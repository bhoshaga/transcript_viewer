import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { getEnv } from "./useEnv"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Debug logger that only outputs to console when DEBUG environment variable is true
 */
export const logger = {
  log: (...args: any[]) => {
    if (getEnv().DEBUG) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    if (getEnv().DEBUG) {
      console.error(...args);
    }
  },
  warn: (...args: any[]) => {
    if (getEnv().DEBUG) {
      console.warn(...args);
    }
  },
  info: (...args: any[]) => {
    if (getEnv().DEBUG) {
      console.info(...args);
    }
  }
};

/**
 * Formats a timestamp to a consistent display format
 * @param timestamp - Legacy timestamp string (optional)
 * @param call_time - Time within the meeting (MM:SS format)
 * @param capture_time - When the message was captured (ISO format)
 * @returns A formatted timestamp string
 */
export function formatTimestamp(
  timestamp?: string, 
  call_time?: string, 
  capture_time?: string
): string {
  // If we have both call_time and capture_time, format them together
  if (call_time && capture_time) {
    try {
      const captureDate = new Date(capture_time);
      if (!isNaN(captureDate.getTime())) {
        // Format the capture time to local time
        const formattedCaptureTime = captureDate.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
        
        // Return the combined format: "11:15 • 9:11:42 AM"
        return `${call_time} • ${formattedCaptureTime}`;
      }
    } catch (error) {
      console.error("Error formatting capture time:", error);
    }
  }

  // If we only have call_time, use that
  if (call_time) {
    return call_time;
  }
  
  // If we only have capture_time, format that
  if (capture_time) {
    try {
      const captureDate = new Date(capture_time);
      if (!isNaN(captureDate.getTime())) {
        return captureDate.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
      }
    } catch (error) {
      console.error("Error formatting capture time:", error);
    }
  }
  
  // Fall back to original timestamp logic if that's all we have
  if (timestamp) {
    // Handle undefined or null timestamps
    if (timestamp === undefined || timestamp === null) {
      return '00:00'; // Default fallback value
    }
    
    // Check if timestamp is in "HH:MM" format (like "10:00")
    if (/^\d{1,2}:\d{2}$/.test(timestamp)) {
      return timestamp; // Return as is
    }
    
    // Check if format is ISO 8601
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(timestamp)) {
      try {
        const formatted = new Date(timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
        return formatted;
      } catch (error) {
        console.error("Error formatting ISO timestamp:", error);
        return timestamp; // Fallback to the original value
      }
    }
    
    // If the timestamp contains commas, it might be a speaker name mixed in
    // Try to extract just the time portion if possible
    if (typeof timestamp === 'string') {
      const timeMatch = timestamp.match(/\d{1,2}:\d{2}/);
      if (timeMatch) {
        return timeMatch[0];
      }
    }
  }
  
  // If all else fails, return a default
  return '00:00';
}