import React from 'react';
import { Message } from '../types';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const timestamp = new Date(message.timestamp);
  const timeStr = format(timestamp, 'HH:mm', { locale: he });

  const getMessageClass = () => {
    if (message.type === 'system') return 'message message-system';
    return `message message-${message.sender}`;
  };

  return (
    <div className={getMessageClass()}>
      {message.imageUrl && (
        <img
          src={message.imageUrl}
          alt="תמונה"
          className="message-image"
          onClick={() => window.open(message.imageUrl, '_blank')}
          style={{ cursor: 'pointer' }}
        />
      )}
      <div className="message-content">
        {message.content.split('\n').map((line, i) => (
          <React.Fragment key={i}>
            {line}
            {i < message.content.split('\n').length - 1 && <br />}
          </React.Fragment>
        ))}
      </div>
      <div className="message-time">
        {timeStr}
        {message.sender === 'user' && (
          <span style={{ marginRight: '4px' }}>✓✓</span>
        )}
      </div>
    </div>
  );
}
