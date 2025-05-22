// Based on github.com/Nexusoft/nexus-market-data-module/src/App/RefreshButton.js
import { keyframes } from '@emotion/react';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Icon, Tooltip, Button, apiCall, showErrorDialog } from 'nexus-module';
import { setMarketPair } from 'actions/actionCreators';
import { fetchMarketData } from 'actions/fetchMarketData';
//import market from 'reducers/ui/market';

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
      let baseTokenGlobal;
      let quoteTokenGlobal;
      let baseTokenNonGlobal;
      let quoteTokenNonGlobal;

      // Check if inserted baseTokenField and quoteTokenField are global names or token addresses
      if ( baseTokenField !== 'NXS' ) {
        
        const check = await apiCall('register/get/names:global',
          { name: baseTokenField }
        ).catch((error) => {
          baseTokenGlobal = false;
        });

        if (check.address) {
          baseTokenGlobal = true;
          baseTokenExist = true;
        } else {
          baseTokenGlobal = false;
        };

      } else {
        baseTokenGlobal = true;
        baseTokenExist = true;
      };

      if ( baseTokenGlobal === false ) {
        const check = await apiCall('register/get/finance:token',
          { address: baseTokenField }
        ).catch((error) => {
          baseTokenNonGlobal = false;
          baseTokenExist = false;
        });

        if (check.address) {
          baseTokenNonGlobal = true;
          baseTokenExist = true;
        } else {
          baseTokenNonGlobal = false;
          baseTokenExist = false;
        };
        
      };

      if ( quoteTokenField !== 'NXS' ) {
        
        const check = await apiCall('register/get/names:global',
          { name: quoteTokenField }
        ).catch((error) => {
          quoteTokenGlobal = false;
        });

        if (check.address) {
          quoteTokenGlobal = true;
          quoteTokenExist = true;
        } else {
          quoteTokenGlobal = false;
        };

      } else {
        quoteTokenGlobal = true;
      };

      if ( quoteTokenGlobal === false ) {
        const check = await apiCall('register/get/finance:token',
          { address: quoteTokenField }
        ).catch((error) => {
          quoteTokenNonGlobal = false;
          quoteTokenExist = false;
        });

        if (check.address) {
          quoteTokenNonGlobal = true;
          quoteTokenExist = true;
        } else {
          quoteTokenNonGlobal = false;
          quoteTokenExist = false;
        };
        
      };

      // Update token attributes if the token exists, and if existing with global name
      if ( baseTokenField !== 'NXS' && baseTokenGlobal === true ) {
        
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

        /*
        if (baseTokenExist !== false) {
          baseTokenExist = true;
        }
        */
      } else if (baseTokenField !== 'NXS' && baseTokenNonGlobal === true) {

        baseTokenAttributes = await apiCall(
          'register/get/finance:token/decimals,currentsupply,maxsupply,address', 
          { address: baseTokenField }
        ).catch((error) => {
          baseTokenExist = false;
          dispatch(showErrorDialog({
            message: 'Cannot get base token attributes from apiCall',
            note: error?.message || 'Unknown error',
          }));
        });

      } else if (baseTokenField === 'NXS') {
        //baseTokenExist = true;
        baseTokenAttributes = {
          decimals: 8,
          currentsupply: 0,
          maxsupply: 0,
          address: '0'
        }

      } else {
        baseTokenExist = false;
      }

      if ( quoteTokenField !== 'NXS' && quoteTokenGlobal === true ) {
        
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
        /*
        if (quoteTokenExist !== false) {
          quoteTokenExist = true;
        }
        */

      } else if (quoteTokenField !== 'NXS' && quoteTokenNonGlobal === true) {
        
        quoteTokenAttributes = await apiCall(
          'register/get/finance:token/decimals,currentsupply,maxsupply,address', 
          { address: quoteTokenField }
        ).catch((error) => {
          quoteTokenExist = false;
          dispatch(showErrorDialog({
            message: 'Cannot get quote token attributes from apiCall',
            note: error?.message || 'Unknown error',
          }));
        });

      } else if (quoteTokenField === 'NXS') {
        
        //quoteTokenExist = true;
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

