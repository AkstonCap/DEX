//Based on https://github.com/Nexusoft/nexus-market-data-module/blob/master/src/App/RefreshButton.js
import { keyframes } from '@emotion/react';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Icon, Tooltip, Button } from 'nexus-module';
import { cancelOrder } from 'actions/placeOrder';
import { fetchMarketData } from 'actions/fetchMarketData';

const spin = keyframes`
  from {
      transform:rotate(0deg);
  }
  to {
      transform:rotate(360deg);
  }
`;

function useCancelOrder( txid ) {
  const [canceling, setCanceling] = useState(false);
  const dispatch = useDispatch();
  
  const cancelingOrder = async () => {
    if (canceling) return;
    setCanceling(true);
    try {
      const result = await dispatch(cancelOrder(txid));
      // Only refresh market data if cancellation was successful
      if (result && result.success) {
        dispatch(fetchMarketData());
      }
    } finally {
      setCanceling(false);
    }
  };

  return [canceling, cancelingOrder];
}

export default function DeleteButton({ txid }) {
  const [canceling, cancelingOrder] = useCancelOrder(txid);
  
  return (
    <Tooltip.Trigger tooltip="Delete">
      <Button 
        onClick={cancelingOrder}
        style={{
          width: '24px',
          height: '24px',
          padding: '4px'
        }}
      >
        <Icon
          icon={{ url: 'delete-simple.svg', id: 'icon' }}
        />
      </Button>
    </Tooltip.Trigger>
  );
}

