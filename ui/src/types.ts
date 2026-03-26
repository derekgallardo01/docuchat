export interface Source {
  fileName: string;
  snippet: string;
  relevanceScore: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: Source[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationDetail {
  id: string;
  title: string;
  messages: ChatMessage[];
}

export interface Document {
  id: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  chunkCount: number;
  status: string;
  createdAt: string;
}

export interface ChatStreamToken {
  token: string;
}

export interface ChatStreamComplete {
  conversationId: string;
  messageId: string;
  sources: Source[];
}
