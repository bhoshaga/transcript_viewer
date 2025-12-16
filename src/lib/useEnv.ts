// =============================================================================
// Environment Variables
// =============================================================================

interface EnvConfig {
  GRAPHQL_URL: string;
  GRAPHQL_WS_URL: string;
  AUTH_TOKEN: string;
  USER_ID: string;
  USER_EMAIL: string;
  USER_NAME: string;
}

export const useEnv = (): EnvConfig => {
  return {
    GRAPHQL_URL: process.env.REACT_APP_GRAPHQL_URL!,
    GRAPHQL_WS_URL: process.env.REACT_APP_GRAPHQL_WS_URL!,
    AUTH_TOKEN: process.env.REACT_APP_AUTH_TOKEN!,
    USER_ID: process.env.REACT_APP_USER_ID!,
    USER_EMAIL: process.env.REACT_APP_USER_EMAIL!,
    USER_NAME: process.env.REACT_APP_USER_NAME!,
  };
};

export const getEnv = (): EnvConfig => {
  return {
    GRAPHQL_URL: process.env.REACT_APP_GRAPHQL_URL!,
    GRAPHQL_WS_URL: process.env.REACT_APP_GRAPHQL_WS_URL!,
    AUTH_TOKEN: process.env.REACT_APP_AUTH_TOKEN!,
    USER_ID: process.env.REACT_APP_USER_ID!,
    USER_EMAIL: process.env.REACT_APP_USER_EMAIL!,
    USER_NAME: process.env.REACT_APP_USER_NAME!,
  };
};
