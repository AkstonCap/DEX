import {
  apiCall,
  secureApiCall,
  showErrorDialog,
  showSuccessDialog,
} from 'nexus-module';
import {
  setNftListings,
  setNftMyAssets,
  setNftLoading,
} from './actionCreators';
import { cachedApiCall } from 'utils/apiCache';

const NFT_CACHE_TTL = 15000;
const DISTORDIA_ART_STANDARD = 'distordia-art-asset';
const DISTORDIA_ART_STANDARD_VERSION = '1.0.0';
const MAX_ASSET_JSON_BYTES = 1000;

const isUserCancelled = (error) =>
  typeof error?.message === 'string' && error.message.toLowerCase().includes('cancel');

const getJsonByteLength = (value) => {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value).length;
  }
  return unescape(encodeURIComponent(value)).length;
};

const parseAssetMetadata = (asset) => {
  if (asset?.json && typeof asset.json === 'object') {
    return asset.json;
  }

  if (typeof asset?.data === 'string' && asset.data.length > 0) {
    try {
      return JSON.parse(asset.data);
    } catch (error) {
      return {};
    }
  }

  return {};
};

const isArtNft = (asset) => {
  const metadata = parseAssetMetadata(asset);
  return Boolean(
    metadata.image_url ||
    asset?.image_url ||
    metadata.standard === DISTORDIA_ART_STANDARD ||
    metadata.asset_class === 'digital_art' ||
    metadata.type === 'digital_art'
  );
};

const getImageSha256 = async (imageUrl) => {
  const subtleCrypto = globalThis?.crypto?.subtle;
  if (!subtleCrypto) {
    throw new Error('Secure SHA-256 hashing is not available in this environment');
  }

  const response = await fetch(imageUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Unable to fetch image for hashing from the provided URL');
  }

  const imageData = await response.arrayBuffer();
  const hashBuffer = await subtleCrypto.digest('SHA-256', imageData);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return {
    hash: hashHex,
    contentType: response.headers?.get?.('content-type') || '',
    sizeBytes: imageData.byteLength,
  };
};

const findExistingArtByHash = async (imageHash) => {
  const assets = await apiCall('register/list/assets:asset', {
    limit: 1000,
  });

  if (!Array.isArray(assets)) {
    return null;
  }

  return (
    assets.find((asset) => {
      const metadata = parseAssetMetadata(asset);
      return metadata.image_sha256 === imageHash;
    }) || null
  );
};

const verifyAssetTokenization = async (assetAddress, token) => {
  try {
    const verification = await apiCall('assets/verify/partial', { token });
    const verifiedAddress = verification?.asset?.address;
    return Boolean(
      verification?.valid &&
      typeof verifiedAddress === 'string' &&
      verifiedAddress === assetAddress
    );
  } catch (error) {
    return false;
  }
};

// Fetch all globally registered NFT art assets
export const fetchNftListings = () => async (dispatch) => {
  dispatch(setNftLoading(true));
  try {
    // List all global assets
    const globalNames = await cachedApiCall(
      apiCall,
      'register/list/names:global/register,address,name',
      {},
      NFT_CACHE_TTL
    ).catch(() => []);

    // Get all assets owned by users (browsable NFTs)
    const assets = await cachedApiCall(
      apiCall,
      'register/list/assets:asset',
      { limit: 200 },
      NFT_CACHE_TTL
    ).catch(() => []);

    if (!Array.isArray(assets)) {
      dispatch(setNftListings([]));
      dispatch(setNftLoading(false));
      return;
    }

    // Filter for art NFTs (assets with image_url field)
    const artNfts = assets
      .filter((asset) => isArtNft(asset))
      .map((asset) => {
        const globalName = globalNames.find(
          (n) => n.register === asset.address
        );
        return {
          ...asset,
          globalName: globalName?.name || '',
        };
      });

    dispatch(setNftListings(artNfts));
  } catch (error) {
    dispatch(setNftListings([]));
  }
  dispatch(setNftLoading(false));
};

