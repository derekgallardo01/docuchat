import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ChatMessage, Source } from '../types';
import { sendMessage } from '../chatConnection';
import { exportConversation } from '../api';
import TypingIndicator from './TypingIndicator';
import SourceCard from './SourceCard';

interface ChatPanelProps {
  conversationId: string | null;
  conversationTitle?: string;
  messages: ChatMessage[];
  onConversationCreated: (id: string) => void;
  onMessageSent: () => void;
  onViewDocument?: (documentId: string, fileName: string, chunkId?: string) => void;
}

// Local-only message appended during/after streaming
interface LocalAssistantMessage {
  content: string;
  sources: Source[];
  tokensUsed: number;
  done: boolean;
}

export default function ChatPanel({
  conversationId, conversationTitle, messages, onConversationCreated, onMessageSent, onViewDocument
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [localUserMessage, setLocalUserMessage] = useState<string | null>(null);
  const [localAssistant, setLocalAssistant] = useState<LocalAssistantMessage | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevMessagesLenRef = useRef(messages.length);

  // Scroll to bottom on new content
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, localAssistant?.content, localUserMessage, statusMessage]);

  // When server messages update and include the assistant reply, clear local state
  useEffect(() => {
    if (localUserMessage && messages.length > prevMessagesLenRef.current) {
      // Server caught up — check if the latest message is the assistant reply
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === 'assistant') {
        setLocalUserMessage(null);
        setLocalAssistant(null);
      }
    }
    prevMessagesLenRef.current = messages.length;
  }, [messages, localUserMessage]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [input]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput('');
    setIsStreaming(true);
    setLocalUserMessage(userMessage);
    setLocalAssistant({ content: '', sources: [], tokensUsed: 0, done: false });
    setStatusMessage(null);

    try {
      await sendMessage(
        userMessage,
        conversationId,
        (token) => {
          setStatusMessage(null);
          setLocalAssistant((prev) => prev ? { ...prev, content: prev.content + token.token } : prev);
        },
        (complete) => {
          setLocalAssistant((prev) => prev ? {
            ...prev,
            sources: complete.sources,
            tokensUsed: complete.tokensUsed,
            done: true,
          } : prev);
          setIsStreaming(false);
          setStatusMessage(null);
          // Notify parent to refresh sidebar + load server messages
          if (!conversationId) {
            onConversationCreated(complete.conversationId);
          } else {
            onMessageSent();
          }
        },
        (error) => {
          console.error('Chat error:', error);
          setIsStreaming(false);
          setLocalUserMessage(null);
          setLocalAssistant(null);
          setStatusMessage(null);
        },
        (status) => {
          setStatusMessage(status.status);
        }
      );
    } catch (err) {
      console.error('Failed to send message:', err);
      setIsStreaming(false);
      setLocalUserMessage(null);
      setLocalAssistant(null);
      setStatusMessage(null);
    }
  }, [input, isStreaming, conversationId, onConversationCreated, onMessageSent]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMarkdown = (content: string) => (
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
      {content}
    </ReactMarkdown>
  );

  const renderSources = (sources: Source[]) => {
    if (sources.length === 0) return null;
    return (
      <div className="sources">
        <div className="sources-label">Sources:</div>
        {sources.map((source, i) => (
          <SourceCard key={i} source={source} onViewDocument={onViewDocument ? () => onViewDocument('', source.fileName) : undefined} />
        ))}
      </div>
    );
  };

  // Build the display list: server messages, then local messages (if not yet synced)
  const hasLocalMessages = localUserMessage !== null;

  const showEmptyState = messages.length === 0 && !hasLocalMessages;

  return (
    <div className="chat-panel">
      {conversationId && conversationTitle && (
        <div className="chat-header">
          <h2>{conversationTitle}</h2>
          <button
            className="btn-export"
            onClick={() => exportConversation(conversationId, conversationTitle)}
            title="Export conversation"
          >
            Export
          </button>
        </div>
      )}

      <div className="messages-container">
        {showEmptyState && (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <path d="M8 10h8M8 14h4" />
              </svg>
            </div>
            <h2>RAG Chat</h2>
            <p>Upload documents and ask questions about them.</p>
          </div>
        )}

        {/* Server messages */}
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="message-header">
              <span className="message-role">{msg.role === 'user' ? 'You' : 'Assistant'}</span>
              {msg.role === 'assistant' && msg.tokensUsed != null && msg.tokensUsed > 0 && (
                <span className="token-badge">{msg.tokensUsed} tokens</span>
              )}
            </div>
            <div className="message-content">
              {msg.role === 'assistant' ? renderMarkdown(msg.content) : <p>{msg.content}</p>}
            </div>
            {renderSources(msg.sources)}
          </div>
        ))}

        {/* Local user message (not yet in server messages) */}
        {hasLocalMessages && (
          <div className="message user fade-in">
            <div className="message-header">
              <span className="message-role">You</span>
            </div>
            <div className="message-content">
              <p>{localUserMessage}</p>
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {isStreaming && statusMessage && !localAssistant?.content && (
          <div className="message assistant fade-in">
            <div className="message-header">
              <span className="message-role">Assistant</span>
            </div>
            <TypingIndicator status={statusMessage} />
          </div>
        )}

        {/* Streaming / completed local assistant message */}
        {hasLocalMessages && localAssistant && localAssistant.content && (
          <div className="message assistant fade-in">
            <div className="message-header">
              <span className="message-role">Assistant</span>
              {localAssistant.done && localAssistant.tokensUsed > 0 && (
                <span className="token-badge">{localAssistant.tokensUsed} tokens</span>
              )}
            </div>
            <div className="message-content">
              {renderMarkdown(localAssistant.content)}
              {!localAssistant.done && <span className="cursor-blink">|</span>}
            </div>
            {localAssistant.done && renderSources(localAssistant.sources)}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <textarea
          ref={textareaRef}
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
