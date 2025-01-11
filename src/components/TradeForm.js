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
import { setOrder } from 'actions/actionCreators';

export default function TradeForm() {
  const dispatch = useDispatch();
  const quoteToken = useSelector((state) => state.ui.market.marketPairs.quoteToken);
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);
  const marketPair = useSelector((state) => state.ui.market.marketPairs.marketPair);
  const orderInQuestion = useSelector((state) => state.ui.market.orderInQuestion);
  const orderMethod = orderInQuestion.orderMethod;
  //const [orderType, setOrderType] = useState('bid');
  const [amount, setAmount] = useState(0);
  const [price, setPrice] = useState(0);
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [accounts, setAccounts] = useState({ quoteAccounts: [], baseAccounts: [] });

  function handleOrderMethodChange(val) {
    dispatch(setOrder({ ...orderInQuestion, orderMethod: val.value }));
  }

  useEffect(() => {
    async function fetchAccounts() {
      try {
        const result = await apiCall('finance/list/account');
        let quoteAccounts = [];
        let baseAccounts = [];
        if (orderMethod === 'bid' || (orderMethod === 'execute' && orderInQuestion.type === 'bid')) {
          const quoteAccounts = result.filter((acct) => acct.ticker === quoteToken && acct.balance > amount);
          const baseAccounts = result.filter((acct) => acct.ticker === baseToken);
          setAccounts({ quoteAccounts, baseAccounts });
        } else if (orderMethod === 'ask' || (orderMethod === 'execute' && orderInQuestion.type === 'ask')) {
          const quoteAccounts = result.filter((acct) => acct.ticker === quoteToken);
          const baseAccounts = result.filter((acct) => acct.ticker === baseToken && acct.balance > amount);
          setAccounts({ quoteAccounts, baseAccounts });
        } else {
          setAccounts({ quoteAccounts, baseAccounts });
        }
      } catch (error) {
        dispatch(showErrorDialog('Error fetching account information:', error));
      }
    }
    fetchAccounts();
  }, [dispatch, orderMethod, orderInQuestion, quoteToken, baseToken, amount]);

  const quoteAccountOptions = accounts.quoteAccounts.map((acct) => ({
    value: acct.address,
    display: `${acct.address} - ${acct.balance} ${quoteToken}`,
  }));
  const baseAccountOptions = accounts.baseAccounts.map((acct) => ({
    value: acct.address,
    display: `${acct.address} - ${acct.balance} ${baseToken}`,
  }));
  const orderMethodOptions = [
    { value: 'bid', display: ('Bid') },
    { value: 'ask', display: ('Ask') },
    { value: 'execute', display: ('Execute') },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(createOrder(orderMethod, price, amount, fromAccount, toAccount));
  };

  //const renderAmountField = () => {
  function renderAmountField() {
    if (orderMethod === 'execute' && orderInQuestion.type === 'ask') {
      return (orderInQuestion.amount + ' ' + baseToken);
    } else {
      return (
        <TextField
          type="number"
          step="0.0001"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      );
    }
  }

  function renderPriceField() {
    if (orderMethod === 'execute' && orderInQuestion.type === 'ask') {
      return (orderInQuestion.price + ' ' + quoteToken);
    } else {
      return (
        <TextField
          type="number"
          step="0.0001"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      );
    }
  }

  return (
    <div>
      <FieldSet legend="Trade Form">
        <form onSubmit={handleSubmit}>
          <FormField label={('Order Method')}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button
                onClick={() => handleOrderMethodChange('bid')}
                variant={orderMethod === 'bid' ? 'primary' : 'default'}
              >
                Bid
              </Button>
              <Button
                onClick={() => handleOrderMethodChange('ask')}
                variant={orderMethod === 'ask' ? 'primary' : 'default'}
              >
                Ask
              </Button>
              <Button
                onClick={() => handleOrderMethodChange('execute')}
                variant={orderMethod === 'execute' ? 'primary' : 'default'}
              >
                Execute
              </Button>
            </div>
          </FormField>
          <FormField label={('Price')}>
            {renderPriceField()}
          </FormField>
          <FormField label={('Amount ' + baseToken)}>
            {renderAmountField()}
          </FormField>
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
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button type="submit">
              Create {orderMethod}
            </Button>
          </div>
        </form>
      </FieldSet>
    </div>
  );
}