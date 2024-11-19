export const formatTimestamp = (callTime, captureTime) => {
    try {
      // Format the time based on locale
      const timeFormatter = new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
  
      // If callTime is in duration format (mm:ss or hh:mm:ss)
      if (/^\d{2}(:\d{2}){1,2}$/.test(callTime)) {
        const captureDate = new Date(captureTime);
        return `${callTime} (${timeFormatter.format(captureDate)})`;
      }
  
      // If callTime is a timestamp
      const callDate = new Date(callTime);
      return timeFormatter.format(callDate);
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid time';
    }
  };
  
  export const formatDuration = (startTime, endTime = null) => {
    try {
      const start = new Date(startTime);
      const end = endTime ? new Date(endTime) : new Date();
      const durationMs = end - start;
      
      const seconds = Math.floor(durationMs / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      
      if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
      }
      if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
      }
      return `${seconds}s`;
    } catch (error) {
      return 'Invalid duration';
    }
  };