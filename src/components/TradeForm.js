import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  FieldSet,
  Button,
  Dropdown,
  TextField,
  Select,
  apiCall,
  showErrorDialog,
} from 'nexus-module';
import { 
  createOrder, 
  cancelOrder, 
  executeOrder,
} from 'actions/placeOrder';

export default function TradeForm() {
  const dispatch = useDispatch();
  const quoteToken = useSelector((state) => state.ui.market.marketPairs.quoteToken);
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);
  const orderInQuestion = useSelector((state) => state.ui.market.orderInQuestion);
  
  const [orderType, setOrderType] = useState('bid');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [accounts, setAccounts] = useState({ quoteAccounts: [], baseAccounts: [] });

  useEffect(() => {
    async function fetchAccounts() {
      try {
        const result = await apiCall('finance/list/account');
        let quoteAccounts = [];
        let baseAccounts = [];
        if (orderType === 'bid' || (orderType === 'execute' && orderInQuestion.type === 'bid')) {
          quoteAccounts = result.filter((acct) => acct.ticker === quoteToken && acct.balance > amount);
          baseAccounts = result.filter((acct) => acct.ticker === baseToken);
        } else if (orderType === 'ask' || (orderType === 'execute' && orderInQuestion.type === 'ask')) {
          quoteAccounts = result.filter((acct) => acct.ticker === quoteToken);
          baseAccounts = result.filter((acct) => acct.ticker === baseToken && acct.balance > amount);
        }
        setAccounts({ quoteAccounts, baseAccounts });
      } catch (error) {
        dispatch(showErrorDialog('Error fetching account information:', error));
      }
    }
    fetchAccounts();
  }, [dispatch, orderType, orderInQuestion, quoteToken, baseToken, amount]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(createOrder(orderType, price, amount, fromAccount, toAccount));
  };

  return (
    <div className="mt2">
      <h3>Place Order</h3>
      <form onSubmit={handleSubmit}>
        <label>
          Order Type:
          <Select value={orderType} onChange={(e) => setOrderType(e.target.value)}>
            <option value="bid">Buy</option>
            <option value="ask">Sell</option>
            <option value="execute">Execute</option>
          </Select>
        </label>
        <label>
          Price:
          <input
            type="number"
            step="0.0001"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <label>
          Amount:
          <input
            type="number"
            step="0.0001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <Dropdown
          label="From Account"
          value={fromAccount}
          onChange={(e) => setFromAccount(e.target.value)}
        >
          {/* Map quoteAccounts for the 'From Account' dropdown */}
          {accounts.quoteAccounts.map((acct) => (
            <option key={acct.address} value={acct.address}>
              {acct.address} - {acct.balance} {quoteToken}
            </option>
          ))}
        </Dropdown>

        <Dropdown
          label="To Account"
          value={toAccount}
          onChange={(e) => setToAccount(e.target.value)}
        >
          {/* Map baseAccounts for the 'To Account' dropdown */}
          {accounts.baseAccounts.map((acct) => (
            <option key={acct.address} value={acct.address}>
              {acct.address} - {acct.balance} {baseToken}
            </option>
          ))}
        </Dropdown>
        <Button onClick={handleSubmit}>
          Create {orderType}
        </Button>
      </form>
    </div>
  );
}