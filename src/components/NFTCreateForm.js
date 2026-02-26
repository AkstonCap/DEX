import { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  FieldSet,
  TextField,
  FormField,
} from 'nexus-module';
import { createNftArt } from 'actions/nftActions';
import {
  CreateFormGrid,
  ImagePreview,
  NFTActionButton,
  NFTImagePlaceholder,
} from './nftStyles';

export default function NFTCreateForm({ onCreated }) {
  const dispatch = useDispatch();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [artist, setArtist] = useState('');
  const [edition, setEdition] = useState('1/1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !imageUrl.trim()) return;
    setIsSubmitting(true);
    const result = await dispatch(
      createNftArt(name.trim(), description.trim(), imageUrl.trim(), artist.trim(), edition.trim())
    );
    setIsSubmitting(false);
    if (result) {
      setName('');
      setDescription('');
      setImageUrl('');
      setArtist('');
      setEdition('1/1');
      if (onCreated) onCreated();
    }
  };

  return (
    <FieldSet legend="Create NFT Art">
      <div style={{ marginBottom: '16px' }}>
        <ImagePreview>
          {imageUrl ? (
            <img src={imageUrl} alt="Preview" />
          ) : (
            <NFTImagePlaceholder style={{ position: 'relative', fontSize: '32px' }}>
              &#x1F3A8;
            </NFTImagePlaceholder>
          )}
        </ImagePreview>
      </div>

      <CreateFormGrid>
        <FormField label="Name *">
          <TextField
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Digital Artwork"
          />
        </FormField>
        <FormField label="Artist Name">
          <TextField
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="Artist name"
          />
        </FormField>
      </CreateFormGrid>

      <div style={{ marginTop: '12px' }}>
        <FormField label="Image URL * (external link to your digital art)">
          <TextField
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/my-art.png"
          />
        </FormField>
      </div>

      <div style={{ marginTop: '12px' }}>
        <FormField label="Description">
          <TextField
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your artwork..."
          />
        </FormField>
      </div>

      <CreateFormGrid>
        <FormField label="Edition">
          <TextField
            value={edition}
            onChange={(e) => setEdition(e.target.value)}
            placeholder="1/1"
          />
        </FormField>
        <div />
      </CreateFormGrid>

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <NFTActionButton
          variant="buy"
          onClick={handleSubmit}
          disabled={isSubmitting || !name.trim() || !imageUrl.trim()}
        >
          {isSubmitting ? 'Creating...' : 'Create NFT Art (2 NXS)'}
        </NFTActionButton>
      </div>
      <p style={{ color: '#6b7280', fontSize: '0.85em', textAlign: 'center', marginTop: '8px' }}>
        Creating an NFT registers a unique on-chain asset pointing to your digital art.
      </p>
    </FieldSet>
  );
}
