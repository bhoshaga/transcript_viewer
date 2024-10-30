import React, { useRef, useEffect } from 'react';

const MessageList = ({ 
  messages, 
  activeStreams, 
  autoScroll, 
  onScroll 
}) => {
  const messagesEndRef = useRef(null);
  const messageContainerRef = useRef(null);

  // Remove duplicates from messages array
  const uniqueMessages = messages.reduce((acc, message) => {
    const key = `${message.speaker}-${message.timestamp}-${message.content}`;
    if (!acc.some(m => 
      m.speaker === message.speaker && 
      m.timestamp === message.timestamp && 
      m.content === message.content
    )) {
      acc.push(message);
    }
    return acc;
  }, []);

  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [uniqueMessages, activeStreams, autoScroll]);

  return (
    <div 
      className="transcript-messages" 
      ref={messageContainerRef}
      onScroll={onScroll}
    >
      {uniqueMessages.map((msg, idx) => (
        <div key={`msg-${msg.timestamp}-${idx}`} className="transcript-message">
          <div className="message-speaker">{msg.speaker || 'Unknown'}</div>
          <div className="message-content">{msg.content || ''}</div>
          <div className="message-timestamp">
            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''} 
            {msg.duration ? `(${msg.duration.toFixed(1)}s)` : ''}
          </div>
        </div>
      ))}
      
      {Object.values(activeStreams)
        .filter(stream => stream?.speaker && stream?.content)
        .map((stream, idx) => (
          <div key={`stream-${stream.timestamp}-${idx}`} className="transcript-message streaming">
            <div className="message-speaker">{stream.speaker}</div>
            <div className="message-content">{stream.content}</div>
            <div className="message-timestamp">
              {stream.timestamp ? new Date(stream.timestamp).toLocaleTimeString() : ''} 
              {stream.duration ? `(${stream.duration.toFixed(1)}s)` : ''}
            </div>
          </div>
        ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;