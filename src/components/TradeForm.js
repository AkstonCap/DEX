import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  FieldSet,
  Button,
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
  formatTokenName,
} from './styles';
import {
  createOrder,
  executeOrder,
} from 'actions/placeOrder';
import { setOrder } from 'actions/actionCreators';
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
  // Raw account/token lists as returned by the API. Balance filtering happens in a
  // memo below so typing an amount never triggers another round of API calls.
  const [ownedAccounts, setOwnedAccounts] = useState({ accounts: [], tokens: [] });
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [marketFillType, setMarketFillType] = useState('buy'); // 'buy' or 'sell'
  const [marketFillMaxAmount, setMarketFillMaxAmount] = useState(0);
  const [confirmationOrder, setConfirmationOrder] = useState(null);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const orderBook = useSelector((state) => state.ui.market.orderBook);
  // Memoize expensive computations
  const formattedQuoteToken = useMemo(() => formatTokenName(quoteToken), [quoteToken]);
  const formattedBaseToken = useMemo(() => formatTokenName(baseToken), [baseToken]);

  // Memoize handler functions to prevent recreation on every render
  const handleQuoteAmountChange = useCallback((e) => {
    setQuoteAmount(parseFloat(e.target.value) || 0);
  }, []);

  const handlePriceChange = useCallback((e) => {
    setPrice(parseFloat(e.target.value) || 0);
  }, []);

  const handleFromAccountChange = useCallback((val) => {
    setFromAccount(val);
  }, []);

  const handleToAccountChange = useCallback((val) => {
    setToAccount(val);
  }, []);

  const handleMarketFillTypeChange = useCallback((type) => {
    setMarketFillType(type);
    setMarketFillMaxAmount(0);
  }, []);

  const handleMarketFillMaxAmountChange = useCallback((e) => {
    setMarketFillMaxAmount(parseFloat(e.target.value) || 0);
  }, []);

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
          note: `No orders found with payment amount <= ${marketFillMaxAmount} ${formattedQuoteToken}. Please increase your max payment amount.`
        });
        return;
      }

      bestOrder = sortedAsks[0];
      
      // Only accept orders within 10% of market best price
      const priceThreshold = marketBestPrice * 1.1; // 10% higher
      
      if (bestOrder.calculatedPrice > priceThreshold) {
        showErrorDialog({
          message: 'Price protection triggered',
          note: `Best available order within your budget is at ${formatNumberWithLeadingZeros(bestOrder.calculatedPrice, 3, quoteTokenDecimals)} ${formattedQuoteToken}, which is more than 10% above the market price of ${formatNumberWithLeadingZeros(marketBestPrice, 3, quoteTokenDecimals)} ${formattedQuoteToken}. Please increase your max payment amount or manually select an order.`
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
          note: `No orders found with payment amount <= ${marketFillMaxAmount} ${formattedBaseToken}. Please increase your max payment amount.`
        });
        return;
      }

      bestOrder = sortedBids[0];
      
      // Only accept orders within 10% of market best price
      const priceThreshold = marketBestPrice * 0.9; // 10% lower
      
      if (bestOrder.calculatedPrice < priceThreshold) {
        showErrorDialog({
          message: 'Price protection triggered',
          note: `Best available order within your budget is at ${formatNumberWithLeadingZeros(bestOrder.calculatedPrice, 3, quoteTokenDecimals)} ${formattedQuoteToken}, which is more than 10% below the market price of ${formatNumberWithLeadingZeros(marketBestPrice, 3, quoteTokenDecimals)} ${formattedQuoteToken}. Please increase your max payment amount or manually select an order.`
        });
        return;
      }
    }

    // Show confirmation dialog with order details
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

  // Mirror the order picked in the order book into the form fields
  useEffect(() => {
    if (orderMethod !== 'execute') return;

    setQuoteAmount(orderInQuestion.amount);
    setPrice(orderInQuestion.price);

    // If there are available orders at this price, auto-select the first one
    if (availableOrders && availableOrders.length > 0 && !orderInQuestion.txid) {
      const firstOrder = availableOrders[0];
      setSelectedOrderId(firstOrder.txid);
      const amount = firstOrder.type === 'ask'
        ? firstOrder.order?.amount
        : firstOrder.contract?.amount;
      dispatch(setOrder(firstOrder.txid, firstOrder.price, amount, firstOrder.type, firstOrder.market, 'execute'));
    }
  }, [
    dispatch,
    orderMethod,
    orderInQuestion.amount,
    orderInQuestion.price,
    orderInQuestion.txid,
    availableOrders,
  ]);

  // Fetch the owned accounts/tokens once per market and order method. Balance
  // filtering is done separately so it does not re-trigger network calls.
  useEffect(() => {
    let cancelled = false;

    async function fetchAccounts() {
      setAccountsLoading(true);
      try {
        const [result, tokens] = await Promise.all([
          apiCall('finance/list/account/balance,ticker,address', {
            sort: 'balance',
            order: 'desc',
          }),
          apiCall('finance/list/token/balance,ticker,address'),
        ]);

        if (cancelled) return;

        setOwnedAccounts({
          accounts: Array.isArray(result) ? result : [],
          tokens: Array.isArray(tokens) ? tokens : [],
        });
      } catch (error) {
        if (cancelled) return;
        setOwnedAccounts({ accounts: [], tokens: [] });
        showErrorDialog({
          message: 'Error fetching account information',
          note: error?.message || 'Unknown error occurred',
        });
      } finally {
        if (!cancelled) setAccountsLoading(false);
      }
    }

    fetchAccounts();

    return () => {
      cancelled = true;
    };
  }, [orderMethod, marketPair]);

  // Select which accounts can pay / receive for the current order method, and
  // hide the ones that do not hold enough balance for the entered amount.
  const accounts = useMemo(() => {
    const { accounts: accountList, tokens: tokenList } = ownedAccounts;
    const isBuySide =
      orderMethod === 'bid' ||
      (orderMethod === 'execute' && orderInQuestion.type === 'ask') ||
      (orderMethod === 'market' && marketFillType === 'buy');
    const isSellSide =
      orderMethod === 'ask' ||
      (orderMethod === 'execute' && orderInQuestion.type === 'bid') ||
      (orderMethod === 'market' && marketFillType === 'sell');

    if (!isBuySide && !isSellSide) {
      return { quoteAccounts: [], baseAccounts: [] };
    }

    const minQuoteBalance = isBuySide
      ? (orderMethod === 'market' ? marketFillMaxAmount : quoteAmount) || 0
      : 0;
    const minBaseBalance = isSellSide
      ? (orderMethod === 'market' ? marketFillMaxAmount : baseAmount) || 0
      : 0;

    const quoteAccounts = [
      ...accountList.filter((acct) => acct.ticker === quoteToken && acct.balance >= minQuoteBalance),
      ...tokenList.filter((token) => token.address === quoteTokenAddress && token.balance >= minQuoteBalance),
    ];
    const baseAccounts = [
      ...accountList.filter((acct) => acct.ticker === baseToken && acct.balance >= minBaseBalance),
      ...tokenList.filter((token) => token.address === baseTokenAddress && token.balance >= minBaseBalance),
    ];

    return { quoteAccounts, baseAccounts };
  }, [
    ownedAccounts,
    orderMethod,
    orderInQuestion.type,
    marketFillType,
    marketFillMaxAmount,
    quoteAmount,
    baseAmount,
    quoteToken,
    quoteTokenAddress,
    baseToken,
    baseTokenAddress,
  ]);

  // Keep the base amount in sync with price * quote amount, without dividing by zero
  useEffect(() => {
    const numericPrice = parseFloat(price);
    const numericQuoteAmount = parseFloat(quoteAmount);
    if (!numericPrice || !Number.isFinite(numericPrice) || !Number.isFinite(numericQuoteAmount)) {
      setBaseAmount(0);
      return;
    }
    setBaseAmount(numericQuoteAmount / numericPrice);
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
    )} ${order.type === 'ask' ? formattedQuoteToken : formattedBaseToken}`
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
    if (orderMethod === 'execute') {
      // Find the full order object from availableOrders to get contract and order amounts
      const fullOrder = availableOrders?.find(order => order.txid === orderInQuestion.txid);
      
      let calculatedQuoteAmount = quoteAmount;
      let calculatedBaseAmount = baseAmount;
      
      if (fullOrder) {
        // Calculate amounts from the full order object
        if (fullOrder.type === 'ask') {
          calculatedQuoteAmount = parseFloat(fullOrder.order?.amount || 0);   // Ask: quote is in order.amount
          calculatedBaseAmount = parseFloat(fullOrder.contract?.amount || 0);  // Ask: base is in contract.amount
        } else if (fullOrder.type === 'bid') {
          calculatedQuoteAmount = parseFloat(fullOrder.contract?.amount || 0); // Bid: quote is in contract.amount
          calculatedBaseAmount = parseFloat(fullOrder.order?.amount || 0);     // Bid: base is in order.amount
        }
      }
      
      await dispatch(
        executeOrder(orderInQuestion.txid, fromAccount, toAccount, calculatedQuoteAmount, calculatedBaseAmount)
      );
      dispatch(setOrder('', 0, 0, '', '', 'execute'));
    } else if (orderMethod === 'market') {
      // Market fill is handled by separate button
      return;
    } else if (orderMethod === 'bid' || orderMethod === 'ask') {
      await dispatch(
        createOrder(orderMethod, price, quoteAmount, fromAccount, toAccount)
      );
      dispatch(setOrder('', 0, 0, orderMethod, '', orderMethod));
      setQuoteAmount(0);
      setBaseAmount(0);
      setPrice(0);
      setFromAccount('');
      setToAccount('');
    }
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
          {formattedQuoteToken}
        </>
        //orderInQuestion.price + ' ' + quoteToken
      );
    } else {
      return (
        <TextField
          type="number"
          step={Math.pow(10, -quoteTokenDecimals).toString()}
          value={quoteAmount}
          onChange={handleQuoteAmountChange}
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
          {formattedQuoteToken}
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
          onChange={handlePriceChange}
        />
      );
    }
  }

  function renderAccountsStatus() {
    if (accountsLoading) {
      return (
        <div className='mt1' style={{ fontSize: '12px', color: '#9ca3af' }}>
          Loading accounts...
        </div>
      );
    }
    if (accounts.quoteAccounts.length === 0 && accounts.baseAccounts.length === 0) {
      return (
        <div className='mt1' style={{ fontSize: '12px', color: '#f59e0b' }}>
          No accounts with sufficient balance for this order.
        </div>
      );
    }
    return null;
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
                    onClick={() => handleMarketFillTypeChange('buy')}
                    style={{ fontSize: '13px', padding: '6px 12px' }}
                  >
                    Buy
                  </BidButton>
                  <AskButton
                    orderMethod={marketFillType === 'sell' ? 'ask' : ''}
                    onClick={() => handleMarketFillTypeChange('sell')}
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
                  onChange={handleMarketFillMaxAmountChange}
                  placeholder="Enter maximum payment amount"
                />
              </FormField>
            </>
          ) : (
            <TradeFormContainer> 
              <FormField
                label={('Price (' + formattedQuoteToken + ' per ' + formattedBaseToken + ')')}>
                {renderPriceField()}
              </FormField>
              <FormField
                orderMethod={orderMethod}
                label={('Amount ' + formattedQuoteToken)}>
                {renderAmountField()}
              </FormField>
            </TradeFormContainer>
          )}
          {orderMethod === 'market' && (
            <>
              <TradeFormContainer>
                <FormField label={('Payment Account ' + formatTokenName(marketFillType === 'buy' ? quoteToken : baseToken))}>
                  <Select
                    value={fromAccount}
                    onChange={handleFromAccountChange}
                    options={marketFillType === 'buy' ? quoteAccountOptions : baseAccountOptions}
                  />
                </FormField>

                <FormField label={('Receiving Account ' + formatTokenName(marketFillType === 'buy' ? baseToken : quoteToken))}>
                  <Select
                    value={toAccount}
                    onChange={handleToAccountChange}
                    options={marketFillType === 'buy' ? baseAccountOptions : quoteAccountOptions}
                  />
                </FormField>
              </TradeFormContainer>
              {renderAccountsStatus()}
            </>
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
            <>
              <TradeFormContainer>
                <FormField label={('Payment Account ' + formatTokenName(payToken))}>
                  <Select
                    value={fromAccount}
                    onChange={handleFromAccountChange}
                    options={paymentOptions}
                  />
                </FormField>

                <FormField label={('Receiving Account ' + formatTokenName(receiveToken))}>
                  <Select
                    value={toAccount}
                    onChange={handleToAccountChange}
                    options={receivingOptions}
                  />
                </FormField>
              </TradeFormContainer>
              {renderAccountsStatus()}
            </>
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
                )} {formattedQuoteToken}
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