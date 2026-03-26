import React from 'react';
import { Conversation } from '../types';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onShowDocuments: () => void;
}

export default function Sidebar({ conversations, activeConversationId, onSelect, onNew, onDelete, onShowDocuments }: SidebarProps) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>RAG Chat</h1>
      </div>

      <div className="sidebar-actions">
        <button className="btn-new-chat" onClick={onNew}>+ New Chat</button>
        <button className="btn-documents" onClick={onShowDocuments}>Documents</button>
      </div>

      <div className="conversation-list">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={`conversation-item ${conv.id === activeConversationId ? 'active' : ''}`}
            onClick={() => onSelect(conv.id)}
          >
            <span className="conversation-title">{conv.title}</span>
            <button
              className="btn-delete"
              onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
              title="Delete"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
