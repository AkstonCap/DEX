import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  FieldSet,
  TextField,
  Button,
  Select,
  FormField,
  apiCall,
} from 'nexus-module';
import { parseNftData } from './NFTCard';
import { transferNft } from 'actions/nftActions';
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

export default function NFTDetailModal({ asset, onClose, isOwned }) {
  const dispatch = useDispatch();
  const nft = parseNftData(asset);
  const [showTransfer, setShowTransfer] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [nxsAccounts, setNxsAccounts] = useState([]);

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
              <ModalMetaValue>{formatDate(nft.created)}</ModalMetaValue>
            </ModalMetaItem>
            <ModalMetaItem>
              <ModalMetaLabel>Type</ModalMetaLabel>
              <ModalMetaValue>
                {nft.type || 'Digital Art'}
              </ModalMetaValue>
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
          </ModalMetaGrid>

          {isOwned && (
            <>
              {!showTransfer ? (
                <ModalActions>
                  <NFTActionButton
                    variant="sell"
                    onClick={() => setShowTransfer(true)}
                  >
                    Transfer NFT
                  </NFTActionButton>
                </ModalActions>
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
                      onClick={() => setShowTransfer(false)}
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
