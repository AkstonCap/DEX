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
  listNftForSale,
  tokenizeNftAsset,
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

  const [tokenizeToken, setTokenizeToken] = useState('');

  const [recipientAddress, setRecipientAddress] = useState('');

  const [sellToken, setSellToken] = useState('');
  const [sellMarket, setSellMarket] = useState('');
  const [sellAmount, setSellAmount] = useState('1');
  const [sellPrice, setSellPrice] = useState('');
  const [sellFrom, setSellFrom] = useState('');
  const [sellTo, setSellTo] = useState('');

  const [buyTxid, setBuyTxid] = useState('');
  const [buyFrom, setBuyFrom] = useState('');
  const [buyTo, setBuyTo] = useState('');

  const [nxsAccounts, setNxsAccounts] = useState([]);
  const [resolvedImageHash, setResolvedImageHash] = useState(nft.image_sha256 || '');
  const [hashLoading, setHashLoading] = useState(false);

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

  useEffect(() => {
    // Fetch NXS accounts for potential buying
    async function fetchAccounts() {
      try {
        const accounts = await apiCall(
          'finance/list/account/balance,ticker,address',
          { sort: 'balance', order: 'desc' }
        );
        if (Array.isArray(accounts)) {
          setNxsAccounts(
            accounts
              .filter((a) => a.ticker === 'NXS' && a.balance > 0)
              .map((a) => ({
                value: a.address,
                display: `${a.address.slice(0, 4)}...${a.address.slice(-4)} - ${a.balance} NXS`,
              }))
          );
        }
      } catch (e) {
        // Ignore
      }
    }
    fetchAccounts();
  }, []);

  const handleTransfer = async () => {
    if (!recipientAddress) return;
    const result = await dispatch(
      transferNft(asset.address, recipientAddress)
    );
    if (result) {
      onClose();
    }
  };

  const handleTokenize = async () => {
    if (!tokenizeToken.trim()) return;
    const result = await dispatch(
      tokenizeNftAsset(asset.address, tokenizeToken.trim())
    );
    if (result) {
      setActiveAction('');
      setTokenizeToken('');
    }
  };

  const handleListForSale = async () => {
    const result = await dispatch(
      listNftForSale({
        assetAddress: asset.address,
        token: sellToken.trim(),
        market: sellMarket.trim(),
        amount: sellAmount,
        price: sellPrice,
        from: sellFrom,
        to: sellTo,
      })
    );

    if (result) {
      setActiveAction('');
      setSellToken('');
      setSellMarket('');
      setSellAmount('1');
      setSellPrice('');
      setSellFrom('');
      setSellTo('');
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
                    onClick={() => setActiveAction('tokenize')}
                  >
                    Tokenize NFT
                  </NFTActionButton>
                  <NFTActionButton
                    variant="list"
                    onClick={() => setActiveAction('sell')}
                  >
                    List for Sale
                  </NFTActionButton>
                  <NFTActionButton
                    variant="sell"
                    onClick={() => setActiveAction('transfer')}
                  >
                    Transfer NFT
                  </NFTActionButton>
                </ModalActions>
              ) : activeAction === 'tokenize' ? (
                <FieldSet legend="Tokenize NFT for Market Trading">
                  <FormField label="Token (name or token address)">
                    <TextField
                      value={tokenizeToken}
                      onChange={(e) => setTokenizeToken(e.target.value)}
                      placeholder="namespace::token or token address"
                    />
                  </FormField>
                  <p style={{ color: '#9ca3af', fontSize: '0.85em' }}>
                    Use a pre-created token. Supply and decimals are defined when the token is created.
                  </p>
                  <ModalActions>
                    <NFTActionButton
                      variant="list"
                      onClick={handleTokenize}
                      disabled={!tokenizeToken.trim()}
                    >
                      Confirm Tokenize
                    </NFTActionButton>
                    <NFTActionButton
                      variant=""
                      onClick={() => setActiveAction('')}
                    >
                      Cancel
                    </NFTActionButton>
                  </ModalActions>
                </FieldSet>
              ) : activeAction === 'sell' ? (
                <FieldSet legend="List Tokenized NFT on Market">
                  <FormField label="Token used for tokenization">
                    <TextField
                      value={sellToken}
                      onChange={(e) => setSellToken(e.target.value)}
                      placeholder="namespace::token or token address"
                    />
                  </FormField>
                  <FormField label="Market Pair (required)">
                    <TextField
                      value={sellMarket}
                      onChange={(e) => setSellMarket(e.target.value)}
                      placeholder="TOKEN/NXS"
                    />
                  </FormField>
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

                  <FormField label="From Account">
                    <Select
                      value={sellFrom}
                      onChange={(val) => setSellFrom(val)}
                      options={nxsAccounts}
                    />
                  </FormField>
                  <FormField label="To Account">
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
                        !sellMarket.trim() ||
                        !sellAmount ||
                        !sellPrice ||
                        !sellFrom ||
                        !sellTo
                      }
                    >
                      Confirm Listing
                    </NFTActionButton>
                    <NFTActionButton
                      variant=""
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
                      variant=""
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
                      options={nxsAccounts}
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
                      variant=""
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
