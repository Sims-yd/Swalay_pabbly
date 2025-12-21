const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export interface TemplateComponent {
    type: 'BODY' | 'HEADER' | 'BUTTONS' | 'FOOTER';
    format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    text?: string;
    parameter_count?: number;
    buttons?: any[];
}

export interface Template {
    name: string;
    language: string;
    category: string;
    id: string;
    components: TemplateComponent[];
}

export interface SendMessagePayload {
    phone: string;
    message: string;
}

export interface SendTemplatePayload {
    phone: string;
    template_name: string;
    language_code?: string;
    body_parameters?: string[];
    header_parameters?: string[];
    header_type?: string;
}

export const getTemplates = async (): Promise<Template[]> => {
    const response = await fetch(`${BACKEND_URL}/templates`, {
        credentials: 'include',
    });
    if (!response.ok) {
        throw new Error('Failed to fetch templates');
    }
    return response.json();
};

export const getHealth = async () => {
    const response = await fetch(`${BACKEND_URL}/health`, {
        credentials: 'include',
    });
    if (!response.ok) {
        throw new Error('Failed to check health');
    }
    return response.json();
};

export const sendMessage = async (payload: SendMessagePayload) => {
    const response = await fetch(`${BACKEND_URL}/send-message`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
    }
    return response.json();
};

export const sendTemplate = async (payload: SendTemplatePayload) => {
    const response = await fetch(`${BACKEND_URL}/send-template`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send template');
    }
    return response.json();
};
