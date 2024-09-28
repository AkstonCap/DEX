import { keyframes } from '@emotion/react';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Icon, Tooltip, Button } from 'nexus-module';

const spin = keyframes`
  from {
      transform:rotate(0deg);
  }
  to {
      transform:rotate(360deg);
  }
`;

export default function RefreshButton({ onClick, disabled }) {
  const [refreshing, setRefreshing] = useState(false);

  const handleClick = () => {
    setRefreshing(true);
    if (onClick) onClick();
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  };

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
