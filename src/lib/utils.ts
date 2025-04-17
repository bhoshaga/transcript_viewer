import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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
  // Log the raw inputs for debugging
  console.log(`formatTimestamp inputs:`, { timestamp, call_time, capture_time });
  
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
      console.log('Timestamp is undefined or null');
      return '00:00'; // Default fallback value
    }
    
    // Check if timestamp is in "HH:MM" format (like "10:00")
    if (/^\d{1,2}:\d{2}$/.test(timestamp)) {
      console.log(`Valid HH:MM format: ${timestamp}`);
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
        console.log(`Parsed ISO timestamp ${timestamp} to ${formatted}`);
        return formatted;
      } catch (error) {
        console.error("Error formatting ISO timestamp:", error);
        return timestamp; // Fallback to the original value
      }
    }
    
    // For debugging, log unknown timestamp formats
    console.log(`Unknown timestamp format in utils: "${timestamp}"`);
    
    // If the timestamp contains commas, it might be a speaker name mixed in
    // Try to extract just the time portion if possible
    if (typeof timestamp === 'string') {
      const timeMatch = timestamp.match(/\d{1,2}:\d{2}/);
      if (timeMatch) {
        console.log(`Extracted time from complex string: ${timeMatch[0]}`);
        return timeMatch[0];
      }
    }
  }
  
  // If all else fails, return a default
  return '00:00';
}