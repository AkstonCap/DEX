export const fetchVolumeData = ( 
  executedOrders
) => {

  const dataBids = executedOrders.bids || [];
  const dataAsks = executedOrders.asks || [];

  let quoteTokenVolumeBids = 0;
  let baseTokenVolumeBids = 0;
  let quoteTokenVolumeAsks = 0;
  let baseTokenVolumeAsks = 0;

  dataBids.forEach((item) => {
    baseTokenVolumeBids += item.order.amount;
    quoteTokenVolumeBids += item.contract.amount; // Adjust this if base token volume calculation is different
  });
  dataAsks.forEach((item) => {
    baseTokenVolumeAsks += item.contract.amount;
    quoteTokenVolumeAsks += item.order.amount; // Adjust this if base token volume calculation is different
  });
  const baseTokenVolume = baseTokenVolumeBids + baseTokenVolumeAsks;
  const quoteTokenVolume = quoteTokenVolumeBids + quoteTokenVolumeAsks;

  return {
    baseTokenVolume,
    quoteTokenVolume,
  };

};