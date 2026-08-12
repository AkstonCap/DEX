import styled from '@emotion/styled';
import { Button } from 'nexus-module';

export const NFTGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
  padding: 10px 0;
`;

export const NFTCardContainer = styled.div`
  background: #1a1e2a;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #2a2f3e;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    border-color: #00e6d8;
  }
`;

export const NFTImageWrapper = styled.div`
  position: relative;
  width: 100%;
  padding-top: 100%; /* 1:1 Aspect Ratio */
  background: #12141c;
  overflow: hidden;
`;

export const NFTImage = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;

  ${NFTCardContainer}:hover & {
    transform: scale(1.05);
  }
`;

export const NFTImagePlaceholder = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1e2a 0%, #2a2f3e 100%);
  color: #555;
  font-size: 48px;
`;

export const NFTCardInfo = styled.div`
  padding: 14px;
`;

export const NFTTitle = styled.div`
  font-weight: 700;
  font-size: 1.05em;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 6px;
`;

export const NFTArtist = styled.div`
  font-size: 0.85em;
  color: #9ca3af;
  margin-bottom: 8px;
`;

export const NFTPrice = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
`;

export const NFTPriceLabel = styled.span`
  font-size: 0.8em;
  color: #6b7280;
`;

export const NFTPriceValue = styled.span`
  font-weight: 700;
  font-size: 1.1em;
  color: #00e6d8;
`;

export const NFTBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75em;
  font-weight: 600;
  background: ${({ type }) =>
    type === 'for_sale'
      ? 'rgba(0, 230, 216, 0.15)'
      : type === 'owned'
      ? 'rgba(240, 170, 33, 0.15)'
      : 'rgba(156, 163, 175, 0.15)'};
  color: ${({ type }) =>
    type === 'for_sale'
      ? '#00e6d8'
      : type === 'owned'
      ? '#f0aa21'
      : '#9ca3af'};
  border: 1px solid
    ${({ type }) =>
      type === 'for_sale'
        ? 'rgba(0, 230, 216, 0.3)'
        : type === 'owned'
        ? 'rgba(240, 170, 33, 0.3)'
        : 'rgba(156, 163, 175, 0.3)'};
`;

export const NFTEdition = styled.span`
  font-size: 0.8em;
  color: #6b7280;
`;

// Modal styles
export const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

export const ModalContent = styled.div`
  background: #1a1e2a;
  border: 1px solid #2a2f3e;
  border-radius: 12px;
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
`;

export const ModalImageSection = styled.div`
  width: 100%;
  max-height: 500px;
  background: #12141c;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 12px 12px 0 0;
`;

export const ModalImage = styled.img`
  width: 100%;
  max-height: 500px;
  object-fit: contain;
`;

export const ModalDetails = styled.div`
  padding: 24px;
`;

export const ModalTitle = styled.h2`
  font-size: 1.5em;
  font-weight: 700;
  color: #fff;
  margin: 0 0 8px 0;
`;

export const ModalArtist = styled.div`
  font-size: 1em;
  color: #9ca3af;
  margin-bottom: 16px;
`;

export const ModalDescription = styled.p`
  color: #d1d5db;
  line-height: 1.6;
  margin-bottom: 20px;
  font-size: 0.95em;
`;

export const ModalMetaGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
`;

export const ModalMetaItem = styled.div`
  background: #12141c;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #2a2f3e;
`;

export const ModalMetaLabel = styled.div`
  font-size: 0.8em;
  color: #6b7280;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const ModalMetaValue = styled.div`
  font-size: 0.95em;
  color: #fff;
  font-weight: 600;
  word-break: break-all;
`;

export const ModalActions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 20px;
`;

export const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 50%;
  z-index: 1;
  line-height: 1;
  transition: background 0.2s;

  &:hover {
    background: rgba(0, 0, 0, 0.9);
  }
`;

export const NFTActionButton = styled(Button)`
  && {
    border: 2px solid
      ${({ variant }) =>
        variant === 'buy'
          ? '#00e6d8'
          : variant === 'sell'
          ? '#ef4568'
          : variant === 'list'
          ? '#f0aa21'
          : '#2a2f3e'} !important;
    background-color: ${({ variant }) =>
      variant === 'buy'
        ? 'rgba(0, 230, 216, 0.15)'
        : variant === 'sell'
        ? 'rgba(239, 69, 104, 0.15)'
        : variant === 'list'
        ? 'rgba(240, 170, 33, 0.15)'
        : 'transparent'} !important;
    color: ${({ variant }) =>
      variant === 'buy'
        ? '#00e6d8'
        : variant === 'sell'
        ? '#ef4568'
        : variant === 'list'
        ? '#f0aa21'
        : '#fff'} !important;
  }
  padding: 12px 24px;
  font-size: 16px;
  cursor: pointer;
  flex: 1;
`;

// Filter bar
export const FilterBar = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  align-items: center;
`;

export const FilterButton = styled.button`
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid ${({ $active }) => ($active ? '#00e6d8' : '#2a2f3e')};
  background: ${({ $active }) =>
    $active ? 'rgba(0, 230, 216, 0.15)' : 'transparent'};
  color: ${({ $active }) => ($active ? '#00e6d8' : '#9ca3af')};
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.2s;

  &:hover {
    border-color: #00e6d8;
    color: #00e6d8;
  }
`;

// Create form styles
export const CreateFormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

export const ImagePreview = styled.div`
  width: 100%;
  max-width: 300px;
  aspect-ratio: 1;
  border-radius: 12px;
  border: 2px dashed #2a2f3e;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #12141c;
  margin: 0 auto 16px auto;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;

  h3 {
    font-size: 1.2em;
    color: #9ca3af;
    margin-bottom: 8px;
  }

  p {
    font-size: 0.95em;
    max-width: 400px;
    margin: 0 auto;
  }
`;
