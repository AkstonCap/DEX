import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FieldSet, TextField } from 'nexus-module';
import styled from '@emotion/styled';
import { PageLayout } from 'components/styles';
import NFTCard from 'components/NFTCard';
import NFTDetailModal from 'components/NFTDetailModal';
import NFTCreateForm from 'components/NFTCreateForm';
import { setNftSelected, setNftFilter } from 'actions/actionCreators';
import { fetchNftListings, fetchMyNftAssets } from 'actions/nftActions';
import {
  NFTGrid,
  FilterBar,
  FilterButton,
  EmptyState,
} from 'components/nftStyles';

const SearchField = styled(TextField)({
  maxWidth: 250,
});

const TabBar = styled.div`
  display: flex;
  gap: 0;
  margin-bottom: 20px;
  border-bottom: 2px solid #2a2f3e;
`;

const Tab = styled.button`
  padding: 12px 24px;
  border: none;
  background: transparent;
  color: ${({ $active }) => ($active ? '#00e6d8' : '#9ca3af')};
  font-size: 1em;
  font-weight: ${({ $active }) => ($active ? '700' : '400')};
  cursor: pointer;
  border-bottom: 2px solid ${({ $active }) => ($active ? '#00e6d8' : 'transparent')};
  margin-bottom: -2px;
  transition: all 0.2s;

  &:hover {
    color: #00e6d8;
  }
`;

const StatsRow = styled.div`
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const StatCard = styled.div`
  background: #1a1e2a;
  border: 1px solid #2a2f3e;
  border-radius: 10px;
  padding: 16px 24px;
  min-width: 140px;
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.5em;
  font-weight: 700;
  color: #00e6d8;
`;

const StatLabel = styled.div`
  font-size: 0.85em;
  color: #6b7280;
  margin-top: 4px;
`;

export default function NFTMarketplace() {
  const dispatch = useDispatch();
  const listings = useSelector((state) => state.ui.nft.listings);
  const myAssets = useSelector((state) => state.ui.nft.myAssets);
  const selected = useSelector((state) => state.ui.nft.selected);
  const loading = useSelector((state) => state.ui.nft.loading);
  const filter = useSelector((state) => state.ui.nft.filter);

  const [activeView, setActiveView] = useState('browse');
  const [search, setSearch] = useState('');

  const refreshData = useCallback(() => {
    dispatch(fetchNftListings());
    dispatch(fetchMyNftAssets());
  }, [dispatch]);

  useEffect(() => {
    refreshData();

    const intervalId = setInterval(refreshData, 30000);
    return () => clearInterval(intervalId);
  }, [refreshData]);

  const handleSelectNft = (asset) => {
    dispatch(setNftSelected(asset));
  };

  const handleCloseModal = () => {
    dispatch(setNftSelected(null));
  };

  const handleFilterChange = (f) => {
    dispatch(setNftFilter(f));
  };

  // Determine which assets to display
  let displayAssets = [];
  if (filter === 'my_art') {
    displayAssets = myAssets;
  } else {
    displayAssets = listings;
  }

  // Apply search filter
  if (search.trim()) {
    const q = search.toLowerCase();
    displayAssets = displayAssets.filter((asset) => {
      const data = asset.json || {};
      const title = (data.title || asset.name || '').toLowerCase();
      const artist = (data.artist || '').toLowerCase();
      return title.includes(q) || artist.includes(q);
    });
  }

  // Check if a listing is owned by the current user
  const myAddresses = new Set(myAssets.map((a) => a.address));
  const isOwned = (asset) => myAddresses.has(asset.address);

  return (
    <PageLayout>
      {/* Stats */}
      <StatsRow>
        <StatCard>
          <StatValue>{listings.length}</StatValue>
          <StatLabel>Total Art NFTs</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{myAssets.length}</StatValue>
          <StatLabel>My Collection</StatLabel>
        </StatCard>
      </StatsRow>

      {/* View tabs */}
      <TabBar>
        <Tab
          $active={activeView === 'browse'}
          onClick={() => setActiveView('browse')}
        >
          Browse Art
        </Tab>
        <Tab
          $active={activeView === 'create'}
          onClick={() => setActiveView('create')}
        >
          Create NFT
        </Tab>
      </TabBar>

      {activeView === 'browse' && (
        <>
          {/* Filters and search */}
          <FilterBar>
            <FilterButton
              $active={filter === 'all'}
              onClick={() => handleFilterChange('all')}
            >
              All Art
            </FilterButton>
            <FilterButton
              $active={filter === 'my_art'}
              onClick={() => handleFilterChange('my_art')}
            >
              My Collection
            </FilterButton>
            <div style={{ marginLeft: 'auto' }}>
              <SearchField
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or artist..."
              />
            </div>
          </FilterBar>

          {/* NFT Grid */}
          {loading && displayAssets.length === 0 ? (
            <EmptyState>
              <h3>Loading NFT Art...</h3>
              <p>Fetching digital art assets from the network.</p>
            </EmptyState>
          ) : displayAssets.length === 0 ? (
            <EmptyState>
              <h3>
                {filter === 'my_art'
                  ? 'No Art NFTs in your collection'
                  : 'No Art NFTs found'}
              </h3>
              <p>
                {filter === 'my_art'
                  ? 'Create your first NFT by switching to the "Create NFT" tab above.'
                  : 'Be the first to create digital art on the network!'}
              </p>
            </EmptyState>
          ) : (
            <NFTGrid>
              {displayAssets.map((asset, idx) => (
                <NFTCard
                  key={asset.address || idx}
                  asset={asset}
                  onClick={handleSelectNft}
                  isOwned={isOwned(asset)}
                />
              ))}
            </NFTGrid>
          )}
        </>
      )}

      {activeView === 'create' && (
        <NFTCreateForm onCreated={() => setActiveView('browse')} />
      )}

      {/* Detail Modal */}
      {selected && (
        <NFTDetailModal
          asset={selected}
          onClose={handleCloseModal}
          isOwned={isOwned(selected)}
        />
      )}
    </PageLayout>
  );
}
