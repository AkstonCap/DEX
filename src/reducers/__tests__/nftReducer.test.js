/**
 * Tests for the NFT reducer state management
 */
import nftReducer from '../ui/nft';
import * as TYPE from 'actions/types';

describe('NFT Reducer', () => {
  const initialState = {
    listings: [],
    myAssets: [],
    selected: null,
    loading: false,
    filter: 'all',
  };

  it('should return initial state', () => {
    expect(nftReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
  });

  it('should handle SET_NFT_LISTINGS', () => {
    const listings = [
      { address: 'addr1', name: 'Art1' },
      { address: 'addr2', name: 'Art2' },
    ];
    const newState = nftReducer(initialState, {
      type: TYPE.SET_NFT_LISTINGS,
      payload: listings,
    });

    expect(newState.listings).toEqual(listings);
    expect(newState.myAssets).toEqual([]);
  });

  it('should handle SET_NFT_MY_ASSETS', () => {
    const assets = [{ address: 'my_addr', name: 'MyArt' }];
    const newState = nftReducer(initialState, {
      type: TYPE.SET_NFT_MY_ASSETS,
      payload: assets,
    });

    expect(newState.myAssets).toEqual(assets);
  });

  it('should handle SET_NFT_SELECTED', () => {
    const selected = { address: 'sel_addr', name: 'Selected' };
    const newState = nftReducer(initialState, {
      type: TYPE.SET_NFT_SELECTED,
      payload: selected,
    });

    expect(newState.selected).toEqual(selected);
  });

  it('should handle SET_NFT_SELECTED with null (deselect)', () => {
    const stateWithSelection = { ...initialState, selected: { address: 'x' } };
    const newState = nftReducer(stateWithSelection, {
      type: TYPE.SET_NFT_SELECTED,
      payload: null,
    });

    expect(newState.selected).toBeNull();
  });

  it('should handle SET_NFT_LOADING true', () => {
    const newState = nftReducer(initialState, {
      type: TYPE.SET_NFT_LOADING,
      payload: true,
    });

    expect(newState.loading).toBe(true);
  });

  it('should handle SET_NFT_LOADING false', () => {
    const loadingState = { ...initialState, loading: true };
    const newState = nftReducer(loadingState, {
      type: TYPE.SET_NFT_LOADING,
      payload: false,
    });

    expect(newState.loading).toBe(false);
  });

  it('should handle SET_NFT_FILTER', () => {
    const newState = nftReducer(initialState, {
      type: TYPE.SET_NFT_FILTER,
      payload: 'my_art',
    });

    expect(newState.filter).toBe('my_art');
  });

  it('should not mutate state on unknown action', () => {
    const state = { ...initialState, listings: [{ address: 'x' }] };
    const newState = nftReducer(state, { type: 'UNKNOWN' });

    expect(newState).toBe(state);
  });
});
