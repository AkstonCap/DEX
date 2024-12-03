import { keyframes } from '@emotion/react';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Icon, Tooltip, Button } from 'nexus-module';
//import { setMarketPair } from 'actions/actionCreators';

const spin = keyframes`
  from {
      transform:rotate(0deg);
  }
  to {
      transform:rotate(360deg);
  }
`;

export default function RefreshButton() {
  //const [refreshing, setRefreshing] = useRefreshMarket();
  return (
    <Tooltip.Trigger tooltip="Refresh">
      <Button square skin="plain" onClick={handleClick} disabled={refreshing || disabled}>
        <Icon
          icon={{ url: 'syncing.svg', id: 'icon' }}
          style={
            refreshing
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
