/**
 * Socket.IO Service - Real-time Communication
 */

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect(token: string) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Setup event listeners
    this.setupEventListeners();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // User count updates
    this.socket.on('user_count_updated', (data) => {
      this.emit('user_count_updated', data);
    });

    // Match notifications
    this.socket.on('new_match', (data) => {
      this.emit('new_match', data);
    });

    // Messages
    this.socket.on('new_message', (data) => {
      this.emit('new_message', data);
    });

    this.socket.on('message_sent', (data) => {
      this.emit('message_sent', data);
    });

    // Typing indicators
    this.socket.on('user_typing', (data) => {
      this.emit('user_typing', data);
    });

    this.socket.on('user_stopped_typing', (data) => {
      this.emit('user_stopped_typing', data);
    });

    // Contact sharing
    this.socket.on('contact_shared', (data) => {
      this.emit('contact_shared', data);
    });

    // Session events
    this.socket.on('session_ending_soon', (data) => {
      this.emit('session_ending_soon', data);
    });

    this.socket.on('session_ended', (data) => {
      this.emit('session_ended', data);
    });

    // Swipe confirmation
    this.socket.on('swipe_recorded', (data) => {
      this.emit('swipe_recorded', data);
    });
  }

  // Emit events to backend
  swipe(targetUserId: number, direction: 'like' | 'pass') {
    this.socket?.emit('swipe', { targetUserId, direction });
  }

  sendMessage(matchId: number, receiverId: number, content: string) {
    this.socket?.emit('send_message', { matchId, receiverId, content });
  }

  startTyping(receiverId: number) {
    this.socket?.emit('typing_start', { receiverId });
  }

  stopTyping(receiverId: number) {
    this.socket?.emit('typing_stop', { receiverId });
  }

  markMessageRead(messageId: number) {
    this.socket?.emit('mark_message_read', { messageId });
  }

  shareContact(matchId: number, receiverId: number, phone?: string, instagram?: string) {
    this.socket?.emit('share_contact', { matchId, receiverId, phone, instagram });
  }

  ping() {
    this.socket?.emit('ping');
  }

  // Event listener management
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => callback(data));
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
export default socketService;
