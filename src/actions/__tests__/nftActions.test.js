/**
 * Tests for the full NFT art process flow:
 * Asset creation -> Listing for sale -> Finding NFT -> Buying NFT
 */
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';

// Mock nexus-module before importing anything else
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

// Mock fetch for image hashing
const mockFetch = jest.fn();
globalThis.fetch = (...args) => mockFetch(...args);

// Mock Web Crypto API
const mockDigest = jest.fn();
const mockCryptoSubtle = { digest: (...args) => mockDigest(...args) };
Object.defineProperty(globalThis, 'crypto', {
  value: { subtle: mockCryptoSubtle },
  writable: true,
  configurable: true,
});

// Mock TextEncoder
global.TextEncoder = class {
  encode(str) {
    return new Uint8Array(Buffer.from(str, 'utf-8'));
  }
};

// Mock apiCache to bypass caching in tests
import { cachedApiCall as mockCachedApiCall } from 'utils/apiCache';
jest.mock('utils/apiCache', () => ({
  cachedApiCall: jest.fn(async (apiCallFn, endpoint, params) => {
    return apiCallFn(endpoint, params);
  }),
}));

import {
  createNftArt,
  fetchNftListings,
  fetchMyNftAssets,
  listNftForSale,
  buyNft,
  transferNft,
  tokenizeNftAsset,
  createNftSaleToken,
} from '../nftActions';
import * as TYPE from '../types';

// Use a simple thunk middleware since redux-thunk v3 exports differently
const createThunkMiddleware = () => ({ dispatch, getState }) => (next) => (action) => {
  if (typeof action === 'function') {
    return action(dispatch, getState);
  }
  return next(action);
};

const middlewares = [createThunkMiddleware()];
const mockStore = configureMockStore(middlewares);

// Helper to create a fake SHA-256 hash buffer
function createFakeHashBuffer(hexString) {
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hexString.substr(i * 2, 2), 16);
  }
  return bytes.buffer;
}

const FAKE_HASH = 'a'.repeat(64);
const FAKE_HASH_BUFFER = createFakeHashBuffer(FAKE_HASH);

const FAKE_IMAGE_DATA = new ArrayBuffer(100);

