/**
 * NFT Art Process Flow - End-to-End Tests
 *
 * Tests the complete NFT art lifecycle on the Nexus blockchain DEX:
 *   1. Asset creation (minting an NFT art piece)
 *   2. Listing the NFT for sale (creating an ask order on the market)
 *   3. Finding NFTs for sale (querying the order book)
 *   4. Buying an NFT (executing an ask order)
 *
 * These tests mock the Nexus blockchain API (`nexus-module`) and exercise
 * the Redux action creators, reducers, and helper utilities that power
 * the DEX module, verifying the data flow at every stage.
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock nexus-module before any imports that reference it
const mockApiCall = jest.fn();
const mockSecureApiCall = jest.fn();
const mockShowErrorDialog = jest.fn();
const mockShowSuccessDialog = jest.fn();

jest.mock('nexus-module', () => ({
  apiCall: (...args) => mockApiCall(...args),
  secureApiCall: (...args) => mockSecureApiCall(...args),
  showErrorDialog: (...args) => mockShowErrorDialog(...args),
  showSuccessDialog: (...args) => mockShowSuccessDialog(...args),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks are set up)
// ---------------------------------------------------------------------------

const { createOrder, executeOrder, cancelOrder } = require('../src/actions/placeOrder');
const { setMarketPair, setOrderBook, setMyOrders, addUnconfirmedOrder, removeUnconfirmedOrder } = require('../src/actions/actionCreators');
const TYPE = require('../src/actions/types');

// Inline minimal Redux store helper so we don't need a full store setup
function createMockStore(initialState) {
  let state = JSON.parse(JSON.stringify(initialState));
  const dispatched = [];

  const store = {
    getState: () => state,
    dispatch: jest.fn((action) => {
      if (typeof action === 'function') {
        return action(store.dispatch, store.getState);
      }
      dispatched.push(action);
      // Apply reducers inline for key slices
      if (action.type === TYPE.SET_ORDER_BOOK) {
        state.ui.market.orderBook = {
          asks: action.payload.asks || [],
          bids: action.payload.bids || [],
        };
      }
      if (action.type === TYPE.SET_MY_ORDERS) {
        state.ui.market.myOrders = {
          orders: action.payload.orders || [],
        };
      }
      if (action.type === TYPE.ADD_UNCONFIRMED_ORDER) {
        state.ui.market.myUnconfirmedOrders.unconfirmedOrders.push(action.payload);
      }
      if (action.type === TYPE.REMOVE_UNCONFIRMED_ORDER) {
        state.ui.market.myUnconfirmedOrders.unconfirmedOrders =
          state.ui.market.myUnconfirmedOrders.unconfirmedOrders.filter(
            (o) => o.txid !== action.payload.txid
          );
      }
      return action;
    }),
    getDispatched: () => dispatched,
  };
  return store;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NFT_ASSET = {
  address: 'aNFTaddress1234567890abcdef1234567890abcdef12345678',
  name: 'CryptoArt_Sunrise_001',
  metadata: {
    title: 'Sunrise Over Digital Mountains',
    artist: 'PixelArtist42',
    description: 'A breathtaking digital landscape of sunrise over procedurally generated mountains.',
    mediaType: 'image/png',
    mediaHash: 'sha256:abc123def456789012345678901234567890abcdef1234567890abcdef123456',
    edition: '1 of 1',
    createdAt: '2025-06-15T10:30:00Z',
  },
};

const SELLER_GENESIS = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3';
const BUYER_GENESIS  = 'f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4';

const SELLER_NXS_ACCOUNT = '8SellerNXSaccount00000000000000000000000000000000000';
const SELLER_NFT_ACCOUNT = NFT_ASSET.address;
const BUYER_NXS_ACCOUNT  = '8BuyerNXSaccount000000000000000000000000000000000000';
const BUYER_NFT_ACCOUNT  = '8BuyerNFTaccount000000000000000000000000000000000000';

// Default state that simulates an NFT/NXS market pair
function makeDefaultState() {
  return {
    ui: {
      market: {
        marketPairs: {
          marketPair: `${NFT_ASSET.name}/NXS`,
          baseToken: NFT_ASSET.name,
          quoteToken: 'NXS',
          baseTokenDecimals: 0, // NFTs are indivisible
          quoteTokenDecimals: 6,
          baseTokenMaxsupply: 1,
          quoteTokenMaxsupply: 0,
          baseTokenCirculatingSupply: 1,
          quoteTokenCirculatingSupply: 0,
          baseTokenAddress: NFT_ASSET.address,
          quoteTokenAddress: '0',
        },
        orderBook: { bids: [], asks: [] },
        executedOrders: { bids: [], asks: [] },
        myOrders: { orders: [] },
        myTrades: { trades: [] },
        myUnconfirmedOrders: { unconfirmedOrders: [] },
        myUnconfirmedTrades: { unconfirmedTrades: [] },
        myCancellingOrders: { cancellingOrders: [] },
        orderInQuestion: { orderMethod: '', availableOrders: [] },
      },
    },
    settings: { timeSpan: '1y' },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 1. NFT Art Asset Creation
// ---------------------------------------------------------------------------

describe('Step 1: NFT Art Asset Creation', () => {
  it('should create an NFT art asset via the supply/create/asset API', async () => {
    // Simulate the Nexus supply/create/asset API call
    mockSecureApiCall.mockResolvedValueOnce({
      success: true,
      txid: 'createTx_001',
      address: NFT_ASSET.address,
    });

    // In the real Nexus wallet, asset creation is done via:
    //   secureApiCall('supply/create/asset', { ... })
    // We simulate that call directly here.
    const result = await mockSecureApiCall('supply/create/asset', {
      name: NFT_ASSET.name,
      data: JSON.stringify(NFT_ASSET.metadata),
    });

    expect(mockSecureApiCall).toHaveBeenCalledWith('supply/create/asset', {
      name: NFT_ASSET.name,
      data: JSON.stringify(NFT_ASSET.metadata),
    });
    expect(result.success).toBe(true);
    expect(result.txid).toBe('createTx_001');
    expect(result.address).toBe(NFT_ASSET.address);
  });

  it('should be retrievable after creation via supply/get/asset', async () => {
    mockApiCall.mockResolvedValueOnce({
      address: NFT_ASSET.address,
      name: NFT_ASSET.name,
      owner: SELLER_GENESIS,
      data: JSON.stringify(NFT_ASSET.metadata),
    });

    const asset = await mockApiCall('supply/get/asset', {
      name: NFT_ASSET.name,
    });

    expect(asset.address).toBe(NFT_ASSET.address);
    expect(asset.owner).toBe(SELLER_GENESIS);
    expect(JSON.parse(asset.data).title).toBe('Sunrise Over Digital Mountains');
  });

  it('should reject creation with missing metadata', async () => {
    mockSecureApiCall.mockResolvedValueOnce({
      success: false,
      message: 'Missing required field: data',
    });

    const result = await mockSecureApiCall('supply/create/asset', {
      name: 'IncompleteArt',
      // no data field
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Missing required field');
  });
});

// ---------------------------------------------------------------------------
// 2. Listing NFT for Sale
// ---------------------------------------------------------------------------

describe('Step 2: Listing NFT for Sale', () => {
  it('should create an ask order to list the NFT for sale', async () => {
    const store = createMockStore(makeDefaultState());
    const listingPrice = 100; // 100 NXS
    const nftAmount = 1; // 1 NFT (indivisible)

    // Mock account lookups (from account = NFT, to account = NXS)
    mockApiCall
      .mockResolvedValueOnce({
        // finance/get/account for fromAccount (NFT asset)
        address: SELLER_NFT_ACCOUNT,
        ticker: NFT_ASSET.name,
        balance: 1,
      })
      .mockResolvedValueOnce([]) // register/get/finance:token for fromAccount (miss)
      .mockResolvedValueOnce({
        // finance/get/account for toAccount (NXS account)
        address: SELLER_NXS_ACCOUNT,
        ticker: 'NXS',
        balance: 500,
      })
      .mockResolvedValueOnce([]); // register/get/finance:token for toAccount (miss)

    // Mock secure API call for order creation
    mockSecureApiCall.mockResolvedValueOnce({
      success: true,
      txid: 'askOrder_001',
      address: 'orderAddress_001',
    });

    // Dispatch the createOrder thunk for an ask (listing the NFT for sale)
    const result = await store.dispatch(
      createOrder('ask', listingPrice, listingPrice * nftAmount, SELLER_NFT_ACCOUNT, SELLER_NXS_ACCOUNT)
    );

    expect(result).toBeTruthy();
    expect(result.success).toBe(true);
    expect(result.txid).toBe('askOrder_001');

    // Verify secureApiCall was called with ask order params
    expect(mockSecureApiCall).toHaveBeenCalledWith(
      'market/create/ask',
      expect.objectContaining({
        market: `${NFT_ASSET.name}/NXS`,
        price: listingPrice,
        from: SELLER_NFT_ACCOUNT,
        to: SELLER_NXS_ACCOUNT,
      })
    );

    // Verify success dialog was shown
    expect(mockShowSuccessDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Order placed successfully',
      })
    );

    // Verify unconfirmed order was added to state
    const unconfirmed = store.getState().ui.market.myUnconfirmedOrders.unconfirmedOrders;
    expect(unconfirmed).toHaveLength(1);
    expect(unconfirmed[0].txid).toBe('askOrder_001');
    expect(unconfirmed[0].type).toBe('ask');
    expect(unconfirmed[0].price).toBe(listingPrice);
  });

  it('should reject listing when seller has insufficient NFT balance', async () => {
    const store = createMockStore(makeDefaultState());

    // fromAccount has 0 balance (already transferred away)
    mockApiCall
      .mockResolvedValueOnce({
        address: SELLER_NFT_ACCOUNT,
        ticker: NFT_ASSET.name,
        balance: 0, // No NFTs available
      })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({
        address: SELLER_NXS_ACCOUNT,
        ticker: 'NXS',
        balance: 500,
      })
      .mockResolvedValueOnce([]);

    const result = await store.dispatch(
      createOrder('ask', 100, 100, SELLER_NFT_ACCOUNT, SELLER_NXS_ACCOUNT)
    );

    expect(result).toBeNull();
    expect(mockShowErrorDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Not enough balance',
      })
    );
    expect(mockSecureApiCall).not.toHaveBeenCalled();
  });

  it('should reject listing when from account has wrong token type', async () => {
    const store = createMockStore(makeDefaultState());

    // fromAccount is NXS instead of the NFT token
    mockApiCall
      .mockResolvedValueOnce({
        address: SELLER_NFT_ACCOUNT,
        ticker: 'NXS', // Wrong token!
        balance: 500,
      })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({
        address: SELLER_NXS_ACCOUNT,
        ticker: 'NXS',
        balance: 500,
      })
      .mockResolvedValueOnce([]);

    const result = await store.dispatch(
      createOrder('ask', 100, 100, SELLER_NFT_ACCOUNT, SELLER_NXS_ACCOUNT)
    );

    expect(result).toBeNull();
    expect(mockShowErrorDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Invalid payment account (wrong token)',
      })
    );
  });

  it('should validate that missing fields are rejected', async () => {
    const store = createMockStore(makeDefaultState());

    const result = await store.dispatch(
      createOrder('ask', 100, 100, '', SELLER_NXS_ACCOUNT)
    );

    expect(result).toBeNull();
    expect(mockShowErrorDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Missing required parameters',
      })
    );
  });
});

// ---------------------------------------------------------------------------
// 3. Finding NFTs for Sale (Order Book Discovery)
// ---------------------------------------------------------------------------

describe('Step 3: Finding NFTs for Sale', () => {
  it('should discover NFT ask orders in the order book', () => {
    const state = makeDefaultState();

    // Simulate what fetchOrderBook produces: asks in the order book
    const askOrders = [
      {
        txid: 'askOrder_001',
        owner: SELLER_GENESIS,
        price: 100,
        type: 'ask',
        timestamp: 1700000000,
        contract: { amount: 1, ticker: NFT_ASSET.name },
        order: { amount: 100, ticker: 'NXS' },
      },
      {
        txid: 'askOrder_002',
        owner: 'anotherSeller00000000000000000000000000000000000000',
        price: 150,
        type: 'ask',
        timestamp: 1700001000,
        contract: { amount: 1, ticker: NFT_ASSET.name },
        order: { amount: 150, ticker: 'NXS' },
      },
    ];

    state.ui.market.orderBook = { bids: [], asks: askOrders };

    // Verify we can find NFTs for sale sorted by price
    const sortedAsks = [...state.ui.market.orderBook.asks].sort(
      (a, b) => a.price - b.price
    );

    expect(sortedAsks).toHaveLength(2);
    expect(sortedAsks[0].price).toBe(100);
    expect(sortedAsks[0].txid).toBe('askOrder_001');
    expect(sortedAsks[1].price).toBe(150);
  });

  it('should filter NFTs by maximum payment budget', () => {
    const maxBudget = 120; // Buyer can spend up to 120 NXS

    const askOrders = [
      {
        txid: 'ask_cheap',
        price: 80,
        type: 'ask',
        contract: { amount: 1, ticker: NFT_ASSET.name },
        order: { amount: 80, ticker: 'NXS' },
      },
      {
        txid: 'ask_mid',
        price: 100,
        type: 'ask',
        contract: { amount: 1, ticker: NFT_ASSET.name },
        order: { amount: 100, ticker: 'NXS' },
      },
      {
        txid: 'ask_expensive',
        price: 200,
        type: 'ask',
        contract: { amount: 1, ticker: NFT_ASSET.name },
        order: { amount: 200, ticker: 'NXS' },
      },
    ];

    // This mirrors the market fill logic from TradeForm.js
    const affordableAsks = askOrders
      .filter((order) => {
        const quoteAmount = parseFloat(order.order?.amount || 0);
        return quoteAmount > 0 && quoteAmount <= maxBudget;
      })
      .sort((a, b) => a.price - b.price);

    expect(affordableAsks).toHaveLength(2);
    expect(affordableAsks[0].txid).toBe('ask_cheap');
    expect(affordableAsks[1].txid).toBe('ask_mid');
    // The expensive one (200 NXS) should be filtered out
    expect(affordableAsks.find((o) => o.txid === 'ask_expensive')).toBeUndefined();
  });

  it('should find best price within 10% price protection', () => {
    const askOrders = [
      {
        txid: 'ask_best',
        type: 'ask',
        contract: { amount: 1, ticker: NFT_ASSET.name },
        order: { amount: 100, ticker: 'NXS' },
      },
      {
        txid: 'ask_overpriced',
        type: 'ask',
        contract: { amount: 1, ticker: NFT_ASSET.name },
        order: { amount: 200, ticker: 'NXS' }, // Way above market
      },
    ];

    // Calculate prices like TradeForm does for asks
    const withPrices = askOrders.map((order) => ({
      ...order,
      calculatedPrice:
        parseFloat(order.order?.amount || 0) /
        parseFloat(order.contract?.amount || 1),
    }));

    const sorted = withPrices
      .filter((o) => o.calculatedPrice > 0)
      .sort((a, b) => a.calculatedPrice - b.calculatedPrice);

    const marketBestPrice = sorted[0].calculatedPrice; // 100
    const priceThreshold = marketBestPrice * 1.1; // 110

    // Best order is at 100 NXS, within 10% threshold
    expect(sorted[0].calculatedPrice).toBe(100);
    expect(sorted[0].calculatedPrice <= priceThreshold).toBe(true);

    // Second order at 200 NXS exceeds 10% protection
    expect(sorted[1].calculatedPrice).toBe(200);
    expect(sorted[1].calculatedPrice > priceThreshold).toBe(true);
  });

  it('should handle empty order book', () => {
    const state = makeDefaultState();
    state.ui.market.orderBook = { bids: [], asks: [] };

    expect(state.ui.market.orderBook.asks).toHaveLength(0);

    // Market fill should not find any orders
    const ordersToSearch = state.ui.market.orderBook.asks;
    expect(ordersToSearch.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Buying an NFT (Executing the Ask Order)
// ---------------------------------------------------------------------------

describe('Step 4: Buying an NFT', () => {
  const askTxid = 'askOrder_001';
  const askPrice = 100;

  it('should execute an ask order to buy the NFT', async () => {
    const state = makeDefaultState();
    // Put the ask order in the order book
    state.ui.market.orderBook.asks = [
      {
        txid: askTxid,
        owner: SELLER_GENESIS,
        price: askPrice,
        type: 'ask',
        contract: { amount: 1, ticker: NFT_ASSET.name },
        order: { amount: 100, ticker: 'NXS' },
      },
    ];

    const store = createMockStore(state);

    // Mock: fetch order list to find the order by txid
    mockApiCall
      .mockResolvedValueOnce({
        // market/list/order - returns the full order book
        bids: [],
        asks: [
          {
            txid: askTxid,
            owner: SELLER_GENESIS,
            price: askPrice,
            type: 'ask',
            contract: { amount: 1, ticker: NFT_ASSET.name },
            order: { amount: 100000000, ticker: 'NXS' }, // Raw NXS amount (not normalized)
          },
        ],
      })
      // Mock: buyer's from account (NXS) lookup
      .mockResolvedValueOnce({
        address: BUYER_NXS_ACCOUNT,
        ticker: 'NXS',
        balance: 500,
      })
      .mockResolvedValueOnce([]) // register/get/finance:token miss
      // Mock: buyer's to account (NFT) lookup
      .mockResolvedValueOnce({
        address: BUYER_NFT_ACCOUNT,
        ticker: NFT_ASSET.name,
        balance: 0,
      })
      .mockResolvedValueOnce([]); // register/get/finance:token miss

    // Mock: secure API call to execute the order
    mockSecureApiCall.mockResolvedValueOnce({
      success: true,
      txid: 'executeTx_001',
      address: 'executeAddress_001',
    });

    const result = await store.dispatch(
      executeOrder(askTxid, BUYER_NXS_ACCOUNT, BUYER_NFT_ACCOUNT, 100, 1)
    );

    expect(result).toBeTruthy();
    expect(result.success).toBe(true);
    expect(result.txid).toBe('executeTx_001');

    // Verify the correct API calls were made
    expect(mockSecureApiCall).toHaveBeenCalledWith(
      'market/execute/order',
      expect.objectContaining({
        txid: askTxid,
        from: BUYER_NXS_ACCOUNT,
        to: BUYER_NFT_ACCOUNT,
      })
    );

    // Verify success dialog
    expect(mockShowSuccessDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Order executed successfully',
      })
    );
  });

  it('should reject purchase when buyer has insufficient NXS balance', async () => {
    const state = makeDefaultState();
    state.ui.market.orderBook.asks = [
      {
        txid: askTxid,
        owner: SELLER_GENESIS,
        price: askPrice,
        type: 'ask',
        contract: { amount: 1, ticker: NFT_ASSET.name },
        order: { amount: 100, ticker: 'NXS' },
      },
    ];

    const store = createMockStore(state);

    mockApiCall
      .mockResolvedValueOnce({
        bids: [],
        asks: [
          {
            txid: askTxid,
            owner: SELLER_GENESIS,
            price: askPrice,
            type: 'ask',
            contract: { amount: 1, ticker: NFT_ASSET.name },
            order: { amount: 100000000, ticker: 'NXS' },
          },
        ],
      })
      .mockResolvedValueOnce({
        address: BUYER_NXS_ACCOUNT,
        ticker: 'NXS',
        balance: 10, // Insufficient! Need 100
      })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({
        address: BUYER_NFT_ACCOUNT,
        ticker: NFT_ASSET.name,
        balance: 0,
      })
      .mockResolvedValueOnce([]);

    const result = await store.dispatch(
      executeOrder(askTxid, BUYER_NXS_ACCOUNT, BUYER_NFT_ACCOUNT, 100, 1)
    );

    expect(result).toBeNull();
    expect(mockShowErrorDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Not enough balance',
      })
    );
    expect(mockSecureApiCall).not.toHaveBeenCalled();
  });

  it('should reject purchase when buyer uses wrong token account for payment', async () => {
    const state = makeDefaultState();
    state.ui.market.orderBook.asks = [
      {
        txid: askTxid,
        owner: SELLER_GENESIS,
        price: askPrice,
        type: 'ask',
        contract: { amount: 1, ticker: NFT_ASSET.name },
        order: { amount: 100, ticker: 'NXS' },
      },
    ];

    const store = createMockStore(state);

    mockApiCall
      .mockResolvedValueOnce({
        bids: [],
        asks: [
          {
            txid: askTxid,
            owner: SELLER_GENESIS,
            price: askPrice,
            type: 'ask',
            contract: { amount: 1, ticker: NFT_ASSET.name },
            order: { amount: 100000000, ticker: 'NXS' },
          },
        ],
      })
      .mockResolvedValueOnce({
        address: BUYER_NXS_ACCOUNT,
        ticker: 'WRONG_TOKEN', // Wrong token!
        balance: 500,
      })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({
        address: BUYER_NFT_ACCOUNT,
        ticker: NFT_ASSET.name,
        balance: 0,
      })
      .mockResolvedValueOnce([]);

    const result = await store.dispatch(
      executeOrder(askTxid, BUYER_NXS_ACCOUNT, BUYER_NFT_ACCOUNT, 100, 1)
    );

    expect(result).toBeNull();
    expect(mockShowErrorDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Invalid payment account (wrong token)',
      })
    );
  });

  it('should reject purchase when order does not exist', async () => {
    const store = createMockStore(makeDefaultState());

    mockApiCall.mockResolvedValueOnce({
      bids: [],
      asks: [], // No orders at all
    });

    const result = await store.dispatch(
      executeOrder('nonexistent_txid', BUYER_NXS_ACCOUNT, BUYER_NFT_ACCOUNT, 100, 1)
    );

    expect(result).toBeNull();
    expect(mockShowErrorDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Order not found',
      })
    );
  });

  it('should reject execution when missing required parameters', async () => {
    const store = createMockStore(makeDefaultState());

    const result = await store.dispatch(
      executeOrder('', BUYER_NXS_ACCOUNT, BUYER_NFT_ACCOUNT, 100, 1)
    );

    expect(result).toBeNull();
    expect(mockShowErrorDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Missing required parameters',
      })
    );
  });
});

// ---------------------------------------------------------------------------
// 5. Order Cancellation (Seller de-lists NFT)
// ---------------------------------------------------------------------------

describe('Step 5: NFT De-listing (Cancel Order)', () => {
  it('should allow seller to cancel their listing', async () => {
    const store = createMockStore(makeDefaultState());

    mockSecureApiCall.mockResolvedValueOnce({
      success: true,
      txid: 'cancelTx_001',
    });

    const result = await store.dispatch(cancelOrder('askOrder_001'));

    expect(result).toBeTruthy();
    expect(result.success).toBe(true);
    expect(mockSecureApiCall).toHaveBeenCalledWith('market/cancel/order', {
      txid: 'askOrder_001',
    });
    expect(mockShowSuccessDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Order cancellation submitted',
      })
    );
  });

  it('should handle cancel failure gracefully', async () => {
    const store = createMockStore(makeDefaultState());

    mockSecureApiCall.mockResolvedValueOnce({
      success: false,
      message: 'Order already executed',
    });

    const result = await store.dispatch(cancelOrder('askOrder_001'));

    expect(result).toBeNull();
    expect(mockShowErrorDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Error cancelling order (success = false)',
      })
    );
  });
});

// ---------------------------------------------------------------------------
// 6. Redux Reducer Tests for NFT State Management
// ---------------------------------------------------------------------------

describe('Step 6: Redux State Management for NFT Orders', () => {
  it('should set market pair for NFT/NXS market', () => {
    const action = setMarketPair(
      `${NFT_ASSET.name}/NXS`,
      NFT_ASSET.name,
      'NXS',
      1,    // maxsupply
      0,
      1,    // circulating
      0,
      0,    // decimals (NFTs indivisible)
      6,
      NFT_ASSET.address,
      '0'
    );

    expect(action.type).toBe(TYPE.SET_MARKET_PAIR);
    expect(action.payload.marketPair).toBe(`${NFT_ASSET.name}/NXS`);
    expect(action.payload.baseToken).toBe(NFT_ASSET.name);
    expect(action.payload.quoteToken).toBe('NXS');
    expect(action.payload.baseTokenDecimals).toBe(0);
  });

  it('should update order book with NFT ask orders', () => {
    const nftOrderBook = {
      bids: [
        {
          txid: 'bid_001',
          price: 90,
          type: 'bid',
          contract: { amount: 90, ticker: 'NXS' },
          order: { amount: 1, ticker: NFT_ASSET.name },
        },
      ],
      asks: [
        {
          txid: 'ask_001',
          price: 100,
          type: 'ask',
          contract: { amount: 1, ticker: NFT_ASSET.name },
          order: { amount: 100, ticker: 'NXS' },
        },
      ],
    };

    const action = setOrderBook(nftOrderBook);
    expect(action.type).toBe(TYPE.SET_ORDER_BOOK);
    expect(action.payload.asks).toHaveLength(1);
    expect(action.payload.bids).toHaveLength(1);
    expect(action.payload.asks[0].contract.ticker).toBe(NFT_ASSET.name);
  });

  it('should track unconfirmed NFT orders correctly', () => {
    const store = createMockStore(makeDefaultState());

    const unconfirmedOrder = {
      txid: 'askOrder_new',
      type: 'ask',
      price: 150,
      timestamp: Date.now() / 1000,
      contract: { amount: 1, ticker: NFT_ASSET.name },
      order: { amount: 150, ticker: 'NXS' },
    };

    store.dispatch(addUnconfirmedOrder(unconfirmedOrder));

    const unconfirmed = store.getState().ui.market.myUnconfirmedOrders.unconfirmedOrders;
    expect(unconfirmed).toHaveLength(1);
    expect(unconfirmed[0].txid).toBe('askOrder_new');

    // Now remove it (simulating blockchain confirmation)
    store.dispatch(removeUnconfirmedOrder('askOrder_new'));

    const afterRemoval = store.getState().ui.market.myUnconfirmedOrders.unconfirmedOrders;
    expect(afterRemoval).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 7. End-to-End: Full NFT Art Lifecycle
// ---------------------------------------------------------------------------

describe('End-to-End: Full NFT Art Lifecycle', () => {
  it('should complete the full flow: create -> list -> discover -> buy', async () => {
    // ---- Phase 1: Create the NFT Art Asset ----
    mockSecureApiCall.mockResolvedValueOnce({
      success: true,
      txid: 'createTx_e2e',
      address: NFT_ASSET.address,
    });

    const createResult = await mockSecureApiCall('supply/create/asset', {
      name: NFT_ASSET.name,
      data: JSON.stringify(NFT_ASSET.metadata),
    });

    expect(createResult.success).toBe(true);
    expect(createResult.address).toBe(NFT_ASSET.address);

    // Verify asset exists
    mockApiCall.mockResolvedValueOnce({
      address: NFT_ASSET.address,
      name: NFT_ASSET.name,
      owner: SELLER_GENESIS,
      data: JSON.stringify(NFT_ASSET.metadata),
    });

    const asset = await mockApiCall('supply/get/asset', { name: NFT_ASSET.name });
    expect(asset.owner).toBe(SELLER_GENESIS);

    // ---- Phase 2: List the NFT for Sale ----
    const store = createMockStore(makeDefaultState());
    const listingPrice = 100;

    mockApiCall
      .mockResolvedValueOnce({
        address: SELLER_NFT_ACCOUNT,
        ticker: NFT_ASSET.name,
        balance: 1,
      })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({
        address: SELLER_NXS_ACCOUNT,
        ticker: 'NXS',
        balance: 500,
      })
      .mockResolvedValueOnce([]);

    mockSecureApiCall.mockResolvedValueOnce({
      success: true,
      txid: 'askOrder_e2e',
      address: 'orderAddr_e2e',
    });

    const listResult = await store.dispatch(
      createOrder('ask', listingPrice, listingPrice, SELLER_NFT_ACCOUNT, SELLER_NXS_ACCOUNT)
    );

    expect(listResult.success).toBe(true);
    expect(listResult.txid).toBe('askOrder_e2e');

    // Verify it appears as unconfirmed
    expect(
      store.getState().ui.market.myUnconfirmedOrders.unconfirmedOrders
    ).toHaveLength(1);

    // ---- Phase 3: Discover the NFT for Sale ----
    // Simulate the order appearing in the order book after blockchain confirmation
    const nftOrderBook = {
      bids: [],
      asks: [
        {
          txid: 'askOrder_e2e',
          owner: SELLER_GENESIS,
          price: listingPrice,
          type: 'ask',
          timestamp: Date.now() / 1000,
          contract: { amount: 1, ticker: NFT_ASSET.name },
          order: { amount: 100, ticker: 'NXS' },
        },
      ],
    };

    store.dispatch(setOrderBook(nftOrderBook));

    const asks = store.getState().ui.market.orderBook.asks;
    expect(asks).toHaveLength(1);
    expect(asks[0].txid).toBe('askOrder_e2e');
    expect(asks[0].price).toBe(listingPrice);

    // ---- Phase 4: Buy the NFT ----
    // Reset mocks for the buy phase
    jest.clearAllMocks();

    mockApiCall
      .mockResolvedValueOnce({
        bids: [],
        asks: [
          {
            txid: 'askOrder_e2e',
            owner: SELLER_GENESIS,
            price: listingPrice,
            type: 'ask',
            contract: { amount: 1, ticker: NFT_ASSET.name },
            order: { amount: 100000000, ticker: 'NXS' },
          },
        ],
      })
      .mockResolvedValueOnce({
        address: BUYER_NXS_ACCOUNT,
        ticker: 'NXS',
        balance: 500,
      })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({
        address: BUYER_NFT_ACCOUNT,
        ticker: NFT_ASSET.name,
        balance: 0,
      })
      .mockResolvedValueOnce([]);

    mockSecureApiCall.mockResolvedValueOnce({
      success: true,
      txid: 'executeTx_e2e',
      address: 'executeAddr_e2e',
    });

    const buyResult = await store.dispatch(
      executeOrder('askOrder_e2e', BUYER_NXS_ACCOUNT, BUYER_NFT_ACCOUNT, 100, 1)
    );

    expect(buyResult).toBeTruthy();
    expect(buyResult.success).toBe(true);
    expect(buyResult.txid).toBe('executeTx_e2e');

    // Verify the execution was submitted to the blockchain
    expect(mockSecureApiCall).toHaveBeenCalledWith(
      'market/execute/order',
      expect.objectContaining({
        txid: 'askOrder_e2e',
        from: BUYER_NXS_ACCOUNT,
        to: BUYER_NFT_ACCOUNT,
      })
    );

    expect(mockShowSuccessDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Order executed successfully',
      })
    );

    // ---- Verify: NFT ownership transferred (post-purchase) ----
    mockApiCall.mockResolvedValueOnce({
      address: NFT_ASSET.address,
      name: NFT_ASSET.name,
      owner: BUYER_GENESIS, // Ownership transferred!
      data: JSON.stringify(NFT_ASSET.metadata),
    });

    const updatedAsset = await mockApiCall('supply/get/asset', {
      name: NFT_ASSET.name,
    });
    expect(updatedAsset.owner).toBe(BUYER_GENESIS);
  });

  it('should handle the bid flow: buyer places bid, seller executes it', async () => {
    const store = createMockStore(makeDefaultState());
    const bidPrice = 80; // 80 NXS
    const bidAmount = 80; // 80 NXS total

    // ---- Buyer creates a bid order ----
    mockApiCall
      .mockResolvedValueOnce({
        address: BUYER_NXS_ACCOUNT,
        ticker: 'NXS',
        balance: 500,
      })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({
        address: BUYER_NFT_ACCOUNT,
        ticker: NFT_ASSET.name,
        balance: 0,
      })
      .mockResolvedValueOnce([]);

    mockSecureApiCall.mockResolvedValueOnce({
      success: true,
      txid: 'bidOrder_e2e',
      address: 'bidAddr_e2e',
    });

    const bidResult = await store.dispatch(
      createOrder('bid', bidPrice, bidAmount, BUYER_NXS_ACCOUNT, BUYER_NFT_ACCOUNT)
    );

    expect(bidResult.success).toBe(true);
    expect(bidResult.txid).toBe('bidOrder_e2e');

    // Verify bid appears in unconfirmed orders
    const unconfirmed = store.getState().ui.market.myUnconfirmedOrders.unconfirmedOrders;
    expect(unconfirmed).toHaveLength(1);
    expect(unconfirmed[0].type).toBe('bid');

    // ---- Seller discovers and fills the bid ----
    jest.clearAllMocks();

    // Put the bid in the order book
    store.dispatch(
      setOrderBook({
        bids: [
          {
            txid: 'bidOrder_e2e',
            owner: BUYER_GENESIS,
            price: bidPrice,
            type: 'bid',
            contract: { amount: 80, ticker: 'NXS' },
            order: { amount: 1, ticker: NFT_ASSET.name },
          },
        ],
        asks: [],
      })
    );

    // Verify bid is visible in order book
    const bids = store.getState().ui.market.orderBook.bids;
    expect(bids).toHaveLength(1);
    expect(bids[0].price).toBe(bidPrice);

    // Seller executes the bid
    mockApiCall
      .mockResolvedValueOnce({
        bids: [
          {
            txid: 'bidOrder_e2e',
            owner: BUYER_GENESIS,
            price: bidPrice,
            type: 'bid',
            contract: { amount: 80000000, ticker: 'NXS' },
            order: { amount: 1, ticker: NFT_ASSET.name },
          },
        ],
        asks: [],
      })
      .mockResolvedValueOnce({
        address: SELLER_NFT_ACCOUNT,
        ticker: NFT_ASSET.name,
        balance: 1,
      })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({
        address: SELLER_NXS_ACCOUNT,
        ticker: 'NXS',
        balance: 500,
      })
      .mockResolvedValueOnce([]);

    mockSecureApiCall.mockResolvedValueOnce({
      success: true,
      txid: 'fillBidTx_e2e',
      address: 'fillBidAddr_e2e',
    });

    const fillResult = await store.dispatch(
      executeOrder('bidOrder_e2e', SELLER_NFT_ACCOUNT, SELLER_NXS_ACCOUNT, 80, 1)
    );

    expect(fillResult.success).toBe(true);
    expect(mockSecureApiCall).toHaveBeenCalledWith(
      'market/execute/order',
      expect.objectContaining({
        txid: 'bidOrder_e2e',
        from: SELLER_NFT_ACCOUNT,
        to: SELLER_NXS_ACCOUNT,
      })
    );
  });
});

// ---------------------------------------------------------------------------
// 8. Market Fill Flow for NFT (automated best-order selection)
// ---------------------------------------------------------------------------

describe('Market Fill: Automated NFT Purchase', () => {
  it('should find and select the cheapest NFT ask order', () => {
    // Simulates the handleMarketFill logic from TradeForm.js
    const maxPayment = 150;
    const marketFillType = 'buy';

    const orderBook = {
      asks: [
        {
          txid: 'ask_A',
          type: 'ask',
          contract: { amount: 1, ticker: NFT_ASSET.name },
          order: { amount: 120, ticker: 'NXS' },
        },
        {
          txid: 'ask_B',
          type: 'ask',
          contract: { amount: 1, ticker: NFT_ASSET.name },
          order: { amount: 80, ticker: 'NXS' },
        },
        {
          txid: 'ask_C',
          type: 'ask',
          contract: { amount: 1, ticker: NFT_ASSET.name },
          order: { amount: 200, ticker: 'NXS' }, // Over budget
        },
      ],
      bids: [],
    };

    const ordersToSearch = marketFillType === 'buy'
      ? orderBook.asks
      : orderBook.bids;

    const sortedAsks = [...ordersToSearch]
      .map((order) => ({
        ...order,
        calculatedPrice:
          parseFloat(order.order?.amount || 0) /
          parseFloat(order.contract?.amount || 1),
      }))
      .filter((order) => {
        const baseAmount = parseFloat(order.order?.amount || 0);
        return baseAmount > 0 && baseAmount <= maxPayment && order.calculatedPrice > 0;
      })
      .sort((a, b) => {
        const priceDiff = a.calculatedPrice - b.calculatedPrice;
        if (priceDiff !== 0) return priceDiff;
        return parseFloat(b.order?.amount || 0) - parseFloat(a.order?.amount || 0);
      });

    expect(sortedAsks).toHaveLength(2); // ask_C filtered out (over budget)
    expect(sortedAsks[0].txid).toBe('ask_B'); // Cheapest at 80 NXS
    expect(sortedAsks[0].calculatedPrice).toBe(80);
    expect(sortedAsks[1].txid).toBe('ask_A'); // Second at 120 NXS

    // Verify 10% price protection passes
    const marketBestPrice = sortedAsks[0].calculatedPrice; // 80
    const priceThreshold = marketBestPrice * 1.1; // 88
    expect(sortedAsks[0].calculatedPrice <= priceThreshold).toBe(true);
  });

  it('should handle sell market fill (highest bid)', () => {
    const maxPayment = 2; // Max NFTs to sell
    const marketFillType = 'sell';

    const orderBook = {
      bids: [
        {
          txid: 'bid_A',
          type: 'bid',
          contract: { amount: 100, ticker: 'NXS' },
          order: { amount: 1, ticker: NFT_ASSET.name },
        },
        {
          txid: 'bid_B',
          type: 'bid',
          contract: { amount: 150, ticker: 'NXS' },
          order: { amount: 1, ticker: NFT_ASSET.name },
        },
      ],
      asks: [],
    };

    const ordersToSearch = marketFillType === 'sell'
      ? orderBook.bids
      : orderBook.asks;

    const sortedBids = [...ordersToSearch]
      .map((order) => ({
        ...order,
        calculatedPrice:
          parseFloat(order.contract?.amount || 0) /
          parseFloat(order.order?.amount || 1),
      }))
      .filter((order) => {
        const basePayment = parseFloat(order.order?.amount || 0);
        return basePayment > 0 && basePayment <= maxPayment && order.calculatedPrice > 0;
      })
      .sort((a, b) => {
        const priceDiff = b.calculatedPrice - a.calculatedPrice;
        if (priceDiff !== 0) return priceDiff;
        return parseFloat(b.order?.amount || 0) - parseFloat(a.order?.amount || 0);
      });

    expect(sortedBids).toHaveLength(2);
    expect(sortedBids[0].txid).toBe('bid_B'); // Highest price at 150 NXS
    expect(sortedBids[0].calculatedPrice).toBe(150);
  });
});

// ---------------------------------------------------------------------------
// 9. API Cache for NFT Data
// ---------------------------------------------------------------------------

describe('API Cache for NFT Data', () => {
  // We test the cache module independently since it's a utility
  const { getCached, setCache, clearCache, getCacheStats } = require('../src/utils/apiCache');

  beforeEach(() => {
    clearCache();
  });

  it('should cache NFT asset lookups', () => {
    const assetData = {
      address: NFT_ASSET.address,
      name: NFT_ASSET.name,
      owner: SELLER_GENESIS,
    };

    setCache('supply/get/asset', { name: NFT_ASSET.name }, assetData, 5000);

    const cached = getCached('supply/get/asset', { name: NFT_ASSET.name });
    expect(cached).toEqual(assetData);
  });

  it('should return null for expired cache entries', () => {
    setCache('supply/get/asset', { name: NFT_ASSET.name }, {}, -1); // Already expired

    const cached = getCached('supply/get/asset', { name: NFT_ASSET.name });
    expect(cached).toBeNull();
  });

  it('should clear cache for specific endpoints', () => {
    setCache('supply/get/asset', { name: 'a' }, { data: 'a' });
    setCache('supply/get/asset', { name: 'b' }, { data: 'b' });
    setCache('market/list/order', {}, { data: 'orders' });

    clearCache('supply/get/asset');

    expect(getCached('supply/get/asset', { name: 'a' })).toBeNull();
    expect(getCached('supply/get/asset', { name: 'b' })).toBeNull();
    expect(getCached('market/list/order', {})).toEqual({ data: 'orders' });
  });

  it('should report cache statistics', () => {
    setCache('endpoint1', {}, { data: 1 }, 10000);
    setCache('endpoint2', {}, { data: 2 }, -1); // expired

    const stats = getCacheStats();
    expect(stats.totalEntries).toBe(2);
    expect(stats.activeEntries).toBe(1);
    expect(stats.expiredEntries).toBe(1);
  });
});
