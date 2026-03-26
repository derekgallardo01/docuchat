import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import DocumentsPanel from './components/DocumentsPanel';
import { Conversation, ChatMessage } from './types';
import { getConversations, getConversation, deleteConversation } from './api';
import './App.css';

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showDocuments, setShowDocuments] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const convos = await getConversations();
      setConversations(convos);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const loadMessages = useCallback(async (id: string) => {
    try {
      const detail = await getConversation(id);
      setMessages(detail.messages);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }, []);

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setShowDocuments(false);
    loadMessages(id);
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setShowDocuments(false);
  };

  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id);
    if (activeConversationId === id) {
      setActiveConversationId(null);
      setMessages([]);
    }
    await loadConversations();
  };

  const handleConversationCreated = (id: string) => {
    setActiveConversationId(id);
    loadConversations();
  };

  const handleMessageSent = () => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
      loadConversations();
    }
  };

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelect={handleSelectConversation}
        onNew={handleNewChat}
        onDelete={handleDeleteConversation}
        onShowDocuments={() => setShowDocuments(true)}
      />
      <main className="main-content">
        {showDocuments ? (
          <DocumentsPanel onClose={() => setShowDocuments(false)} />
        ) : (
          <ChatPanel
            conversationId={activeConversationId}
            messages={messages}
            onConversationCreated={handleConversationCreated}
            onMessageSent={handleMessageSent}
          />
        )}
      </main>
    </div>
  );
}

export default App;
