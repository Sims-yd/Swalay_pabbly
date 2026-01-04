"use client";

import { PageWrapper } from "@/components/ui/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Search, Send, Check, CheckCheck, User } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { getMessages, Message, sendMessage } from "@/api/messages";

interface Conversation {
    contactId: string;
    name: string;
    lastMessage: string;
    timestamp: number;
    unreadCount: number;
    messages: Message[];
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
            const msgs = await getMessages();
            processMessages(msgs);
            setLoading(false);
        } catch (error) {
            console.error("Failed to load messages", error);
        }
    };

    const processMessages = (msgs: Message[]) => {
        const convMap = new Map<string, Conversation>();

        // Sort messages by createdAt
        const sortedMsgs = [...msgs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        sortedMsgs.forEach(msg => {
            const contactId = msg.chatId;

            if (!contactId) return;

            if (!convMap.has(contactId)) {
                convMap.set(contactId, {
                    contactId,
                    name: contactId, // Default to phone number as we don't have contact name in Message yet
                    lastMessage: "",
                    timestamp: 0,
                    unreadCount: 0,
                    messages: []
                });
            }

            const conv = convMap.get(contactId)!;

            // Deduplicate based on ID
            if (!conv.messages.find(m => m.id === msg.id)) {
                conv.messages.push(msg);
            }

            // Update last message info
            conv.lastMessage = msg.text;
            conv.timestamp = Math.floor(new Date(msg.createdAt).getTime() / 1000);
        });

        // Convert map to array and sort by last message timestamp
        const convArray = Array.from(convMap.values()).sort((a, b) => b.timestamp - a.timestamp);
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

    const formatTime = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getStatusIcon = (status?: string) => {
        switch (status) {
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
        }
    };

    return (
        <PageWrapper title="Inbox">
            <div className="flex gap-6 h-screen max-h-[calc(100vh-120px)]">
                {/* Sidebar */}
                <Card className="border-none shadow-sm flex flex-col w-[300px] h-full flex-shrink-0">
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
                <Card className="border-none shadow-sm flex flex-col flex-1 h-full min-w-0">
                    {selectedContactId ? (
                        <>
                            <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                        <User className="h-6 w-6 text-gray-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-semibold truncate">{selectedConversation?.name}</h3>
                                        <p className="text-xs text-gray-500 truncate">{selectedContactId}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/50 min-h-0">
                                {selectedConversation?.messages
                                    .map((msg, idx) => (
                                        <div key={idx} className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] rounded-lg p-3 ${msg.direction === 'outgoing' ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-800 border'}`}>
                                                <p className="text-sm">{msg.text}</p>
                                                <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${msg.direction === 'outgoing' ? 'text-white/70' : 'text-gray-400'}`}>
                                                    <span>{formatTime(Math.floor(new Date(msg.createdAt).getTime() / 1000))}</span>
                                                    {msg.direction === 'outgoing' && msg.status && (
                                                        <span className="inline-flex items-center ml-1">
                                                            {getStatusIcon(msg.status)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="p-4 border-t bg-white dark:bg-gray-950 flex-shrink-0">
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