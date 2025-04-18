import { getEnv } from './lib/useEnv';

// OpenAI API configuration
const env = getEnv();
export const OPENAI_API_KEY = env.OPENAI_API_KEY;
export const ENABLE_STREAMING = env.ENABLE_STREAMING;

// Log env variables for debugging (will be removed in production)
console.log('Environment variables debug:');
console.log('REACT_APP_OPENAI_API_KEY present:', !!process.env.REACT_APP_OPENAI_API_KEY);
console.log('First few characters:', process.env.REACT_APP_OPENAI_API_KEY?.substring(0, 4));
console.log('All env keys:', Object.keys(process.env).filter(key => key.includes('OPENAI') || key.includes('REACT')));

// Token limits
export const MAX_CONVERSATION_TOKENS = 4000; // Approximate token limit for conversation history

// Check if API key is configured
export const isOpenAIConfigured = (): boolean => {
  return !!OPENAI_API_KEY;
};

// Chat configuration
export const CHAT_CONFIG = {
  model: 'gpt-4o',
  temperature: 0.7,
  max_tokens: 1000,
};

// Function to get a redacted API key for debugging (shows only first 4 chars)
export const getRedactedKey = (): string => {
  if (!OPENAI_API_KEY) return 'Not configured';
  if (OPENAI_API_KEY.length < 8) return 'Invalid key format';
  return `${OPENAI_API_KEY.substring(0, 4)}...${OPENAI_API_KEY.substring(OPENAI_API_KEY.length - 4)}`;
}; 