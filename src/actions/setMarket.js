import { setBaseToken, setMarketPair, setOrderToken } from './actionCreators';

export const setMarket = (newOrderToken, newBaseToken) => {
    setBaseToken(newBaseToken);
    setOrderToken(newOrderToken);
    const concatenatedMarket = `${newOrderToken}/${newBaseToken}`;
    setMarketPair(concatenatedMarket);
}