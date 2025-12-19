import React, { useState, useRef, useEffect } from 'react';
import {
    Phone,
    Video,
    MoreVertical,
    Paperclip,
    Smile,
    Mic,
    Send,
    CheckCheck
} from 'lucide-react';

interface Message {
    sender: string;
    text: string;
    time?: string;
}

interface Contact {
    name: string;
    phone?: string;
}

interface ChatBoxProps {
    contact: Contact | null;
    initialMessages: Message[];
}

const ChatBox: React.FC<ChatBoxProps> = ({ contact, initialMessages }) => {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, contact]);

    // Reset messages when contact changes (for demo purposes, usually you'd fetch new messages)
    useEffect(() => {
        setMessages(initialMessages);
    }, [contact, initialMessages]);

    const handleSend = () => {
        if (!inputText.trim()) return;

        const newMessage: Message = {
            sender: "me",
            text: inputText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages([...messages, newMessage]);
        setInputText('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
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
                        <p className="text-xs text-muted">WhatsApp Number</p>
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

                {messages.map((msg, index) => {
                    const isMe = msg.sender === "me";
                    return (
                        <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-[70%] md:max-w-[60%] rounded-lg px-4 py-2 relative shadow-sm ${isMe
                                    ? 'bg-green-600 text-white rounded-tr-none'
                                    : 'bg-card text-card-foreground border rounded-tl-none'
                                    }`}
                            >
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                <div className={`flex items-center justify-end space-x-1 mt-1 ${isMe ? 'text-green-200' : 'text-muted'}`}>
                                    <span className="text-[10px]">
                                        {msg.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {isMe && <CheckCheck size={12} />}
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
                        />
                    </div>

                    {inputText.trim() ? (
                        <button
                            onClick={handleSend}
                            className="p-3 bg-green-600 hover:bg-green-700 text-white rounded-full transition-all transform hover:scale-105 shadow-lg"
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
