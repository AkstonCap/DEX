import { useSelector, useDispatch } from 'react-redux';
import { FieldSet, apiCall } from 'nexus-module';
import { OrderTable, OrderbookTableHeader, OrderbookTableRow, formatTokenName } from './styles';
import { formatNumberWithLeadingZeros } from '../actions/formatNumber';
import { useEffect, useState } from 'react';

export default function HoldersList({ num }) {
  const dispatch = useDispatch();
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);
  const baseTokenDecimals = useSelector((state) => state.ui.market.marketPairs.baseTokenDecimals);
  const circulatingSupply = useSelector((state) => state.ui.market.marketPairs.baseTokenCirculatingSupply);
  const baseTokenAddress = useSelector((state) => state.ui.market.marketPairs.baseTokenAddress);
  const [holders, setHolders] = useState([]);
  const string = 'results.address=' + baseTokenAddress;

  useEffect(() => {
    let isMounted = true;
    const fetchHolders = async () => {
      await apiCall(
        'register/list/finance:accounts/token,address,balance', 
        { 
          limit: 1000, 
          sort: 'balance', 
          order: 'desc', 
        }
      ).then((data) => {
          const filteredData = data?.filter(item => 
            item.token === baseTokenAddress && parseFloat(item.balance) > 0);
          // Calculate percentage of circulating supply
          const withPercent = filteredData?.map(item => ({
            ...item,
            percentageCirculatingSupply: circulatingSupply
              ? (parseFloat(item.balance) / parseFloat(circulatingSupply)) * 100
              : 0
          }));
          if (isMounted) setHolders(Array.isArray(withPercent) ? withPercent : []);
        })
        .catch(() => {
          if (isMounted) setHolders([]);
        });
    };
    fetchHolders();
    return () => { isMounted = false; };
  }, [baseTokenAddress, circulatingSupply]);

  const renderHolders = (data) => {
    if (!Array.isArray(data)) {
      return 'No holders';
    }
    const len = data.length;
    return data.slice(0, Math.min(num, len)).map((item, index) => (
      <OrderbookTableRow key={index}>
        <td>{formatTokenName(item.address)}</td>
        <td>{formatNumberWithLeadingZeros(
          parseFloat(item.balance),
          3, 
          baseTokenDecimals
        )}</td>
        <td>{formatNumberWithLeadingZeros(
          parseFloat(item.percentageCirculatingSupply),
          3,
          6
        )}{' %'}</td>
      </OrderbookTableRow>
    ));
  };

  return (
    <div>
      <FieldSet legend="Holders List">
        <OrderTable>
          <thead>
            <tr>
              <th>Account</th>
              <th>Amount</th>
              <th>Percentage</th>
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