// Fetch user's own NFT art assets
export const fetchMyNftAssets = () => async (dispatch) => {
  try {
    const myAssets = await apiCall('assets/list/asset', {
      limit: 100,
    }).catch(() => []);

    if (!Array.isArray(myAssets)) {
      dispatch(setNftMyAssets([]));
      return;
    }

    // Filter for art NFTs
    const myArtNfts = myAssets.filter(
      (asset) => isArtNft(asset)
    );

    dispatch(setNftMyAssets(myArtNfts));
  } catch (error) {
    dispatch(setNftMyAssets([]));
  }
};

// Create a new NFT art asset
export const createNftArt =
  (name, description, imageUrl, artist, edition) => async (dispatch) => {
    if (!name || !imageUrl) {
      showErrorDialog({
        message: 'Missing required fields',
        note: 'Name and Image URL are required to create an NFT',
      });
      return null;
    }

    try {
      const normalizedImageUrl = String(imageUrl).trim();
      const imageHashInfo = await getImageSha256(normalizedImageUrl);

      const duplicateAsset = await findExistingArtByHash(imageHashInfo.hash);
      if (duplicateAsset) {
        showErrorDialog({
          message: 'This image is already registered',
          note:
            'Matching image hash found on-chain for asset ' +
            String(duplicateAsset.address || duplicateAsset.name || 'unknown'),
        });
        return null;
      }

      const assetPayload = {
        standard: DISTORDIA_ART_STANDARD,
        standard_version: DISTORDIA_ART_STANDARD_VERSION,
        title: name,
        description: description || '',
        image_url: normalizedImageUrl,
        image_sha256: imageHashInfo.hash,
        image_content_type: imageHashInfo.contentType,
        image_size_bytes: imageHashInfo.sizeBytes,
        artist: artist || 'Anonymous',
        edition: edition || '1/1',
        asset_class: 'digital_art',
        type: 'digital_art',
        created: Math.floor(Date.now() / 1000),
      };

      const assetPayloadJson = JSON.stringify(assetPayload);
      const payloadSize = getJsonByteLength(assetPayloadJson);
      if (payloadSize > MAX_ASSET_JSON_BYTES) {
        showErrorDialog({
          message: 'Asset metadata exceeds 1KB limit',
          note:
            'Current payload size is ' +
            String(payloadSize) +
            ' bytes. Reduce metadata fields or values.',
        });
        return null;
      }

      const params = {
        name: name,
        format: 'JSON',
        json: assetPayloadJson,
      };

      const result = await secureApiCall('assets/create/asset', params);

      if (!result) {
        return null;
      }

      if (result.success) {
        showSuccessDialog({
          message: 'NFT Art created successfully!',
          note:
            'Transaction ID: ' +
            String(result.txid || '') +
            '\nAsset address: ' +
            String(result.address || '') +
            '\nImage SHA-256: ' +
            imageHashInfo.hash,
        });

        // Refresh listings
        dispatch(fetchMyNftAssets());
        dispatch(fetchNftListings());
        return result;
      } else {
        showErrorDialog({
          message: 'Failed to create NFT',
          note: result?.message || 'Unknown error',
        });
        return null;
      }
    } catch (error) {
      if (isUserCancelled(error)) {
        return null;
      }
      showErrorDialog({
        message: 'Error creating NFT art',
        note: error?.message || 'Unknown error occurred',
      });
      return null;
    }
  };

// Transfer (sell) an NFT to another user
export const transferNft =
  (assetAddress, recipientAddress) => async (dispatch) => {
    if (!assetAddress || !recipientAddress) {
      showErrorDialog({
        message: 'Missing required fields',
        note: 'Asset address and recipient are required',
      });
      return null;
    }

    try {
      const result = await secureApiCall('assets/transfer/asset', {
        address: assetAddress,
        recipient: recipientAddress,
      });

      if (!result) {
        return null;
      }

      if (result.success) {
        showSuccessDialog({
          message: 'NFT transferred successfully!',
          note: 'Transaction ID: ' + String(result.txid || ''),
        });

        dispatch(fetchMyNftAssets());
        dispatch(fetchNftListings());
        return result;
      } else {
        showErrorDialog({
          message: 'Failed to transfer NFT',
          note: result?.message || 'Unknown error',
        });
        return null;
      }
    } catch (error) {
      if (isUserCancelled(error)) {
        return null;
      }
      showErrorDialog({
        message: 'Error transferring NFT',
        note: error?.message || 'Unknown error occurred',
      });
      return null;
    }
  };

