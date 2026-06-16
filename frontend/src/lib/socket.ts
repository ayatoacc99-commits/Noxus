'use client';

import { io, Socket } from 'socket.io-client';
import type { User } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(user: User) {
  if (socket?.connected) return socket;

  const url = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || '';
  socket = io(url, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    auth: { userId: user.id },
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
