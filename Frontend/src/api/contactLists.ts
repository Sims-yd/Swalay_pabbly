const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export interface ContactList {
    id: string;
    name: string;
    created_at: string;
    contact_count?: number;
}

export const getContactLists = async (): Promise<{ lists: ContactList[] }> => {
    const response = await fetch(`${BACKEND_URL}/contacts/lists`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch lists');
    return response.json();
};

export const createContactList = async (name: string): Promise<ContactList> => {
    const response = await fetch(`${BACKEND_URL}/contacts/lists`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to create list');
    }
    return response.json();
};

export const updateContactList = async (id: string, name: string): Promise<ContactList> => {
    const response = await fetch(`${BACKEND_URL}/contacts/lists/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to update list');
    }
    return response.json();
};

export const deleteContactList = async (id: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${BACKEND_URL}/contacts/lists/${id}`, {
        method: 'DELETE',
        credentials: 'include',
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to delete list');
    }
    return response.json();
};

export const getContactsInList = async (id: string): Promise<Array<{ id: string; name: string; phone: string; created_at: string }>> => {
    const response = await fetch(`${BACKEND_URL}/contacts/lists/${id}/contacts`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch list contacts');
    return response.json();
};
