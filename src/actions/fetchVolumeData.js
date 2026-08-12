// Expects executed orders already normalized by utils/marketData.js - the raw
// core amounts would make every NXS volume 1e6 times too large.
export const fetchVolumeData = (
  executedOrders
) => {

  const dataBids = executedOrders?.bids || [];
  const dataAsks = executedOrders?.asks || [];

  let quoteTokenVolumeBids = 0;
  let baseTokenVolumeBids = 0;
  let quoteTokenVolumeAsks = 0;
  let baseTokenVolumeAsks = 0;

  // bid: order = base received, contract = quote paid
  dataBids.forEach((item) => {
    baseTokenVolumeBids += parseFloat(item.order?.amount) || 0;
    quoteTokenVolumeBids += parseFloat(item.contract?.amount) || 0;
  });
  // ask: contract = base sold, order = quote received
  dataAsks.forEach((item) => {
    baseTokenVolumeAsks += parseFloat(item.contract?.amount) || 0;
    quoteTokenVolumeAsks += parseFloat(item.order?.amount) || 0;
  });
  const baseTokenVolume = baseTokenVolumeBids + baseTokenVolumeAsks;
  const quoteTokenVolume = quoteTokenVolumeBids + quoteTokenVolumeAsks;

  return {
    baseTokenVolume,
    quoteTokenVolume,
  };

};