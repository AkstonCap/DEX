export const setMarketPair = (
    orderToken, 
    baseToken,
    setMarketPairState 
) => {
    const concatenatedMarket = `${orderToken}/${baseToken}`;
    setMarketPairState(concatenatedMarket);
}