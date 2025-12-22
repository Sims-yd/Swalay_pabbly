import { useEffect, useState, useCallback } from 'react';
import socketService from '@/lib/socketService';
import { Message } from '@/api/messages';

interface UseWebSocketMessagesOptions {
    userId: string | null;
    chatId?: string;
    onNewMessage?: (message: Message) => void;
    onStatusUpdate?: (data: { messageId: string; status: string }) => void;
}

export const useWebSocketMessages = ({
    userId,
    chatId,
    onNewMessage,
    onStatusUpdate,
}: UseWebSocketMessagesOptions) => {
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!userId) return;

        // Connect to socket
        socketService.connect(userId);
        setIsConnected(socketService.isConnected());

        // Set up event listeners
        const handleNewMessage = (message: Message) => {
            console.log('📨 Received new message:', message);
            if (onNewMessage) {
                onNewMessage(message);
            }
        };

        const handleStatusUpdate = (data: { messageId: string; whatsappMessageId?: string; status: string; timestamp?: string }) => {
            console.log('✅ Received status update:', data);
            if (onStatusUpdate) {
                onStatusUpdate(data);
            }
        };

        socketService.onNewMessage(handleNewMessage);
        socketService.onMessageStatusUpdate(handleStatusUpdate);

        // Cleanup on unmount
        return () => {
            socketService.off('new_message', handleNewMessage);
            socketService.off('message_status_update', handleStatusUpdate);
        };
    }, [userId, onNewMessage, onStatusUpdate]);

    return {
        isConnected,
        socketService,
    };
};
