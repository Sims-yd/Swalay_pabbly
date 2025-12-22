import React, { useState, useRef, useEffect } from 'react';
import {
    Phone,
    Video,
    MoreVertical,
    Paperclip,
    Smile,
    Mic,
    Send,
    Check,
    CheckCheck
} from 'lucide-react';
import { useWebSocketMessages } from '@/hooks/useWebSocketMessages';
import { Message, sendMessage as sendMessageAPI, getMessages } from '@/api/messages';

interface Contact {
    name: string;
    phone?: string;
}

interface ChatBoxProps {
    contact: Contact | null;
    userId: string | null;  // Current user's ID for WebSocket
}

const ChatBox: React.FC<ChatBoxProps> = ({ contact, userId }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load initial messages when contact changes
    useEffect(() => {
        if (!contact?.phone) {
            setMessages([]);
            return;
        }

        const loadMessages = async () => {
            try {
                const fetchedMessages = await getMessages(contact.phone);
                setMessages(fetchedMessages);
            } catch (error) {
                console.error('Failed to load messages:', error);
            }
        };

        loadMessages();
    }, [contact?.phone]);

    // WebSocket integration
    const { isConnected } = useWebSocketMessages({
        userId,
        chatId: contact?.phone,
        onNewMessage: (message) => {
            // Add new message to state if it belongs to current chat
            if (message.chatId === contact?.phone) {
                setMessages(prev => {
                    // Avoid duplicates
                    if (prev.some(m => m.id === message.id)) {
                        return prev;
                    }
                    return [...prev, message];
                });
            }
        },
        onStatusUpdate: (data) => {
            // Update message status in state
            setMessages(prev => prev.map(msg => 
                msg.id === data.messageId || msg.whatsappMessageId === data.messageId
                    ? { ...msg, status: data.status as Message['status'] }
                    : msg
            ));
        },
    });

    const handleSend = async () => {
        if (!inputText.trim() || !contact?.phone || isSending) return;

        const messageText = inputText.trim();
        setInputText('');
        setIsSending(true);

        try {
            // Send message via API
            const response = await sendMessageAPI({
                phone: contact.phone,
                message: messageText,
            });

            console.log('Send message response:', response);

            if (response.success && response.message) {
                // Add the message directly from the response
                const newMessage: Message = {
                    id: response.message.id,
                    chatId: response.message.chatId,
                    senderId: response.message.senderId,
                    receiverId: response.message.receiverId,
                    text: response.message.text,
                    status: response.message.status as Message['status'],
                    createdAt: response.message.createdAt,
                    updatedAt: response.message.updatedAt,
                    whatsappMessageId: response.message.whatsappMessageId,
                };

                setMessages(prev => {
                    // Check if message already exists
                    if (prev.some(m => m.id === newMessage.id)) {
                        return prev;
                    }
                    return [...prev, newMessage];
                });
            } else {
                // If sending failed, show error
                console.error('Message send failed:', response);
                alert('Failed to send message: ' + (response.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            alert('Failed to send message. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const getStatusIcon = (status: Message['status']) => {
        switch (status) {
            case 'sending':
                return (
                    <span className="flex items-center justify-center opacity-50" title="Sending...">
                        <Check size={16} strokeWidth={2.5} />
                    </span>
                );
            case 'sent':
                return (
                    <span className="flex items-center justify-center" title="Sent">
                        <Check size={16} strokeWidth={2.5} />
                    </span>
                );
            case 'delivered':
                return (
                    <span className="flex items-center justify-center" title="Delivered">
                        <CheckCheck size={16} strokeWidth={2.5} />
                    </span>
                );
            case 'read':
                return (
                    <span className="flex items-center justify-center text-blue-400" title="Read">
                        <CheckCheck size={16} strokeWidth={2.5} />
                    </span>
                );
            case 'failed':
                return (
                    <span className="flex items-center justify-center text-red-400" title="Failed">
                        <span className="text-xs font-bold">✕</span>
                    </span>
                );
            default:
                return null;
        }
    };

    if (!contact) {
        return (
            <div className="flex-1 bg-background flex items-center justify-center text-muted">
                Select a chat to start messaging
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-screen bg-background relative">
            {/* Header */}
            <div className="h-16 px-6 border-b border-gray-200 flex items-center justify-between bg-card flex-shrink-0 z-10">
                <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-[var(--primary-foreground)] font-medium">
                        {contact.name.charAt(0)}
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-card-foreground">{contact.name}</h2>
                        <p className="text-xs text-muted">
                            {isConnected ? '🟢 Connected' : '🔴 Connecting...'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-4 text-muted">
                    <button className="hover:text-primary transition-colors"><Phone size={20} /></button>
                    <button className="hover:text-primary transition-colors"><Video size={20} /></button>
                    <button className="hover:text-primary transition-colors"><MoreVertical size={20} /></button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted">
                {/* Date Divider */}
                <div className="flex justify-center my-4">
                    <span className="px-3 py-1 bg-card rounded-full text-xs text-muted">
                        Today
                    </span>
                </div>

                {messages.map((msg) => {
                    const isMe = msg.senderId === userId;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-[70%] md:max-w-[60%] rounded-lg px-3 py-2 relative shadow-sm ${isMe
                                    ? 'bg-green-600 text-white rounded-tr-none'
                                    : 'bg-card text-card-foreground border rounded-tl-none'
                                    }`}
                            >
                                <p className="text-sm leading-relaxed whitespace-pre-wrap pr-2">{msg.text}</p>
                                <div className={`flex items-center justify-end space-x-1 mt-1 ${isMe ? 'text-white/70' : 'text-muted'}`}>
                                    <span className="text-[10px]">
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {isMe && (
                                        <span className="inline-flex items-center ml-1">
                                            {getStatusIcon(msg.status)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-card border-t border-gray-200 flex-shrink-0">
                <div className="flex items-end space-x-2 max-w-4xl mx-auto">
                    <button className="p-3 text-muted hover:text-primary transition-colors rounded-full hover:bg-muted/80">
                        <Smile size={24} />
                    </button>
                    <button className="p-3 text-muted hover:text-primary transition-colors rounded-full hover:bg-muted/80">
                        <Paperclip size={24} />
                    </button>

                    <div className="flex-1 bg-card rounded-lg border border-gray-200 focus-within:border-primary/60 transition-colors flex items-center">
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder="Type a message..."
                            className="w-full bg-transparent text-card-foreground px-4 py-3 max-h-32 focus:outline-none resize-none scrollbar-hide text-sm"
                            rows={1}
                            style={{ minHeight: '46px' }}
                            disabled={isSending}
                        />
                    </div>

                    {inputText.trim() ? (
                        <button
                            onClick={handleSend}
                            disabled={isSending}
                            className="p-3 bg-green-600 hover:bg-green-700 text-white rounded-full transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={20} className="ml-0.5" />
                        </button>
                    ) : (
                        <button className="p-3 text-muted hover:text-primary transition-colors rounded-full hover:bg-muted/80">
                            <Mic size={24} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatBox;
