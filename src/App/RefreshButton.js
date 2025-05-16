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
  
  const refreshMarket = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      
      let baseTokenAttributes;
      let quoteTokenAttributes;
      let baseTokenExist;
      let quoteTokenExist;
      
      // Check token attributes if not NXS, and if existing with global name
      if ( baseTokenField !== 'NXS' ) {
        
        baseTokenAttributes = await apiCall(
          'register/get/finance:token/decimals,currentsupply,maxsupply,address', 
          { name: baseTokenField }
        ).catch((error) => {
          baseTokenExist = false;
          dispatch(showErrorDialog({
            message: 'Cannot get base token attributes from apiCall',
            note: error?.message || 'Unknown error',
          }));
        });

        if (baseTokenExist !== false) {
          baseTokenExist = true;
        } 

      } else if (baseTokenField === 'NXS') {
        baseTokenExist = true;
        baseTokenAttributes = {
          decimals: 8,
          currentsupply: 0,
          maxsupply: 0,
          address: '0'
        }
      } else {
        baseTokenExist = false;
      }

      if ( quoteTokenField !== 'NXS' ) {
        quoteTokenAttributes = await apiCall(
          'register/get/finance:token/decimals,currentsupply,maxsupply,address', 
          { name: quoteTokenField }
        ).catch((error) => {
          quoteTokenExist = false;
          dispatch(showErrorDialog({
            message: 'Cannot get quote token attributes from apiCall',
            note: error?.message || 'Unknown error',
          }));
          }
        );

        if (quoteTokenExist !== false) {
          quoteTokenExist = true;
        }

      } else if (quoteTokenField === 'NXS') {
        quoteTokenExist = true;
        quoteTokenAttributes = {
          decimals: 8,
          currentsupply: 0,
          maxsupply: 0,
          address: '0'
        }
      } else {
        quoteTokenExist = false;
      }

      // Set the market pair if tokens exists
      if (baseTokenExist === true && quoteTokenExist === true) {

        dispatch(setMarketPair(
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

        await dispatch(fetchMarketData())
      }
      
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

