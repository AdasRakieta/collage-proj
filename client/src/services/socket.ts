// Socket.IO was removed from the backend for MVP.
// This file keeps a minimal no-op API so older UI code can compile safely.

type Handler = (...args: any[]) => void;

class NoopSocketService {
  connect(): void {
    // no-op
  }

  disconnect(): void {
    // no-op
  }

  on(_event: string, _handler: Handler): void {
    // no-op
  }

  off(_event: string, _handler?: Handler): void {
    // no-op
  }

  emit(_event: string, ..._args: any[]): void {
    // no-op
  }
}

export const socketService = new NoopSocketService();
