import { keyframes } from '@emotion/react';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Icon, Tooltip, Button } from 'nexus-module';
import { cancelOrder } from 'actions/placeOrder';

const spin = keyframes`
  from {
      transform:rotate(0deg);
  }
  to {
      transform:rotate(360deg);
  }
`;

function useCancelOrder( orderAddress ) {
  const [canceling, setCanceling] = useState(false);
  const dispatch = useDispatch();
  
  const cancelingOrder = async () => {
    if (canceling) return;
    setCanceling(true);
    try {
      cancelOrder(orderAddress, dispatch);
    } finally {
      setCanceling(false);
    }
  };

  return [canceling, cancelingOrder];
}

export default function DeleteButton({ orderAddress }) {
  const [canceling, cancelingOrder] = useCancelOrder(orderAddress);
  
  return (
    <Tooltip.Trigger tooltip="Refresh">
      <Button square skin="plain" onClick={cancelingOrder}>
        <Icon
          icon={{ url: 'syncing.svg', id: 'icon' }}
          style={
            canceling
              ? {
                  animation: `${spin} 2s linear infinite`,
                }
              : undefined
          }
        />
      </Button>
    </Tooltip.Trigger>
  );
}

