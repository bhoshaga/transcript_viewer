export default class TranscriptWebSocket {
  constructor(meetingId, username, handlers) {
    this.meetingId = meetingId;
    this.username = username;
    this.ws = null;
    this.handlers = handlers;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
  }

  connect() {
    const wsUrl = `wss://api.stru.ai/ws/meetings/${this.meetingId}/transcript?user=${this.username}`;

    this.ws = new WebSocket(wsUrl);
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.ws.onopen = () => {
      this.handlers.onConnectionChange("CONNECTED");
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.ws.onclose = (event) => {
      this.handlers.onConnectionChange("DISCONNECTED");
      if (event.code !== 1000) {
        this.attemptReconnect();
      }
    };

    this.ws.onerror = (error) => {
      this.handlers.onConnectionChange("ERROR");
      this.handlers.onError(error);
    };
  }

  handleMessage(data) {
    switch (data.type) {
      case "stream":
        this.handleStreamMessage(data);
        break;
      case "history":
        this.handlers.onHistory(data.data);
        break;
      case "status":
        this.handlers.onStatus(data.data);
        break;
    }
  }

  handleStreamMessage(data) {
    const { message, active_streams } = data.data;

    if (message?.isComplete) {
      this.handlers.onMessageComplete(message);
    } else {
      this.handlers.onMessageStreaming(message);
    }

    this.handlers.onActiveStreamsUpdate(active_streams);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000);
      this.ws = null;
    }
  }
}
