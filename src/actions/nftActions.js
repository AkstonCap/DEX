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
      .filter((asset) => asset.image_url && asset.image_url !== '')
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
      (asset) => asset.image_url && asset.image_url !== ''
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
      const params = {
        name: name,
        format: 'JSON',
        json: JSON.stringify({
          title: name,
          description: description || '',
          image_url: imageUrl,
          artist: artist || 'Anonymous',
          edition: edition || '1/1',
          type: 'digital_art',
          created: Math.floor(Date.now() / 1000),
        }),
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
            String(result.address || ''),
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
        destination: recipientAddress,
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
      showErrorDialog({
        message: 'Error transferring NFT',
        note: error?.message || 'Unknown error occurred',
      });
      return null;
    }
  };

// List an NFT for sale on the market (create ask order)
export const listNftForSale =
  (assetAddress, priceNxs) => async (dispatch) => {
    if (!assetAddress || !priceNxs || priceNxs <= 0) {
      showErrorDialog({
        message: 'Missing required fields',
        note: 'Asset address and a valid price are required',
      });
      return null;
    }

    try {
      const result = await secureApiCall('market/create/ask', {
        from: assetAddress,
        price: priceNxs,
        amount: 1,
      });

      if (!result) {
        return null;
      }

      if (result.success) {
        showSuccessDialog({
          message: 'NFT listed for sale!',
          note:
            'Price: ' +
            priceNxs +
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
      showErrorDialog({
        message: 'Error listing NFT for sale',
        note: error?.message || 'Unknown error occurred',
      });
      return null;
    }
  };

// Buy an NFT (execute an existing ask order)
export const buyNft =
  (txid, fromAccount) => async (dispatch) => {
    if (!txid || !fromAccount) {
      showErrorDialog({
        message: 'Missing required fields',
        note: 'Order ID and payment account are required',
      });
      return null;
    }

    try {
      const result = await secureApiCall('market/execute/order', {
        txid: txid,
        from: fromAccount,
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
      showErrorDialog({
        message: 'Error purchasing NFT',
        note: error?.message || 'Unknown error occurred',
      });
      return null;
    }
  };
