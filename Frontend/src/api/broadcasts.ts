const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export interface BroadcastCreateRequest {
    name: string;
    phones: string[];
    template_name: string;
    template_id?: string;
    language_code?: string;
    body_parameters?: string[];
    header_parameters?: string[];
    header_type?: string | null;
}

export const createBroadcast = async (data: BroadcastCreateRequest) => {
    const response = await fetch(`${BACKEND_URL}/broadcasts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to create broadcast');
    }
    return response.json();
};

export const getBroadcasts = async () => {
    const response = await fetch(`${BACKEND_URL}/broadcasts`);
    if (!response.ok) throw new Error('Failed to fetch broadcasts');
    return response.json();
};

export const getBroadcast = async (id: string) => {
    const response = await fetch(`${BACKEND_URL}/broadcasts/${id}`);
    if (!response.ok) throw new Error('Failed to fetch broadcast');
    return response.json();
};
