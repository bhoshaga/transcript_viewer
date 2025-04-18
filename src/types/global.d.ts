// TypeScript declaration for global window.ENV object
import { Message } from '../types';

interface EnvVariables {
  OPENAI_API_KEY: string;
  ENABLE_STREAMING: boolean;
}

declare global {
  interface Window {
    ENV?: EnvVariables;
    transcriptData?: Message[];
  }
}

export {}; 