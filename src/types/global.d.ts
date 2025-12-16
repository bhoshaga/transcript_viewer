// TypeScript declaration for global window.ENV object

interface EnvVariables {
  GRAPHQL_URL: string;
  GRAPHQL_WS_URL: string;
  AUTH_TOKEN: string;
  USER_ID: string;
  USER_EMAIL: string;
  USER_NAME: string;
}

interface Message {
  id: string;
  speaker: string;
  content: string;
  timestamp?: string;
  call_time?: string;
}

declare global {
  interface Window {
    ENV?: EnvVariables;
    transcriptData?: Message[];
  }
}

export {};
