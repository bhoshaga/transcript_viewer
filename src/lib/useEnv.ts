/**
 * Custom hook to access environment variables with fallbacks
 */
export const useEnv = () => {
  return {
    OPENAI_API_KEY: process.env.REACT_APP_OPENAI_API_KEY || '',
    ENABLE_STREAMING: process.env.REACT_APP_ENABLE_STREAMING !== 'false',
  };
};

/**
 * Get environment variables directly (for non-hook contexts)
 */
export const getEnv = () => {
  return {
    OPENAI_API_KEY: process.env.REACT_APP_OPENAI_API_KEY || '',
    ENABLE_STREAMING: process.env.REACT_APP_ENABLE_STREAMING !== 'false',
  };
}; 