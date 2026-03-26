import * as signalR from '@microsoft/signalr';
import { ChatStreamComplete, ChatStreamToken } from './types';

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
  onError: (error: string) => void
): Promise<void> {
  const conn = await ensureConnected();

  // Set up one-time handlers
  const tokenHandler = (data: ChatStreamToken) => onToken(data);
  const completeHandler = (data: ChatStreamComplete) => {
    conn.off('ReceiveToken', tokenHandler);
    conn.off('ReceiveComplete', completeHandler);
    conn.off('ReceiveError', errorHandler);
    onComplete(data);
  };
  const errorHandler = (error: string) => {
    conn.off('ReceiveToken', tokenHandler);
    conn.off('ReceiveComplete', completeHandler);
    conn.off('ReceiveError', errorHandler);
    onError(error);
  };

  conn.on('ReceiveToken', tokenHandler);
  conn.on('ReceiveComplete', completeHandler);
  conn.on('ReceiveError', errorHandler);

  await conn.invoke('SendMessage', { message, conversationId });
}
