import * as TYPE from 'actions/types';

const initialState = {
  listings: [],
  myAssets: [],
  selected: null,
  loading: false,
  filter: 'all', // 'all', 'for_sale', 'my_art'
};

export default (state = initialState, action) => {
  switch (action.type) {
    case TYPE.SET_NFT_LISTINGS:
      return { ...state, listings: action.payload };
    case TYPE.SET_NFT_SELECTED:
      return { ...state, selected: action.payload };
    case TYPE.SET_NFT_MY_ASSETS:
      return { ...state, myAssets: action.payload };
    case TYPE.SET_NFT_LOADING:
      return { ...state, loading: action.payload };
    case TYPE.SET_NFT_FILTER:
      return { ...state, filter: action.payload };
    default:
      return state;
  }
};
