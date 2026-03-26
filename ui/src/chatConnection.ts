import * as signalR from '@microsoft/signalr';
import { ChatStreamComplete, ChatStreamStatus, ChatStreamToken, DocumentStatusUpdate } from './types';

const HUB_URL = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}/hubs/chat`
  : 'http://localhost:5210/hubs/chat';

let connection: signalR.HubConnection | null = null;

export function getConnection(): signalR.HubConnection {
  if (!connection) {
    connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .build();
  }
  return connection;
}

export async function ensureConnected(): Promise<signalR.HubConnection> {
  const conn = getConnection();
  if (conn.state === signalR.HubConnectionState.Disconnected) {
    await conn.start();
  }
  return conn;
}

export async function sendMessage(
  message: string,
  conversationId: string | null,
  onToken: (data: ChatStreamToken) => void,
  onComplete: (data: ChatStreamComplete) => void,
  onError: (error: string) => void,
  onStatus?: (data: ChatStreamStatus) => void
): Promise<void> {
  const conn = await ensureConnected();

  const tokenHandler = (data: ChatStreamToken) => onToken(data);
  const statusHandler = (data: ChatStreamStatus) => onStatus?.(data);
  const completeHandler = (data: ChatStreamComplete) => {
    cleanup();
    onComplete(data);
  };
  const errorHandler = (error: string) => {
    cleanup();
    onError(error);
  };

  const cleanup = () => {
    conn.off('ReceiveToken', tokenHandler);
    conn.off('ReceiveStatus', statusHandler);
    conn.off('ReceiveComplete', completeHandler);
    conn.off('ReceiveError', errorHandler);
  };

  conn.on('ReceiveToken', tokenHandler);
  conn.on('ReceiveStatus', statusHandler);
  conn.on('ReceiveComplete', completeHandler);
  conn.on('ReceiveError', errorHandler);

  await conn.invoke('SendMessage', { message, conversationId });
}

export function onDocumentStatus(handler: (data: DocumentStatusUpdate) => void): () => void {
  const conn = getConnection();
  conn.on('DocumentStatusChanged', handler);
  return () => conn.off('DocumentStatusChanged', handler);
}
