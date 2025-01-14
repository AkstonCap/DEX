// Based on github.com/Nexusoft/nexus-market-data-module/src/App/RefreshButton.js
import { keyframes } from '@emotion/react';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Icon, Tooltip, Button, apiCall } from 'nexus-module';
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
  
  const refreshMarket = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      let baseTokenAttributes;
      let quoteTokenAttributes;
      
      if ( baseTokenField !== 'NXS' ) {
        baseTokenAttributes = await apiCall(
          'register/get/finance:token/decimals,currentsupply,maxsupply', 
          { name: baseTokenField }
        ).catch((error) => {
          return { decimals: 'N/A', currentsupply: 'N/A', maxsupply: 'N/A' };
        });
      } else {
        baseTokenAttributes = {
          decimals: 8,
          currentsupply: 0,
          maxsupply: 0
        }
      }

      if ( quoteTokenField !== 'NXS' ) {
        quoteTokenAttributes = await apiCall(
          'register/get/finance:token/decimals,currentsupply,maxsupply', 
          { name: quoteTokenField }
        ).catch((error) => {
          return { decimals: 'N/A', currentsupply: 'N/A', maxsupply: 'N/A' };
        });
      } else {
        quoteTokenAttributes = {
          decimals: 8,
          currentsupply: 0,
          maxsupply: 0
        }
      }

      // Set the market pair - need to add check if tokens exists
      dispatch(setMarketPair(
        baseTokenField, 
        quoteTokenField, 
        baseTokenAttributes.maxsupply, 
        quoteTokenAttributes.maxsupply, 
        baseTokenAttributes.currentsupply, 
        quoteTokenAttributes.currentsupply,
        baseTokenAttributes.decimals,
        quoteTokenAttributes.decimals
      ));
      await dispatch(fetchMarketData())
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

