"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { sendChatMessage, ChatMessage } from "@/api/chatbot";
import { MessageCircle, X, Send, Bot, User, Loader2, Minimize2 } from "lucide-react";

interface Message extends ChatMessage {
    id: string;
    timestamp: Date;
}

const WELCOME_MESSAGE: Omit<Message, 'timestamp'> = {
    id: "welcome",
    role: "assistant",
    content: "👋 Hi! I'm your WhatsApp Business API assistant. I can help you with:\n\n• Setting up WhatsApp Business API\n• Managing message templates\n• Configuring webhooks\n• Troubleshooting API issues\n\nHow can I help you today?",
};

export function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Initialize welcome message on client side only to avoid hydration mismatch
    useEffect(() => {
        if (!isInitialized) {
            setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date() }]);
            setIsInitialized(true);
        }
    }, [isInitialized]);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const generateMessageId = () => {
        return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };

    const handleSendMessage = async () => {
        const trimmedMessage = inputValue.trim();
        if (!trimmedMessage || isLoading) return;

        const userMessage: Message = {
            id: generateMessageId(),
            role: "user",
            content: trimmedMessage,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputValue("");
        setIsLoading(true);
        setError(null);

        try {
            // Prepare conversation history (exclude welcome message and current message)
            const conversationHistory: ChatMessage[] = messages
                .filter((msg) => msg.id !== "welcome")
                .map((msg) => ({
                    role: msg.role,
                    content: msg.content,
                }));

            const response = await sendChatMessage(trimmedMessage, conversationHistory);

            const assistantMessage: Message = {
                id: generateMessageId(),
                role: "assistant",
                content: response.response,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);

            if (!response.success && response.error) {
                setError(response.error);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An error occurred";
            setError(errorMessage);
            
            const errorAssistantMessage: Message = {
                id: generateMessageId(),
                role: "assistant",
                content: "I'm sorry, I encountered an error. Please try again in a moment.",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorAssistantMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const formatMessage = (content: string) => {
        // Convert markdown-style formatting to HTML
        return content
            .split("\n")
            .map((line, index) => {
                // Handle bullet points
                if (line.startsWith("• ") || line.startsWith("- ")) {
                    return (
                        <div key={index} className="flex items-start gap-2 ml-2">
                            <span className="text-green-500 mt-1">•</span>
                            <span>{line.substring(2)}</span>
                        </div>
                    );
                }
                // Handle numbered lists
                if (/^\d+\.\s/.test(line)) {
                    return (
                        <div key={index} className="ml-2">
                            {line}
                        </div>
                    );
                }
                // Handle code blocks (simple)
                if (line.startsWith("```") || line.endsWith("```")) {
                    return null;
                }
                // Regular text or empty line
                return (
                    <div key={index} className={line === "" ? "h-2" : ""}>
                        {line}
                    </div>
                );
            })
            .filter(Boolean);
    };

    // Don't render until client-side initialization is complete
    if (!isInitialized) {
        return null;
    }

    return (
        <>
            {/* Floating Chat Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 transition-all duration-300 hover:scale-105 ${
                    isOpen ? "scale-0 opacity-0" : "scale-100 opacity-100"
                }`}
                aria-label="Open chatbot"
            >
                <MessageCircle className="w-6 h-6" />
            </button>

            {/* Chat Window */}
            <div
                className={`fixed bottom-6 right-6 z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transition-all duration-300 ease-out ${
                    isOpen
                        ? "w-[380px] h-[560px] opacity-100 scale-100"
                        : "w-0 h-0 opacity-0 scale-95 pointer-events-none"
                }`}
                style={{
                    maxHeight: "calc(100vh - 100px)",
                    maxWidth: "calc(100vw - 48px)",
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                            <Bot className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm">WhatsApp API Assistant</h3>
                            <p className="text-xs text-green-100">Online • Powered by AI</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            aria-label="Minimize chat"
                        >
                            <Minimize2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            aria-label="Close chat"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex items-end gap-2 ${
                                message.role === "user" ? "justify-end" : "justify-start"
                            }`}
                        >
                            {message.role === "assistant" && (
                                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-5 h-5 text-green-600" />
                                </div>
                            )}
                            <div
                                className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm ${
                                    message.role === "user"
                                        ? "bg-green-600 text-white rounded-br-md"
                                        : "bg-white text-gray-800 rounded-bl-md shadow-sm border border-gray-100"
                                }`}
                            >
                                <div className="leading-relaxed">
                                    {formatMessage(message.content)}
                                </div>
                                <div
                                    className={`text-[10px] mt-1 ${
                                        message.role === "user" ? "text-green-100" : "text-gray-400"
                                    }`}
                                >
                                    {message.timestamp.toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </div>
                            </div>
                            {message.role === "user" && (
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                    <User className="w-5 h-5 text-gray-600" />
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Typing Indicator */}
                    {isLoading && (
                        <div className="flex items-end gap-2 justify-start">
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                <Bot className="w-5 h-5 text-green-600" />
                            </div>
                            <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-sm border border-gray-100">
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div className="text-center">
                            <span className="text-xs text-red-500 bg-red-50 px-3 py-1 rounded-full">
                                {error}
                            </span>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-gray-100">
                    <div className="flex items-center gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about WhatsApp Business API..."
                            className="flex-1 px-4 py-3 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!inputValue.trim() || isLoading}
                            className="w-11 h-11 flex items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 disabled:hover:scale-100"
                            aria-label="Send message"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-400 text-center mt-2">
                        AI-powered assistant for WhatsApp Business API
                    </p>
                </div>
            </div>

            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-40 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
}
