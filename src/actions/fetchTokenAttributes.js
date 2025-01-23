import { apiCall, showErrorDialog } from 'nexus-module';
import { setMarketPair } from 'actions/actionCreators';

export const refreshMarket = (baseToken, quoteToken) => async dispatch => {
    try {
      const baseTokenData = baseToken !== 'NXS' 
        ? await apiCall('register/get/finance:token/decimals,currentsupply,maxsupply', { name: baseToken })
        : { decimals: 8, currentsupply: 0, maxsupply: 0 };
        
      const quoteTokenData = quoteToken !== 'NXS'
        ? await apiCall('register/get/finance:token/decimals,currentsupply,maxsupply', { name: quoteToken })
        : { decimals: 8, currentsupply: 0, maxsupply: 0 };
  
      dispatch(setMarketPair(
        baseToken,
        quoteToken, 
        baseTokenData.maxsupply,
        quoteTokenData.maxsupply,
        baseTokenData.currentsupply,
        quoteTokenData.currentsupply,
        baseTokenData.decimals,
        quoteTokenData.decimals
      ));

    } catch (error) {
      dispatch(showErrorDialog('Error refreshing token data', error));
    }
  };