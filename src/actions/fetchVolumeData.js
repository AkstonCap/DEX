export const fetchVolumeData = ( 
  executedOrders
) => {

  dataBids = executedOrders.bids || [];
  dataAsks = executedOrders.asks || [];

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

  return {
    orderTokenVolume,
    baseTokenVolume,
  };

};