import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import DocumentsPanel from './components/DocumentsPanel';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import DocumentViewer from './components/DocumentViewer';
import { Conversation, ChatMessage } from './types';
import { getConversations, getConversation, deleteConversation } from './api';
import { useTheme } from './hooks/useTheme';
import './App.css';

type View = 'chat' | 'documents' | 'analytics';

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversationTitle, setActiveConversationTitle] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [view, setView] = useState<View>('chat');
  const [viewerDoc, setViewerDoc] = useState<{ documentId: string; fileName: string; chunkId?: string } | null>(null);
  const { theme, toggleTheme } = useTheme();

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
      setActiveConversationTitle(detail.title);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }, []);

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setView('chat');
    loadMessages(id);
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setActiveConversationTitle(undefined);
    setMessages([]);
    setView('chat');
  };

  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id);
    if (activeConversationId === id) {
      setActiveConversationId(null);
      setActiveConversationTitle(undefined);
      setMessages([]);
    }
    await loadConversations();
  };

  const handleConversationCreated = (id: string) => {
    setActiveConversationId(id);
    loadMessages(id);
    loadConversations();
  };

  const handleMessageSent = () => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
      loadConversations();
    }
  };

  const handleViewDocument = (documentId: string, fileName: string, chunkId?: string) => {
    setViewerDoc({ documentId, fileName, chunkId });
  };

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelect={handleSelectConversation}
        onNew={handleNewChat}
        onDelete={handleDeleteConversation}
        onShowDocuments={() => setView('documents')}
        onShowAnalytics={() => setView('analytics')}
        theme={theme}
        onToggleTheme={toggleTheme}
        onConversationsChanged={loadConversations}
      />
      <main className="main-content">
        {view === 'documents' && (
          <DocumentsPanel onClose={() => setView('chat')} />
        )}
        {view === 'analytics' && (
          <AnalyticsDashboard onClose={() => setView('chat')} />
        )}
        {view === 'chat' && (
          <ChatPanel
            conversationId={activeConversationId}
            conversationTitle={activeConversationTitle}
            messages={messages}
            onConversationCreated={handleConversationCreated}
            onMessageSent={handleMessageSent}
            onViewDocument={handleViewDocument}
          />
        )}
      </main>

      {viewerDoc && (
        <DocumentViewer
          documentId={viewerDoc.documentId}
          fileName={viewerDoc.fileName}
          highlightChunkId={viewerDoc.chunkId}
          onClose={() => setViewerDoc(null)}
        />
      )}
    </div>
  );
}

export default App;
