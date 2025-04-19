import { Meeting } from "../types";
import { logger } from "../lib/utils";

export interface MeetingStatusHandlers {
  onMeetingEnded?: (meetingId: string, endTime: string) => void;
  onConnectionChange?: (status: "CONNECTED" | "DISCONNECTED" | "ERROR") => void;
  onError?: (error: Event) => void;
}

export default class MeetingStatusWebsocket {
  private meetingId: string;
  private username: string;
  private handlers: MeetingStatusHandlers;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  
  constructor(meetingId: string, username: string, handlers: MeetingStatusHandlers) {
    this.meetingId = meetingId;
    this.username = username;
    this.handlers = handlers;
  }
  
  connect() {
    const wsUrl = `wss://api.stru.ai/ws/meetings/${this.meetingId}/transcript?user=${this.username}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventListeners();
    } catch (error) {
      logger.error("Error connecting to WebSocket:", error);
      this.attemptReconnect();
    }
  }
  
  setupEventListeners() {
    if (!this.ws) return;
    
    this.ws.onopen = () => {
      logger.log("Connected to meeting status WebSocket");
      this.reconnectAttempts = 0;
      if (this.handlers.onConnectionChange) {
        this.handlers.onConnectionChange("CONNECTED");
      }
    };
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        logger.error("Error parsing WebSocket message:", error);
      }
    };
    
    this.ws.onclose = (event) => {
      logger.log("Meeting status WebSocket closed:", event.code, event.reason);
      if (this.handlers.onConnectionChange) {
        this.handlers.onConnectionChange("DISCONNECTED");
      }
      
      this.attemptReconnect();
    };
    
    this.ws.onerror = (error) => {
      logger.error("Meeting status WebSocket error:", error);
      if (this.handlers.onError) {
        this.handlers.onError(error);
      }
      if (this.handlers.onConnectionChange) {
        this.handlers.onConnectionChange("ERROR");
      }
    };
  }
  
  handleMessage(data: any) {
    // Only handle meeting_ended events in this service
    if (data.type === "meeting_ended") {
      logger.log("Meeting ended event received:", this.meetingId);
      const endTime = new Date().toISOString();
      
      if (this.handlers.onMeetingEnded) {
        this.handlers.onMeetingEnded(this.meetingId, endTime);
      }
    }
  }
  
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.log("Max reconnect attempts reached, giving up");
      return;
    }
    
    this.reconnectAttempts++;
    
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );
    
    logger.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }
  
  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close(1000);
      this.ws = null;
    }
  }
} 