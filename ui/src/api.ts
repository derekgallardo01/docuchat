import { Conversation, ConversationDetail, Document, DocumentChunk, AnalyticsData } from './types';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5210';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// Conversations
export const getConversations = () => fetchJson<Conversation[]>('/api/conversations');
export const getConversation = (id: string) => fetchJson<ConversationDetail>(`/api/conversations/${id}`);
export const deleteConversation = (id: string) =>
  fetch(`${API_BASE}/api/conversations/${id}`, { method: 'DELETE' });
export const renameConversation = (id: string, title: string) =>
  fetch(`${API_BASE}/api/conversations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
export const exportConversation = async (id: string, title: string) => {
  const res = await fetch(`${API_BASE}/api/conversations/${id}/export`);
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}.md`;
  a.click();
  URL.revokeObjectURL(url);
};

// Documents
export const getDocuments = () => fetchJson<Document[]>('/api/documents');
export const getDocument = (id: string) => fetchJson<Document>(`/api/documents/${id}`);
export const getDocumentChunks = (id: string) => fetchJson<DocumentChunk[]>(`/api/documents/${id}/chunks`);

export const uploadDocument = async (file: File): Promise<Document> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/documents/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
};

export const deleteDocument = (id: string) =>
  fetch(`${API_BASE}/api/documents/${id}`, { method: 'DELETE' });

// Analytics
export const getAnalytics = () => fetchJson<AnalyticsData>('/api/analytics');
