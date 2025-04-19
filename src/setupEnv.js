// Environment variables setup
import { logger } from './lib/utils';

// Set initial DEBUG value for bootstrapping the logger
const initialDebug = process.env.REACT_APP_DEBUG === 'true';

// Create a bootstrapping logger function that respects DEBUG before window.ENV is fully set up
const bootstrapLog = (...args) => {
  if (initialDebug) {
    console.log(...args);
  }
};

bootstrapLog('Setting up environment variables...');
bootstrapLog('Available process.env keys:', Object.keys(process.env).filter(k => k.startsWith('REACT_APP')));
bootstrapLog('REACT_APP_OPENAI_API_KEY directly:', process.env.REACT_APP_OPENAI_API_KEY?.substring(0, 4) + '...');

window.ENV = {
  OPENAI_API_KEY: process.env.REACT_APP_OPENAI_API_KEY || '',
  ENABLE_STREAMING: process.env.REACT_APP_ENABLE_STREAMING !== 'false',
  DEBUG: process.env.REACT_APP_DEBUG === 'true',
};

bootstrapLog('Environment setup complete');
bootstrapLog('API Key available:', !!window.ENV.OPENAI_API_KEY);
bootstrapLog('API Key length:', window.ENV.OPENAI_API_KEY?.length);
bootstrapLog('First few chars:', window.ENV.OPENAI_API_KEY?.substring(0, 4));

// Export for direct import
export const ENV = window.ENV; 