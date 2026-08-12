import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  FieldSet,
  TextField,
  Select,
  FormField,
  apiCall,
} from 'nexus-module';
import { parseNftData } from './NFTCard';
import {
  buyNft,
  createNftSaleToken,
  listNftForSale,
  transferNft,
} from 'actions/nftActions';
import {
  ModalOverlay,
  ModalContent,
  ModalImageSection,
  ModalImage,
  ModalDetails,
  ModalTitle,
  ModalArtist,
  ModalDescription,
  ModalMetaGrid,
  ModalMetaItem,
  ModalMetaLabel,
  ModalMetaValue,
  ModalActions,
  CloseButton,
  NFTActionButton,
  NFTImagePlaceholder,
} from './nftStyles';

const isLikelySha256 = (value) => /^[a-f0-9]{64}$/i.test(String(value || ''));

const buildHashFingerprintSvg = (hash) => {
  if (!isLikelySha256(hash)) {
    return '';
  }

  const size = 240;
  const cells = 10;
  const padding = 12;
  const cellSize = (size - padding * 2) / cells;
  const normalized = hash.toLowerCase();
  const hue = parseInt(normalized.slice(0, 2), 16);
  const colorA = `hsl(${Math.round((hue / 255) * 360)} 78% 58%)`;
  const colorB = `hsl(${Math.round(((255 - hue) / 255) * 360)} 72% 48%)`;
  const bg = '#12141c';

  const rects = [];
  let bitIndex = 0;

  for (let y = 0; y < cells; y += 1) {
    for (let x = 0; x < cells; x += 1) {
      const hashPos = bitIndex % normalized.length;
      const nibble = parseInt(normalized[hashPos], 16);
      const on = (nibble & 1) === 1;
      if (on) {
        const fill = (nibble & 2) === 2 ? colorA : colorB;
        rects.push(
          `<rect x="${padding + x * cellSize}" y="${padding + y * cellSize}" width="${cellSize}" height="${cellSize}" fill="${fill}" rx="1.2" />`
        );
      }
      bitIndex += 1;
    }
  }

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">`,
    `<rect width="${size}" height="${size}" fill="${bg}" />`,
    ...rects,
    '</svg>',
  ].join('');

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const computeSha256FromImageUrl = async (imageUrl) => {
  const subtleCrypto = globalThis?.crypto?.subtle;
  if (!subtleCrypto || !imageUrl) {
    return '';
  }

  const response = await fetch(imageUrl, { cache: 'no-store' });
  if (!response.ok) {
    return '';
  }

  const imageData = await response.arrayBuffer();
  const hashBuffer = await subtleCrypto.digest('SHA-256', imageData);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

export default function NFTDetailModal({ asset, onClose, isOwned }) {
  const dispatch = useDispatch();
  const nft = parseNftData(asset);

  const [activeAction, setActiveAction] = useState('');

  const [recipientAddress, setRecipientAddress] = useState('');

  const [sellToken, setSellToken] = useState('');
  const [createTokenName, setCreateTokenName] = useState('');
  const [createTokenSupply, setCreateTokenSupply] = useState('1');
  const [createTokenDecimals, setCreateTokenDecimals] = useState('0');
  const [sellAmount, setSellAmount] = useState('1');
  const [sellPrice, setSellPrice] = useState('');
  const [sellTo, setSellTo] = useState('');

  const [buyTxid, setBuyTxid] = useState('');
  const [buyFrom, setBuyFrom] = useState('');
  const [buyTo, setBuyTo] = useState('');

  const [nxsAccounts, setNxsAccounts] = useState([]);
  const [nxsAccountsWithBalance, setNxsAccountsWithBalance] = useState([]);
  const [resolvedImageHash, setResolvedImageHash] = useState(nft.image_sha256 || '');
  const [hashLoading, setHashLoading] = useState(false);
  const [tokenizationLoading, setTokenizationLoading] = useState(false);
  const [isTokenized, setIsTokenized] = useState(false);
  const [tokenizedTokenAddress, setTokenizedTokenAddress] = useState('');
  const [activeAskCount, setActiveAskCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function ensureHash() {
      const existingHash = nft.image_sha256;
      if (isLikelySha256(existingHash)) {
        setResolvedImageHash(existingHash);
        setHashLoading(false);
        return;
      }

      if (!nft.image_url) {
        setResolvedImageHash('');
        setHashLoading(false);
        return;
      }

      setHashLoading(true);
      const computedHash = await computeSha256FromImageUrl(nft.image_url);
      if (!cancelled) {
        setResolvedImageHash(computedHash);
        setHashLoading(false);
      }
    }

    ensureHash();

    return () => {
      cancelled = true;
    };
  }, [nft.image_sha256, nft.image_url]);

  const fingerprintImage = buildHashFingerprintSvg(resolvedImageHash);
  const derivedSellMarketPair = sellToken.trim()
    ? `${sellToken.trim()}/NXS`
    : '';

  useEffect(() => {
    // Fetch NXS accounts for potential buying
    async function fetchAccounts() {
      try {
        const accounts = await apiCall(
          'finance/list/account/balance,ticker,address,name',
          { sort: 'balance', order: 'desc' }
        );
        if (Array.isArray(accounts)) {
          const allNxsAccounts = accounts
            .filter((a) => a.ticker === 'NXS')
            .map((a) => {
              const accountName = String(a.name || '').trim();
              const accountLabel = accountName
                ? `${accountName} (${a.address.slice(0, 4)}...${a.address.slice(-4)}) - ${a.balance} NXS`
                : `${a.address.slice(0, 4)}...${a.address.slice(-4)} - ${a.balance} NXS`;

              return {
                value: a.address,
                display: accountLabel,
                name: accountName,
                balance: Number(a.balance) || 0,
              };
            });

          const fundedNxsAccounts = allNxsAccounts.filter(
            (a) => a.balance > 0
          );

          setNxsAccounts(allNxsAccounts);
          setNxsAccountsWithBalance(
            fundedNxsAccounts.length > 0 ? fundedNxsAccounts : allNxsAccounts
          );

          setSellTo((prev) => {
            if (prev) {
              return prev;
            }

            const defaultAccount = allNxsAccounts.find(
              (a) => String(a.name || '').toLowerCase() === 'default'
            );

            return defaultAccount?.value || allNxsAccounts[0]?.value || '';
          });
        }
      } catch (e) {
        // Ignore
      }
    }
    fetchAccounts();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchTokenizationAndAsks() {
      if (!asset?.address) {
        setIsTokenized(false);
        setTokenizedTokenAddress('');
        setActiveAskCount(0);
        return;
      }

      setTokenizationLoading(true);
      setIsTokenized(false);
      setTokenizedTokenAddress('');
      setActiveAskCount(0);

      try {
        const tokens = await apiCall(
          'register/list/finance:token/token,ticker',
          {
            limit: 300,
          }
        ).catch(() => []);

        if (!Array.isArray(tokens) || tokens.length === 0) {
          if (!cancelled) {
            setTokenizationLoading(false);
          }
          return;
        }

        let matchedTokenAddress = '';

        for (const token of tokens) {
          const tokenAddress = String(token?.token || '').trim();
          if (!tokenAddress) {
            continue;
          }

          const verification = await apiCall('assets/verify/partial', {
            token: tokenAddress,
          }).catch(() => null);

          if (
            verification?.valid &&
            verification?.asset?.address === asset.address
          ) {
            matchedTokenAddress = tokenAddress;
            break;
          }
        }

        if (!cancelled) {
          if (!matchedTokenAddress) {
            setIsTokenized(false);
            setTokenizedTokenAddress('');
            setActiveAskCount(0);
            setTokenizationLoading(false);
            return;
          }

          setIsTokenized(true);
          setTokenizedTokenAddress(matchedTokenAddress);
        }

        const marketPair = `${matchedTokenAddress}/NXS`;
        const orderBook = await apiCall(
          'market/list/order/txid,type',
          {
            market: marketPair,
            limit: 1000,
          }
        ).catch(() => null);

        if (!cancelled) {
          const asks = Array.isArray(orderBook?.asks)
            ? orderBook.asks
            : [];
          setActiveAskCount(asks.length);
          setTokenizationLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          setTokenizationLoading(false);
        }
      }
    }

    fetchTokenizationAndAsks();

    return () => {
      cancelled = true;
    };
  }, [asset?.address]);

  const handleTransfer = async () => {
    if (!recipientAddress) return;
    const result = await dispatch(
      transferNft(asset.address, recipientAddress)
    );
    if (result) {
      onClose();
    }
  };

  const handleListForSale = async () => {
    const result = await dispatch(
      listNftForSale({
        assetAddress: asset.address,
        token: sellToken.trim(),
        amount: sellAmount,
        price: sellPrice,
        from: sellToken.trim(),
        to: sellTo,
      })
    );

    if (result) {
      setActiveAction('');
      setSellToken('');
      setSellAmount('1');
      setSellPrice('');
      setSellTo('');
    }
  };

  const handleCreateSaleToken = async () => {
    const result = await dispatch(
      createNftSaleToken({
        name: createTokenName.trim(),
        supply: createTokenSupply,
        decimals: createTokenDecimals,
      })
    );

    if (result?.address) {
      setSellToken(String(result.address));
    }
  };

  const handleBuyNft = async () => {
    const result = await dispatch(
      buyNft({
        txid: buyTxid.trim(),
        from: buyFrom,
        to: buyTo,
      })
    );
    if (result) {
      setActiveAction('');
      setBuyTxid('');
      setBuyFrom('');
      setBuyTo('');
      onClose();
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const truncateAddress = (addr) => {
    if (!addr) return 'N/A';
    if (addr.length > 20) {
      return addr.slice(0, 8) + '...' + addr.slice(-8);
    }
    return addr;
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose}>&times;</CloseButton>

        <ModalImageSection>
          {nft.image_url ? (
            <ModalImage src={nft.image_url} alt={nft.title} />
          ) : (
            <NFTImagePlaceholder
              style={{ position: 'relative', height: '300px' }}
            >
              &#x1F3A8;
            </NFTImagePlaceholder>
          )}
        </ModalImageSection>

        <ModalDetails>
          <ModalTitle>{nft.title}</ModalTitle>
          <ModalArtist>by {nft.artist}</ModalArtist>

          {nft.description && (
            <ModalDescription>{nft.description}</ModalDescription>
          )}

          <ModalMetaGrid>
            <ModalMetaItem>
              <ModalMetaLabel>Asset Address</ModalMetaLabel>
              <ModalMetaValue>
                {truncateAddress(asset.address)}
              </ModalMetaValue>
            </ModalMetaItem>
            <ModalMetaItem>
              <ModalMetaLabel>Edition</ModalMetaLabel>
              <ModalMetaValue>{nft.edition || 'Unique'}</ModalMetaValue>
            </ModalMetaItem>
            <ModalMetaItem>
              <ModalMetaLabel>Created</ModalMetaLabel>
              <ModalMetaValue>{formatDate(asset.created)}</ModalMetaValue>
            </ModalMetaItem>
            {asset.owner && (
              <ModalMetaItem>
                <ModalMetaLabel>Owner</ModalMetaLabel>
                <ModalMetaValue>
                  {truncateAddress(asset.owner)}
                </ModalMetaValue>
              </ModalMetaItem>
            )}
            {nft.image_url && (
              <ModalMetaItem>
                <ModalMetaLabel>Art URL</ModalMetaLabel>
                <ModalMetaValue>
                  <a
                    href={nft.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#00e6d8', textDecoration: 'none' }}
                  >
                    View Full Image
                  </a>
                </ModalMetaValue>
              </ModalMetaItem>
            )}
            <ModalMetaItem>
              <ModalMetaLabel>Image SHA-256</ModalMetaLabel>
              <ModalMetaValue>
                {hashLoading
                  ? 'Computing from image URL...'
                  : resolvedImageHash || 'Not available'}
              </ModalMetaValue>
            </ModalMetaItem>
            <ModalMetaItem>
              <ModalMetaLabel>Tokenized</ModalMetaLabel>
              <ModalMetaValue>
                {tokenizationLoading
                  ? 'Checking...'
                  : isTokenized
                  ? 'Yes'
                  : 'No'}
              </ModalMetaValue>
            </ModalMetaItem>
            <ModalMetaItem>
              <ModalMetaLabel>Token Address</ModalMetaLabel>
              <ModalMetaValue>
                {tokenizationLoading
                  ? 'Resolving...'
                  : tokenizedTokenAddress || 'Not tokenized'}
              </ModalMetaValue>
            </ModalMetaItem>
            <ModalMetaItem>
              <ModalMetaLabel>Active Asks</ModalMetaLabel>
              <ModalMetaValue>
                {tokenizationLoading
                  ? 'Checking market...'
                  : isTokenized
                  ? String(activeAskCount)
                  : 'N/A'}
              </ModalMetaValue>
            </ModalMetaItem>
          </ModalMetaGrid>

          <FieldSet legend="Artwork / Hash Fingerprint">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
              }}
            >
              <div style={{ background: '#12141c', border: '1px solid #2a2f3e', borderRadius: '8px', padding: '10px' }}>
                <div style={{ color: '#9ca3af', fontSize: '0.8em', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Image From URL
                </div>
                {nft.image_url ? (
                  <img
                    src={nft.image_url}
                    alt={nft.title}
                    style={{ width: '100%', maxHeight: '220px', objectFit: 'contain', borderRadius: '6px' }}
                  />
                ) : (
                  <NFTImagePlaceholder style={{ position: 'relative', height: '220px', fontSize: '28px' }}>
                    &#x1F3A8;
                  </NFTImagePlaceholder>
                )}
              </div>

              <div style={{ background: '#12141c', border: '1px solid #2a2f3e', borderRadius: '8px', padding: '10px' }}>
                <div style={{ color: '#9ca3af', fontSize: '0.8em', marginBottom: '8px', textTransform: 'uppercase' }}>
                  SHA-256 Visual Fingerprint
                </div>
                {fingerprintImage ? (
                  <img
                    src={fingerprintImage}
                    alt="SHA-256 visual fingerprint"
                    style={{ width: '100%', maxHeight: '220px', objectFit: 'contain', borderRadius: '6px' }}
                  />
                ) : (
                  <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', border: '1px dashed #2a2f3e', borderRadius: '6px' }}>
                    {hashLoading ? 'Computing hash...' : 'Hash unavailable'}
                  </div>
                )}
              </div>
            </div>
          </FieldSet>

          {isOwned && (
            <>
              {!activeAction ? (
                <ModalActions>
                  <NFTActionButton
                    variant="list"
                    onClick={() => setActiveAction('sell')}
                  >
                    Tokenize & List for Sale
                  </NFTActionButton>
                  <NFTActionButton
                    variant="sell"
                    onClick={() => setActiveAction('transfer')}
                  >
                    Transfer NFT
                  </NFTActionButton>
                </ModalActions>
              ) : activeAction === 'sell' ? (
                <FieldSet legend="Tokenize Asset and List on Market">
                  <p style={{ color: '#9ca3af', fontSize: '0.85em', marginTop: 0 }}>
                    Full process: 1) Art asset created  2) Token created (supply/decimals)  3) Asset tokenized with token address  4) Ask created on market pair <strong>{derivedSellMarketPair || '<token-address>/NXS'}</strong>.
                  </p>

                  <FormField label="Create Token (optional name)">
                    <TextField
                      value={createTokenName}
                      onChange={(e) => setCreateTokenName(e.target.value)}
                      placeholder="Optional token name"
                    />
                  </FormField>
                  <FormField label="Token Supply">
                    <TextField
                      value={createTokenSupply}
                      onChange={(e) => setCreateTokenSupply(e.target.value)}
                      placeholder="1"
                    />
                  </FormField>
                  <FormField label="Token Decimals">
                    <TextField
                      value={createTokenDecimals}
                      onChange={(e) => setCreateTokenDecimals(e.target.value)}
                      placeholder="0"
                    />
                  </FormField>
                  <p style={{ color: '#9ca3af', fontSize: '0.85em' }}>
                    Suggested for unique art: supply <strong>1</strong>, decimals <strong>0</strong>. You can change these before creating token.
                  </p>
                  <ModalActions>
                    <NFTActionButton
                      variant="list"
                      onClick={handleCreateSaleToken}
                      disabled={!createTokenSupply || !createTokenDecimals}
                    >
                      Create Token
                    </NFTActionButton>
                  </ModalActions>

                  <FormField label="Token address for asset tokenization">
                    <TextField
                      value={sellToken}
                      onChange={(e) => setSellToken(e.target.value)}
                      placeholder="Token register address"
                    />
                  </FormField>
                  <p style={{ color: '#9ca3af', fontSize: '0.85em' }}>
                    Step 2 requirement: create the token first with your chosen supply and decimals. This flow then tokenizes the asset (if needed) and creates the ask order.
                  </p>
                  <p style={{ color: '#9ca3af', fontSize: '0.85em' }}>
                    Market pair is fixed to <strong>{derivedSellMarketPair || '<token-address>/NXS'}</strong>.
                  </p>
                  <p style={{ color: '#9ca3af', fontSize: '0.85em' }}>
                    The sell "from" source is automatically set to this token address.
                  </p>
                  <FormField label="Amount">
                    <TextField
                      value={sellAmount}
                      onChange={(e) => setSellAmount(e.target.value)}
                      placeholder="1"
                    />
                  </FormField>
                  <FormField label="Price">
                    <TextField
                      value={sellPrice}
                      onChange={(e) => setSellPrice(e.target.value)}
                      placeholder="10"
                    />
                  </FormField>

                  <FormField label="To Account (NXS, defaults to default)">
                    <Select
                      value={sellTo}
                      onChange={(val) => setSellTo(val)}
                      options={nxsAccounts}
                    />
                  </FormField>

                  <ModalActions>
                    <NFTActionButton
                      variant="list"
                      onClick={handleListForSale}
                      disabled={
                        !sellToken.trim() ||
                        !sellAmount ||
                        !sellPrice ||
                        !sellTo
                      }
                    >
                      Tokenize & Create Ask
                    </NFTActionButton>
                    <NFTActionButton
                      onClick={() => setActiveAction('')}
                    >
                      Cancel
                    </NFTActionButton>
                  </ModalActions>
                </FieldSet>
              ) : (
                <FieldSet legend="Transfer NFT">
                  <FormField label="Recipient Address (Nexus address or username:account)">
                    <TextField
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      placeholder="Enter recipient address"
                    />
                  </FormField>
                  <ModalActions>
                    <NFTActionButton
                      variant="sell"
                      onClick={handleTransfer}
                    >
                      Confirm Transfer
                    </NFTActionButton>
                    <NFTActionButton
                      onClick={() => setActiveAction('')}
                    >
                      Cancel
                    </NFTActionButton>
                  </ModalActions>
                </FieldSet>
              )}
            </>
          )}

          {!isOwned && (
            <>
              {!activeAction ? (
                <ModalActions>
                  <NFTActionButton
                    variant="buy"
                    onClick={() => setActiveAction('buy')}
                  >
                    Buy NFT (Execute Order)
                  </NFTActionButton>
                </ModalActions>
              ) : (
                <FieldSet legend="Buy NFT via Market Order">
                  <FormField label="Order TXID">
                    <TextField
                      value={buyTxid}
                      onChange={(e) => setBuyTxid(e.target.value)}
                      placeholder="Order transaction hash"
                    />
                  </FormField>
                  <FormField label="From Account (payment)">
                    <Select
                      value={buyFrom}
                      onChange={(val) => setBuyFrom(val)}
                      options={nxsAccountsWithBalance}
                    />
                  </FormField>
                  <FormField label="To Account (receiving)">
                    <Select
                      value={buyTo}
                      onChange={(val) => setBuyTo(val)}
                      options={nxsAccounts}
                    />
                  </FormField>
                  <ModalActions>
                    <NFTActionButton
                      variant="buy"
                      onClick={handleBuyNft}
                      disabled={!buyTxid.trim() || !buyFrom || !buyTo}
                    >
                      Confirm Buy
                    </NFTActionButton>
                    <NFTActionButton
                      onClick={() => setActiveAction('')}
                    >
                      Cancel
                    </NFTActionButton>
                  </ModalActions>
                </FieldSet>
              )}
            </>
          )}
        </ModalDetails>
      </ModalContent>
    </ModalOverlay>
  );
}
