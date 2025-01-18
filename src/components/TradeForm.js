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
  BidButton, 
  AskButton, 
  ExecuteButton,
  MarketFillButton, 
  TradeFormContainer,
  SubmitButton,
} from './styles';
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
  const [quoteAmount, setQuoteAmount] = useState(0);
  const [baseAmount, setBaseAmount] = useState(0);
  const [price, setPrice] = useState(0);
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [accounts, setAccounts] = useState({ quoteAccounts: [], baseAccounts: [] });

  const handleOrderMethodChange = (val) => {
    if (val === 'bid') {
      dispatch(setOrder( '', 0, 0, 'bid', '', 'bid' ));
      setQuoteAmount(0);
      setBaseAmount(0);
    } else if (val === 'ask') {
      dispatch(setOrder( '', 0, 0, 'ask', '', 'ask' ));
      setQuoteAmount(0);
      setBaseAmount(0);
    } else if (val === 'execute') {
      dispatch(setOrder( '', 0, 0, '', '', 'execute' ));
    }
  }

  useEffect(() => {
    async function fetchAccounts() {
      try {
        
        const params = {
          sort: 'balance',
          order: 'desc',
        };

        if (orderMethod === 'execute') {
          setQuoteAmount(orderInQuestion.amount);
          setBaseAmount(orderInQuestion.amount / orderInQuestion.price);
        }

        const result = await apiCall('finance/list/account/balance,ticker,address', params);
        
        let quoteAccounts = [];
        let baseAccounts = [];

        if (orderMethod === 'bid' || (orderMethod === 'execute' && orderInQuestion.type === 'ask')) {
          const quoteAccounts = result.filter((acct) => acct.ticker === quoteToken && acct.balance >= quoteAmount);
          const baseAccounts = result.filter((acct) => acct.ticker === baseToken);
          setAccounts({ quoteAccounts, baseAccounts });
        } else if (orderMethod === 'ask' || (orderMethod === 'execute' && orderInQuestion.type === 'bid')) {
          const quoteAccounts = result.filter((acct) => acct.ticker === quoteToken);
          const baseAccounts = result.filter((acct) => acct.ticker === baseToken && acct.balance >= baseAmount);
          setAccounts({ quoteAccounts, baseAccounts });
        } else {
          setAccounts({ quoteAccounts, baseAccounts });
        }

      } catch (error) {

        dispatch(showErrorDialog('Error fetching account information:', error));
      
      }
    }

    fetchAccounts();

  }, [dispatch, orderMethod, orderInQuestion, marketPair, quoteAmount, baseAmount]);

  useEffect(() => {
    setBaseAmount(quoteAmount / price);
  }, [quoteAmount, price]);

  const quoteAccountOptions = accounts.quoteAccounts.map((acct) => ({
    value: acct.address,
    display: `${acct.address.slice(0, 4)}...${acct.address.slice(-4)} - ${acct.balance} ${acct.ticker}`,
  }));
  
  const baseAccountOptions = accounts.baseAccounts.map((acct) => ({
    value: acct.address,
    display: `${acct.address.slice(0, 4)}...${acct.address.slice(-4)} - ${acct.balance} ${acct.ticker}`,
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (orderMethod === 'execute') {
      dispatch(executeOrder(orderInQuestion.txid, fromAccount, toAccount, quoteAmount));
    } else if (orderMethod === 'bid' || orderMethod === 'ask') {
      dispatch(createOrder(orderMethod, price, quoteAmount, fromAccount, toAccount));
    }
  };

  function renderAmountField() {
    if (orderMethod === 'execute' && orderInQuestion.type === 'ask') {
      return (orderInQuestion.amount + ' ' + quoteToken);
    } else if (orderMethod === 'execute' && orderInQuestion.type === 'bid') {
      return (orderInQuestion.amount + ' ' + quoteToken);
    } else {
      return (
        <TextField
          type="number"
          step="0.0001"
          value={quoteAmount}
          onChange={(e) => {
            setQuoteAmount(e.target.value);
            //setBaseAmount(e.target.value / price);
            }
          }
        />
      );
    }
  }

  function renderPriceField() {
    if (orderMethod === 'execute' && orderInQuestion.type === 'ask') {
      return (orderInQuestion.price + ' ' + quoteToken);
    } else if (orderMethod === 'execute' && orderInQuestion.type === 'bid') {
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

  let receivingOptions;
  let paymentOptions;
  let payToken;
  let receiveToken;
  if (orderMethod === 'ask' || (orderMethod === 'execute' && orderInQuestion.type === 'bid')) {
    receivingOptions = quoteAccountOptions;
    receiveToken = quoteToken;
    paymentOptions = baseAccountOptions;
    payToken = baseToken;
  } else {
    receivingOptions = baseAccountOptions;
    receiveToken = baseToken;
    paymentOptions = quoteAccountOptions;
    payToken = quoteToken;
  }

  return (
    <div>
      <FieldSet legend="Trade Form">
          <FormField label={('Order Method')}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <BidButton
                orderMethod={orderMethod}
                onClick={() => handleOrderMethodChange('bid')}
                //variant={orderMethod === 'bid'}
              >
                Bid
              </BidButton>
              <AskButton
                orderMethod={orderMethod}
                onClick={() => handleOrderMethodChange('ask')}
                //variant={orderMethod === 'ask'}
              >
                Ask
              </AskButton>
              <ExecuteButton
                orderMethod={orderMethod}
                onClick={() => handleOrderMethodChange('execute')}
                //variant={orderMethod === 'execute'}
              >
                Execute
              </ExecuteButton>
              <MarketFillButton
                orderMethod={orderMethod}
                //onClick={() => handleOrderMethodChange('execute')}
                //variant={orderMethod === 'execute'}
              >
                Market (coming soon)
              </MarketFillButton>
            </div>
          </FormField>
          <TradeFormContainer> 
            <FormField label={('Price ' + quoteToken)}>
              {renderPriceField()}
            </FormField>
            <FormField label={('Amount ' + quoteToken)}>
              {renderAmountField()}
            </FormField>
          </TradeFormContainer>
          <TradeFormContainer>
            <FormField label={('Payment Account ' + payToken)}>
              <Select
                value={fromAccount}
                onChange={(val) => setFromAccount(val)}
                options={paymentOptions}
              />
            </FormField>

            <FormField label={('Receiving Account ' + receiveToken)}>
              <Select
                value={toAccount}
                onChange={(option) => setToAccount(option)}
                options={
                  receivingOptions
                }
              />
            </FormField>
          </TradeFormContainer>
          <div className='mt2'>
            {orderMethod === 'execute' ? (
              orderInQuestion.txid
                ? <>txid: {orderInQuestion.txid.slice(0, 10)}....{orderInQuestion.txid.slice(-10)}</>
                : <>Click on order to execute in order book</>
            ) : null}
          </div>
          <div className='mt2'>
            <div className='text-center'>
              <SubmitButton 
                orderMethod={orderMethod}
                onClick={handleSubmit}>
                {
                orderMethod === 'execute' ? 
                'Execute order' : 'Create ' + orderMethod
                }
              </SubmitButton>
            </div>
          </div>
      </FieldSet>
    </div>
  );
}