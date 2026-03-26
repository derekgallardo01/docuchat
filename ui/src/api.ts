import { Conversation, ConversationDetail, Document } from './types';

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

// Documents
export const getDocuments = () => fetchJson<Document[]>('/api/documents');
export const getDocument = (id: string) => fetchJson<Document>(`/api/documents/${id}`);

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
