import { io, Socket } from 'socket.io-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

class SocketService {
    private socket: Socket | null = null;
    private userId: string | null = null;
    private listeners: Map<string, Set<Function>> = new Map();

    connect(userId: string) {
        if (this.socket?.connected) {
            console.log('Socket already connected');
            return;
        }

        this.userId = userId;
        
        // Initialize socket connection
        this.socket = io(BACKEND_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
        });

        // Handle connection
        this.socket.on('connect', () => {
            console.log('🔌 Socket connected:', this.socket?.id);
            // Register user with server
            if (this.userId) {
                this.socket?.emit('register', { userId: this.userId });
            }
        });

        // Handle registration confirmation
        this.socket.on('registered', (data) => {
            console.log('✅ Registered with server:', data);
        });

        // Handle disconnection
        this.socket.on('disconnect', (reason) => {
            console.log('🔌 Socket disconnected:', reason);
        });

        // Handle reconnection
        this.socket.on('reconnect', (attemptNumber) => {
            console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
            // Re-register user after reconnection
            if (this.userId) {
                this.socket?.emit('register', { userId: this.userId });
            }
        });

        // Handle connection errors
        this.socket.on('connect_error', (error) => {
            console.error('❌ Socket connection error:', error);
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.userId = null;
            this.listeners.clear();
        }
    }

    // Listen for new messages
    onNewMessage(callback: (message: any) => void) {
        if (!this.socket) {
            console.warn('Socket not connected');
            return;
        }

        const eventName = 'new_message';
        
        // Store listener for cleanup
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }
        this.listeners.get(eventName)?.add(callback);

        this.socket.on(eventName, callback);
    }

    // Listen for message status updates
    onMessageStatusUpdate(callback: (data: any) => void) {
        if (!this.socket) {
            console.warn('Socket not connected');
            return;
        }

        const eventName = 'message_status_update';
        
        // Store listener for cleanup
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }
        this.listeners.get(eventName)?.add(callback);

        this.socket.on(eventName, callback);
    }

    // Remove specific listener
    off(eventName: string, callback?: Function) {
        if (!this.socket) return;

        if (callback) {
            this.socket.off(eventName, callback as any);
            this.listeners.get(eventName)?.delete(callback);
        } else {
            this.socket.off(eventName);
            this.listeners.delete(eventName);
        }
    }

    // Remove all listeners
    removeAllListeners() {
        if (!this.socket) return;

        this.listeners.forEach((_, eventName) => {
            this.socket?.off(eventName);
        });
        this.listeners.clear();
    }

    isConnected(): boolean {
        return this.socket?.connected || false;
    }

    getSocketId(): string | undefined {
        return this.socket?.id;
    }
}

// Export singleton instance
const socketService = new SocketService();
export default socketService;