// Tokenize NFT asset for market trading
export const tokenizeNftAsset =
  (assetAddress, token) => async (dispatch) => {
    if (!assetAddress || !token) {
      showErrorDialog({
        message: 'Missing required fields',
        note: 'Asset address and token are required for tokenization',
      });
      return null;
    }

    try {
      const result = await secureApiCall('assets/tokenize/asset', {
        address: assetAddress,
        token,
      });

      if (!result) {
        return null;
      }

      if (result.success) {
        showSuccessDialog({
          message: 'NFT tokenized successfully!',
          note:
            'Token: ' +
            String(token) +
            '\nTransaction ID: ' +
            String(result.txid || ''),
        });
        dispatch(fetchMyNftAssets());
        dispatch(fetchNftListings());
        return result;
      }

      showErrorDialog({
        message: 'Failed to tokenize NFT',
        note: result?.message || 'Unknown error',
      });
      return null;
    } catch (error) {
      if (isUserCancelled(error)) {
        return null;
      }
      showErrorDialog({
        message: 'Error tokenizing NFT',
        note: error?.message || 'Unknown error occurred',
      });
      return null;
    }
  };

// List an NFT for sale on the market (create ask order)
export const listNftForSale =
  (params) => async (dispatch) => {
    const {
      assetAddress,
      token,
      market,
      amount,
      price,
      from,
      to,
    } = params || {};

    if (
      !assetAddress ||
      !token ||
      !market ||
      typeof market !== 'string' ||
      !from ||
      !to ||
      !amount ||
      Number(amount) <= 0 ||
      !price ||
      Number(price) <= 0
    ) {
      showErrorDialog({
        message: 'Missing required fields',
        note:
          'Required: assetAddress, token, market, amount, price, from, to',
      });
      return null;
    }

    try {
      const tokenized = await verifyAssetTokenization(assetAddress, token);
      if (!tokenized) {
        showErrorDialog({
          message: 'NFT is not tokenized for market trading',
          note:
            'Tokenize the asset first with assets/tokenize/asset using a pre-created token (with your chosen supply/decimals).',
        });
        return null;
      }

      const result = await secureApiCall('market/create/ask', {
        market,
        amount: Number(amount),
        price: Number(price),
        from,
        to,
      });

      if (!result) {
        return null;
      }

      if (result.success) {
        showSuccessDialog({
          message: 'NFT listed for sale!',
          note:
            'Price: ' +
            Number(price) +
            ' NXS\nTransaction ID: ' +
            String(result.txid || ''),
        });
        dispatch(fetchMyNftAssets());
        dispatch(fetchNftListings());
        return result;
      } else {
        showErrorDialog({
          message: 'Failed to list NFT',
          note: result?.message || 'Unknown error',
        });
        return null;
      }
    } catch (error) {
      if (isUserCancelled(error)) {
        return null;
      }
      showErrorDialog({
        message: 'Error listing NFT for sale',
        note: error?.message || 'Unknown error occurred',
      });
      return null;
    }
  };

// Buy an NFT (execute an existing ask order)
export const buyNft =
  (params) => async (dispatch) => {
    const { txid, from, to } = params || {};

    if (!txid || !from || !to) {
      showErrorDialog({
        message: 'Missing required fields',
        note: 'Required: txid, from, to',
      });
      return null;
    }

    try {
      const result = await secureApiCall('market/execute/order', {
        txid,
        from,
        to,
      });

      if (!result) {
        return null;
      }

      if (result.success) {
        showSuccessDialog({
          message: 'NFT purchased successfully!',
          note: 'Transaction ID: ' + String(result.txid || ''),
        });
        dispatch(fetchMyNftAssets());
        dispatch(fetchNftListings());
        return result;
      } else {
        showErrorDialog({
          message: 'Failed to purchase NFT',
          note: result?.message || 'Unknown error',
        });
        return null;
      }
    } catch (error) {
      if (isUserCancelled(error)) {
        return null;
      }
      showErrorDialog({
        message: 'Error purchasing NFT',
        note: error?.message || 'Unknown error occurred',
      });
      return null;
    }
  };
