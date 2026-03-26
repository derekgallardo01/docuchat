import React, { useState } from 'react';
import { Conversation } from '../types';
import { renameConversation } from '../api';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onShowDocuments: () => void;
  onShowAnalytics: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onConversationsChanged: () => void;
}

export default function Sidebar({
  conversations, activeConversationId, onSelect, onNew, onDelete,
  onShowDocuments, onShowAnalytics, theme, onToggleTheme, onConversationsChanged
}: SidebarProps) {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filtered = search
    ? conversations.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  const handleDoubleClick = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleRename = async () => {
    if (editingId && editTitle.trim()) {
      await renameConversation(editingId, editTitle.trim());
      onConversationsChanged();
    }
    setEditingId(null);
  };

  const handleRenameKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRename();
    if (e.key === 'Escape') setEditingId(null);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>RAG Chat</h1>
        <button className="btn-theme" onClick={onToggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? '\u2600' : '\u263E'}
        </button>
      </div>

      <div className="sidebar-actions">
        <button className="btn-new-chat" onClick={onNew}>+ New Chat</button>
        <div className="sidebar-btn-row">
          <button className="btn-documents" onClick={onShowDocuments}>Documents</button>
          <button className="btn-analytics" onClick={onShowAnalytics}>Analytics</button>
        </div>
      </div>

      <div className="search-container">
        <input
          type="text"
          placeholder="Search conversations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        {search && (
          <button className="search-clear" onClick={() => setSearch('')}>&times;</button>
        )}
      </div>

      <div className="conversation-list">
        {filtered.map((conv) => (
          <div
            key={conv.id}
            className={`conversation-item ${conv.id === activeConversationId ? 'active' : ''}`}
            onClick={() => onSelect(conv.id)}
            onDoubleClick={() => handleDoubleClick(conv)}
          >
            {editingId === conv.id ? (
              <input
                className="rename-input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleRename}
                onKeyDown={handleRenameKey}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="conversation-title">{conv.title}</span>
            )}
            <button
              className="btn-delete"
              onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
              title="Delete"
            >
              &times;
            </button>
          </div>
        ))}
        {filtered.length === 0 && search && (
          <div className="no-results">No conversations found</div>
        )}
      </div>
    </div>
  );
}
