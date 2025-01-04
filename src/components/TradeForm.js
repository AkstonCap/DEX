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
  FormField,
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
  const marketPair = useSelector((state) => state.ui.market.marketPairs.marketPair);
  const orderInQuestion = useSelector((state) => state.ui.market.orderInQuestion);
  
  const [orderType, setOrderType] = useState('bid');
  const [amount, setAmount] = useState(0);
  const [price, setPrice] = useState(0);
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

  const quoteAccountOptions = accounts.quoteAccounts.map((acct) => ({
    value: acct.address,
    display: `${acct.address} - ${acct.balance} ${quoteToken}`,
  }));
  const baseAccountOptions = accounts.baseAccounts.map((acct) => ({
    value: acct.address,
    display: `${acct.address} - ${acct.balance} ${baseToken}`,
  }));
  const orderTypeOptions = [
    { value: 'bid', display: ('Bid') },
    { value: 'ask', display: ('Ask') },
    { value: 'execute', display: ('Execute') },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(createOrder(orderType, price, amount, fromAccount, toAccount));
  };

  return (
    <div>
      <FieldSet legend="Trade Form">
        <form onSubmit={handleSubmit}>
          <FormField label={('Order Type')}>
            <Select
              value={orderType} 
              onChange={(val) => dispatch(setOrderType(val))}
              options={orderTypeOptions}
            />
          </FormField>
          {/*<label>
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
          </label>*/}
          <FormField label={('Payment Account')}>
            <Select
              value={fromAccount}
              onChange={(val) => dispatch(setFromAccount(val))}
              options={quoteAccountOptions}
            />
          </FormField>

          <FormField label={('Receiving Account')}>
            <Select
              value={toAccount}
              onChange={(val) => dispatch(setToAccount(val))}
              options={baseAccountOptions}
            />
          </FormField>
          <Button type="submit">
            Create {orderType}
          </Button>
        </form>
      </FieldSet>
    </div>
  );
}