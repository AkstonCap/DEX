// Based on github.com/Nexusoft/nexus-market-data-module/src/App/RefreshButton.js
import { keyframes } from '@emotion/react';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Icon, Tooltip, Button } from 'nexus-module';
import { setMarketPair } from 'actions/actionCreators';
import { fetchMarketData } from 'actions/fetchMarketData';

const spin = keyframes`
  from {
      transform:rotate(0deg);
  }
  to {
      transform:rotate(360deg);
  }
`;

function useRefreshMarket(baseTokenField, quoteTokenField) {
  const [refreshing, setRefreshing] = useState(false);
  const dispatch = useDispatch();
  
  const refreshMarket = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      dispatch(setMarketPair(baseTokenField, quoteTokenField)),
      await dispatch(fetchMarketData())
    } finally {
      setRefreshing(false);
    }
  };

  return [refreshing, refreshMarket];
}

export default function RefreshButton({ baseTokenField, quoteTokenField }) {
  const [refreshing, refreshMarket] = useRefreshMarket(baseTokenField, quoteTokenField);
  
  return (
    <Tooltip.Trigger tooltip="Refresh">
      <Button square skin="plain" onClick={refreshMarket}>
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

