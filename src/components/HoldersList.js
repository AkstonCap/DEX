import { useSelector, useDispatch } from 'react-redux';
import { FieldSet, apiCall } from 'nexus-module';
import { OrderTable, OrderbookTableHeader, OrderbookTableRow, formatTokenName } from './styles';
import { formatNumberWithLeadingZeros } from '../actions/formatNumber';
import { useEffect, useState } from 'react';

export default function HoldersList({ num = 10 }) {
  const dispatch = useDispatch();
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);
  const baseTokenDecimals = useSelector((state) => state.ui.market.marketPairs.baseTokenDecimals);
  const circulatingSupply = useSelector((state) => state.ui.market.marketPairs.baseTokenCirculatingSupply);
  const baseTokenAddress = useSelector((state) => state.ui.market.marketPairs.baseTokenAddress);
  const [holders, setHolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchHolders = async () => {
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
          
          const sortedData = filteredData.sort((a, b) => 
            parseFloat(b.balance || 0) - parseFloat(a.balance || 0));

          console.log('HoldersList: Processed holders:', sortedData.length, 'items');
          
          if (isMounted) {
            setHolders(sortedData || []);
          }
        } else {
          console.log('HoldersList: No valid data received');
          if (isMounted) {
            setHolders([]);
          }
        }
      } catch (error) {
        console.error('HoldersList: Error fetching holders:', error);
        if (isMounted) {
          setHolders([]);
          setError('Failed to load holders list');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchHolders();
    return () => { isMounted = false; };
  }, [baseTokenAddress, baseToken]);

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
    return data.slice(0, Math.min(num, len)).map((item, index) => (
      <OrderbookTableRow key={item.address || index} style={{ color: '#fbbf24' }}>
        <td>{item.owner ? formatTokenName(item.owner) : 'Unknown'}</td>
        <td>{formatTokenName(item.address || 'Unknown')}</td>
        <td>{formatNumberWithLeadingZeros(
          parseFloat(item.balance || 0),
          3, 
          baseTokenDecimals
        )}</td>
        <td>{circulatingSupply ? 
          ((parseFloat(item.balance || 0) / parseFloat(circulatingSupply)) * 100).toFixed(2) + '%' : 'N/A'}</td>
      </OrderbookTableRow>
    ));
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
      </FieldSet>
    </div>
  );
}