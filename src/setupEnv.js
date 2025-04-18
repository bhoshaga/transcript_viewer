// Environment variables setup
console.log('Setting up environment variables...');
console.log('Available process.env keys:', Object.keys(process.env).filter(k => k.startsWith('REACT_APP')));
console.log('REACT_APP_OPENAI_API_KEY directly:', process.env.REACT_APP_OPENAI_API_KEY?.substring(0, 4) + '...');

window.ENV = {
  OPENAI_API_KEY: process.env.REACT_APP_OPENAI_API_KEY || '',
  ENABLE_STREAMING: process.env.REACT_APP_ENABLE_STREAMING !== 'false',
};

console.log('Environment setup complete');
console.log('API Key available:', !!window.ENV.OPENAI_API_KEY);
console.log('API Key length:', window.ENV.OPENAI_API_KEY?.length);
console.log('First few chars:', window.ENV.OPENAI_API_KEY?.substring(0, 4));

// Export for direct import
export const ENV = window.ENV; 