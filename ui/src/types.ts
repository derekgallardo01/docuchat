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
  tokensUsed?: number;
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

export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
}

export interface ChatStreamToken {
  token: string;
}

export interface ChatStreamStatus {
  status: string;
}

export interface ChatStreamComplete {
  conversationId: string;
  messageId: string;
  sources: Source[];
  tokensUsed: number;
}

export interface DocumentStatusUpdate {
  documentId: string;
  status: string;
  detail: string;
  progress?: number;
  total?: number;
}

export interface AnalyticsData {
  totalConversations: number;
  totalMessages: number;
  totalDocuments: number;
  totalTokensUsed: number;
  messagesPerDay: { date: string; count: number }[];
  tokensPerDay: { date: string; count: number }[];
  documentsByStatus: { status: string; count: number }[];
  topDocuments: { fileName: string; referenceCount: number; avgRelevanceScore: number }[];
}
