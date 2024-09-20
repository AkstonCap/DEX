import { listMarket, DEFAULT_MARKET_PAIR } from './listMarket';

export const fetchVolume = async (
  inputMarket = DEFAULT_MARKET_PAIR, 
  checkingMarket, 
  setCheckingMarket, 
  setOrderTokenVolume,
  setBaseTokenVolume, 
  showErrorDialog,
  timeFilter = '1d'
) => {
    if (checkingMarket) return;
    try {
      setCheckingMarket(true);
      const pair = inputMarket;
      const data = await listMarket(pair, 'executed', 'time', 'desc', timeFilter, 0);

      //const data = [...dataInit.bids, ...dataInit.asks]; // Adjust this if data structure is different

      let orderTokenVolume = 0;
      let baseTokenVolume = 0;
      data.forEach((item) => {
        orderTokenVolume += item.order.amount;
        baseTokenVolume += item.contract.amount; // Adjust this if base token volume calculation is different
      });

      setOrderTokenVolume(orderTokenVolume);
      setBaseTokenVolume(baseTokenVolume);

    } catch (error) {
      showErrorDialog({
        message: 'Cannot get volume',
        note: error?.message || 'Unknown error',
      });
    } finally {
      setCheckingMarket(false);
    }
};