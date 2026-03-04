/**
 * Tests for the API cache utility used in NFT listing fetches
 */
import { getCached, setCache, clearCache, cachedApiCall, getCacheStats } from '../apiCache';

describe('API Cache', () => {
  beforeEach(() => {
    clearCache();
  });

  describe('setCache / getCached', () => {
    it('should store and retrieve cached data', () => {
      setCache('test/endpoint', { limit: 10 }, { data: 'hello' }, 60000);

      const result = getCached('test/endpoint', { limit: 10 });
      expect(result).toEqual({ data: 'hello' });
    });

    it('should return null for missing cache entries', () => {
      const result = getCached('nonexistent/endpoint', {});
      expect(result).toBeNull();
    });

    it('should return null for expired cache entries', () => {
      // Set with 0 TTL (immediately expired)
      setCache('test/endpoint', {}, { data: 'old' }, -1);

      const result = getCached('test/endpoint', {});
      expect(result).toBeNull();
    });

    it('should differentiate by params', () => {
      setCache('test/endpoint', { limit: 10 }, 'data10', 60000);
      setCache('test/endpoint', { limit: 20 }, 'data20', 60000);

      expect(getCached('test/endpoint', { limit: 10 })).toBe('data10');
      expect(getCached('test/endpoint', { limit: 20 })).toBe('data20');
    });
  });

  describe('clearCache', () => {
    it('should clear all cache entries', () => {
      setCache('a', {}, 'data_a', 60000);
      setCache('b', {}, 'data_b', 60000);

      clearCache();

      expect(getCached('a', {})).toBeNull();
      expect(getCached('b', {})).toBeNull();
    });

    it('should clear only matching endpoint', () => {
      setCache('a', {}, 'data_a', 60000);
      setCache('b', {}, 'data_b', 60000);

      clearCache('a');

      expect(getCached('a', {})).toBeNull();
      expect(getCached('b', {})).toBe('data_b');
    });
  });

  describe('cachedApiCall', () => {
    it('should call API and cache result on first call', async () => {
      const mockApi = jest.fn().mockResolvedValue([{ id: 1 }]);

      const result = await cachedApiCall(mockApi, 'test/endpoint', {}, 60000);

      expect(result).toEqual([{ id: 1 }]);
      expect(mockApi).toHaveBeenCalledTimes(1);
    });

    it('should return cached result on subsequent calls', async () => {
      const mockApi = jest.fn().mockResolvedValue([{ id: 1 }]);

      await cachedApiCall(mockApi, 'test/endpoint', {}, 60000);
      const result = await cachedApiCall(mockApi, 'test/endpoint', {}, 60000);

      expect(result).toEqual([{ id: 1 }]);
      expect(mockApi).toHaveBeenCalledTimes(1); // Only called once
    });
  });

  describe('getCacheStats', () => {
    it('should report cache statistics', () => {
      setCache('active', {}, 'data', 60000);

      const stats = getCacheStats();
      expect(stats.totalEntries).toBe(1);
      expect(stats.activeEntries).toBe(1);
    });
  });
});