describe('NFT Art Process Flow', () => {
  let store;

  beforeEach(() => {
    store = mockStore({
      ui: {
        nft: {
          listings: [],
          myAssets: [],
          selected: null,
          loading: false,
          filter: 'all',
        },
      },
    });

    jest.resetAllMocks();

    // Re-setup cachedApiCall mock after reset
    mockCachedApiCall.mockImplementation(async (apiCallFn, endpoint, params) => {
      return apiCallFn(endpoint, params);
    });

    // Default mock for fetch (image fetching)
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(FAKE_IMAGE_DATA),
      headers: {
        get: () => 'image/png',
      },
    });

    // Default mock for crypto.subtle.digest
    mockDigest.mockResolvedValue(FAKE_HASH_BUFFER);
  });

  // =========================================================================
  // STEP 1: Asset Creation (createNftArt)
  // =========================================================================
  describe('Step 1: Asset Creation (createNftArt)', () => {
    it('should create an NFT art asset with all required fields', async () => {
      // No duplicate found
      mockApiCall.mockResolvedValueOnce([]); // register/list/assets:asset (duplicate check)

      // secureApiCall for assets/create/asset
      mockSecureApiCall.mockResolvedValueOnce({
        success: true,
        txid: 'tx_create_123',
        address: 'asset_addr_abc',
      });

      // After creation, fetchMyNftAssets and fetchNftListings are dispatched
      mockApiCall.mockResolvedValueOnce([]); // assets/list/asset (my assets)
      mockApiCall.mockResolvedValueOnce([]); // register/list/names:global (listings)
      mockApiCall.mockResolvedValueOnce([]); // register/list/assets:asset (listings)

      const result = await store.dispatch(
        createNftArt('My Art', 'A beautiful piece', 'https://example.com/art.png', 'TestArtist', '1/1')
      );

      expect(result).toBeTruthy();
      expect(result.success).toBe(true);
      expect(result.txid).toBe('tx_create_123');
      expect(result.address).toBe('asset_addr_abc');

      // Verify image was fetched for hashing
      expect(mockFetch).toHaveBeenCalledWith('https://example.com/art.png', { cache: 'no-store' });

      // Verify SHA-256 was computed
      expect(mockDigest).toHaveBeenCalledWith('SHA-256', FAKE_IMAGE_DATA);

      // Verify asset creation API call
      expect(mockSecureApiCall).toHaveBeenCalledWith('assets/create/asset', expect.objectContaining({
        name: 'My Art',
        format: 'JSON',
        json: expect.arrayContaining([
          expect.objectContaining({ name: 'distordia-type', value: 'art-asset' }),
          expect.objectContaining({ name: 'title', value: 'My Art' }),
          expect.objectContaining({ name: 'description', value: 'A beautiful piece' }),
          expect.objectContaining({ name: 'image_url', value: 'https://example.com/art.png' }),
          expect.objectContaining({ name: 'image_sha256' }),
          expect.objectContaining({ name: 'artist', value: 'TestArtist' }),
          expect.objectContaining({ name: 'edition', value: '1/1' }),
        ]),
      }));

      // Verify success dialog
      expect(mockShowSuccessDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'NFT Art created successfully!',
        })
      );
    });

    it('should reject creation when name is missing', async () => {
      const result = await store.dispatch(
        createNftArt('', 'desc', 'https://example.com/art.png', 'artist', '1/1')
      );

      expect(result).toBeNull();
      expect(mockShowErrorDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Missing required fields',
        })
      );
      expect(mockSecureApiCall).not.toHaveBeenCalled();
    });

    it('should reject creation when imageUrl is missing', async () => {
      const result = await store.dispatch(
        createNftArt('My Art', 'desc', '', 'artist', '1/1')
      );

      expect(result).toBeNull();
      expect(mockShowErrorDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Missing required fields',
        })
      );
    });

    it('should reject creation when duplicate image hash exists on-chain', async () => {
      // Duplicate found
      mockApiCall.mockResolvedValueOnce([
        {
          address: 'existing_asset_addr',
          name: 'ExistingArt',
          json: [
            { name: 'distordia-type', value: 'art-asset' },
            { name: 'image_sha256', value: FAKE_HASH },
          ],
        },
      ]);

      const result = await store.dispatch(
        createNftArt('My Art', 'desc', 'https://example.com/art.png', 'artist', '1/1')
      );

      expect(result).toBeNull();
      expect(mockShowErrorDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'This image is already registered',
        })
      );
      expect(mockSecureApiCall).not.toHaveBeenCalled();
    });

    it('should handle API failure during creation gracefully', async () => {
      // No duplicate
      mockApiCall.mockResolvedValueOnce([]);

      // secureApiCall returns failure
      mockSecureApiCall.mockResolvedValueOnce({
        success: false,
        message: 'Insufficient funds',
      });

      const result = await store.dispatch(
        createNftArt('My Art', 'desc', 'https://example.com/art.png', 'artist', '1/1')
      );

      expect(result).toBeNull();
      expect(mockShowErrorDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to create NFT',
        })
      );
    });

    it('should handle user cancellation silently', async () => {
      mockApiCall.mockResolvedValueOnce([]);

      mockSecureApiCall.mockRejectedValueOnce(
        new Error('User cancelled the operation')
      );

      const result = await store.dispatch(
        createNftArt('My Art', 'desc', 'https://example.com/art.png', 'artist', '1/1')
      );

      expect(result).toBeNull();
      expect(mockShowErrorDialog).not.toHaveBeenCalled();
    });

    it('should handle null return from secureApiCall (pin dialog dismissed)', async () => {
      mockApiCall.mockResolvedValueOnce([]);
      mockSecureApiCall.mockResolvedValueOnce(null);

      const result = await store.dispatch(
        createNftArt('My Art', 'desc', 'https://example.com/art.png', 'artist', '1/1')
      );

      expect(result).toBeNull();
    });

    it('should enforce the 1KB metadata size limit', async () => {
      mockApiCall.mockResolvedValueOnce([]);

      // Create a very long description to exceed 1KB
      const longDescription = 'x'.repeat(900);

      const result = await store.dispatch(
        createNftArt('My Art', longDescription, 'https://example.com/art.png', 'artist', '1/1')
      );

      expect(result).toBeNull();
      expect(mockShowErrorDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Asset metadata exceeds 1KB limit',
        })
      );
    });

    it('should use default values for optional fields', async () => {
      mockApiCall.mockResolvedValueOnce([]);
      mockSecureApiCall.mockResolvedValueOnce({
        success: true,
        txid: 'tx_123',
        address: 'addr_123',
      });
      mockApiCall.mockResolvedValueOnce([]); // fetchMyNftAssets
      mockApiCall.mockResolvedValueOnce([]); // fetchNftListings names
      mockApiCall.mockResolvedValueOnce([]); // fetchNftListings assets

      await store.dispatch(
        createNftArt('My Art', '', 'https://example.com/art.png', '', '')
      );

      expect(mockSecureApiCall).toHaveBeenCalledWith('assets/create/asset', expect.objectContaining({
        json: expect.arrayContaining([
          expect.objectContaining({ name: 'artist', value: 'Anonymous' }),
          expect.objectContaining({ name: 'edition', value: '1/1' }),
          expect.objectContaining({ name: 'description', value: '' }),
        ]),
      }));
    });
  });

  // =========================================================================
  // STEP 2: Token Creation for Sale (createNftSaleToken)
  // =========================================================================
  describe('Step 2: Token Creation for Sale (createNftSaleToken)', () => {
    it('should create a sale token with valid parameters', async () => {
      mockSecureApiCall.mockResolvedValueOnce({
        success: true,
        address: 'token_addr_xyz',
        txid: 'tx_token_456',
      });

      const result = await store.dispatch(
        createNftSaleToken({ name: 'ArtToken', supply: 1, decimals: 0 })
      );

      expect(result).toBeTruthy();
      expect(result.success).toBe(true);
      expect(result.address).toBe('token_addr_xyz');

      expect(mockSecureApiCall).toHaveBeenCalledWith('finance/create/token', {
        name: 'ArtToken',
        supply: 1,
        decimals: 0,
      });

      expect(mockShowSuccessDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Sale token created successfully!',
        })
      );
    });

    it('should create token without name when not provided', async () => {
      mockSecureApiCall.mockResolvedValueOnce({
        success: true,
        address: 'token_addr_no_name',
        txid: 'tx_789',
      });

      const result = await store.dispatch(
        createNftSaleToken({ name: '', supply: 1, decimals: 0 })
      );

      expect(result).toBeTruthy();
      expect(mockSecureApiCall).toHaveBeenCalledWith('finance/create/token', {
        supply: 1,
        decimals: 0,
      });
    });

    it('should reject invalid supply (zero)', async () => {
      const result = await store.dispatch(
        createNftSaleToken({ name: 'Test', supply: 0, decimals: 0 })
      );

      expect(result).toBeNull();
      expect(mockShowErrorDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid token parameters',
        })
      );
    });

    it('should reject negative supply', async () => {
      const result = await store.dispatch(
        createNftSaleToken({ name: 'Test', supply: -1, decimals: 0 })
      );

      expect(result).toBeNull();
    });

    it('should reject non-integer supply', async () => {
      const result = await store.dispatch(
        createNftSaleToken({ name: 'Test', supply: 1.5, decimals: 0 })
      );

      expect(result).toBeNull();
    });

    it('should reject negative decimals', async () => {
      const result = await store.dispatch(
        createNftSaleToken({ name: 'Test', supply: 1, decimals: -1 })
      );

      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // STEP 3: Listing for Sale (listNftForSale)
  // =========================================================================
  describe('Step 3: Listing NFT for Sale (listNftForSale)', () => {
    it('should tokenize and list an NFT for sale successfully', async () => {
      // verifyAssetTokenization - not yet tokenized
      mockApiCall.mockResolvedValueOnce({ valid: false });

      // tokenize the asset
      mockSecureApiCall.mockResolvedValueOnce({ success: true, txid: 'tx_tokenize' });

      // create ask order
      mockSecureApiCall.mockResolvedValueOnce({
        success: true,
        txid: 'tx_ask_order',
      });

      // After listing: fetchMyNftAssets + fetchNftListings
      mockApiCall.mockResolvedValueOnce([]); // my assets
      mockApiCall.mockResolvedValueOnce([]); // global names
      mockApiCall.mockResolvedValueOnce([]); // assets

      const result = await store.dispatch(
        listNftForSale({
          assetAddress: 'asset_addr_abc',
          token: 'token_addr_xyz',
          amount: 1,
          price: 100,
          from: 'token_addr_xyz',
          to: 'nxs_account_addr',
        })
      );

      expect(result).toBeTruthy();
      expect(result.success).toBe(true);

      // Verify market ask was created with correct market pair
      expect(mockSecureApiCall).toHaveBeenCalledWith('market/create/ask', {
        market: 'token_addr_xyz/NXS',
        amount: 1,
        price: 100,
        from: 'token_addr_xyz',
        to: 'nxs_account_addr',
      });

      expect(mockShowSuccessDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'NFT listed for sale!',
        })
      );
    });

    it('should skip tokenization when already tokenized', async () => {
      // verifyAssetTokenization - already tokenized
      mockApiCall.mockResolvedValueOnce({
        valid: true,
        asset: { address: 'asset_addr_abc' },
      });

      // create ask order (no tokenization step)
      mockSecureApiCall.mockResolvedValueOnce({
        success: true,
        txid: 'tx_ask_order_2',
      });

      // After listing refreshes
      mockApiCall.mockResolvedValueOnce([]);
      mockApiCall.mockResolvedValueOnce([]);
      mockApiCall.mockResolvedValueOnce([]);

      const result = await store.dispatch(
        listNftForSale({
          assetAddress: 'asset_addr_abc',
          token: 'token_addr_xyz',
          amount: 1,
          price: 50,
          from: 'token_addr_xyz',
          to: 'nxs_account_addr',
        })
      );

      expect(result).toBeTruthy();
      // Only one secureApiCall (the ask), no tokenization
      expect(mockSecureApiCall).toHaveBeenCalledTimes(1);
      expect(mockSecureApiCall).toHaveBeenCalledWith('market/create/ask', expect.any(Object));
    });

    it('should reject listing with missing fields', async () => {
      const result = await store.dispatch(
        listNftForSale({
          assetAddress: 'asset_addr',
          token: '',
          amount: 1,
          price: 100,
          from: 'from_addr',
          to: 'to_addr',
        })
      );

      expect(result).toBeNull();
      expect(mockShowErrorDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Missing required fields',
        })
      );
    });

    it('should reject listing with zero price', async () => {
      const result = await store.dispatch(
        listNftForSale({
          assetAddress: 'asset_addr',
          token: 'token_addr',
          amount: 1,
          price: 0,
          from: 'from_addr',
          to: 'to_addr',
        })
      );

      expect(result).toBeNull();
    });

    it('should reject listing with zero amount', async () => {
      const result = await store.dispatch(
        listNftForSale({
          assetAddress: 'asset_addr',
          token: 'token_addr',
          amount: 0,
          price: 10,
          from: 'from_addr',
          to: 'to_addr',
        })
      );

      expect(result).toBeNull();
    });

    it('should handle tokenization failure gracefully', async () => {
      // Not yet tokenized
      mockApiCall.mockResolvedValueOnce({ valid: false });

      // Tokenization fails
      mockSecureApiCall.mockResolvedValueOnce({
        success: false,
        message: 'Tokenization failed',
      });

      const result = await store.dispatch(
        listNftForSale({
          assetAddress: 'asset_addr',
          token: 'token_addr',
          amount: 1,
          price: 100,
          from: 'token_addr',
          to: 'to_addr',
        })
      );

      expect(result).toBeNull();
      expect(mockShowErrorDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to tokenize NFT for market listing',
        })
      );
    });
  });

  // =========================================================================
  // STEP 4: Finding NFTs (fetchNftListings)
  // =========================================================================
  describe('Step 4: Finding NFTs for Sale (fetchNftListings)', () => {
    it('should fetch and filter art NFTs from global assets', async () => {
      const globalNames = [
        { register: 'addr_1', name: 'ArtPiece1' },
        { register: 'addr_3', name: 'NotAnArt' },
      ];

      const assets = [
        {
          address: 'addr_1',
          json: [
            { name: 'distordia-type', value: 'art-asset' },
            { name: 'image_url', value: 'https://example.com/img1.png' },
            { name: 'title', value: 'Art One' },
          ],
        },
        {
          address: 'addr_2',
          json: [
            { name: 'image_url', value: 'https://example.com/img2.png' },
            { name: 'title', value: 'Art Two' },
          ],
        },
        {
          address: 'addr_3',
          json: [
            { name: 'some_field', value: 'not art' },
          ],
        },
      ];

      mockApiCall.mockResolvedValueOnce(globalNames);
      mockApiCall.mockResolvedValueOnce(assets);

      await store.dispatch(fetchNftListings());

      const actions = store.getActions();
      const listingsAction = actions.find((a) => a.type === TYPE.SET_NFT_LISTINGS);

      expect(listingsAction).toBeTruthy();
      // addr_1 and addr_2 are art (have image_url), addr_3 is not
      expect(listingsAction.payload).toHaveLength(2);
      expect(listingsAction.payload[0].globalName).toBe('ArtPiece1');
      expect(listingsAction.payload[1].globalName).toBe('');
    });

    it('should handle empty asset list', async () => {
      mockApiCall.mockResolvedValueOnce([]);
      mockApiCall.mockResolvedValueOnce([]);

      await store.dispatch(fetchNftListings());

      const actions = store.getActions();
      const listingsAction = actions.find((a) => a.type === TYPE.SET_NFT_LISTINGS);
      expect(listingsAction.payload).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('Network error'));
      mockApiCall.mockRejectedValueOnce(new Error('Network error'));

      await store.dispatch(fetchNftListings());

      const actions = store.getActions();
      const listingsAction = actions.find((a) => a.type === TYPE.SET_NFT_LISTINGS);
      expect(listingsAction.payload).toEqual([]);
    });

    it('should set loading state during fetch', async () => {
      mockApiCall.mockResolvedValueOnce([]);
      mockApiCall.mockResolvedValueOnce([]);

      await store.dispatch(fetchNftListings());

      const actions = store.getActions();
      const loadingActions = actions.filter((a) => a.type === TYPE.SET_NFT_LOADING);

      // Should set loading true then false
      expect(loadingActions.length).toBeGreaterThanOrEqual(2);
      expect(loadingActions[0].payload).toBe(true);
      expect(loadingActions[loadingActions.length - 1].payload).toBe(false);
    });

    it('should detect art NFTs using distordia-type field', async () => {
      mockApiCall.mockResolvedValueOnce([]);
      mockApiCall.mockResolvedValueOnce([
        {
          address: 'addr_distordia',
          json: [
            { name: 'distordia-type', value: 'art-asset' },
            { name: 'title', value: 'Distordia Art' },
          ],
        },
      ]);

      await store.dispatch(fetchNftListings());

      const listingsAction = store.getActions().find((a) => a.type === TYPE.SET_NFT_LISTINGS);
      expect(listingsAction.payload).toHaveLength(1);
      expect(listingsAction.payload[0].address).toBe('addr_distordia');
    });

    it('should detect art NFTs using image_url on asset', async () => {
      mockApiCall.mockResolvedValueOnce([]);
      mockApiCall.mockResolvedValueOnce([
        {
          address: 'addr_with_image',
          image_url: 'https://example.com/direct.png',
          json: [],
        },
      ]);

      await store.dispatch(fetchNftListings());

      const listingsAction = store.getActions().find((a) => a.type === TYPE.SET_NFT_LISTINGS);
      expect(listingsAction.payload).toHaveLength(1);
    });
  });

  // =========================================================================
  // STEP 4b: Fetching My NFT Assets (fetchMyNftAssets)
  // =========================================================================
  describe('Step 4b: Fetching My NFT Assets (fetchMyNftAssets)', () => {
    it('should fetch and filter user art NFTs', async () => {
      mockApiCall.mockResolvedValueOnce([
        {
          address: 'my_art_1',
          json: [
            { name: 'image_url', value: 'https://example.com/my1.png' },
          ],
        },
        {
          address: 'my_non_art',
          json: [{ name: 'some_data', value: 'not art' }],
        },
      ]);

      await store.dispatch(fetchMyNftAssets());

      const action = store.getActions().find((a) => a.type === TYPE.SET_NFT_MY_ASSETS);
      expect(action.payload).toHaveLength(1);
      expect(action.payload[0].address).toBe('my_art_1');
    });

    it('should handle empty results', async () => {
      mockApiCall.mockResolvedValueOnce([]);

      await store.dispatch(fetchMyNftAssets());

      const action = store.getActions().find((a) => a.type === TYPE.SET_NFT_MY_ASSETS);
      expect(action.payload).toEqual([]);
    });

    it('should handle API errors', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('fail'));

      await store.dispatch(fetchMyNftAssets());

      const action = store.getActions().find((a) => a.type === TYPE.SET_NFT_MY_ASSETS);
      expect(action.payload).toEqual([]);
    });
  });

  // =========================================================================
  // STEP 5: Buying an NFT (buyNft)
  // =========================================================================
  describe('Step 5: Buying an NFT (buyNft)', () => {
    it('should execute a market order to buy an NFT', async () => {
      mockSecureApiCall.mockResolvedValueOnce({
        success: true,
        txid: 'tx_buy_789',
      });

      // After buy: fetchMyNftAssets + fetchNftListings
      mockApiCall.mockResolvedValueOnce([]); // my assets
      mockApiCall.mockResolvedValueOnce([]); // global names
      mockApiCall.mockResolvedValueOnce([]); // assets

      const result = await store.dispatch(
        buyNft({
          txid: 'ask_order_txid',
          from: 'buyer_nxs_account',
          to: 'buyer_receiving_account',
        })
      );

      expect(result).toBeTruthy();
      expect(result.success).toBe(true);
      expect(result.txid).toBe('tx_buy_789');

      expect(mockSecureApiCall).toHaveBeenCalledWith('market/execute/order', {
        txid: 'ask_order_txid',
        from: 'buyer_nxs_account',
        to: 'buyer_receiving_account',
      });

      expect(mockShowSuccessDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'NFT purchased successfully!',
        })
      );
    });

    it('should reject buy with missing txid', async () => {
      const result = await store.dispatch(
        buyNft({ txid: '', from: 'from', to: 'to' })
      );

      expect(result).toBeNull();
      expect(mockShowErrorDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Missing required fields',
        })
      );
    });

    it('should reject buy with missing from account', async () => {
      const result = await store.dispatch(
        buyNft({ txid: 'tx_123', from: '', to: 'to' })
      );

      expect(result).toBeNull();
    });

    it('should reject buy with missing to account', async () => {
      const result = await store.dispatch(
        buyNft({ txid: 'tx_123', from: 'from', to: '' })
      );

      expect(result).toBeNull();
    });

    it('should handle purchase failure', async () => {
      mockSecureApiCall.mockResolvedValueOnce({
        success: false,
        message: 'Insufficient balance',
      });

      const result = await store.dispatch(
        buyNft({ txid: 'tx_123', from: 'from', to: 'to' })
      );

      expect(result).toBeNull();
      expect(mockShowErrorDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to purchase NFT',
        })
      );
    });

    it('should handle user cancellation during buy', async () => {
      mockSecureApiCall.mockRejectedValueOnce(
        new Error('User cancelled the operation')
      );

      const result = await store.dispatch(
        buyNft({ txid: 'tx_123', from: 'from', to: 'to' })
      );

      expect(result).toBeNull();
      expect(mockShowErrorDialog).not.toHaveBeenCalled();
    });

    it('should refresh listings after successful purchase', async () => {
      mockSecureApiCall.mockResolvedValueOnce({
        success: true,
        txid: 'tx_buy',
      });
      mockApiCall.mockResolvedValueOnce([]); // my assets
      mockApiCall.mockResolvedValueOnce([]); // global names
      mockApiCall.mockResolvedValueOnce([]); // assets

      await store.dispatch(buyNft({ txid: 'tx_123', from: 'from', to: 'to' }));

      // Wait for fire-and-forget async dispatches to resolve
      await new Promise((r) => setTimeout(r, 50));

      const actions = store.getActions();
      const myAssetsAction = actions.find((a) => a.type === TYPE.SET_NFT_MY_ASSETS);
      const listingsAction = actions.find((a) => a.type === TYPE.SET_NFT_LISTINGS);

      expect(myAssetsAction).toBeTruthy();
      expect(listingsAction).toBeTruthy();
    });
  });

  // =========================================================================
  // STEP 6: Transfer NFT
  // =========================================================================
  describe('Step 6: Transfer NFT (transferNft)', () => {
    it('should transfer an NFT to another user', async () => {
      mockSecureApiCall.mockResolvedValueOnce({
        success: true,
        txid: 'tx_transfer_101',
      });
      mockApiCall.mockResolvedValueOnce([]); // my assets
      mockApiCall.mockResolvedValueOnce([]); // global names
      mockApiCall.mockResolvedValueOnce([]); // assets

      const result = await store.dispatch(
        transferNft('asset_addr', 'recipient_addr')
      );

      expect(result).toBeTruthy();
      expect(result.success).toBe(true);
      expect(mockSecureApiCall).toHaveBeenCalledWith('assets/transfer/asset', {
        address: 'asset_addr',
        recipient: 'recipient_addr',
      });
    });

    it('should reject transfer with missing asset address', async () => {
      const result = await store.dispatch(transferNft('', 'recipient'));

      expect(result).toBeNull();
      expect(mockShowErrorDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Missing required fields',
        })
      );
    });

    it('should reject transfer with missing recipient', async () => {
      const result = await store.dispatch(transferNft('asset_addr', ''));

      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // STEP 7: Tokenize NFT Asset
  // =========================================================================
  describe('Step 7: Tokenize NFT Asset (tokenizeNftAsset)', () => {
    it('should tokenize an NFT asset', async () => {
      mockSecureApiCall.mockResolvedValueOnce({
        success: true,
        txid: 'tx_tokenize_202',
      });
      mockApiCall.mockResolvedValueOnce([]); // my assets
      mockApiCall.mockResolvedValueOnce([]); // global names
      mockApiCall.mockResolvedValueOnce([]); // assets

      const result = await store.dispatch(
        tokenizeNftAsset('asset_addr', 'token_addr')
      );

      expect(result).toBeTruthy();
      expect(result.success).toBe(true);
      expect(mockSecureApiCall).toHaveBeenCalledWith('assets/tokenize/asset', {
        address: 'asset_addr',
        token: 'token_addr',
      });
    });

    it('should reject tokenization with missing fields', async () => {
      const result = await store.dispatch(tokenizeNftAsset('', 'token'));

      expect(result).toBeNull();
      expect(mockShowErrorDialog).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // FULL END-TO-END FLOW
  // =========================================================================
  describe('Full End-to-End Flow: Create -> List -> Find -> Buy', () => {
    it('should complete the entire NFT art lifecycle', async () => {
      // === PHASE 1: Create the NFT art asset ===
      // No duplicate found
      mockApiCall.mockResolvedValueOnce([]);

      const createdAsset = {
        success: true,
        txid: 'tx_create_e2e',
        address: 'asset_e2e_addr',
      };
      mockSecureApiCall.mockResolvedValueOnce(createdAsset);

      // Post-creation refresh
      mockApiCall.mockResolvedValueOnce([]); // my assets
      mockApiCall.mockResolvedValueOnce([]); // global names
      mockApiCall.mockResolvedValueOnce([]); // assets

      const createResult = await store.dispatch(
        createNftArt('E2E Artwork', 'Test piece', 'https://example.com/e2e.png', 'E2E Artist', '1/1')
      );

      expect(createResult.success).toBe(true);
      expect(createResult.address).toBe('asset_e2e_addr');

      // Wait for fire-and-forget async dispatches from creation to settle
      await new Promise((r) => setTimeout(r, 50));

      // === PHASE 2: Create a token for sale ===
      store.clearActions();

      const createdToken = {
        success: true,
        address: 'token_e2e_addr',
        txid: 'tx_token_e2e',
      };
      mockSecureApiCall.mockResolvedValueOnce(createdToken);

      const tokenResult = await store.dispatch(
        createNftSaleToken({ name: 'E2EToken', supply: 1, decimals: 0 })
      );

      expect(tokenResult.success).toBe(true);
      expect(tokenResult.address).toBe('token_e2e_addr');

      // === PHASE 3: List the NFT for sale ===
      store.clearActions();

      // Asset verification (not yet tokenized)
      mockApiCall.mockResolvedValueOnce({ valid: false });

      // Tokenize
      mockSecureApiCall.mockResolvedValueOnce({ success: true, txid: 'tx_tokenize_e2e' });

      // Create ask order
      mockSecureApiCall.mockResolvedValueOnce({
        success: true,
        txid: 'tx_ask_e2e',
      });

      // Post-listing refresh
      mockApiCall.mockResolvedValueOnce([]); // my assets
      mockApiCall.mockResolvedValueOnce([]); // global names
      mockApiCall.mockResolvedValueOnce([]); // assets

      const listResult = await store.dispatch(
        listNftForSale({
          assetAddress: 'asset_e2e_addr',
          token: 'token_e2e_addr',
          amount: 1,
          price: 250,
          from: 'token_e2e_addr',
          to: 'seller_nxs_account',
        })
      );

      expect(listResult.success).toBe(true);

      // Wait for fire-and-forget async dispatches from listing to settle
      await new Promise((r) => setTimeout(r, 50));

      // === PHASE 4: A buyer discovers the NFT on the marketplace ===
      store.clearActions();

      const globalNames = [{ register: 'asset_e2e_addr', name: 'E2E Artwork' }];
      const allAssets = [
        {
          address: 'asset_e2e_addr',
          json: [
            { name: 'distordia-type', value: 'art-asset' },
            { name: 'image_url', value: 'https://example.com/e2e.png' },
            { name: 'image_sha256', value: FAKE_HASH },
            { name: 'title', value: 'E2E Artwork' },
            { name: 'artist', value: 'E2E Artist' },
            { name: 'edition', value: '1/1' },
          ],
        },
      ];

      mockApiCall.mockResolvedValueOnce(globalNames);
      mockApiCall.mockResolvedValueOnce(allAssets);

      await store.dispatch(fetchNftListings());

      const listingsAction = store.getActions().find((a) => a.type === TYPE.SET_NFT_LISTINGS);
      expect(listingsAction.payload).toHaveLength(1);
      expect(listingsAction.payload[0].address).toBe('asset_e2e_addr');
      expect(listingsAction.payload[0].globalName).toBe('E2E Artwork');

      // === PHASE 5: Buyer purchases the NFT ===
      store.clearActions();

      mockSecureApiCall.mockResolvedValueOnce({
        success: true,
        txid: 'tx_purchase_e2e',
      });

      // Post-buy refresh
      mockApiCall.mockResolvedValueOnce([
        {
          address: 'asset_e2e_addr',
          json: [
            { name: 'image_url', value: 'https://example.com/e2e.png' },
            { name: 'title', value: 'E2E Artwork' },
          ],
        },
      ]); // buyer now owns it
      mockApiCall.mockResolvedValueOnce(globalNames);
      mockApiCall.mockResolvedValueOnce(allAssets);

      const buyResult = await store.dispatch(
        buyNft({
          txid: 'tx_ask_e2e',
          from: 'buyer_nxs_account',
          to: 'buyer_token_account',
        })
      );

      expect(buyResult.success).toBe(true);
      expect(buyResult.txid).toBe('tx_purchase_e2e');

      // Wait for fire-and-forget async dispatches from buy to settle
      await new Promise((r) => setTimeout(r, 50));

      // Verify the buyer's asset list was refreshed
      const myAssetsAction = store.getActions().find((a) => a.type === TYPE.SET_NFT_MY_ASSETS);
      expect(myAssetsAction).toBeTruthy();
      expect(myAssetsAction.payload).toHaveLength(1);
      expect(myAssetsAction.payload[0].address).toBe('asset_e2e_addr');

      // Success dialogs were shown at each step
      expect(mockShowSuccessDialog).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'NFT purchased successfully!' })
      );
    });
  });
});
