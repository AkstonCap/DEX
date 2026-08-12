import { apiCall as nexusApiCall } from 'nexus-module';

/**
 * Wrapper around nexus-module's apiCall with retry logic and better error handling.
 * @param {string} endpoint - The API endpoint to call
 * @param {object} params - Parameters to send with the request
 * @param {number} retries - Number of retry attempts (default: 3)
 * @param {number} delayMs - Base delay in milliseconds for exponential backoff (default: 1000)
 * @returns {Promise<any>} The API response
 * @throws {Error} If all retries fail
 */
export const apiCallWithRetry = async (endpoint, params = {}, retries = 3, delayMs = 1000) => {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await nexusApiCall(endpoint, params);
      return result;
    } catch (error) {
      lastError = error;
      // If this is the last attempt, throw the error
      if (attempt === retries) {
        console.error(`API call to ${endpoint} failed after ${retries} retries:`, error);
        throw error;
      }
      // Otherwise, wait and retry
      const waitTime = delayMs * Math.pow(2, attempt); // exponential backoff
      console.warn(`API call to ${endpoint} failed (attempt ${attempt + 1}/${retries + 1}). Retrying in ${waitTime}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  // This line should never be reached due to the throw above, but TypeScript needs it
  throw lastError;
};

export default apiCallWithRetry;