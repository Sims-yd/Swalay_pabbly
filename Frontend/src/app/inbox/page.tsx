"use client";

import { PageWrapper } from "@/components/ui/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Search, Send, Check, CheckCheck, User, MessageSquarePlus, MessageCircle, Lock, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { getMessages, Message, sendMessage, sendTemplate } from "@/api/messages";
import { getContacts, Contact } from "@/api/contacts";
import TemplateSelectorModal from "@/components/broadcast/TemplateSelectorModal";
import { Template } from "@/api/templates";

interface Conversation {
    contactId: string;
    contactName: string;
    lastMessage: string;
    timestamp: number;
    unreadCount: number;
    messages: Message[];
    hasUserResponded: boolean;
}

export default function InboxPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
    const [messageText, setMessageText] = useState("");
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    // New conversation flow
    const [showNewConversationModal, setShowNewConversationModal] = useState(false);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [contactSearchQuery, setContactSearchQuery] = useState("");
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);
    const [pendingContactForTemplate, setPendingContactForTemplate] = useState<Contact | null>(null);
    const [sendingTemplate, setSendingTemplate] = useState(false);
    const [sendingMessage, setSendingMessage] = useState(false);
    
    // Template parameters
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [showTemplateParamsModal, setShowTemplateParamsModal] = useState(false);
    const [bodyParams, setBodyParams] = useState<string[]>([]);
    const [headerParams, setHeaderParams] = useState<string[]>([]);
    const [headerType, setHeaderType] = useState<string | undefined>(undefined);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    useEffect(() => {
        loadMessages();
        loadContacts();
        const interval = setInterval(loadMessages, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [conversations, selectedContactId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const loadContacts = async () => {
        try {
            const contactList = await getContacts();
            setContacts(contactList);
        } catch (error) {
            console.error("Failed to load contacts", error);
        }
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
                // Find contact name from contacts list
                const contact = contacts.find(c => c.phone === contactId);
                convMap.set(contactId, {
                    contactId,
                    contactName: contact?.name || contactId,
                    lastMessage: "",
                    timestamp: 0,
                    unreadCount: 0,
                    messages: [],
                    hasUserResponded: false
                });
            }

            const conv = convMap.get(contactId)!;

            // Deduplicate based on ID
            if (!conv.messages.find(m => m.id === msg.id)) {
                conv.messages.push(msg);
            }

            // Check if user (incoming) has responded
            if (msg.direction === 'incoming') {
                conv.hasUserResponded = true;
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
            setSendingMessage(true);
            await sendMessage({
                phone: selectedContactId,
                message: messageText
            });
            setMessageText("");
            loadMessages(); // Refresh immediately
        } catch (error) {
            console.error("Failed to send message", error);
            alert("Failed to send message");
        } finally {
            setSendingMessage(false);
        }
    };

    const handleStartConversationWithTemplate = (contact: Contact) => {
        setPendingContactForTemplate(contact);
        setShowTemplateSelector(true);
        setShowNewConversationModal(false);
    };

    const handleTemplateSelected = async (template: Template) => {
        setSelectedTemplate(template);
        
        // Parse Body Params
        const bodyComponent = template.components.find((c: any) => c.type === 'BODY');
        const bodyCount = bodyComponent?.parameter_count || 0;
        setBodyParams(new Array(bodyCount).fill(''));

        // Parse Header Params
        const headerComponent = template.components.find((c: any) => c.type === 'HEADER');
        const format = headerComponent?.format?.toUpperCase();

        if (headerComponent && format === 'TEXT') {
            const headerCount = headerComponent.parameter_count || 0;
            setHeaderParams(new Array(headerCount).fill(''));
            setHeaderType('TEXT');
        } else if (format === 'IMAGE') {
            setHeaderParams(['']);
            setHeaderType('IMAGE');
        } else if (headerComponent && format) {
            setHeaderParams(['']);
            setHeaderType(format);
        } else {
            setHeaderParams([]);
            setHeaderType(undefined);
        }
        setSelectedFile(null);
        
        setShowTemplateSelector(false);
        setShowTemplateParamsModal(true);
    };

    const handleBodyParamChange = (index: number, value: string) => {
        const updated = [...bodyParams];
        updated[index] = value;
        setBodyParams(updated);
    };

    const handleHeaderParamChange = (index: number, value: string) => {
        const updated = [...headerParams];
        updated[index] = value;
        setHeaderParams(updated);
    };

    const handleSendTemplateWithParams = async () => {
        if (!pendingContactForTemplate || !selectedTemplate) return;

        try {
            setSendingTemplate(true);
            await sendTemplate({
                phone: pendingContactForTemplate.phone,
                template_name: selectedTemplate.name,
                template_id: selectedTemplate.id,
                language_code: selectedTemplate.language,
                body_parameters: bodyParams.length > 0 ? bodyParams : undefined,
                header_parameters: headerParams.length > 0 ? headerParams : undefined,
                header_type: headerType as any
            });

            // Refresh messages to show the new conversation
            await loadMessages();
            setSelectedContactId(pendingContactForTemplate.phone);
            setShowTemplateParamsModal(false);
            setPendingContactForTemplate(null);
            setSelectedTemplate(null);
        } catch (error) {
            console.error("Failed to send template", error);
            alert("Failed to send template. Please try again.");
        } finally {
            setSendingTemplate(false);
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
                    <div className="p-4 border-b space-y-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input placeholder="Search chats..." className="pl-9" />
                        </div>
                        <Button 
                            onClick={() => setShowNewConversationModal(true)}
                            className="w-full"
                            size="sm"
                        >
                            <MessageSquarePlus className="h-4 w-4 mr-2" />
                            New Chat
                        </Button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {conversations.map(conv => (
                            <div
                                key={conv.contactId}
                                onClick={() => setSelectedContactId(conv.contactId)}
                                className={`p-4 border-b cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${selectedContactId === conv.contactId ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                            >
                                <div className="flex items-start justify-between mb-1">
                                    <span className="font-semibold text-sm">{conv.contactName}</span>
                                    <span className="text-xs text-gray-500">
                                        {new Date(conv.timestamp * 1000).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 truncate">{conv.lastMessage}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    {!conv.hasUserResponded && (
                                        <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-full">
                                            Awaiting response
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                        {conversations.length === 0 && !loading && (
                            <div className="p-4 text-center text-gray-500 text-sm">
                                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>No conversations yet</p>
                                <p className="text-xs mt-1">Start a new chat to begin messaging</p>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Chat Area */}
                <Card className="border-none shadow-sm flex flex-col flex-1 h-full min-w-0">
                    {selectedContactId ? (
                        <>
                            <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                                        <User className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-semibold truncate">{selectedConversation?.contactName}</h3>
                                        <p className="text-xs text-gray-500 truncate">{selectedContactId}</p>
                                    </div>
                                </div>
                                {!selectedConversation?.hasUserResponded && (
                                    <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
                                        <Lock className="h-3 w-3" />
                                        Awaiting response
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/50 min-h-0">
                                {selectedConversation?.messages && selectedConversation.messages.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                                        <div className="text-center">
                                            <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-30" />
                                            <p>Conversation started with a template</p>
                                            <p className="text-xs mt-1">Waiting for a response...</p>
                                        </div>
                                    </div>
                                ) : (
                                    selectedConversation?.messages.map((msg, idx) => (
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
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="p-4 border-t bg-white dark:bg-gray-950 flex-shrink-0">
                                {!selectedConversation?.hasUserResponded ? (
                                    <div className="text-center text-sm text-gray-500 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                        <Lock className="h-4 w-4 inline mr-2" />
                                        Typing is disabled until the contact responds
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <Input
                                            value={messageText}
                                            onChange={(e) => setMessageText(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && !sendingMessage && handleSendMessage()}
                                            placeholder="Type a message..."
                                            className="flex-1"
                                            disabled={sendingMessage}
                                        />
                                        <Button 
                                            onClick={handleSendMessage}
                                            disabled={sendingMessage}
                                        >
                                            {sendingMessage ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Send className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <MessageCircle className="h-16 w-16 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                                <p className="text-gray-500 text-lg">Select a conversation to start chatting</p>
                                <p className="text-gray-400 text-sm mt-2">or create a new chat with a contact</p>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* New Conversation Modal */}
            <Dialog open={showNewConversationModal} onOpenChange={setShowNewConversationModal}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Start New Conversation</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search contacts..."
                                className="pl-9"
                                value={contactSearchQuery}
                                onChange={(e) => setContactSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                            {contacts
                                .filter(c =>
                                    c.name.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
                                    c.phone.includes(contactSearchQuery)
                                )
                                .map(contact => (
                                    <button
                                        key={contact.id}
                                        onClick={() => handleStartConversationWithTemplate(contact)}
                                        className="w-full p-3 border-b hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left flex items-center justify-between"
                                        disabled={sendingTemplate}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                                                <User className="h-5 w-5 text-white" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{contact.name}</p>
                                                <p className="text-xs text-gray-500">{contact.phone}</p>
                                            </div>
                                        </div>
                                        <MessageSquarePlus className="h-4 w-4 text-gray-400" />
                                    </button>
                                ))}

                            {contacts.length === 0 && (
                                <div className="p-6 text-center text-gray-500 text-sm">
                                    <p>No contacts available</p>
                                    <p className="text-xs mt-1">Add contacts to start conversations</p>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Template Selector Modal */}
            <TemplateSelectorModal
                open={showTemplateSelector}
                onOpenChange={setShowTemplateSelector}
                onSelect={handleTemplateSelected}
            />

            {/* Template Parameters Modal */}
            <Dialog open={showTemplateParamsModal} onOpenChange={setShowTemplateParamsModal}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Template Parameters - {selectedTemplate?.name}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Header Parameters */}
                        {headerParams.length > 0 && (
                            <div className="space-y-3 border-b pb-4">
                                <h3 className="text-sm font-medium text-gray-900">Header Parameters ({headerType})</h3>

                                {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType || '') && (
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-500">Upload {headerType}</label>
                                        <input
                                            type="file"
                                            accept={
                                                headerType === 'IMAGE' ? "image/*" :
                                                    headerType === 'VIDEO' ? "video/*" :
                                                        headerType === 'DOCUMENT' ? ".pdf,.doc,.docx,.ppt,.pptx,.txt,.xls,.xlsx" :
                                                            undefined
                                            }
                                            onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                                            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        />
                                        <p className="text-xs text-gray-400">Or enter a URL/ID below</p>
                                    </div>
                                )}

                                {headerParams.map((param, index) => (
                                    <div key={`header-${index}`}>
                                        <Input
                                            placeholder={headerType === 'TEXT' ? `Header Variable {{${index + 1}}}` : `Media URL/ID`}
                                            value={param}
                                            onChange={(e) => handleHeaderParamChange(index, e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Body Parameters */}
                        {bodyParams.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-gray-900">Body Parameters</h3>
                                {bodyParams.map((param, index) => (
                                    <div key={`body-${index}`}>
                                        <Input
                                            placeholder={`Body Variable {{${index + 1}}}`}
                                            value={param}
                                            onChange={(e) => handleBodyParamChange(index, e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {bodyParams.length === 0 && headerParams.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                <p className="text-sm">This template has no parameters</p>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 pt-4 border-t">
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                setShowTemplateParamsModal(false);
                                setSelectedTemplate(null);
                            }}
                            disabled={sendingTemplate}
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleSendTemplateWithParams}
                            disabled={sendingTemplate}
                            className="flex-1"
                        >
                            {sendingTemplate ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                "Send Template"
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </PageWrapper>
    );
}