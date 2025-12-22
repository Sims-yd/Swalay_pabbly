"use client";

import { PageWrapper } from "@/components/ui/PageWrapper";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Search, Send, Check, CheckCheck, User } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { getLegacyMessages, ReceivedMessage, sendMessage } from "@/api/messages";

interface Conversation {
    contactId: string;
    name: string;
    lastMessage: string;
    timestamp: number;
    unreadCount: number;
    messages: ReceivedMessage[];
}

export default function InboxPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
    const [messageText, setMessageText] = useState("");
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadMessages();
        const interval = setInterval(loadMessages, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [conversations, selectedContactId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const loadMessages = async () => {
        try {
            const msgs = await getLegacyMessages();
            processMessages(msgs);
            setLoading(false);
        } catch (error) {
            console.error("Failed to load messages", error);
        }
    };

    const processMessages = (msgs: ReceivedMessage[]) => {
        const convMap = new Map<string, Conversation>();
        const messageMap = new Map<string, ReceivedMessage>();

        // 1. First pass: Collect all actual messages
        msgs.forEach(msg => {
            if (msg.type === 'message') {
                // Create a copy to avoid mutating the original if needed, 
                // though here we are building fresh state.
                messageMap.set(msg.id, { ...msg });
            }
        });

        // 2. Second pass: Apply statuses to messages
        msgs.forEach(msg => {
            if (msg.type === 'status') {
                const targetMsg = messageMap.get(msg.id);
                if (targetMsg) {
                    // Update status. 
                    // WhatsApp order: sent -> delivered -> read
                    // We assume the backend sends them in order or we just take the latest?
                    // Let's use a simple priority check to avoid overwriting 'read' with 'delivered' 
                    // if events arrive out of order.
                    const statusPriority: Record<string, number> = {
                        'sent': 1,
                        'delivered': 2,
                        'read': 3,
                        'failed': 4
                    };

                    const currentStatus = targetMsg.status;
                    const newStatus = msg.status;

                    const currentPriority = currentStatus ? (statusPriority[currentStatus] || 0) : 0;
                    const newPriority = newStatus ? (statusPriority[newStatus] || 0) : 0;

                    if (newPriority > currentPriority) {
                        targetMsg.status = newStatus;
                    }
                }
            }
        });

        // 3. Group into conversations
        messageMap.forEach(msg => {
            // Determine contact ID
            // If incoming, from is the contact.
            // If outgoing, recipient_id is the contact.
            const contactId = msg.direction === 'outgoing' ? msg.recipient_id : msg.from;

            if (!contactId) return;

            if (!convMap.has(contactId)) {
                convMap.set(contactId, {
                    contactId,
                    name: msg.contact?.profile?.name || contactId,
                    lastMessage: "",
                    timestamp: 0,
                    unreadCount: 0,
                    messages: []
                });
            }

            const conv = convMap.get(contactId)!;
            conv.messages.push(msg);

            // Update conversation metadata based on the latest message
            const msgTimestamp = parseInt(msg.timestamp);
            if (msgTimestamp > conv.timestamp) {
                conv.timestamp = msgTimestamp;
                conv.lastMessage = msg.text || `[${msg.msg_type}]`;
                if (msg.contact?.profile?.name) {
                    conv.name = msg.contact.profile.name;
                }
            }
        });

        // Convert map to array and sort conversations by timestamp
        const convArray = Array.from(convMap.values()).sort((a, b) => b.timestamp - a.timestamp);

        // Sort messages within each conversation
        convArray.forEach(conv => {
            conv.messages.sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp));
        });

        setConversations(convArray);
    };

    const handleSendMessage = async () => {
        if (!selectedContactId || !messageText.trim()) return;

        try {
            await sendMessage({
                phone: selectedContactId,
                message: messageText
            });
            setMessageText("");
            loadMessages(); // Refresh immediately
        } catch (error) {
            console.error("Failed to send message", error);
            alert("Failed to send message");
        }
    };

    const selectedConversation = conversations.find(c => c.contactId === selectedContactId);

    const formatTime = (timestamp: string) => {
        return new Date(parseInt(timestamp) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getStatusIcon = (status?: string) => {
        switch (status) {
<<<<<<< HEAD
            case 'sent': return <Check className="h-3 w-3 text-gray-400" />;
            case 'delivered': return <CheckCheck className="h-3 w-3 text-gray-400" />;
            case 'read': return <CheckCheck className="h-3 w-3 text-blue-500" />;
            default: return null; // No icon for unknown or pending
=======
            case 'sending':
                return <Check className="h-3.5 w-3.5 opacity-50" strokeWidth={2.5} />;
            case 'sent':
                return <Check className="h-3.5 w-3.5" strokeWidth={2.5} />;
            case 'delivered':
                return <CheckCheck className="h-3.5 w-3.5" strokeWidth={2.5} />;
            case 'read':
                return <CheckCheck className="h-3.5 w-3.5 text-blue-400" strokeWidth={2.5} />;
            case 'failed':
                return <span className="text-red-400 text-xs">✕</span>;
            default:
                return null;
>>>>>>> 7bceef50de0c9b815e8d0aa189caed5e9585b8eb
        }
    };

    return (
        <PageWrapper title="Inbox" className="h-[calc(100vh-100px)]">
            <div className="grid grid-cols-[300px_1fr] gap-6 h-full">
                {/* Sidebar */}
                <Card className="border-none shadow-sm flex flex-col h-full">
                    <div className="p-4 border-b">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input placeholder="Search chats..." className="pl-9" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {conversations.map(conv => (
                            <div
                                key={conv.contactId}
                                onClick={() => setSelectedContactId(conv.contactId)}
                                className={`p-4 border-b cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${selectedContactId === conv.contactId ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                            >
                                <div className="flex justify-between mb-1">
                                    <span className="font-semibold">{conv.name}</span>
                                    <span className="text-xs text-gray-500">
                                        {new Date(conv.timestamp * 1000).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 truncate">{conv.lastMessage}</p>
                            </div>
                        ))}
                        {conversations.length === 0 && !loading && (
                            <div className="p-4 text-center text-gray-500">No conversations yet</div>
                        )}
                    </div>
                </Card>

                {/* Chat Area */}
                <Card className="border-none shadow-sm flex flex-col h-full">
                    {selectedContactId ? (
                        <>
                            <div className="p-4 border-b flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                        <User className="h-6 w-6 text-gray-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">{selectedConversation?.name}</h3>
                                        <p className="text-xs text-gray-500">{selectedContactId}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/50">
<<<<<<< HEAD
                                {selectedConversation?.messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] rounded-lg p-3 ${msg.direction === 'outgoing' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 border'}`}>
                                            <p className="text-sm">{msg.text || `[${msg.msg_type}]`}</p>
                                            <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${msg.direction === 'outgoing' ? 'text-blue-100' : 'text-gray-400'}`}>
                                                {formatTime(msg.timestamp)}
                                                {msg.direction === 'outgoing' && getStatusIcon(msg.status)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
=======
                                {selectedConversation?.messages
                                    .filter(msg => msg.type === 'message') // Only show actual messages, not status updates
                                    .map((msg, idx) => (
                                        <div key={idx} className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] rounded-lg p-3 ${msg.direction === 'outgoing' ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-800 border'}`}>
                                                <p className="text-sm">{msg.text || `[${msg.msg_type}]`}</p>
                                                <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${msg.direction === 'outgoing' ? 'text-white/70' : 'text-gray-400'}`}>
                                                    <span>{formatTime(msg.timestamp)}</span>
                                                    {msg.direction === 'outgoing' && msg.status && (
                                                        <span className="inline-flex items-center ml-1">
                                                            {getStatusIcon(msg.status)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
>>>>>>> 7bceef50de0c9b815e8d0aa189caed5e9585b8eb
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="p-4 border-t bg-white dark:bg-gray-950">
                                <div className="flex gap-2">
                                    <Input
                                        value={messageText}
                                        onChange={(e) => setMessageText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="Type a message..."
                                        className="flex-1"
                                    />
                                    <Button onClick={handleSendMessage}>
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500">
                            Select a conversation to start chatting
                        </div>
                    )}
                </Card>
            </div>
        </PageWrapper>
    );
}
