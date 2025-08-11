import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import {
  FieldSet,
  TextField,
  Button,
  Select,
  apiCall,
  secureApiCall,
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

// Wallet UI removed; swaps are initiated externally and tracked here by tx id

const SOLANA_LIQUIDITY_POOL_ADDRESS = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"; // Service receiving account
const SOLANA_RPC_URL = (typeof process !== 'undefined' && process.env && process.env.SOLANA_RPC_URL) || 'https://api.mainnet-beta.solana.com';
const USDC_MINT_MAINNET = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// Fees and limits
const MIN_SWAP_AMOUNT = 0.2; // both directions
const FLAT_FEE_USDC = 0.1; // flat fee in USDC
const PCT_FEE = 0.001; // 0.1%

const computeFees = (amt) => {
  const amount = Number(amt) || 0;
  const flat = FLAT_FEE_USDC;
  const pct = amount * PCT_FEE;
  const total = flat + pct;
  const expectedReceive = Math.max(0, amount - total);
  return { flat, pct, total, expectedReceive };
};

export default function StablecoinSwap() {
  const [swapDirection, setSwapDirection] = useState('toUSDD'); // 'toUSDD' or 'toUSDC'
  const [amount, setAmount] = useState('');
  const [solanaWallet, setSolanaWallet] = useState('');
  const [usddAccount, setUsddAccount] = useState('');
  const [nexusAccounts, setNexusAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState(null);
  const [notification, setNotification] = useState(null);
  // Solana wallet connection removed
  const [solanaTxId, setSolanaTxId] = useState('');
  const [solanaPollId, setSolanaPollId] = useState(null);
  const [nexusPollId, setNexusPollId] = useState(null);
  const [nexusBaselineBalance, setNexusBaselineBalance] = useState(null);
  const [expectedUsdd, setExpectedUsdd] = useState(null);
  // USDD -> USDC tracking
  const [nexusDebitTxId, setNexusDebitTxId] = useState(null);
  const [nexusDebitPollId, setNexusDebitPollId] = useState(null);
  const [solanaCreditPollId, setSolanaCreditPollId] = useState(null);
  const [recipientOwnerForCredit, setRecipientOwnerForCredit] = useState(null);

  // Fetch Nexus accounts on component mount
  useEffect(() => {
    fetchNexusAccounts();
  }, []);

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
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setNotification({ type: 'error', message: 'Please enter a valid amount' });
      return;
    }
    if (amt < MIN_SWAP_AMOUNT) {
      setNotification({ type: 'error', message: `Minimum swap amount is ${MIN_SWAP_AMOUNT}` });
      return;
    }

    if (swapDirection === 'toUSDD') {
      if (!usddAccount) {
        setNotification({ type: 'error', message: 'Please select a USDD receiving account' });
        return;
      }
      await handleUSDCtoUSDD();
    } else {
      if (!usddAccount) {
        setNotification({ type: 'error', message: 'Please select a USDD account to send from' });
        return;
      }
      if (!solanaWallet) {
        setNotification({ type: 'error', message: 'Please enter your Solana wallet address to receive USDC' });
        return;
      }
      await handleUSDDtoUSDC();
    }
  };

  const handleUSDCtoUSDD = async () => {
    setIsLoading(true);
    setTransactionStatus({ status: 'pending', message: 'Initiating USDC to USDD swap...', step: 1, totalSteps: 3 });

    try {
      // Step 1: Validate accounts and prepare transaction
      setTransactionStatus({ status: 'pending', message: 'Preparing transaction...', step: 1, totalSteps: 3 });

      const { expectedReceive } = computeFees(amount);

      // Step 2: Display Solana transaction instructions
      setTransactionStatus({
        status: 'waiting',
        message: `Please send ${amount} USDC to the service with memo in the exact format: nexus: <USDD_account>`,
        step: 2,
        totalSteps: 3,
        solanaAddress: SOLANA_LIQUIDITY_POOL_ADDRESS,
        memo: `nexus: ${usddAccount}`,
        amount: amount,
        token: 'USDC',
        expectedAfterFees: expectedReceive,
      });

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

  // --- Solana helpers ---
  const solanaRpc = async (method, params) => {
    const res = await fetch(SOLANA_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    if (!res.ok) throw new Error(`RPC ${method} failed: ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error.message || 'RPC error');
    return json.result;
  };

  const getParsedAccountInfo = async (address) => {
    try {
      return await solanaRpc('getAccountInfo', [address, { encoding: 'jsonParsed', commitment: 'confirmed' }]);
    } catch (e) {
      return null;
    }
  };

  const ensureUsdcAtaExists = async (address) => {
    if (!address) return { ok: false };

    // Case 1: Address might be a token account. If so, verify it's USDC and initialized.
    const acct = await getParsedAccountInfo(address);
    const parsed = acct?.value?.data?.parsed;
    if (parsed?.type === 'account') {
      const info = parsed?.info;
      if (info?.mint === USDC_MINT_MAINNET && info?.state === 'initialized') {
        // Use the owner of this token account for payout monitoring
        return { ok: true, owner: info.owner };
      }
    }

    // Case 2: Treat address as an owner; ensure at least one USDC token account exists
    try {
      const resp = await solanaRpc('getTokenAccountsByOwner', [address, { mint: USDC_MINT_MAINNET }, { encoding: 'jsonParsed', commitment: 'confirmed' }]);
      const hasAny = Array.isArray(resp?.value) && resp.value.length > 0;
      if (hasAny) return { ok: true, owner: address };
    } catch {}

    return { ok: false };
  };

  const decodeMemoFromTx = (tx) => {
    try {
      const instructions = tx?.transaction?.message?.instructions || [];
      // jsonParsed returns program as 'spl-memo'
      const memoIx = instructions.find(ix => ix.program === 'spl-memo');
      if (memoIx && typeof memoIx.parsed === 'string') return memoIx.parsed;
      // Fallback: raw base64 data
      const memoIx2 = instructions.find(ix => ix.programId === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
      if (memoIx2 && memoIx2.data) {
        try { return atob(memoIx2.data); } catch {}
      }
    } catch {}
    return null;
  };

  const extractUsdcTransfer = (tx) => {
    try {
      const instructions = tx?.transaction?.message?.instructions || [];
      // Find a spl-token transfer to the service address with USDC mint
      for (const ix of instructions) {
        if (ix.program === 'spl-token' && ix.parsed && (ix.parsed.type === 'transferChecked' || ix.parsed.type === 'transfer')) {
          const info = ix.parsed.info || {};
          const dest = info.destination || info.dest || info.account || '';
          const mint = info.mint || '';
          const amountUi = info.tokenAmount?.uiAmount ?? (info.amount && info.decimals != null ? Number(info.amount) / Math.pow(10, info.decimals) : undefined);
          if (dest === SOLANA_LIQUIDITY_POOL_ADDRESS && mint === USDC_MINT_MAINNET) {
            return { amountUi: Number(amountUi) || 0, mint, dest };
          }
        }
      }
    } catch {}
    return null;
  };

  const checkSolanaTxOnce = async (txid) => {
    if (!txid) {
      setNotification({ type: 'error', message: 'Please paste the Solana USDC transaction signature' });
      return { found: false };
    }
    setIsLoading(true);
    try {
      const tx = await solanaRpc('getTransaction', [txid, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed' }]);
      if (!tx) {
        setTransactionStatus(prev => ({
          ...(prev || {}),
          status: 'monitoring',
          message: 'Transaction not found or not yet confirmed. Waiting...',
          step: 2,
          totalSteps: 3,
          solanaTxHash: txid,
        }));
        return { found: false };
      }
      if (tx?.meta?.err) {
        setTransactionStatus({ status: 'error', message: 'Solana transaction failed', solanaTxHash: txid });
        return { found: true, failed: true };
      }
      const memo = decodeMemoFromTx(tx);
      const transfer = extractUsdcTransfer(tx);
      if (!transfer) {
        setTransactionStatus({ status: 'error', message: 'No USDC transfer to the service address found in this transaction', solanaTxHash: txid });
        return { found: true, failed: true };
      }
      const memoOk = typeof memo === 'string' && memo.toLowerCase().startsWith('nexus: ');
      const memoAccount = memoOk ? memo.slice(7).trim() : '';
      if (!memoOk) {
        setTransactionStatus({ status: 'refunded', message: 'Invalid memo format. Expected: "nexus: <USDD_account>"', solanaTxHash: txid });
        setNotification({ type: 'error', message: 'Invalid memo format. Service will refund.' });
        return { found: true, failed: true };
      }
      // If user selected an account, require it matches the memo
      if (usddAccount && memoAccount && memoAccount !== usddAccount) {
        setTransactionStatus({ status: 'refunded', message: 'Memo account does not match selected USDD account. Service will refund.', solanaTxHash: txid });
        setNotification({ type: 'error', message: 'Memo account mismatch. Refund expected.' });
        return { found: true, failed: true };
      }

      // Valid tx → proceed to monitor Nexus incoming USDD
      const expected = Number(transfer.amountUi || 0);
      const { expectedReceive } = computeFees(expected);
      setExpectedUsdd(expectedReceive);
      setTransactionStatus({
        status: 'monitoring',
        message: `Solana tx confirmed. Expecting ~${expectedReceive} USDD to ${memoAccount || usddAccount} after fees. Monitoring Nexus...`,
        step: 3,
        totalSteps: 3,
        solanaTxHash: txid,
      });

      // capture current balance as baseline
      const baseline = await getNexusAccountBalance(memoAccount || usddAccount);
      if (baseline != null) setNexusBaselineBalance(baseline);

      return { found: true, failed: false, expected: expectedReceive, memoAccount: memoAccount || usddAccount };
    } catch (e) {
      setTransactionStatus({ status: 'error', message: `Solana query failed: ${e.message}` });
      setNotification({ type: 'error', message: `Solana query failed: ${e.message}` });
      return { found: false };
    } finally {
      setIsLoading(false);
    }
  };

  const startSolanaPolling = (txid) => {
    if (solanaPollId) clearInterval(solanaPollId);
    const id = setInterval(async () => {
      const res = await checkSolanaTxOnce(txid);
      if (res.found && !res.failed) {
        clearInterval(id);
        setSolanaPollId(null);
        startNexusPolling(res.memoAccount || usddAccount, res.expected);
      } else if (res.found && res.failed) {
        clearInterval(id);
        setSolanaPollId(null);
      }
    }, 8000);
    setSolanaPollId(id);
  };

  const startNexusPolling = (address, expected) => {
    if (!address || !expected) return;
    if (nexusPollId) clearInterval(nexusPollId);
    const id = setInterval(async () => {
      try {
        const bal = await getNexusAccountBalance(address);
        if (bal == null) return;
        let base = nexusBaselineBalance;
        if (base == null) { setNexusBaselineBalance(bal); return; }
        const delta = Number(bal) - Number(base);
        if (delta >= Number(expected) * 0.95) {
          clearInterval(id);
          setNexusPollId(null);
          setTransactionStatus(prev => ({ ...(prev || {}), status: 'completed', message: `USDD credited on Nexus. Amount ~${delta} to ${address}.` }));
          setNotification({ type: 'success', message: 'USDD received on Nexus' });
        }
      } catch {}
    }, 7000);
    setNexusPollId(id);
  };

  // --- Nexus helpers ---
  const getNexusAccountBalance = async (address) => {
    try {
      // Try a direct get
      const acc = await apiCall('finance/get/account', { address });
      if (acc && typeof acc.balance === 'number') return acc.balance;
    } catch {}
    try {
      // Fallback to list and find
      const all = await apiCall('finance/list/account');
      const found = Array.isArray(all) ? all.find(a => a.address === address) : null;
      if (found && typeof found.balance === 'number') return found.balance;
    } catch {}
    return null;
  };

  const getNexusTransactionStatus = async (txid) => {
    try {
      const tx = await apiCall('finance/get/transaction', { txid });
      return tx;
    } catch {}
    try {
      const tx = await apiCall('ledger/get/transaction', { txid });
      return tx;
    } catch {}
    return null;
  };

  const nexusTxIsConfirmed = (tx) => {
    if (!tx) return false;
    if (tx.confirmations != null) return tx.confirmations > 0;
    if (tx.status && typeof tx.status === 'string') return tx.status.toLowerCase() === 'confirmed';
    if (tx.timestamp) return true;
    return false;
  };

  const startNexusDebitPolling = (txid, expectedAmount, ownerForCredit) => {
    if (!txid) return;
    if (nexusDebitPollId) clearInterval(nexusDebitPollId);
    const id = setInterval(async () => {
      try {
        const tx = await getNexusTransactionStatus(txid);
        if (nexusTxIsConfirmed(tx)) {
          clearInterval(id);
          setNexusDebitPollId(null);
          setTransactionStatus(prev => ({
            ...(prev || {}),
            status: 'monitoring',
            message: 'USDD debit confirmed. Monitoring Solana for USDC credit...',
            step: 3,
            totalSteps: 3,
          }));
          startSolanaCreditPolling(txid, ownerForCredit || solanaWallet, expectedAmount);
        }
      } catch (e) {
        // keep polling on errors
      }
    }, 8000);
    setNexusDebitPollId(id);
  };

  const getOwnerUsdcDelta = (tx, owner) => {
    try {
      const pre = tx?.meta?.preTokenBalances || [];
      const post = tx?.meta?.postTokenBalances || [];
      let preAmt = 0;
      let postAmt = 0;
      for (const b of pre) {
        if (b.mint === USDC_MINT_MAINNET && b.owner === owner) {
          preAmt += Number(b.uiTokenAmount?.uiAmount || 0);
        }
      }
      for (const b of post) {
        if (b.mint === USDC_MINT_MAINNET && b.owner === owner) {
          postAmt += Number(b.uiTokenAmount?.uiAmount || 0);
        }
      }
      const delta = postAmt - preAmt;
      return delta;
    } catch {
      return 0;
    }
  };

  const startSolanaCreditPolling = (expectedMemo, recipientOwner, expectedAmount) => {
    if (!recipientOwner || !expectedMemo) return;
    if (solanaCreditPollId) clearInterval(solanaCreditPollId);
    const id = setInterval(async () => {
      try {
        const sigs = await solanaRpc('getSignaturesForAddress', [SOLANA_LIQUIDITY_POOL_ADDRESS, { limit: 30 }]);
        if (!Array.isArray(sigs)) return;
        for (const s of sigs) {
          const tx = await solanaRpc('getTransaction', [s.signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed' }]);
          if (!tx || tx?.meta?.err) continue;
          const memo = decodeMemoFromTx(tx) || '';
          if (!memo) continue;
          const memoMatch = memo.includes(expectedMemo);
          if (!memoMatch) continue;
          const delta = getOwnerUsdcDelta(tx, recipientOwner);
          if (delta >= expectedAmount * 0.95) {
            clearInterval(id);
            setSolanaCreditPollId(null);
            setTransactionStatus(prev => ({
              ...(prev || {}),
              status: 'completed',
              message: `USDC transfer detected on Solana. Amount ~${delta} to ${recipientOwner}.`,
              solanaTxHash: s.signature,
            }));
            setNotification({ type: 'success', message: 'USDC received on Solana' });
            break;
          }
        }
      } catch (e) {
        // non-fatal during polling
      }
    }, 10000);
    setSolanaCreditPollId(id);
  };

  useEffect(() => {
    // stop polling when finished
    if (transactionStatus && ['completed', 'error', 'refunded'].includes(transactionStatus.status)) {
      if (solanaPollId) clearInterval(solanaPollId);
      if (nexusPollId) clearInterval(nexusPollId);
      if (nexusDebitPollId) clearInterval(nexusDebitPollId);
      if (solanaCreditPollId) clearInterval(solanaCreditPollId);
    }
    return () => {
      // cleanup on unmount
      if (solanaPollId) clearInterval(solanaPollId);
      if (nexusPollId) clearInterval(nexusPollId);
      if (nexusDebitPollId) clearInterval(nexusDebitPollId);
      if (solanaCreditPollId) clearInterval(solanaCreditPollId);
    };
  }, [transactionStatus]);

  const handleUSDDtoUSDC = async () => {
    setIsLoading(true);
    setTransactionStatus({ status: 'pending', message: 'Initiating USDD to USDC swap...', step: 1, totalSteps: 3 });

    try {
      // Validate minimum amount
      const amt = parseFloat(amount);
      if (amt < MIN_SWAP_AMOUNT) {
        setTransactionStatus({ status: 'error', message: `Minimum swap amount is ${MIN_SWAP_AMOUNT}` });
        setNotification({ type: 'error', message: `Minimum swap amount is ${MIN_SWAP_AMOUNT}` });
        return;
      }

      // Validate recipient USDC ATA existence on Solana before debiting
      setTransactionStatus({
        status: 'pending',
        message: 'Validating recipient USDC token account (ATA) on Solana...',
        step: 1,
        totalSteps: 3
      });

      const validation = await ensureUsdcAtaExists(solanaWallet);
      if (!validation.ok) {
        setTransactionStatus({
          status: 'error',
          message: 'No USDC associated token account (ATA) found for this address on Solana. Please create your USDC token account in your wallet before proceeding.'
        });
        setNotification({ type: 'error', message: 'USDC ATA not found for this address on Solana.' });
        return;
      }
      setRecipientOwnerForCredit(validation.owner);

      // Step 1: Debit USDD with a reference that includes the Solana USDC receiving address
      setTransactionStatus({
        status: 'pending',
        message: 'Submitting USDD debit transaction...',
        step: 1,
        totalSteps: 3
      });

      const debitPayload = {
        address: usddAccount,
        amount: parseFloat(amount),
        reference: `USDC_SOL:${solanaWallet}`,
      };

      const debitResult = await secureApiCall('finance/debit/account', debitPayload);

      const txid = debitResult?.txid || debitResult?.hash || debitResult?.tx || null;
      setNexusDebitTxId(txid);
      setTransactionStatus({
        status: 'pending',
        message: 'USDD debit submitted. Waiting for confirmation on Nexus...',
        step: 2,
        totalSteps: 3,
        nexusTxHash: txid,
      });

      if (txid) startNexusDebitPolling(txid, parseFloat(amount), validation.owner);
      setNotification({ type: 'success', message: 'USDD debit submitted. Monitoring status...' });

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
            {Number(amount) > 0 && Number(amount) < MIN_SWAP_AMOUNT && (
              <div style={{ color: '#fca5a5', fontSize: 12, marginTop: 6 }}>
                Minimum swap amount is {MIN_SWAP_AMOUNT}
              </div>
            )}
          </InputGroup>

          {/* Fees and estimate */}
          <div style={{
            background: '#111827',
            border: '1px solid #374151',
            borderRadius: 8,
            padding: 12,
            fontSize: 14,
            color: '#d1d5db',
            marginBottom: 12
          }}>
            {(() => {
              const amt = Number(amount) || 0;
              const { flat, pct, total, expectedReceive } = computeFees(amt);
              const outToken = swapDirection === 'toUSDD' ? 'USDD' : 'USDC';
              const inToken = swapDirection === 'toUSDD' ? 'USDC' : 'USDD';
              return (
                <div>
                  <div style={{ marginBottom: 4 }}><strong>Minimum:</strong> {MIN_SWAP_AMOUNT} {inToken}</div>
                  <div style={{ marginBottom: 4 }}><strong>Fees:</strong> {FLAT_FEE_USDC} USDC flat + {(PCT_FEE * 100).toFixed(1)}% of amount ({pct.toFixed(6)} {inToken})</div>
                  <div style={{ marginBottom: 4 }}><strong>Total fees (approx):</strong> {total.toFixed(6)} {inToken}</div>
                  <div><strong>Estimated received:</strong> {expectedReceive.toFixed(6)} {outToken}</div>
                </div>
              );
            })()}
          </div>

          {/** Wallet connection UI removed for toUSDD; transaction is created externally */}

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

          {swapDirection === 'toUSDD' && (
            <>
              <InputGroup>
                <Label>How to send USDC to the swap service</Label>
                <div style={{
                  background: '#111827',
                  border: '1px solid #374151',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 14,
                  color: '#d1d5db'
                }}>
                  <div><strong>Network:</strong> Solana</div>
                  <div><strong>Token:</strong> USDC</div>
                  <div><strong>Send to:</strong> <span style={{ fontFamily: 'monospace' }}>{SOLANA_LIQUIDITY_POOL_ADDRESS}</span></div>
                  <div><strong>Memo (exact):</strong> <span style={{ fontFamily: 'monospace' }}>{`nexus: ${usddAccount || '<select a USDD account>'}`}</span></div>
                  <div><strong>Amount:</strong> {amount || '0'}</div>
                  <div><strong>Estimated received:</strong> {computeFees(amount).expectedReceive.toFixed(6)} USDD</div>
                </div>
              </InputGroup>

              <InputGroup>
                <Label>Paste Solana USDC Transaction Signature</Label>
                <TextField
                  placeholder="Enter Solana tx signature (base58)"
                  value={solanaTxId}
                  onChange={(e) => setSolanaTxId(e.target.value)}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <Button
                    onClick={async () => { await checkSolanaTxOnce(solanaTxId); startSolanaPolling(solanaTxId); }}
                    disabled={isLoading || !solanaTxId}
                  >
                    Check Status
                  </Button>
                  {solanaPollId && (
                    <Button onClick={() => { clearInterval(solanaPollId); setSolanaPollId(null); }}>
                      Stop Auto-Refresh
                    </Button>
                  )}
                </div>
              </InputGroup>
            </>
          )}

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
            disabled={isLoading || !amount || Number(amount) < MIN_SWAP_AMOUNT ||
              (swapDirection === 'toUSDD' ? (!usddAccount) : (!solanaWallet || !usddAccount))}
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

            {transactionStatus.refundTxHash && (
              <div>
                <strong>Refund Transaction (Solana):</strong>
                <TransactionHash>{transactionStatus.refundTxHash}</TransactionHash>
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
            <p><strong>USDC → USDD:</strong> From your Solana wallet, send USDC to our Solana liquidity pool with your Nexus account address as memo (format: <code>nexus: &lt;USDD_account&gt;</code>). USDD will be automatically sent to your specified Nexus account.</p>
            <p><strong>USDD → USDC:</strong> Send USDD from your Nexus account to our bridge. USDC will be automatically sent to your specified Solana wallet address.</p>
            <p><strong>Minimum amount:</strong> {MIN_SWAP_AMOUNT} (both directions).</p>
            <p><strong>Fees:</strong> {FLAT_FEE_USDC} USDC flat + {(PCT_FEE * 100).toFixed(1)}% of amount. Estimated received is calculated as amount minus total fees.</p>
            <p><strong>Exchange Rate:</strong> 1:1 ratio (minus fees and network costs)</p>
            <p><strong>Requirements:</strong> A Solana wallet capable of sending USDC with a memo field.</p>
          </div>
        </div>
      </FieldSet>
    </Container>
  );
}
