export const fetchVolumeData = ( 
  orderToken,
  baseToken,
  executedOrders
) => {

  dataBids = executedOrders.bids;
  dataAsks = executedOrders.asks;
      
      //const data = [...dataInit.bids, ...dataInit.asks]; // Adjust this if data structure is different
  let oMULTIPLIER, bMULTIPLIER;
  if (orderToken !== 'NXS'  && baseToken === 'NXS') {
    oMULTIPLIER = 1;
    bMULTIPLIER = 1e-6;
  } else if (orderToken === 'NXS' && baseToken !== 'NXS') {
    oMULTIPLIER = 1e-6;
    bMULTIPLIER = 1;
  } else {
    oMULTIPLIER = 1;
    bMULTIPLIER = 1;
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
  const orderTokenVolume = (orderTokenVolumeBids + orderTokenVolumeAsks) * oMULTIPLIER;
  const baseTokenVolume = (baseTokenVolumeBids + baseTokenVolumeAsks) * bMULTIPLIER;

  return {
    orderTokenVolume,
    baseTokenVolume,
  };

};