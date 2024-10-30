const WS_BASE = process.env.REACT_APP_ENV === 'production'
  ? 'wss://api.stru.ai/ws/meetings'
  : 'ws://localhost:8000/ws/meetings';

class TranscriptWebSocket {
  constructor(meetingId, username, handlers) {
    this.meetingId = meetingId;
    this.username = username;
    this.handlers = handlers;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.close();
    }

    try {
      this.ws = new WebSocket(`${WS_BASE}/${this.meetingId}/transcript?user=${this.username}`);
      this.setupEventListeners();
      this.handlers.onDebugLog('Connecting to WebSocket...', 'info');
    } catch (error) {
      this.handlers.onDebugLog(`WebSocket connection error: ${error.message}`, 'error');
      this.attemptReconnect();
    }
  }

  setupEventListeners() {
    this.ws.onopen = () => {
      this.handlers.onStatusChange('CONNECTED');
      this.handlers.onDebugLog('Connected to meeting transcript', 'success');
      this.reconnectAttempts = 0;
      this.reconnectDelay = 2000;
      
      // Start ping interval
      this.startPingInterval();
    };

    this.ws.onclose = (event) => {
      this.handlers.onStatusChange('DISCONNECTED');
      this.handlers.onDebugLog(`Disconnected from meeting transcript. Code: ${event.code}`, 'error');
      
      if (event.code !== 1000) {
        this.attemptReconnect();
      }
    };

    this.ws.onerror = (error) => {
      this.handlers.onStatusChange('ERROR');
      this.handlers.onDebugLog(`WebSocket error: ${error.message || 'Unknown error'}`, 'error');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        this.handlers.onDebugLog(`Failed to parse WebSocket message: ${error.message}`, 'error');
      }
    };
  }

  handleMessage(data) {
    switch (data.type) {
      case 'status':
        this.handlers.onStats(data.data);
        break;
      case 'error':
        this.handlers.onDebugLog(`Server error: ${data.data}`, 'error');
        break;
      case 'history':
        const history = Array.isArray(data.data) ? data.data : [];
        this.handlers.onHistory(history);
        this.handlers.onDebugLog(`Loaded ${history.length} messages from history`, 'info');
        break;
      case 'stream':
        this.handleStreamMessage(data);
        break;
      case 'pong':
        // Handle pong response if needed
        break;
      default:
        this.handlers.onDebugLog(`Unknown message type: ${data.type}`, 'warning');
    }
  }

  handleStreamMessage(data) {
    const { active_streams = {}, message } = data.data || {};
    
    if (!message) return;

    if (message.isComplete) {
      this.handlers.onMessageComplete(message);
    } else {
      this.handlers.onMessageStreaming(message);
    }
  }

  startPingInterval() {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.handlers.onDebugLog('Max reconnection attempts reached', 'error');
      return;
    }

    this.handlers.onDebugLog(
      `Attempting to reconnect in ${this.reconnectDelay/1000} seconds...`, 
      'warning'
    );

    setTimeout(() => {
      this.reconnectAttempts++;
      this.reconnectDelay *= 1.5;
      this.connect();
    }, this.reconnectDelay);
  }

  disconnect() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    if (this.ws) {
      this.ws.close(1000);
      this.ws = null;
    }
  }
}

export default TranscriptWebSocket;