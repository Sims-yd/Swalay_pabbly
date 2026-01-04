const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export interface Contact {
    id: string;
    name: string;
    phone: string;
    list_ids: string[];
    created_at: string;
}

export interface ContactCreateRequest {
    name: string;
    phone: string;
    list_ids?: string[];
}

export interface ContactUpdateRequest {
    name?: string;
    phone?: string;
    list_ids?: string[];
}

export const getContacts = async (listId?: string): Promise<Contact[]> => {
    const url = new URL(`${BACKEND_URL}/contacts`);
    if (listId) url.searchParams.set('list_id', listId);
    const response = await fetch(url.toString(), { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch contacts');
    return response.json();
};

export const getContactStats = async (): Promise<{ total: number }> => {
    const response = await fetch(`${BACKEND_URL}/contacts/stats`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
};

export const addContact = async (data: ContactCreateRequest): Promise<Contact> => {
    const response = await fetch(`${BACKEND_URL}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to add contact');
    }
    return response.json();
};

export const updateContact = async (id: string, data: ContactUpdateRequest): Promise<Contact> => {
    const response = await fetch(`${BACKEND_URL}/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to update contact');
    }
    return response.json();
};

export const deleteContact = async (id: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${BACKEND_URL}/contacts/${id}`, {
        method: 'DELETE',
        credentials: 'include',
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to delete contact');
    }
    return response.json();
};

export const addContactToList = async (contactId: string, listId: string): Promise<Contact> => {
    const response = await fetch(`${BACKEND_URL}/contacts/${contactId}/lists/${listId}`, {
        method: 'POST',
        credentials: 'include',
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to add to list');
    }
    return response.json();
};

export const removeContactFromList = async (contactId: string, listId: string): Promise<Contact> => {
    const response = await fetch(`${BACKEND_URL}/contacts/${contactId}/lists/${listId}`, {
        method: 'DELETE',
        credentials: 'include',
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to remove from list');
    }
    return response.json();
};

export interface DashboardStats {
    contacts: number;
    contact_lists: number;
    templates: number;
    broadcasts: number;
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
    const response = await fetch(`${BACKEND_URL}/contacts/dashboard/stats`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch dashboard stats');
    return response.json();
};
