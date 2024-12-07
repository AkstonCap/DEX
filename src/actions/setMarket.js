import { setMarketPair } from './actionCreators';

export const updateMarket = (newOrderToken, newBaseToken) => {
    setMarketPair(newOrderToken, newBaseToken);
    /*setBaseToken(newBaseToken);
    setOrderToken(newOrderToken);
    const concatenatedMarket = `${newOrderToken}/${newBaseToken}`;
    setMarketPair(concatenatedMarket);*/
}