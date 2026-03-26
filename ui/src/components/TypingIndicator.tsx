import React from 'react';

interface TypingIndicatorProps {
  status: string;
}

export default function TypingIndicator({ status }: TypingIndicatorProps) {
  return (
    <div className="typing-indicator">
      <div className="typing-dots">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
      <span className="typing-status">{status}</span>
    </div>
  );
}
