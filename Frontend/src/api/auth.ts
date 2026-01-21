const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export interface AuthPayload {
    email: string;
    password: string;
}

export interface AuthUser {
    id: string;
    email: string;
    created_at: string;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
    user: AuthUser;
}


export interface FacebookAuthPayload {
    access_token: string;
    facebook_id: string;
    email?: string;
    name?: string;
}

const handleAuthRequest = async (path: string, payload?: AuthPayload | FacebookAuthPayload) => {
    const url = `${BACKEND_URL}${path}`;
    console.debug(`[auth] POST`, path, `→`, url);
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: payload ? JSON.stringify(payload) : undefined,
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
        console.warn(`[auth] POST ${path} failed`, { status: response.status, data });
    } else {
        console.debug(`[auth] POST ${path} ok`, { status: response.status });
    }
    if (!response.ok) {
        const message = data?.detail || data?.error || 'Authentication failed';
        throw new Error(message);
    }
    return data as AuthResponse;
};

export const signup = async (payload: AuthPayload) => handleAuthRequest('/auth/signup', payload);
export const login = async (payload: AuthPayload) => handleAuthRequest('/auth/login', payload);
export const facebookLogin = async (payload: FacebookAuthPayload) => handleAuthRequest('/auth/facebook', payload);
export const logout = async () => {
    await fetch(`${BACKEND_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
    });
};

export const getCurrentUser = async (): Promise<AuthUser> => {
    const response = await fetch(`${BACKEND_URL}/auth/me`, {
        credentials: 'include',
    });

    if (response.status === 401) {
        throw new Error('Unauthorized');
    }

    if (!response.ok) {
        throw new Error('Failed to fetch user');
    }

    return response.json();
};
