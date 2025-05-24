// Based on github.com/Nexusoft/nexus-market-data-module/src/App/RefreshButton.js
import { keyframes } from '@emotion/react';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Icon, Tooltip, Button, apiCall, showErrorDialog } from 'nexus-module';
import { setMarketPair } from 'actions/actionCreators';
import { fetchMarketData } from 'actions/fetchMarketData';

const spin = keyframes`
  from {
      transform:rotate(0deg);
  }
  to {
      transform:rotate(360deg);
  }
`;

function useRefreshMarket(baseTokenField, quoteTokenField) {
  const [refreshing, setRefreshing] = useState(false);
  const dispatch = useDispatch();
  
  // Helper to get token attributes by name or address
  const getTokenAttributes = async (field, isGlobal) => {
    if (field === 'NXS') {
      return {
        decimals: 6,
        currentsupply: 0,
        maxsupply: 0,
        address: '0'
      };
    }
    try {
      if (isGlobal) {
        return await apiCall('register/get/finance:token/decimals,currentsupply,maxsupply,address', { name: field });
      } else {
        return await apiCall('register/get/finance:token/decimals,currentsupply,maxsupply,address', { address: field });
      }
    } catch (error) {
      dispatch(showErrorDialog({
        message: `Cannot get token attributes for ${field}`,
        note: error?.message || 'Unknown error',
      }));
      return null;
    }
  };

  // Helper to check if token exists (global or non-global)
  const checkToken = async (field) => {
    if (field === 'NXS') return { exists: true, isGlobal: true };
    try {
      const globalCheck = await apiCall('register/get/finance:token', { name: field });
      if (globalCheck.address) return { exists: true, isGlobal: true };
    } catch {}
    try {
      const nonGlobalCheck = await apiCall('register/get/finance:token', { address: field });
      if (nonGlobalCheck.address) return { exists: true, isGlobal: false };
    } catch {}
    return { exists: false, isGlobal: false };
  };

  const refreshMarket = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      
      // Check base token
      const baseStatus = await checkToken(baseTokenField);
      // Check quote token
      const quoteStatus = await checkToken(quoteTokenField);

      if (!baseStatus.exists || !quoteStatus.exists) {
        setRefreshing(false);
        return;
      }

      // Get attributes
      const baseTokenAttributes = await getTokenAttributes(baseTokenField, baseStatus.isGlobal);
      const quoteTokenAttributes = await getTokenAttributes(quoteTokenField, quoteStatus.isGlobal);

      if (!baseTokenAttributes || !quoteTokenAttributes) {
        setRefreshing(false);
        return;
      }
      
      // Set the market pair
      const marketPair = `${baseTokenField}/${quoteTokenField}`;
      dispatch(setMarketPair(
        marketPair,
        baseTokenField,
        quoteTokenField,
        baseTokenAttributes.maxsupply,
        quoteTokenAttributes.maxsupply,
        baseTokenAttributes.currentsupply,
        quoteTokenAttributes.currentsupply,
        baseTokenAttributes.decimals,
        quoteTokenAttributes.decimals,
        baseTokenAttributes.address,
        quoteTokenAttributes.address
      ));

      await dispatch(fetchMarketData());

    } finally {
      setRefreshing(false);
    }
  };

  return [refreshing, refreshMarket];
}

export default function RefreshButton({ baseTokenField, quoteTokenField }) {
  const [refreshing, refreshMarket] = useRefreshMarket(baseTokenField, quoteTokenField);
  
  return (
    <Tooltip.Trigger tooltip="Refresh">
      <Button square skin="plain" onClick={refreshMarket}>
        <Icon
          icon={{ url: 'syncing.svg', id: 'icon' }}
          style={
            refreshing
              ? {
                  animation: `${spin} 2s linear infinite`,
                }
              : undefined
          }
        />
      </Button>
    </Tooltip.Trigger>
  );
}

