import { useSelector, useDispatch } from 'react-redux';
import { FieldSet, apiCall } from 'nexus-module';
import { OrderTable, OrderbookTableHeader, OrderbookTableRow, formatTokenName } from './styles';
import { formatNumberWithLeadingZeros } from '../actions/formatNumber';
import { useEffect, useState, useRef, useCallback } from 'react';

// Update holders list every 2 minutes (120000 ms)
const HOLDERS_UPDATE_INTERVAL = 2 * 60 * 1000;

export default function HoldersList({ num = 10 }) {
  const dispatch = useDispatch();
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);
  const baseTokenDecimals = useSelector((state) => state.ui.market.marketPairs.baseTokenDecimals);
  const circulatingSupply = useSelector((state) => state.ui.market.marketPairs.baseTokenCirculatingSupply);
  const baseTokenAddress = useSelector((state) => state.ui.market.marketPairs.baseTokenAddress);
  const orderBook = useSelector((state) => state.ui.market.orderBook);
  const [holders, setHolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Use refs to access latest values in interval callback without causing re-renders
  const orderBookRef = useRef(orderBook);
  const baseTokenRef = useRef(baseToken);
  
  // Keep refs updated with latest values
  useEffect(() => {
    orderBookRef.current = orderBook;
  }, [orderBook]);
  
  useEffect(() => {
    baseTokenRef.current = baseToken;
  }, [baseToken]);

  const fetchHolders = useCallback(async () => {
    if (!baseTokenAddress) {
      console.log('HoldersList: No baseTokenAddress available');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('HoldersList: Fetching holders for token:', baseTokenAddress);
      
      const data = await apiCall(
        'register/list/finance:accounts', 
        { 
          where: `results.token=${baseTokenAddress}`,
          limit: 100,
          sort: 'balance', 
          order: 'desc', 
        }
      );

      console.log('HoldersList: Raw API response:', data);

      if (data && Array.isArray(data)) {
        const filteredData = data.filter(item => 
          item.token === baseTokenAddress && parseFloat(item.balance || 0) > 0);
        
        // Calculate locked amounts from order book (use ref for latest value)
        const currentOrderBook = orderBookRef.current;
        const currentBaseToken = baseTokenRef.current;
        const lockedByOwner = {};
        
        // Process bids - for bids, the ORDER contains base token (what you want to receive)
        // So we DON'T count bids as locked base tokens
        
        // Process asks - for asks, the CONTRACT contains base token (what you're selling)
        // These ARE locked base tokens
        if (currentOrderBook?.asks && Array.isArray(currentOrderBook.asks)) {
          currentOrderBook.asks.forEach(order => {
            if (order.owner && order.contract?.ticker === currentBaseToken && order.contract?.amount) {
              const owner = order.owner;
              const amount = parseFloat(order.contract.amount) || 0;
              lockedByOwner[owner] = (lockedByOwner[owner] || 0) + amount;
            }
          });
        }
        
        // Note: Bids don't lock base tokens - they lock quote tokens
        // So we only count asks for base token holdings
        
        console.log('HoldersList: Locked amounts by owner:', lockedByOwner);
        
        // Add locked amounts to holder balances
        const enrichedData = filteredData.map(holder => {
          const locked = lockedByOwner[holder.owner] || 0;
          const totalBalance = parseFloat(holder.balance || 0) + locked;
          return {
            ...holder,
            lockedAmount: locked,
            balance: totalBalance.toString()
          };
        });
        
        const sortedData = enrichedData.sort((a, b) => 
          parseFloat(b.balance || 0) - parseFloat(a.balance || 0));

        console.log('HoldersList: Processed holders with locked amounts:', sortedData.length, 'items');
        
        setHolders(sortedData || []);
      } else {
        console.log('HoldersList: No valid data received');
        setHolders([]);
      }
    } catch (error) {
      console.error('HoldersList: Error fetching holders:', error);
      setHolders([]);
      setError('Failed to load holders list');
    } finally {
      setLoading(false);
    }
  }, [baseTokenAddress]);

  // Fetch immediately when baseTokenAddress changes, then set up interval
  useEffect(() => {
    if (!baseTokenAddress) return;
    
    // Fetch immediately
    fetchHolders();
    
    // Set up interval for updates every 2 minutes
    const intervalId = setInterval(fetchHolders, HOLDERS_UPDATE_INTERVAL);
    
    // Cleanup interval on unmount or when baseTokenAddress changes
    return () => clearInterval(intervalId);
  }, [baseTokenAddress, fetchHolders]);

  const renderHolders = (data) => {
    if (loading) {
      return (
        <OrderbookTableRow>
          <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
            Loading holders...
          </td>
        </OrderbookTableRow>
      );
    }

    if (error) {
      return (
        <OrderbookTableRow>
          <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#ef4444' }}>
            {error}
          </td>
        </OrderbookTableRow>
      );
    }

    if (!Array.isArray(data) || data.length === 0) {
      return (
        <OrderbookTableRow>
          <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
            No holders found
          </td>
        </OrderbookTableRow>
      );
    }

    const len = data.length;
    return data.slice(0, Math.min(num, len)).map((item, index) => {
      const totalBalance = parseFloat(item.balance || 0);
      const lockedAmount = parseFloat(item.lockedAmount || 0);
      const freeBalance = totalBalance - lockedAmount;
      
      return (
        <OrderbookTableRow key={item.address || index} style={{ color: '#fbbf24' }}>
          <td>{item.owner ? formatTokenName(item.owner) : 'Unknown'}</td>
          <td>{formatTokenName(item.address || 'Unknown')}</td>
          <td>
            {formatNumberWithLeadingZeros(totalBalance, 3, baseTokenDecimals)}
            {lockedAmount > 0 && (
              <span style={{ fontSize: '0.85em', color: '#9ca3af', marginLeft: '4px' }}>
                ({formatNumberWithLeadingZeros(lockedAmount, 3, baseTokenDecimals)} locked)
              </span>
            )}
          </td>
          <td>{circulatingSupply ? 
            ((totalBalance / parseFloat(circulatingSupply)) * 100).toFixed(2) + '%' : 'N/A'}</td>
        </OrderbookTableRow>
      );
    });
  };

  const renderRemainingSummary = () => {
    if (loading || error || !Array.isArray(holders) || holders.length <= num) {
      return null;
    }

    const remainingHolders = holders.slice(num);
    const remainingCount = remainingHolders.length;
    const totalHeld = remainingHolders.reduce((sum, holder) => 
      sum + parseFloat(holder.balance || 0), 0);
    const percentageOfSupply = circulatingSupply ? 
      ((totalHeld / parseFloat(circulatingSupply)) * 100).toFixed(2) : 'N/A';

    return (
      <div style={{ 
        marginTop: '16px', 
        padding: '12px', 
        backgroundColor: 'rgba(59, 130, 246, 0.1)', 
        borderRadius: '4px',
        border: '1px solid rgba(59, 130, 246, 0.2)'
      }}>
        <div style={{ fontSize: '0.9em', color: '#93c5fd', fontWeight: 'bold', marginBottom: '8px' }}>
          Remaining Holders Summary
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '0.85em' }}>
          <div>
            <span style={{ color: '#9ca3af' }}>Accounts: </span>
            <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{remainingCount}</span>
          </div>
          <div>
            <span style={{ color: '#9ca3af' }}>Total Held: </span>
            <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>
              {formatNumberWithLeadingZeros(totalHeld, 3, baseTokenDecimals)}
            </span>
          </div>
          <div>
            <span style={{ color: '#9ca3af' }}>% of Supply: </span>
            <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{percentageOfSupply}%</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <FieldSet legend={`Holders List (${baseToken || 'Unknown Token'})`}>
        <OrderTable>
          <thead>
            <tr>
              <th style={{ width: '25%' }}>Owner</th>
              <th style={{ width: '25%' }}>Account</th>
              <th style={{ width: '30%' }}>Amount</th>
              <th style={{ width: '20%' }}>Percentage</th>
            </tr>
          </thead>
          <tbody>
            {renderHolders(holders)}
          </tbody>
        </OrderTable>
        {renderRemainingSummary()}
      </FieldSet>
    </div>
  );
}