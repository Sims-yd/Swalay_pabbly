const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export interface SendMessageRequest {
    phone: string;
    message: string;
}

export interface SendTemplateRequest {
    phone: string;
    template_name: string;
    language_code?: string;
    body_parameters?: string[];
    header_parameters?: string[];
    header_type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
}

export interface ReceivedMessage {
    type: 'message' | 'status';
    id: string;
    timestamp: string;
    raw: any;

    // Message specific
    direction?: 'incoming' | 'outgoing';
    from?: string;
    text?: string;
    msg_type?: string;
    contact?: any;

    // Status specific
    status?: 'sent' | 'delivered' | 'read' | 'failed';
    recipient_id?: string;
}

export const sendMessage = async (data: SendMessageRequest) => {
    const response = await fetch(`${BACKEND_URL}/send-message`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to send message');
    }
    return response.json();
};

export const sendTemplate = async (data: SendTemplateRequest) => {
    const response = await fetch(`${BACKEND_URL}/send-template`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to send template');
    }
    return response.json();
};

export interface BroadcastTemplateRequest {
    phone_numbers: string[];
    template_name: string;
    language_code?: string;
    body_parameters?: string[];
    header_parameters?: string[];
    header_type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
}

export const broadcastTemplate = async (data: BroadcastTemplateRequest) => {
    const response = await fetch(`${BACKEND_URL}/broadcast-template`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to send broadcast');
    }
    return response.json();
};

export const getMessages = async (): Promise<ReceivedMessage[]> => {
    const response = await fetch(`${BACKEND_URL}/messages`, {
        credentials: 'include',
    });
    if (!response.ok) {
        throw new Error('Failed to fetch messages');
    }
    return response.json();
};

