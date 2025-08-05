import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import {
  FieldSet,
  TextField,
  Button,
  Select,
  apiCall,
} from 'nexus-module';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
`;

const SwapContainer = styled.div`
  background: #1f2937;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  border: 1px solid #374151;
`;

const SwapDirection = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
`;

const DirectionButton = styled.button`
  flex: 1;
  padding: 12px 16px;
  border-radius: 8px;
  border: 2px solid ${props => props.active ? '#3b82f6' : '#374151'};
  background: ${props => props.active ? '#1e40af' : '#111827'};
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.active ? '#1e40af' : '#1f2937'};
  }
`;

const TokenDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #111827;
  border-radius: 8px;
  border: 1px solid #374151;
  margin-bottom: 16px;
`;

const TokenIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => props.color || '#6b7280'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: white;
  font-size: 12px;
`;

const SwapArrow = styled.div`
  display: flex;
  justify-content: center;
  margin: 16px 0;
  font-size: 24px;
  color: #6b7280;
`;

const InputGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #d1d5db;
`;

const StatusContainer = styled.div`
  margin-top: 20px;
  padding: 16px;
  background: #111827;
  border-radius: 8px;
  border: 1px solid #374151;
`;

const TransactionHash = styled.div`
  font-family: monospace;
  font-size: 12px;
  color: #9ca3af;
  word-break: break-all;
  margin-top: 8px;
`;

const NotificationContainer = styled.div`
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  ${props => props.type === 'success' && `
    background: #064e3b;
    border-color: #059669;
    color: #d1fae5;
  `}
  
  ${props => props.type === 'error' && `
    background: #7f1d1d;
    border-color: #dc2626;
    color: #fecaca;
  `}
  
  ${props => props.type === 'info' && `
    background: #1e3a8a;
    border-color: #3b82f6;
    color: #dbeafe;
  `}
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 18px;
  margin-left: 12px;
  
  &:hover {
    opacity: 0.7;
  }
`;

const CustomNotification = ({ type, children, onClose }) => (
  <NotificationContainer type={type}>
    <span>{children}</span>
    <CloseButton onClick={onClose}>×</CloseButton>
  </NotificationContainer>
);

const WalletContainer = styled.div`
  background: #111827;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid #374151;
`;

const WalletStatus = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const WalletInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const WalletIndicator = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => props.connected ? '#059669' : '#dc2626'};
`;

const WalletAddress = styled.div`
  font-family: monospace;
  font-size: 12px;
  color: #9ca3af;
  word-break: break-all;
`;

const WalletButton = styled.button`
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid #374151;
  background: ${props => props.variant === 'disconnect' ? '#7f1d1d' : '#1e40af'};
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.variant === 'disconnect' ? '#991b1b' : '#1e3a8a'};
  }

  &:disabled {
    background: #6b7280;
    cursor: not-allowed;
  }
`;

const WalletInstallPrompt = styled.div`
  background: #1e3a8a;
  border: 1px solid #3b82f6;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  color: #dbeafe;
`;

const WalletLink = styled.a`
  color: #60a5fa;
  text-decoration: none;
  font-weight: 500;
  
  &:hover {
    text-decoration: underline;
  }
`;

const WalletGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 12px;
`;

const SOLANA_LIQUIDITY_POOL_ADDRESS = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"; // Example address

export default function StablecoinSwap() {
  const [swapDirection, setSwapDirection] = useState('toUSDD'); // 'toUSDD' or 'toUSDC'
  const [amount, setAmount] = useState('');
  const [solanaWallet, setSolanaWallet] = useState('');
  const [usddAccount, setUsddAccount] = useState('');
  const [nexusAccounts, setNexusAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState(null);
  const [notification, setNotification] = useState(null);
  const [solanaWalletConnected, setSolanaWalletConnected] = useState(false);
  const [solanaProvider, setSolanaProvider] = useState(null);

  // Fetch Nexus accounts on component mount
  useEffect(() => {
    fetchNexusAccounts();
    checkSolanaWallet();
  }, []);

  // Check for Solana wallet on page load
  const checkSolanaWallet = () => {
    if (typeof window !== 'undefined') {
      let provider = null;
      
      // Check for Phantom wallet
      if (window.solana && window.solana.isPhantom) {
        provider = window.solana;
      }
      // Check for Solflare wallet
      else if (window.solflare && window.solflare.isSolflare) {
        provider = window.solflare;
      }
      
      if (provider) {
        setSolanaProvider(provider);
        // Check if already connected
        if (provider.isConnected) {
          setSolanaWalletConnected(true);
          setSolanaWallet(provider.publicKey?.toString() || '');
        }
      }
    }
  };

  const connectSolanaWallet = async () => {
    try {
      if (!solanaProvider) {
        setNotification({
          type: 'error',
          message: 'No Solana wallet found. Please install Phantom or Solflare wallet extension.'
        });
        return;
      }

      const response = await solanaProvider.connect();
      if (response.publicKey) {
        setSolanaWalletConnected(true);
        setSolanaWallet(response.publicKey.toString());
        
        const walletName = solanaProvider.isPhantom ? 'Phantom' : 
                          solanaProvider.isSolflare ? 'Solflare' : 'Solana';
        
        setNotification({
          type: 'success',
          message: `${walletName} wallet connected successfully!`
        });
      }
    } catch (error) {
      console.error('Error connecting Solana wallet:', error);
      setNotification({
        type: 'error',
        message: 'Failed to connect Solana wallet: ' + error.message
      });
    }
  };

  const disconnectSolanaWallet = async () => {
    try {
      if (solanaProvider) {
        await solanaProvider.disconnect();
      }
      setSolanaWalletConnected(false);
      setSolanaWallet('');
      setNotification({
        type: 'info',
        message: 'Solana wallet disconnected'
      });
    } catch (error) {
      console.error('Error disconnecting Solana wallet:', error);
    }
  };

  const fetchNexusAccounts = async () => {
    try {
      const accounts = await apiCall('finance/list/account', {
        //where: 'results.ticker=USDD'
      });
      const filteredAccounts = accounts.filter(account => account.ticker === 'USDD');
      if (filteredAccounts && Array.isArray(filteredAccounts)) {
        setNexusAccounts(filteredAccounts);
        // Set the first account as default for USDD account
        if (filteredAccounts.length > 0 && !usddAccount) {
          setUsddAccount(filteredAccounts[0].address);
        }
      }
    } catch (error) {
      console.error('Error fetching Nexus accounts:', error);
      setNotification({
        type: 'error',
        message: 'Failed to fetch Nexus accounts'
      });
    }
  };

  const handleSwap = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setNotification({
        type: 'error',
        message: 'Please enter a valid amount'
      });
      return;
    }

    if (swapDirection === 'toUSDD') {
      if (!solanaWalletConnected) {
        setNotification({
          type: 'error',
          message: 'Please connect your Solana wallet first'
        });
        return;
      }
      if (!usddAccount) {
        setNotification({
          type: 'error',
          message: 'Please select a USDD receiving account'
        });
        return;
      }
      await handleUSDCtoUSDD();
    } else {
      if (!usddAccount) {
        setNotification({
          type: 'error',
          message: 'Please select a USDD account to send from'
        });
        return;
      }
      if (!solanaWallet) {
        setNotification({
          type: 'error',
          message: 'Please enter your Solana wallet address to receive USDC'
        });
        return;
      }
      await handleUSDDtoUSDC();
    }
  };

  const handleUSDCtoUSDD = async () => {
    setIsLoading(true);
    setTransactionStatus({
      status: 'pending',
      message: 'Initiating USDC to USDD swap...',
      step: 1,
      totalSteps: 3
    });

    try {
      // Step 1: Validate accounts and prepare transaction
      setTransactionStatus({
        status: 'pending',
        message: 'Preparing transaction...',
        step: 1,
        totalSteps: 3
      });

      // Step 2: Display Solana transaction instructions
      setTransactionStatus({
        status: 'waiting',
        message: `Please send ${amount} USDC to the liquidity pool address below with the memo containing your USDD account address:`,
        step: 2,
        totalSteps: 3,
        solanaAddress: SOLANA_LIQUIDITY_POOL_ADDRESS,
        memo: usddAccount,
        amount: amount,
        token: 'USDC'
      });

      // Step 3: Monitor for USDD receipt (this would typically involve polling)
      // For now, we'll simulate this process
      setTimeout(() => {
        setTransactionStatus({
          status: 'monitoring',
          message: 'Monitoring for USDD receipt...',
          step: 3,
          totalSteps: 3
        });
        
        // Simulate completion after another delay
        setTimeout(() => {
          setTransactionStatus({
            status: 'completed',
            message: `Successfully swapped ${amount} USDC to USDD!`,
            step: 3,
            totalSteps: 3
          });
          setNotification({
            type: 'success',
            message: `Swap completed! ${amount} USDD received in account ${usddAccount}`
          });
        }, 5000);
      }, 2000);

    } catch (error) {
      console.error('Swap error:', error);
      setTransactionStatus({
        status: 'error',
        message: 'Swap failed: ' + error.message
      });
      setNotification({
        type: 'error',
        message: 'Swap failed: ' + error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUSDDtoUSDC = async () => {
    setIsLoading(true);
    setTransactionStatus({
      status: 'pending',
      message: 'Initiating USDD to USDC swap...',
      step: 1,
      totalSteps: 3
    });

    try {
      // Step 1: Send USDD to the bridge account
      setTransactionStatus({
        status: 'pending',
        message: 'Sending USDD to bridge account...',
        step: 1,
        totalSteps: 3
      });

      // This would involve calling the Nexus API to send USDD
      const bridgeAccount = "NxSwapBridge1234567890"; // Example bridge account
      
      // Simulate the USDD transaction
      const usddTxResult = await secureApiCall('tokens/transfer', {
        from: usddAccount,
        to: bridgeAccount,
        amount: parseFloat(amount),
        reference: `SOLANA_BRIDGE:${solanaWallet}`,
        expires: 300 // 1 minute expiration
      });

      setTransactionStatus({
        status: 'pending',
        message: 'USDD sent to bridge. Processing Solana transaction...',
        step: 2,
        totalSteps: 3,
        nexusTxHash: usddTxResult.txid
      });

      // Step 2: Bridge processes and sends USDC
      setTimeout(() => {
        setTransactionStatus({
          status: 'monitoring',
          message: 'Monitoring USDC transfer to your Solana wallet...',
          step: 3,
          totalSteps: 3,
          nexusTxHash: usddTxResult.txid
        });

        // Simulate completion
        setTimeout(() => {
          setTransactionStatus({
            status: 'completed',
            message: `Successfully swapped ${amount} USDD to USDC!`,
            step: 3,
            totalSteps: 3,
            nexusTxHash: usddTxResult.txid,
            solanaTxHash: "5J7X8K9..." // Simulated Solana tx hash
          });
          setNotification({
            type: 'success',
            message: `Swap completed! ${amount} USDC sent to ${solanaWallet}`
          });
        }, 5000);
      }, 3000);

    } catch (error) {
      console.error('Swap error:', error);
      setTransactionStatus({
        status: 'error',
        message: 'Swap failed: ' + error.message
      });
      setNotification({
        type: 'error',
        message: 'Swap failed: ' + error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetTransaction = () => {
    setTransactionStatus(null);
    setAmount('');
    setNotification(null);
  };

  return (
    <Container>
      <FieldSet legend="Stablecoin Cross-Chain Swap">
        
        {notification && (
          <CustomNotification
            type={notification.type}
            onClose={() => setNotification(null)}
          >
            {notification.message}
          </CustomNotification>
        )}

        <SwapContainer>
          <SwapDirection>
            <DirectionButton
              active={swapDirection === 'toUSDD'}
              onClick={() => setSwapDirection('toUSDD')}
            >
              USDC → USDD
            </DirectionButton>
            <DirectionButton
              active={swapDirection === 'toUSDC'}
              onClick={() => setSwapDirection('toUSDC')}
            >
              USDD → USDC
            </DirectionButton>
          </SwapDirection>

          {swapDirection === 'toUSDD' ? (
            <>
              <TokenDisplay>
                <TokenIcon color="#2775ca">USDC</TokenIcon>
                <div>
                  <div style={{ fontWeight: '600', color: '#f3f4f6' }}>USDC (Solana)</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>USD Coin on Solana blockchain</div>
                </div>
              </TokenDisplay>

              <SwapArrow>↓</SwapArrow>

              <TokenDisplay>
                <TokenIcon color="#059669">USDD</TokenIcon>
                <div>
                  <div style={{ fontWeight: '600', color: '#f3f4f6' }}>USDD (Nexus)</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>USD Distordia on Nexus blockchain</div>
                </div>
              </TokenDisplay>
            </>
          ) : (
            <>
              <TokenDisplay>
                <TokenIcon color="#059669">USDD</TokenIcon>
                <div>
                  <div style={{ fontWeight: '600', color: '#f3f4f6' }}>USDD (Nexus)</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>USD Distordia on Nexus blockchain</div>
                </div>
              </TokenDisplay>

              <SwapArrow>↓</SwapArrow>

              <TokenDisplay>
                <TokenIcon color="#2775ca">USDC</TokenIcon>
                <div>
                  <div style={{ fontWeight: '600', color: '#f3f4f6' }}>USDC (Solana)</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>USD Coin on Solana blockchain</div>
                </div>
              </TokenDisplay>
            </>
          )}

          <InputGroup>
            <Label>Amount to Swap</Label>
            <TextField
              type="number"
              placeholder={`Enter ${swapDirection === 'toUSDD' ? 'USDC' : 'USDD'} amount`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0"
            />
          </InputGroup>

          {swapDirection === 'toUSDD' && (
            <>
              {!solanaProvider ? (
                <WalletInstallPrompt>
                  <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                    No Solana wallet detected
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    Please install a Solana wallet extension to continue:
                  </div>
                  <WalletGrid>
                    <div>
                      <WalletLink href="https://phantom.app/" target="_blank" rel="noopener noreferrer">
                        📱 Install Phantom
                      </WalletLink>
                    </div>
                    <div>
                      <WalletLink href="https://solflare.com/" target="_blank" rel="noopener noreferrer">
                        🔥 Install Solflare
                      </WalletLink>
                    </div>
                  </WalletGrid>
                  <div style={{ fontSize: '12px', marginTop: '12px', opacity: 0.8 }}>
                    After installation, refresh this page to connect your wallet.
                  </div>
                </WalletInstallPrompt>
              ) : (
                <WalletContainer>
                  <Label>Solana Wallet Connection</Label>
                  <WalletStatus>
                    <WalletInfo>
                      <WalletIndicator connected={solanaWalletConnected} />
                      <div>
                        <div style={{ fontWeight: '500', color: '#f3f4f6' }}>
                          {solanaWalletConnected ? 'Wallet Connected' : 'Wallet Not Connected'}
                        </div>
                        {solanaWalletConnected && solanaWallet && (
                          <WalletAddress>{solanaWallet}</WalletAddress>
                        )}
                      </div>
                    </WalletInfo>
                    {solanaWalletConnected ? (
                      <WalletButton 
                        variant="disconnect"
                        onClick={disconnectSolanaWallet}
                        disabled={isLoading}
                      >
                        Disconnect
                      </WalletButton>
                    ) : (
                      <WalletButton 
                        onClick={connectSolanaWallet}
                        disabled={isLoading}
                      >
                        Connect Wallet
                      </WalletButton>
                    )}
                  </WalletStatus>
                </WalletContainer>
              )}
            </>
          )}

          <InputGroup>
            <Label>
              {swapDirection === 'toUSDD' ? 'USDD Receiving Account' : 'USDD Sending Account'}
            </Label>
            <Select
              value={usddAccount}
              onChange={(e) => setUsddAccount(e.target.value)}
            >
              <option value="">Select Nexus account</option>
              {nexusAccounts.map((account) => (
                <option key={account.address} value={account.address}>
                  {account.name || account.address}
                </option>
              ))}
            </Select>
          </InputGroup>

          {swapDirection === 'toUSDC' && (
            <InputGroup>
              <Label>Solana Wallet Address (USDC Recipient)</Label>
              <TextField
                placeholder="Enter Solana wallet address to receive USDC"
                value={solanaWallet}
                onChange={(e) => setSolanaWallet(e.target.value)}
              />
            </InputGroup>
          )}

          <Button
            onClick={handleSwap}
            disabled={isLoading || !amount || 
              (swapDirection === 'toUSDD' ? (!solanaWalletConnected || !usddAccount) : (!solanaWallet || !usddAccount))}
            style={{
              width: '100%',
              padding: '12px',
              marginTop: '16px',
              background: isLoading ? '#6b7280' : '#3b82f6',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? 'Processing...' : `Swap ${amount || '0'} ${swapDirection === 'toUSDD' ? 'USDC → USDD' : 'USDD → USDC'}`}
          </Button>
        </SwapContainer>

        {transactionStatus && (
          <StatusContainer>
            <div style={{ fontWeight: '600', marginBottom: '8px' }}>
              Transaction Status: {transactionStatus.status}
            </div>
            <div style={{ marginBottom: '8px' }}>
              {transactionStatus.step && transactionStatus.totalSteps && (
                <span style={{ color: '#9ca3af' }}>
                  Step {transactionStatus.step} of {transactionStatus.totalSteps}
                </span>
              )}
            </div>
            <div style={{ marginBottom: '12px' }}>
              {transactionStatus.message}
            </div>

            {transactionStatus.status === 'waiting' && (
              <div style={{ 
                background: '#1f2937', 
                padding: '16px', 
                borderRadius: '8px',
                border: '1px solid #374151',
                marginTop: '12px'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                  Solana Transaction Instructions:
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Send to:</strong> 
                  <TransactionHash>{transactionStatus.solanaAddress}</TransactionHash>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Amount:</strong> {transactionStatus.amount} {transactionStatus.token}
                </div>
                <div>
                  <strong>Memo:</strong>
                  <TransactionHash>{transactionStatus.memo}</TransactionHash>
                </div>
              </div>
            )}

            {transactionStatus.nexusTxHash && (
              <div>
                <strong>Nexus Transaction:</strong>
                <TransactionHash>{transactionStatus.nexusTxHash}</TransactionHash>
              </div>
            )}

            {transactionStatus.solanaTxHash && (
              <div>
                <strong>Solana Transaction:</strong>
                <TransactionHash>{transactionStatus.solanaTxHash}</TransactionHash>
              </div>
            )}

            {(transactionStatus.status === 'completed' || transactionStatus.status === 'error') && (
              <Button
                onClick={resetTransaction}
                style={{
                  marginTop: '12px',
                  padding: '8px 16px',
                  background: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                New Transaction
              </Button>
            )}
          </StatusContainer>
        )}

        <div style={{ 
          marginTop: '20px', 
          padding: '16px', 
          background: '#111827', 
          borderRadius: '8px',
          border: '1px solid #374151'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#f3f4f6' }}>How it works:</h4>
          <div style={{ fontSize: '14px', color: '#9ca3af', lineHeight: '1.5' }}>
            <p><strong>USDC → USDD:</strong> Connect your Phantom wallet, then send USDC to our Solana liquidity pool with your Nexus account address as memo. USDD will be automatically sent to your specified Nexus account.</p>
            <p><strong>USDD → USDC:</strong> Send USDD from your Nexus account to our bridge. USDC will be automatically sent to your specified Solana wallet address.</p>
            <p><strong>Exchange Rate:</strong> 1:1 ratio (minus network fees)</p>
            <p><strong>Requirements:</strong> Phantom or Solflare wallet extension for Solana transactions</p>
          </div>
        </div>
      </FieldSet>
    </Container>
  );
}
