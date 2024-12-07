import { listMarket } from './listMarket';
//import { setBaseTokenVolume,setOrderTokenVolume } from './actionCreators';
import { showErrorDialog } from 'nexus-module';

export const fetchVolume = async (
  inputMarket = DEFAULT_MARKET_PAIR, 
  timeFilter = '1d',
  orderToken,
  baseToken
) => {
    try {
      const pair = inputMarket;
      const dataBids = await listMarket(
        pair, 
        'executed', 
        '/timestamp,contract.amount,order.amount',
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
        '/timestamp,contract.amount,order.amount',
        '', 
        'time', 
        'desc', 
        timeFilter, 
        0, 
        'Ask'
      );

      //const data = [...dataInit.bids, ...dataInit.asks]; // Adjust this if data structure is different

      if (orderToken === 'NXS') {
        MULTIPLIER = 1e6;
      } else if (baseToken === 'NXS') {
        MULTIPLIER = 1e-6;
      } else {
        MULTIPLIER = 1;
      }

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

      //setOrderTokenVolume(orderTokenVolume);
      //setBaseTokenVolume(baseTokenVolume);
      return {
        orderTokenVolume,
        baseTokenVolume,
      };
    } catch (error) {
      showErrorDialog({
        message: 'Cannot get volume',
        note: error?.message || 'Unknown error',
      });
      return {
        orderTokenVolume: 0,
        baseTokenVolume: 0,
      };
    }
};