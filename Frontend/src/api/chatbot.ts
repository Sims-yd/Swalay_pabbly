const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface ChatbotRequest {
    message: string;
    conversation_history: ChatMessage[];
}

export interface ChatbotResponse {
    response: string;
    success: boolean;
    error?: string;
}

/**
 * Send a message to the chatbot and receive an AI response
 */
export const sendChatMessage = async (
    message: string,
    conversationHistory: ChatMessage[] = []
): Promise<ChatbotResponse> => {
    const response = await fetch(`${BACKEND_URL}/chatbot/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message,
            conversation_history: conversationHistory,
        } as ChatbotRequest),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || 'Failed to get chatbot response');
    }

    return response.json();
};

/**
 * Check chatbot service health
 */
export const checkChatbotHealth = async (): Promise<{ status: string; gemini_configured: boolean }> => {
    const response = await fetch(`${BACKEND_URL}/chatbot/health`);
    
    if (!response.ok) {
        throw new Error('Chatbot service unavailable');
    }
    
    return response.json();
};
