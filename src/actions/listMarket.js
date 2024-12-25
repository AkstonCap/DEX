import { 
  apiCall, 
  showErrorDialog 
} from 'nexus-module';
import { DEFAULT_MARKET_PAIR } from 'App/Main';
//const DEFAULT_MARKET_PAIR = 'DIST/NXS';

export const listMarket = async (
  marketPair = DEFAULT_MARKET_PAIR, 
  path,
  dataFilter = '',
  dataOperator = '',  
  sort = 'time',
  asc_desc = 'desc', 
  timeFilter = 'all',
  numOfRes = 0,
  typeFilter = null
) => {
  try {
    /*
    const params = {
      market: marketPair
      limit: numOfRes,
      sort: sort,
      order: asc_desc,
      where: {
        }
    };
    */
    const now = Date.now();
    const timeFilters = {
      '1d': now - 24 * 60 * 60 * 1000,
      '1w': now - 7 * 24 * 60 * 60 * 1000,
      '1m': now - 30 * 24 * 60 * 60 * 1000,
      '1y': now - 365 * 24 * 60 * 60 * 1000,
      'all': 0,
    };

    if (!timeFilters.hasOwnProperty(timeFilter)) {
      showErrorDialog('Invalid time filter value (listMarket)');
      return {
        bids: [],
        asks: []
      }
    }
    /*
    const filtering = {
      where: {
        timestamp: {
          gt: timeFilters[timeFilter] || 0,
        },
        ...(typeFilter && { type: {
          eq: typeFilter
        } }),
      },
    }
    */
    // Calling Nexus API to get the list from market
    const resultInit = await apiCall(
      'market/list/' + path + dataFilter + dataOperator,
      { market: marketPair } //params 
    ).catch((error) => {
      showErrorDialog('Error fetching API market/list/ (listMarket):', error);
      return {
        bids: [],
        asks: []
      }
    });

    // Adjusting NXS amounts
    const [baseToken, quoteToken] = marketPair.split('/');
    if (quoteToken === 'NXS') {
      resultInit.bids.forEach(element => {
        element.contract.amount = element.contract.amount / 1e6;
        element.price = element.price / 1e6;
      });
      resultInit.asks.forEach(element => {
        element.order.amount = element.order.amount / 1e6;
      });
    } else if (baseToken === 'NXS') {
      resultInit.bids.forEach(element => {
        element.order.amount = element.order.amount / 1e6;
      });
      resultInit.asks.forEach(element => {
        element.contract.amount = element.contract.amount / 1e6;
        element.price = element.price / 1e6;
      });
    }

    // Preliminary fix of price bug
    resultInit.bids.forEach(element => {
      const calculatedPrice = element.contract.amount / element.order.amount;
      if (element.price !== calculatedPrice) {
        element.price = calculatedPrice;
      }
    });
    resultInit.asks.forEach(element => {
      const calculatedPrice = element.order.amount / element.contract.amount;
      if (element.price !== calculatedPrice) {
        element.price = calculatedPrice;
      }
    });

    // Combining bids and asks
    let resultArray = [];
    if ((path === 'executed' || path === 'order') && (resultInit.bids && resultInit.asks)) {
      resultArray = [...resultInit.bids, ...resultInit.asks]; // Add this line to combine bids and asks
    } else if ((path === 'bid' || !resultInit.asks) && resultInit.bids?.length > 0) {
      resultArray = [...resultInit.bids ];
    } else if ((path === 'ask' || !resultInit.bids) && resultInit.asks?.length > 0) {
      resultArray = [...resultInit.asks ];
    } else {
      resultArray = [];
      showErrorDialog('Empty data from API (listMarket)');
      return {
        bids: [],
        asks: []
      }
    }

    // Filtering results based on timefilter
    const filteredResultTime = Array.isArray(resultArray) ? resultArray.filter((item) => { 
      const itemTime = new Date(item.timestamp).getTime();
      return itemTime > (timeFilters[timeFilter] || 0);
    }) : [];

    // Filtering results based on typefilter
    const filteredResult = Array.isArray(filteredResultTime) ? filteredResultTime.filter((item) => {
      if (typeFilter) {
        return item.type === typeFilter;
      }
      return true;
    }) : [];

    // Sorting results based on what to sort, and asc or desc
    const sortFunctions = {
      'time': (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
      'price': (a, b) => (b.contract.amount / b.order.amount) - (a.contract.amount / a.order.amount),
      // 'price': (a, b) => b.price - a.price,
      'volumeQuote': (a, b) => b.contract.amount - a.contract.amount,
      'volumeBase': (a, b) => b.order.amount - a.order.amount
    };
    if (asc_desc === 'asc') {
      sortFunctions.price = (a, b) => (a.contract.amount / a.order.amount) - (b.contract.amount / b.order.amount);
      // sortFunctions.price = (a, b) => a.price - b.price;
      sortFunctions.time = (a, b) => new Date(a.timestamp) - new Date(b.timestamp);
      sortFunctions.volumeQuote = (a, b) => a.contract.amount - b.contract.amount;
      sortFunctions.volumeBase = (a, b) => a.order.amount - b.order.amount;
    }

    // Filtering results based on typefilter
    const bids = Array.isArray(filteredResult) ? filteredResult.filter((item) => item.type === 'bid') : [];
    const asks = Array.isArray(filteredResult) ? filteredResult.filter((item) => item.type === 'ask') : [];

    let sortedBids;
    let sortedAsks;
    if (numOfRes > 0) {
      //sortedResult = filteredResult.sort(sortFunctions[sort]).slice(0, numOfRes);
      sortedBids = bids.sort(sortFunctions[sort]).slice(0, numOfRes);
      sortedAsks = asks.sort(sortFunctions[sort]).slice(0, numOfRes);
    } else if (numOfRes === 0) {
      //sortedResult = filteredResult.sort(sortFunctions[sort]);
      sortedBids = bids.sort(sortFunctions[sort]);
      sortedAsks = asks.sort(sortFunctions[sort]);
    } else {
      showErrorDialog('Invalid input for number of results (listMarket)');
      return {
        bids: [],
        asks: []
      }
    }

    const sortedResult = {
      bids: sortedBids,
      asks: sortedAsks
    };

    // return sorted result;
    return sortedResult;
  } catch (error) {
    showErrorDialog('Error listing market (listMarket):', error);
    return {
      bids: [],
      asks: []
    }
  }
};