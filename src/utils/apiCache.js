/**
 * Simple in-memory cache for API responses
 * Reduces redundant API calls across components
 */

const cache = new Map();
const DEFAULT_TTL = 10000; // 10 seconds default

/**
 * Generate a cache key from endpoint and params
 */
const getCacheKey = (endpoint, params = {}) => {
  return `${endpoint}:${JSON.stringify(params)}`;
};

/**
 * Get cached response if not expired
 * @param {string} endpoint - API endpoint
 * @param {object} params - API parameters
 * @returns {any|null} Cached data or null if expired/missing
 */
export const getCached = (endpoint, params = {}) => {
  const key = getCacheKey(endpoint, params);
  const entry = cache.get(key);
  
  if (!entry) return null;
  
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  
  return entry.data;
};

/**
 * Store response in cache
 * @param {string} endpoint - API endpoint
 * @param {object} params - API parameters
 * @param {any} data - Response data to cache
 * @param {number} ttl - Time to live in milliseconds
 */
export const setCache = (endpoint, params = {}, data, ttl = DEFAULT_TTL) => {
  const key = getCacheKey(endpoint, params);
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttl,
  });
};

/**
 * Clear entire cache or specific entries
 * @param {string} endpoint - Optional endpoint to clear
 */
export const clearCache = (endpoint = null) => {
  if (endpoint) {
    // Clear all entries for this endpoint
    for (const key of cache.keys()) {
      if (key.startsWith(endpoint + ':')) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
};

/**
 * Cached API call wrapper
 * Use this for read-only API calls that can be cached
 * @param {Function} apiCallFn - The apiCall function from nexus-module
 * @param {string} endpoint - API endpoint
 * @param {object} params - API parameters
 * @param {number} ttl - Cache TTL in milliseconds
 * @returns {Promise<any>} API response (cached or fresh)
 */
export const cachedApiCall = async (apiCallFn, endpoint, params = {}, ttl = DEFAULT_TTL) => {
  // Check cache first
  const cached = getCached(endpoint, params);
  if (cached !== null) {
    return cached;
  }
  
  // Make fresh API call
  const result = await apiCallFn(endpoint, params);
  
  // Cache the result
  setCache(endpoint, params, result, ttl);
  
  return result;
};

/**
 * Get cache stats for debugging
 */
export const getCacheStats = () => {
  const now = Date.now();
  let activeEntries = 0;
  let expiredEntries = 0;
  
  for (const entry of cache.values()) {
    if (now > entry.expiresAt) {
      expiredEntries++;
    } else {
      activeEntries++;
    }
  }
  
  return {
    totalEntries: cache.size,
    activeEntries,
    expiredEntries,
  };
};
