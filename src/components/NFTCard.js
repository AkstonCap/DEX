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

function normalizeJsonFields(json) {
  if (Array.isArray(json)) {
    return json.reduce((obj, field) => {
      if (field && typeof field.name === 'string') {
        obj[field.name] = field.value;
      }
      return obj;
    }, {});
  }
  return typeof json === 'object' && json !== null ? json : {};
}

function parseNftData(asset) {
  // Try to parse JSON data from the asset
  let data = {};
  if (asset.json) {
    data = normalizeJsonFields(asset.json);
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
    image_sha256: data.image_sha256 || '',
    artist: data.artist || 'Unknown',
    edition: data.edition || '',
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
