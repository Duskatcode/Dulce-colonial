import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const connectSocket = (): Socket => {
  if (!socket) {
    socket = io(`${import.meta.env.VITE_WS_URL}/alerts`, {
      auth: { token: localStorage.getItem('accessToken') },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('🔌 WebSocket conectado');
    });

    socket.on('disconnect', () => {
      console.log('🔌 WebSocket desconectado');
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = (): Socket | null => socket;