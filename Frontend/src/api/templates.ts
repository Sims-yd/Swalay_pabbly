const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export interface TemplateComponent {
    type: 'BODY' | 'HEADER' | 'BUTTONS' | 'FOOTER';
    format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    text?: string;
    parameter_count?: number;
    buttons?: any[];
}

export interface Template {
    id: string;
    name: string;
    language: string;
    category: string;
    status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'DRAFT';
    components: TemplateComponent[];
}

export const fetchTemplates = async (): Promise<Template[]> => {
    const response = await fetch(`${BACKEND_URL}/templates`);
    if (!response.ok) {
        throw new Error('Failed to fetch templates');
    }
    return response.json();
};

export const syncTemplates = async (): Promise<{ status: string; message: string }> => {
    const response = await fetch(`${BACKEND_URL}/templates`, {
        method: 'POST',
    });
    if (!response.ok) {
        throw new Error('Failed to sync templates');
    }
    return response.json();
};

export const getTemplate = async (id: string): Promise<Template> => {
    const response = await fetch(`${BACKEND_URL}/templates/${id}`);
    if (!response.ok) {
        throw new Error('Failed to fetch template');
    }
    return response.json();
};

export const createTemplate = async (data: any): Promise<any> => {
    const response = await fetch(`${BACKEND_URL}/templates/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create template');
    }
    return response.json();
};

export const deleteTemplate = async (name: string): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${BACKEND_URL}/templates?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete template');
    }
    return response.json();
};