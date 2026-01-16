import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const SOCKET_URL = API_URL.replace('/api', '');

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket?.connected) return;
    
    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnection: true,
      reconnectionAttempts: 10,
      autoConnect: true,
      timeout: 5000, // 5 second timeout
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket.IO connected');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket.IO disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.warn('⚠️ Socket.IO connection error (this is normal if server is restarting):', error.message);
    });

    this.socket.on('error', (error) => {
      console.error('Socket.IO error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (!this.socket) {
      console.warn('Socket not connected. Call connect() first.');
      return;
    }
    this.socket.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (!this.socket) return;
    if (callback) {
      this.socket.off(event, callback);
    } else {
      this.socket.off(event);
    }
  }

  emit(event: string, data: any) {
    if (!this.socket) {
      console.warn('Socket not connected. Call connect() first.');
      return;
    }
    this.socket.emit(event, data);
  }
}

export const socketService = new SocketService();
