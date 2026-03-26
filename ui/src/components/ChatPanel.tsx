import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ChatMessage, Source } from '../types';
import { sendMessage } from '../chatConnection';

interface ChatPanelProps {
  conversationId: string | null;
  messages: ChatMessage[];
  onConversationCreated: (id: string) => void;
  onMessageSent: () => void;
}

export default function ChatPanel({ conversationId, messages, onConversationCreated, onMessageSent }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingSources, setStreamingSources] = useState<Source[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput('');
    setIsStreaming(true);
    setStreamingContent('');
    setStreamingSources([]);

    try {
      await sendMessage(
        userMessage,
        conversationId,
        (token) => {
          setStreamingContent((prev) => prev + token.token);
        },
        (complete) => {
          setStreamingSources(complete.sources);
          setIsStreaming(false);
          setStreamingContent('');
          if (!conversationId) {
            onConversationCreated(complete.conversationId);
          }
          onMessageSent();
        },
        (error) => {
          console.error('Chat error:', error);
          setIsStreaming(false);
          setStreamingContent('');
        }
      );
    } catch (err) {
      console.error('Failed to send message:', err);
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const allMessages = [
    ...messages,
    ...(isStreaming && input === '' ? [
      { id: 'user-pending', role: 'user' as const, content: '', sources: [], createdAt: '' },
    ] : []),
  ];

  return (
    <div className="chat-panel">
      <div className="messages-container">
        {allMessages.length === 0 && !isStreaming && (
          <div className="empty-state">
            <h2>RAG Chat</h2>
            <p>Upload documents and ask questions about them.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="message-role">{msg.role === 'user' ? 'You' : 'Assistant'}</div>
            <div className="message-content">
              {msg.role === 'assistant' ? (
                <ReactMarkdown
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      const inline = !match;
                      return !inline ? (
                        <SyntaxHighlighter style={oneDark} language={match![1]} PreTag="div">
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>{children}</code>
                      );
                    },
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
            {msg.sources.length > 0 && (
              <div className="sources">
                <div className="sources-label">Sources:</div>
                {msg.sources.map((source, i) => (
                  <div key={i} className="source-chip">
                    <span className="source-file">{source.fileName}</span>
                    <span className="source-score">{(source.relevanceScore * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {isStreaming && streamingContent && (
          <div className="message assistant">
            <div className="message-role">Assistant</div>
            <div className="message-content">
              <ReactMarkdown>{streamingContent}</ReactMarkdown>
              <span className="cursor-blink">|</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about your documents..."
          disabled={isStreaming}
          rows={1}
        />
        <button onClick={handleSend} disabled={isStreaming || !input.trim()}>
          {isStreaming ? 'Thinking...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
