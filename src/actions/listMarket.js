import { 
  apiCall, 
  showErrorDialog 
} from 'nexus-module';

const DEFAULT_MARKET_PAIR = 'DIST/NXS';

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
    const params = {
      market: marketPair
    };

    const now = Date.now();
    const timeFilters = {
      '1d': now - 24 * 60 * 60 * 1000,
      '1w': now - 7 * 24 * 60 * 60 * 1000,
      '1m': now - 30 * 24 * 60 * 60 * 1000,
      '1y': now - 365 * 24 * 60 * 60 * 1000,
      'all': 0,
    };

    if (!timeFilters.hasOwnProperty(timeFilter)) {
      throw new Error('Invalid filter value');
    }

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

    // Calling Nexus API to get the list from market
    const resultInit = await apiCall(
      'market/list/' + path + dataFilter + dataOperator,
      { market: marketPair } //params 
    ).catch((error) => {
      showErrorDialog('Error listing market:', error);
    });

    
    // Check if result is a JSON string and parse it
    if (typeof result === 'string') {
      result = JSON.parse(result);
    }

    let result = [];
    if (path === 'executed' || path === 'order') {
      result = [...resultInit.bids, ...resultInit.asks]; // Add this line to combine bids and asks
    } else if (path === 'bid') {
      result = [...resultInit.bids ];
    } else if (path === 'ask') {
      result = [...resultInit.asks ];
    }

    // Filtering results based on timefilter
    const filteredResultTime = Array.isArray(result) ? result.filter((item) => { 
      const itemTime = new Date(item.timestamp).getTime();
      return itemTime > (timeFilters[timeFilter] || 0);
    }) : [];

    // Filtering results based on typefilter
    const filteredResult = Array.isArray(result) ? filteredResultTime.filter((item) => {
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
      'volumeBase': (a, b) => b.contract.amount - a.contract.amount,
      'volumeOrder': (a, b) => b.order.amount - a.order.amount
    };
    if (asc_desc === 'asc') {
      sortFunctions.price = (a, b) => (a.contract.amount / a.order.amount) - (b.contract.amount / b.order.amount);
      // sortFunctions.price = (a, b) => a.price - b.price;
      sortFunctions.time = (a, b) => new Date(a.timestamp) - new Date(b.timestamp);
      sortFunctions.volumeBase = (a, b) => a.contract.amount - b.contract.amount;
      sortFunctions.volumeOrder = (a, b) => a.order.amount - b.order.amount;
    }

    let sortedResult;
    if (numOfRes > 0) {
      sortedResult = filteredResult.sort(sortFunctions[sort]).slice(0, numOfRes);
    } else if (numOfRes === 0) {
      sortedResult = filteredResult.sort(sortFunctions[sort]);
    } else {
      showErrorDialog('Invalid number of results');
    }

    // return sorted result;
    return sortedResult;
  } catch (error) {
    showErrorDialog('Error listing market:', error);
  }
};