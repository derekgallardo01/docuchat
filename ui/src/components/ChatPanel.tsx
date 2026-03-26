import React, { useState, useRef, useEffect } from 'react';
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

export default function ChatPanel({
  conversationId, conversationTitle, messages, onConversationCreated, onMessageSent, onViewDocument
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const [completedResponse, setCompletedResponse] = useState<{ content: string; sources: Source[]; tokensUsed: number } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent, pendingUserMessage, statusMessage]);

  // Clear local state when server messages catch up
  useEffect(() => {
    if (!isStreaming && pendingUserMessage && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'assistant') {
        // Batch all local state clears together to avoid intermediate renders
        requestAnimationFrame(() => {
          setPendingUserMessage(null);
          setCompletedResponse(null);
          setStreamingContent('');
        });
      }
    }
  }, [messages, isStreaming, pendingUserMessage]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput('');
    setIsStreaming(true);
    setStreamingContent('');
    setPendingUserMessage(userMessage);
    setCompletedResponse(null);
    setStatusMessage(null);

    try {
      await sendMessage(
        userMessage,
        conversationId,
        (token) => {
          setStatusMessage(null);
          setStreamingContent((prev) => prev + token.token);
        },
        (complete) => {
          // Keep streamingContent visible — don't clear it
          setCompletedResponse({ content: '', sources: complete.sources, tokensUsed: complete.tokensUsed });
          setIsStreaming(false);
          setStatusMessage(null);
          // Delay server sync so local state stays visible without flicker
          setTimeout(() => {
            if (!conversationId) {
              onConversationCreated(complete.conversationId);
            } else {
              onMessageSent();
            }
          }, 100);
        },
        (error) => {
          console.error('Chat error:', error);
          setIsStreaming(false);
          setPendingUserMessage(null);
          setStatusMessage(null);
        },
        (status) => {
          setStatusMessage(status.status);
        }
      );
    } catch (err) {
      console.error('Failed to send message:', err);
      setIsStreaming(false);
      setPendingUserMessage(null);
      setStatusMessage(null);
    }
  };

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

  const renderMessage = (msg: ChatMessage) => (
    <div key={msg.id} className={`message ${msg.role} fade-in`}>
      <div className="message-header">
        <span className="message-role">{msg.role === 'user' ? 'You' : 'Assistant'}</span>
        {msg.role === 'assistant' && msg.tokensUsed && (
          <span className="token-badge">{msg.tokensUsed} tokens</span>
        )}
      </div>
      <div className="message-content">
        {msg.role === 'assistant' ? renderMarkdown(msg.content) : <p>{msg.content}</p>}
      </div>
      {renderSources(msg.sources)}
    </div>
  );

  const showEmptyState = messages.length === 0 && !pendingUserMessage && !isStreaming;

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

        {messages.map(renderMessage)}

        {pendingUserMessage && (
          <div className="message user fade-in">
            <div className="message-header">
              <span className="message-role">You</span>
            </div>
            <div className="message-content">
              <p>{pendingUserMessage}</p>
            </div>
          </div>
        )}

        {isStreaming && statusMessage && !streamingContent && (
          <div className="message assistant fade-in">
            <div className="message-header">
              <span className="message-role">Assistant</span>
            </div>
            <TypingIndicator status={statusMessage} />
          </div>
        )}

        {isStreaming && streamingContent && (
          <div className="message assistant fade-in">
            <div className="message-header">
              <span className="message-role">Assistant</span>
            </div>
            <div className="message-content">
              {renderMarkdown(streamingContent)}
              <span className="cursor-blink">|</span>
            </div>
          </div>
        )}

        {completedResponse && !isStreaming && streamingContent && (
          <div className="message assistant fade-in">
            <div className="message-header">
              <span className="message-role">Assistant</span>
              {completedResponse.tokensUsed > 0 && (
                <span className="token-badge">{completedResponse.tokensUsed} tokens</span>
              )}
            </div>
            <div className="message-content">
              {renderMarkdown(streamingContent)}
            </div>
            {renderSources(completedResponse.sources)}
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
