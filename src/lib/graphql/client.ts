// =============================================================================
// GraphQL Client - Simple fetch-based client with JWT auth
// =============================================================================

import { GraphQLResponse, GraphQLError } from '../../types';

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const GRAPHQL_URL = process.env.REACT_APP_GRAPHQL_URL!;
const GRAPHQL_WS_URL = process.env.REACT_APP_GRAPHQL_WS_URL!;
const AUTH_TOKEN = process.env.REACT_APP_AUTH_TOKEN!;

// -----------------------------------------------------------------------------
// GraphQL Client
// -----------------------------------------------------------------------------

export class GraphQLClient {
  private url: string;
  private token: string;

  constructor(url: string = GRAPHQL_URL, token: string = AUTH_TOKEN) {
    this.url = url;
    this.token = token;
  }

  async query<T>(
    query: string,
    variables?: Record<string, unknown>,
    operationName?: string
  ): Promise<T> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        query,
        variables,
        operationName,
      }),
    });

    if (!response.ok) {
      throw new GraphQLClientError(
        `HTTP ${response.status}: ${response.statusText}`,
        'HTTP_ERROR'
      );
    }

    const result: GraphQLResponse<T> = await response.json();

    if (result.errors && result.errors.length > 0) {
      throw new GraphQLClientError(
        result.errors[0].message,
        result.errors[0].extensions?.code || 'GRAPHQL_ERROR',
        result.errors
      );
    }

    return result.data;
  }

  async mutate<T>(
    mutation: string,
    variables?: Record<string, unknown>,
    operationName?: string
  ): Promise<T> {
    return this.query<T>(mutation, variables, operationName);
  }
}

// -----------------------------------------------------------------------------
// GraphQL Error
// -----------------------------------------------------------------------------

export class GraphQLClientError extends Error {
  code: string;
  errors?: GraphQLError[];

  constructor(message: string, code: string, errors?: GraphQLError[]) {
    super(message);
    this.name = 'GraphQLClientError';
    this.code = code;
    this.errors = errors;
  }
}

// -----------------------------------------------------------------------------
// WebSocket Client for Subscriptions
// -----------------------------------------------------------------------------

type SubscriptionHandler<T> = {
  next: (data: T) => void;
  error: (error: Error) => void;
  complete: () => void;
};

export class GraphQLSubscriptionClient {
  private url: string;
  private token: string;
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, SubscriptionHandler<unknown>> = new Map();
  private messageId = 0;
  private connectionPromise: Promise<void> | null = null;

  constructor(url: string = GRAPHQL_WS_URL, token: string = AUTH_TOKEN) {
    this.url = url;
    this.token = token;
  }

  private connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url, 'graphql-transport-ws');

      this.ws.onopen = () => {
        this.ws!.send(JSON.stringify({
          type: 'connection_init',
          payload: {
            authorization: this.token,
          },
        }));
      };

      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'connection_ack':
            resolve();
            break;

          case 'next':
            const handler = this.subscriptions.get(message.id);
            if (handler) {
              handler.next(message.payload.data);
            }
            break;

          case 'error':
            const errorHandler = this.subscriptions.get(message.id);
            if (errorHandler) {
              errorHandler.error(new Error(message.payload[0]?.message || 'Subscription error'));
            }
            break;

          case 'complete':
            const completeHandler = this.subscriptions.get(message.id);
            if (completeHandler) {
              completeHandler.complete();
              this.subscriptions.delete(message.id);
            }
            break;
        }
      };

      this.ws.onerror = (error) => {
        reject(new Error('WebSocket connection error'));
      };

      this.ws.onclose = () => {
        this.connectionPromise = null;
        this.subscriptions.forEach((handler) => {
          handler.complete();
        });
        this.subscriptions.clear();
      };
    });

    return this.connectionPromise;
  }

  async subscribe<T>(
    query: string,
    variables: Record<string, unknown>,
    handler: SubscriptionHandler<T>
  ): Promise<() => void> {
    await this.connect();

    const id = String(++this.messageId);

    this.subscriptions.set(id, handler as SubscriptionHandler<unknown>);

    this.ws!.send(JSON.stringify({
      id,
      type: 'subscribe',
      payload: {
        query,
        variables,
      },
    }));

    return () => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          id,
          type: 'complete',
        }));
      }
      this.subscriptions.delete(id);
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000);
      this.ws = null;
    }
    this.connectionPromise = null;
    this.subscriptions.clear();
  }
}

// -----------------------------------------------------------------------------
// Default Client Instances
// -----------------------------------------------------------------------------

export const graphqlClient = new GraphQLClient();
export const subscriptionClient = new GraphQLSubscriptionClient();
