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
      const dataBids = await listMarket(
        pair, 
        'executed', 
        '', 
        'time', 
        'desc', 
        timeFilter, 
        0, 
        'Bid'
      );
      const dataAsks = await listMarket(
        pair, 
        'executed', 
        '', 
        'time', 
        'desc', 
        timeFilter, 
        0, 
        'Ask'
      );

      //const data = [...dataInit.bids, ...dataInit.asks]; // Adjust this if data structure is different

      let orderTokenVolumeBids = 0;
      let baseTokenVolumeBids = 0;
      let orderTokenVolumeAsks = 0;
      let baseTokenVolumeAsks = 0;

      dataBids.forEach((item) => {
        orderTokenVolumeBids += item.order.amount;
        baseTokenVolumeBids += item.contract.amount; // Adjust this if base token volume calculation is different
      });
      dataAsks.forEach((item) => {
        orderTokenVolumeAsks += item.contract.amount;
        baseTokenVolumeAsks += item.order.amount; // Adjust this if base token volume calculation is different
      });
      const orderTokenVolume = orderTokenVolumeBids + orderTokenVolumeAsks;
      const baseTokenVolume = baseTokenVolumeBids + baseTokenVolumeAsks;

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