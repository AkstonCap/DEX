import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  FieldSet,
  Button,
  Dropdown,
  TextField,
  Select,
  Modal,
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
  formatTokenName,
} from './styles';
import { 
  createOrder, 
  cancelOrder, 
  executeOrder,
} from 'actions/placeOrder';
import { setOrder } from 'actions/actionCreators';
import { fetchMarketData } from 'actions/fetchMarketData';
import { formatNumberWithLeadingZeros } from 'actions/formatNumber';

export default function TradeForm() {
  const dispatch = useDispatch();
  const quoteToken = useSelector((state) => state.ui.market.marketPairs.quoteToken);
  const quoteTokenAddress = useSelector((state) => state.ui.market.marketPairs.quoteTokenAddress);
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);
  const baseTokenAddress = useSelector((state) => state.ui.market.marketPairs.baseTokenAddress);
  const marketPair = useSelector((state) => state.ui.market.marketPairs.marketPair);
  const quoteTokenDecimals = useSelector((state) => state.ui.market.marketPairs.quoteTokenDecimals);
  const baseTokenDecimals = useSelector((state) => state.ui.market.marketPairs.baseTokenDecimals);
  const orderInQuestion = useSelector((state) => state.ui.market.orderInQuestion);
  const availableOrders = useSelector((state) => state.ui.market.orderInQuestion.availableOrders);
  const orderMethod = orderInQuestion.orderMethod;
  //const [orderType, setOrderType] = useState('bid');
  const [quoteAmount, setQuoteAmount] = useState(0);
  const [baseAmount, setBaseAmount] = useState(0);
  const [price, setPrice] = useState(0);
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [accounts, setAccounts] = useState({ quoteAccounts: [], baseAccounts: [] });
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [marketFillType, setMarketFillType] = useState('buy'); // 'buy' or 'sell'
  const [marketFillMaxAmount, setMarketFillMaxAmount] = useState(0);
  const [confirmationOrder, setConfirmationOrder] = useState(null);
  const orderBook = useSelector((state) => state.ui.market.orderBook);

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
    } else if (val === 'market') {
      dispatch(setOrder( '', 0, 0, '', '', 'market' ));
      setMarketFillMaxAmount(0);
    }
  }

  // Set default order method to 'market' on mount
  useEffect(() => {
    if (!orderMethod || orderMethod === '') {
      handleOrderMethodChange('market');
    }
  }, []);

  // Handle market fill execution
  const handleMarketFill = async () => {
    if (!marketFillMaxAmount || marketFillMaxAmount <= 0) {
      showErrorDialog({
        message: 'Invalid amount',
        note: 'Please enter a valid maximum payment amount'
      });
      return;
    }

    if (!fromAccount || !toAccount || fromAccount === '' || toAccount === '') {
      showErrorDialog({
        message: 'Missing accounts',
        note: 'Please select both payment and receiving accounts'
      });
      return;
    }

    // Get orders based on buy/sell type
    const ordersToSearch = marketFillType === 'buy' 
      ? (orderBook?.asks || []) 
      : (orderBook?.bids || []);

    if (ordersToSearch.length === 0) {
      showErrorDialog({
        message: 'No orders available',
        note: `No ${marketFillType === 'buy' ? 'sell' : 'buy'} orders found in the order book`
      });
      return;
    }

    // Find best order based on type
    let bestOrder = null;
    if (marketFillType === 'buy') {
      // Get the absolute best (cheapest) price in the market for comparison
      const allAsks = [...ordersToSearch]
        .map(order => ({
          ...order,
          calculatedPrice: parseFloat(order.order?.amount || 0) / parseFloat(order.contract?.amount || 0)
        }))
        .filter(order => order.calculatedPrice > 0)
        .sort((a, b) => a.calculatedPrice - b.calculatedPrice);
      const marketBestPrice = allAsks.length > 0 ? allAsks[0].calculatedPrice : 0;
      
      // For buy, find cheapest ask where payment amount fits within max payment budget
      // When executing an ask, you pay quote token but filter by order.amount (base amount)
      const sortedAsks = [...ordersToSearch]
        .map(order => ({
          ...order,
          // Recalculate price for asks: price = order.amount / contract.amount
          calculatedPrice: parseFloat(order.order?.amount || 0) / parseFloat(order.contract?.amount || 0)
        }))
        .filter(order => {
          // For ask orders, filter by order.amount (base token - already normalized for NXS)
          const baseAmount = parseFloat(order.order?.amount || 0);
          return baseAmount > 0 && baseAmount <= marketFillMaxAmount && order.calculatedPrice > 0;
        })
        .sort((a, b) => {
          const priceDiff = a.calculatedPrice - b.calculatedPrice;
          if (priceDiff !== 0) return priceDiff; // Lower price first
          // For tie-breaker, prefer higher base amount
          return parseFloat(b.order?.amount || 0) - parseFloat(a.order?.amount || 0);
        });
      
      if (sortedAsks.length === 0) {
        showErrorDialog({
          message: 'Amount is too small',
          note: `No orders found with payment amount <= ${marketFillMaxAmount} ${formatTokenName(quoteToken)}. Please increase your max payment amount.`
        });
        return;
      }

      bestOrder = sortedAsks[0];
      
      // Only accept orders within 10% of market best price
      const priceThreshold = marketBestPrice * 1.1; // 10% higher
      
      if (bestOrder.calculatedPrice > priceThreshold) {
        showErrorDialog({
          message: 'Price protection triggered',
          note: `Best available order within your budget is at ${formatNumberWithLeadingZeros(bestOrder.calculatedPrice, 3, quoteTokenDecimals)} ${formatTokenName(quoteToken)}, which is more than 10% above the market price of ${formatNumberWithLeadingZeros(marketBestPrice, 3, quoteTokenDecimals)} ${formatTokenName(quoteToken)}. Please increase your max payment amount or manually select an order.`
        });
        return;
      }
    } else {
      // Get the absolute best (highest) price in the market for comparison
      const allBids = [...ordersToSearch]
        .map(order => ({
          ...order,
          calculatedPrice: parseFloat(order.contract?.amount || 0) / parseFloat(order.order?.amount || 0)
        }))
        .filter(order => order.calculatedPrice > 0)
        .sort((a, b) => b.calculatedPrice - a.calculatedPrice);
      const marketBestPrice = allBids.length > 0 ? allBids[0].calculatedPrice : 0;
      
      // For sell, find highest bid where payment amount is below max
      const sortedBids = [...ordersToSearch]
        .map(order => ({
          ...order,
          // Recalculate price for bids: price = contract.amount / order.amount
          calculatedPrice: parseFloat(order.contract?.amount || 0) / parseFloat(order.order?.amount || 0)
        }))
        .filter(order => {
          const basePayment = parseFloat(order.order?.amount || 0);
          return basePayment > 0 && basePayment <= marketFillMaxAmount && order.calculatedPrice > 0;
        })
        .sort((a, b) => {
          const priceDiff = b.calculatedPrice - a.calculatedPrice;
          if (priceDiff !== 0) return priceDiff; // Higher price first
          return parseFloat(b.order?.amount || 0) - parseFloat(a.order?.amount || 0); // Higher base amount first
        });
      
      if (sortedBids.length === 0) {
        showErrorDialog({
          message: 'Amount is too small',
          note: `No orders found with payment amount <= ${marketFillMaxAmount} ${formatTokenName(baseToken)}. Please increase your max payment amount.`
        });
        return;
      }

      bestOrder = sortedBids[0];
      
      // Only accept orders within 10% of market best price
      const priceThreshold = marketBestPrice * 0.9; // 10% lower
      
      if (bestOrder.calculatedPrice < priceThreshold) {
        showErrorDialog({
          message: 'Price protection triggered',
          note: `Best available order within your budget is at ${formatNumberWithLeadingZeros(bestOrder.calculatedPrice, 3, quoteTokenDecimals)} ${formatTokenName(quoteToken)}, which is more than 10% below the market price of ${formatNumberWithLeadingZeros(marketBestPrice, 3, quoteTokenDecimals)} ${formatTokenName(quoteToken)}. Please increase your max payment amount or manually select an order.`
        });
        return;
      }
    }

    // Show confirmation dialog with order details
    console.log('Setting confirmation order:', { bestOrder, fromAccount, toAccount });
    setConfirmationOrder({
      order: bestOrder,
      fromAccount,
      toAccount
    });
  }

  // Execute the confirmed order
  const handleConfirmExecution = async () => {
    if (!confirmationOrder) return;

    const { order, fromAccount, toAccount } = confirmationOrder;
    
    // Determine amounts based on order type
    // For ask orders: order.amount is base (what seller gives), contract.amount is quote (what seller wants)
    // For bid orders: contract.amount is quote (what buyer gives), order.amount is base (what buyer wants)
    const quoteAmount = order.type === 'ask' 
      ? parseFloat(order.order?.amount || 0)      // Ask: quote is in order.amount
      : parseFloat(order.contract?.amount || 0);  // Bid: quote is in contract.amount
    
    const baseAmount = order.type === 'ask' 
      ? parseFloat(order.contract?.amount || 0)   // Ask: base is in contract.amount
      : parseFloat(order.order?.amount || 0);     // Bid: base is in order.amount
    
    // Execute the order using secureApiCall (opens confirmation dialog with PIN)
    const result = await dispatch(
      executeOrder(order.txid, fromAccount, toAccount, quoteAmount, baseAmount)
    );

    // Reset form and close dialog after execution
    if (result) {
      setMarketFillMaxAmount(0);
      setFromAccount('');
      setToAccount('');
      setConfirmationOrder(null);
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
          setPrice(orderInQuestion.price);
          
          // If there are available orders at this price, auto-select the first one
          if (availableOrders && availableOrders.length > 0 && !orderInQuestion.txid) {
            const firstOrder = availableOrders[0];
            setSelectedOrderId(firstOrder.txid);
            const amount = firstOrder.type === 'ask' ? firstOrder.order.amount : firstOrder.contract.amount;
            dispatch(setOrder(firstOrder.txid, firstOrder.price, amount, firstOrder.type, firstOrder.market, 'execute'));
          }
        }

        const result = await apiCall('finance/list/account/balance,ticker,address', params);
        const tokens = await apiCall('finance/list/token/balance,ticker,address');
        
        let quoteAccounts = [];
        let baseAccounts = [];

        if (orderMethod === 'bid' || (orderMethod === 'execute' && orderInQuestion.type === 'ask') || (orderMethod === 'market' && marketFillType === 'buy')) {

          const minQuoteBalance = orderMethod === 'market' ? marketFillMaxAmount : quoteAmount;
          const quoteTokenOwned = tokens
            ?.filter((token) => token.address === quoteTokenAddress && token.balance >= minQuoteBalance);
          const quoteAccounts1 = result.filter((acct) => acct.ticker === quoteToken && acct.balance >= minQuoteBalance);
          if (quoteTokenOwned.length > 0) {
            quoteAccounts = [...quoteAccounts1, ...quoteTokenOwned];
          } else {
            quoteAccounts = quoteAccounts1;
          }

          const baseTokenOwned = tokens
            ?.filter((token) => token.address === baseTokenAddress);
          const baseAccounts1 = result
            .filter((acct) => acct.ticker === baseToken);
          if (baseTokenOwned.length > 0) {
            baseAccounts = [...baseAccounts1, ...baseTokenOwned];
          } else {
            baseAccounts = baseAccounts1;
          }
          
          setAccounts({ quoteAccounts, baseAccounts });

        } else if (orderMethod === 'ask' || (orderMethod === 'execute' && orderInQuestion.type === 'bid') || (orderMethod === 'market' && marketFillType === 'sell')) {

          const quoteTokenOwned = tokens
            ?.filter((token) => token.address === quoteTokenAddress );
          const quoteAccounts1 = result.filter((acct) => acct.ticker === quoteToken);
          const quoteAccounts = [...quoteAccounts1, ...quoteTokenOwned];
          
          const minBaseBalance = orderMethod === 'market' ? marketFillMaxAmount : baseAmount;
          const baseTokenOwned = tokens
            ?.filter((token) => token.address === baseTokenAddress && token.balance >= minBaseBalance );
          const baseAccounts1 = result.filter((acct) => acct.ticker === baseToken && acct.balance >= minBaseBalance);
          const baseAccounts = [...baseAccounts1, ...baseTokenOwned];

          setAccounts({ quoteAccounts, baseAccounts });

        } else {

          setAccounts({ quoteAccounts, baseAccounts });

        }

      } catch (error) {
        dispatch(showErrorDialog({
          message: 'Error fetching account information',
          note: error?.message || 'Unknown error occurred'
        }));
      
      }
    }

    fetchAccounts();

  }, [dispatch, orderMethod, orderInQuestion, marketPair, quoteAmount, baseAmount, marketFillType, marketFillMaxAmount]);

  useEffect(() => {
    setBaseAmount(quoteAmount / price);
  }, [quoteAmount, price]);

  // Handle order selection from dropdown
  const handleOrderSelection = (txid) => {
    setSelectedOrderId(txid);
    const selectedOrder = availableOrders.find(order => order.txid === txid);
    if (selectedOrder) {
      const amount = selectedOrder.type === 'ask' ? selectedOrder.order.amount : selectedOrder.contract.amount;
      dispatch(setOrder(selectedOrder.txid, selectedOrder.price, amount, selectedOrder.type, selectedOrder.market, 'execute'));
    }
  };

  // Create dropdown options from available orders
  const orderDropdownOptions = availableOrders?.map(order => ({
    value: order.txid,
    display: `${order.txid.slice(0, 8)}...${order.txid.slice(-8)} - ${formatNumberWithLeadingZeros(
      parseFloat(order.type === 'ask' ? order.order.amount : order.contract.amount),
      3,
      order.type === 'ask' ? quoteTokenDecimals : baseTokenDecimals
    )} ${order.type === 'ask' ? formatTokenName(quoteToken) : formatTokenName(baseToken)}`
  })) || [];

  const quoteAccountOptions = accounts.quoteAccounts.map((acct) => ({
    value: acct.address,
    display: `${acct.address.slice(0, 4)}...${acct.address.slice(-4)} - ${acct.balance} ${acct.ticker}`,
  }));
  
  const baseAccountOptions = accounts.baseAccounts.map((acct) => ({
    value: acct.address,
    display: `${acct.address.slice(0, 4)}...${acct.address.slice(-4)} - ${acct.balance} ${acct.ticker}`,
  }));

  // decouple order action from data refresh to avoid middleware errors
  const handleSubmit = async (e) => {
    e.preventDefault();
    let result;
    if (orderMethod === 'execute') {
      result = await dispatch(
        executeOrder(orderInQuestion.txid, fromAccount, toAccount, quoteAmount)
      );
      dispatch(setOrder('', 0, 0, '', '', 'execute'));
    } else if (orderMethod === 'market') {
      // Market fill is handled by separate button
      return;
    } else if (orderMethod === 'bid' || orderMethod === 'ask') {
      result = await dispatch(
        createOrder(orderMethod, price, quoteAmount, fromAccount, toAccount)
      );
      dispatch(setOrder('', 0, 0, orderMethod, '', orderMethod));
      setQuoteAmount(0);
      setBaseAmount(0);
      setPrice(0);
      setFromAccount('');
      setToAccount('');
    }
    // Refresh market data after successful operation with a small delay
    /*if (result && result.success) {
      setTimeout(() => {
        dispatch(fetchMarketData());
      }, 100);
    }*/
  };

  function renderAmountField() {
    if (
      (orderMethod === 'execute' && orderInQuestion.type === 'ask') || (orderMethod === 'execute' && orderInQuestion.type === 'bid')
    ) {
      return (
        <>
          {formatNumberWithLeadingZeros(
            parseFloat(orderInQuestion.amount), 
            3,
            quoteTokenDecimals
            )
          }{' '} 
          {formatTokenName(quoteToken)}
        </>
        //orderInQuestion.price + ' ' + quoteToken
      );
    } else {
      return (
        <TextField
          type="number"
          step={Math.pow(10, -quoteTokenDecimals).toString()}
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
    if (
      (orderMethod === 'execute' && orderInQuestion.type === 'ask') || (orderMethod === 'execute' && orderInQuestion.type === 'bid')
    ) {
      return (
        <>
          {formatNumberWithLeadingZeros(
            parseFloat(orderInQuestion.price), 
            3,
            quoteTokenDecimals
            )
          }{' '} 
          {formatTokenName(quoteToken)}
        </>
        //orderInQuestion.price + ' ' + quoteToken
      );
    //} else if (orderMethod === 'execute' && orderInQuestion.type === 'bid') {
    //  return (orderInQuestion.price + ' ' + quoteToken);
    } else {
      return (
        <TextField
          type="number"
          step={Math.pow(10, -quoteTokenDecimals).toString()}
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
              <MarketFillButton
                orderMethod={orderMethod}
                onClick={() => handleOrderMethodChange('market')}
                style={{ marginRight: '8px' }}
              >
                Market Fill
              </MarketFillButton>
              <BidButton
                orderMethod={orderMethod}
                onClick={() => handleOrderMethodChange('bid')}
              >
                Bid
              </BidButton>
              <AskButton
                orderMethod={orderMethod}
                onClick={() => handleOrderMethodChange('ask')}
              >
                Ask
              </AskButton>
              <ExecuteButton
                orderMethod={orderMethod}
                onClick={() => handleOrderMethodChange('execute')}
              >
                Execute
              </ExecuteButton>
            </div>
          </FormField>
          {orderMethod === 'market' ? (
            <>
              <FormField label="Order Type">
                <div style={{ display: 'flex', gap: '16px' }}>
                  <BidButton
                    orderMethod={marketFillType === 'buy' ? 'bid' : ''}
                    onClick={() => setMarketFillType('buy')}
                    style={{ fontSize: '13px', padding: '6px 12px' }}
                  >
                    Buy
                  </BidButton>
                  <AskButton
                    orderMethod={marketFillType === 'sell' ? 'ask' : ''}
                    onClick={() => setMarketFillType('sell')}
                    style={{ fontSize: '13px', padding: '6px 12px' }}
                  >
                    Sell
                  </AskButton>
                </div>
              </FormField>
              <FormField label={`Max Payment Amount (${formatTokenName(marketFillType === 'buy' ? quoteToken : baseToken)})`}>
                <TextField
                  type="number"
                  step={Math.pow(10, -(marketFillType === 'buy' ? quoteTokenDecimals : baseTokenDecimals)).toString()}
                  value={marketFillMaxAmount}
                  onChange={(e) => setMarketFillMaxAmount(parseFloat(e.target.value))}
                  placeholder="Enter maximum payment amount"
                />
              </FormField>
            </>
          ) : (
            <TradeFormContainer> 
              <FormField
                label={('Price (' + formatTokenName(quoteToken) + ' per ' + formatTokenName(baseToken) + ')')}>
                {renderPriceField()}
              </FormField>
              <FormField
                orderMethod={orderMethod}
                label={('Amount ' + formatTokenName(quoteToken))}>
                {renderAmountField()}
              </FormField>
            </TradeFormContainer>
          )}
          {orderMethod === 'market' && (
            <TradeFormContainer>
              <FormField label={('Payment Account ' + formatTokenName(marketFillType === 'buy' ? quoteToken : baseToken))}>
                <Select
                  value={fromAccount}
                  onChange={(val) => setFromAccount(val)}
                  options={marketFillType === 'buy' ? quoteAccountOptions : baseAccountOptions}
                />
              </FormField>

              <FormField label={('Receiving Account ' + formatTokenName(marketFillType === 'buy' ? baseToken : quoteToken))}>
                <Select
                  value={toAccount}
                  onChange={(option) => setToAccount(option)}
                  options={marketFillType === 'buy' ? baseAccountOptions : quoteAccountOptions}
                />
              </FormField>
            </TradeFormContainer>
          )}
          {orderMethod === 'market' && (
            <div className='mt2 text-center'>
              <Button onClick={handleMarketFill}>
                Find Best Order & Execute
              </Button>
            </div>
          )}
          {orderMethod === 'execute' && availableOrders && availableOrders.length > 0 && (
            <FormField label="Select Order to Execute">
              <Select
                value={selectedOrderId}
                onChange={handleOrderSelection}
                options={orderDropdownOptions}
              />
            </FormField>
          )}
          {orderMethod !== 'market' && (
            <TradeFormContainer>
              <FormField label={('Payment Account ' + formatTokenName(payToken))}>
                <Select
                  value={fromAccount}
                  onChange={(val) => setFromAccount(val)}
                  options={paymentOptions}
                />
              </FormField>

              <FormField label={('Receiving Account ' + formatTokenName(receiveToken))}>
                <Select
                  value={toAccount}
                  onChange={(option) => setToAccount(option)}
                  options={
                    receivingOptions
                  }
                />
              </FormField>
            </TradeFormContainer>
          )}
          <div className='mt2'>
            {orderMethod === 'execute' ? (
              orderInQuestion.txid
                ? <>
                    txid: {orderInQuestion.txid.slice(0, 10)}....{orderInQuestion.txid.slice(-10)}
                    <br />
                    Choose another order in the dropdown above to change the amount to fill, or click on an available order price in the order book (right hand side) which you would like to fill.
                  </>
                : <>
                    txid: 
                    <br />
                    Click on an available order price in the order book (right hand side) which you would like to fill.
                  </>
            ) : null}
          </div>
          {orderMethod !== 'market' && (
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
          )}
      </FieldSet>
      {console.log('confirmationOrder state:', confirmationOrder)}
      {console.log('confirmationOrder?.order:', confirmationOrder?.order)}
      {console.log('confirmationOrder?.order?.txid:', confirmationOrder?.order?.txid)}
      {confirmationOrder && confirmationOrder.order && confirmationOrder.order.txid && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setConfirmationOrder(null)}
        >
          <div
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '20px',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflow: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
          <FieldSet legend="Confirm Order Execution">
              {console.log('Order for confirmation:', confirmationOrder.order)}
              {console.log('Order type:', confirmationOrder.order.type)}
              {console.log('contract.amount:', confirmationOrder.order.contract?.amount, 'contract.ticker:', confirmationOrder.order.contract?.ticker)}
              {console.log('order.amount:', confirmationOrder.order.order?.amount, 'order.ticker:', confirmationOrder.order.order?.ticker)}
              <div style={{ marginBottom: '10px' }}>
                <strong>Order ID:</strong> {confirmationOrder.order.txid.slice(0, 10)}...{confirmationOrder.order.txid.slice(-10)}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Price:</strong> {formatNumberWithLeadingZeros(
                  confirmationOrder.order.calculatedPrice || 
                  (marketFillType === 'buy' 
                    ? parseFloat(confirmationOrder.order.order?.amount || 0) / parseFloat(confirmationOrder.order.contract?.amount || 1)
                    : parseFloat(confirmationOrder.order.contract?.amount || 0) / parseFloat(confirmationOrder.order.order?.amount || 1)
                  ),
                  3,
                  quoteTokenDecimals
                )} {formatTokenName(quoteToken)}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Payment Amount:</strong> {formatNumberWithLeadingZeros(
                  confirmationOrder.order.type === 'ask' 
                    ? parseFloat(confirmationOrder.order.order?.amount || 0)      // Executing ask: pay order amount (quote)
                    : parseFloat(confirmationOrder.order.contract?.amount || 0),  // Executing bid: pay contract amount (quote)
                  3,
                  confirmationOrder.order.type === 'ask' 
                    ? (confirmationOrder.order.order?.ticker === 'NXS' ? 6 : quoteTokenDecimals)
                    : (confirmationOrder.order.contract?.ticker === 'NXS' ? 6 : quoteTokenDecimals)
                )} {confirmationOrder.order.type === 'ask' ? confirmationOrder.order.order?.ticker : confirmationOrder.order.contract?.ticker}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Receiving Amount:</strong> {formatNumberWithLeadingZeros(
                  confirmationOrder.order.type === 'ask' 
                    ? parseFloat(confirmationOrder.order.contract?.amount || 0)   // Executing ask: receive contract amount (base)
                    : parseFloat(confirmationOrder.order.order?.amount || 0),     // Executing bid: receive order amount (base)
                  3,
                  confirmationOrder.order.type === 'ask' 
                    ? (confirmationOrder.order.contract?.ticker === 'NXS' ? 6 : baseTokenDecimals)
                    : (confirmationOrder.order.order?.ticker === 'NXS' ? 6 : baseTokenDecimals)
                )} {confirmationOrder.order.type === 'ask' ? confirmationOrder.order.contract?.ticker : confirmationOrder.order.order?.ticker}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Payment Account:</strong> {confirmationOrder.fromAccount.slice(0, 8)}...{confirmationOrder.fromAccount.slice(-8)}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Receiving Account:</strong> {confirmationOrder.toAccount.slice(0, 8)}...{confirmationOrder.toAccount.slice(-8)}
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
              <Button onClick={handleConfirmExecution}>
                Confirm & Execute
              </Button>
              <Button onClick={() => setConfirmationOrder(null)}>
                Cancel
              </Button>
            </div>
          </FieldSet>
          </div>
        </div>
      )}
    </div>
  );
}