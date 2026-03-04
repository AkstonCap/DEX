/**
 * Tests for NFTCard parseNftData helper
 */

// Mock nexus-module to avoid importing UI dependencies
jest.mock('nexus-module', () => ({
  Button: 'Button',
}));

import { parseNftData } from '../NFTCard';

describe('parseNftData', () => {
  it('should parse JSON array fields from asset', () => {
    const asset = {
      address: 'addr_1',
      json: [
        { name: 'title', value: 'My Art' },
        { name: 'description', value: 'A piece' },
        { name: 'image_url', value: 'https://example.com/art.png' },
        { name: 'image_sha256', value: 'abc123' },
        { name: 'artist', value: 'TestArtist' },
        { name: 'edition', value: '1/5' },
      ],
    };

    const result = parseNftData(asset);
    expect(result.title).toBe('My Art');
    expect(result.description).toBe('A piece');
    expect(result.image_url).toBe('https://example.com/art.png');
    expect(result.image_sha256).toBe('abc123');
    expect(result.artist).toBe('TestArtist');
    expect(result.edition).toBe('1/5');
  });

  it('should parse JSON string data from asset', () => {
    const asset = {
      address: 'addr_2',
      data: JSON.stringify({
        title: 'Data Art',
        image_url: 'https://example.com/data.png',
        artist: 'DataArtist',
      }),
    };

    const result = parseNftData(asset);
    expect(result.title).toBe('Data Art');
    expect(result.image_url).toBe('https://example.com/data.png');
    expect(result.artist).toBe('DataArtist');
  });

  it('should use fallback values for missing fields', () => {
    const asset = { address: 'addr_3' };

    const result = parseNftData(asset);
    expect(result.title).toBe('Untitled');
    expect(result.description).toBe('');
    expect(result.image_url).toBe('');
    expect(result.artist).toBe('Unknown');
    expect(result.edition).toBe('');
  });

  it('should use asset.name as title fallback', () => {
    const asset = {
      address: 'addr_4',
      name: 'AssetName',
      json: [],
    };

    const result = parseNftData(asset);
    expect(result.title).toBe('AssetName');
  });

  it('should use asset.image_url as image fallback', () => {
    const asset = {
      address: 'addr_5',
      image_url: 'https://example.com/direct.png',
      json: [],
    };

    const result = parseNftData(asset);
    expect(result.image_url).toBe('https://example.com/direct.png');
  });

  it('should handle invalid JSON data gracefully', () => {
    const asset = {
      address: 'addr_6',
      data: 'not valid json{',
    };

    const result = parseNftData(asset);
    expect(result.title).toBe('Untitled');
    expect(result.artist).toBe('Unknown');
  });

  it('should handle JSON array with malformed entries', () => {
    const asset = {
      address: 'addr_7',
      json: [
        { name: 'title', value: 'Good' },
        null,
        { value: 'no name field' },
        { name: 123, value: 'bad name type' },
      ],
    };

    const result = parseNftData(asset);
    expect(result.title).toBe('Good');
  });

  it('should handle JSON object format (non-array)', () => {
    const asset = {
      address: 'addr_8',
      json: {
        title: 'Object Art',
        artist: 'ObjectArtist',
        image_url: 'https://example.com/obj.png',
      },
    };

    // normalizeJsonFields returns the object as-is if not an array
    const result = parseNftData(asset);
    expect(result.title).toBe('Object Art');
    expect(result.artist).toBe('ObjectArtist');
  });
});
