import {
  NFTCardContainer,
  NFTImageWrapper,
  NFTImage,
  NFTImagePlaceholder,
  NFTCardInfo,
  NFTTitle,
  NFTArtist,
  NFTPrice,
  NFTPriceLabel,
  NFTPriceValue,
  NFTBadge,
  NFTEdition,
} from './nftStyles';

function parseNftData(asset) {
  // Try to parse JSON data from the asset
  let data = {};
  if (asset.json && typeof asset.json === 'object') {
    data = asset.json;
  } else if (typeof asset.data === 'string' && asset.data.length > 0) {
    try {
      data = JSON.parse(asset.data);
    } catch (e) {
      // Not JSON data
    }
  }
  return {
    title: data.title || asset.name || 'Untitled',
    description: data.description || '',
    image_url: data.image_url || asset.image_url || '',
    artist: data.artist || 'Unknown',
    edition: data.edition || '',
    type: data.type || '',
    created: data.created || 0,
  };
}

export { parseNftData };

export default function NFTCard({ asset, onClick, isOwned }) {
  const nft = parseNftData(asset);

  return (
    <NFTCardContainer onClick={() => onClick(asset)}>
      <NFTImageWrapper>
        {nft.image_url ? (
          <NFTImage src={nft.image_url} alt={nft.title} loading="lazy" />
        ) : (
          <NFTImagePlaceholder>&#x1F3A8;</NFTImagePlaceholder>
        )}
      </NFTImageWrapper>
      <NFTCardInfo>
        <NFTTitle>{nft.title}</NFTTitle>
        <NFTArtist>by {nft.artist}</NFTArtist>
        <NFTPrice>
          <div>
            {nft.edition && <NFTEdition>{nft.edition}</NFTEdition>}
          </div>
          <div>
            {isOwned ? (
              <NFTBadge type="owned">Owned</NFTBadge>
            ) : (
              <NFTBadge type="for_sale">Art NFT</NFTBadge>
            )}
          </div>
        </NFTPrice>
      </NFTCardInfo>
    </NFTCardContainer>
  );
}
