const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// Mock data generators
const mockTemplates = [
    { id: 1, name: "Welcome Message", status: "APPROVED", language: "en", category: "MARKETING" },
    { id: 2, name: "Order Confirmation", status: "APPROVED", language: "en", category: "UTILITY" },
    { id: 3, name: "Payment Reminder", status: "PENDING", language: "en", category: "UTILITY" },
];

const mockContacts = [
    { id: 1, name: "John Doe", phone: "+1234567890", status: "opted-in", created_at: "2023-01-01" },
    { id: 2, name: "Jane Smith", phone: "+0987654321", status: "opted-out", created_at: "2023-01-02" },
];

const mockBroadcasts = [
    { id: 1, name: "New Year Sale", status: "Sent", sent: 100, delivered: 98, read: 80 },
    { id: 2, name: "Weekly Update", status: "Scheduled", sent: 0, delivered: 0, read: 0 },
];

import { useEffect, useState } from "react";
import { fetchTemplates, getTemplate, Template } from "@/api/templates";
import { getBroadcasts, createBroadcast } from "@/api/broadcasts";

export const useGetTemplates = () => {
    const [data, setData] = useState<Template[] | null>(null);
    const [isLoading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        let mounted = true;
        fetchTemplates().then((t) => { if (mounted) setData(t); }).catch(e => { if (mounted) setError(e); }).finally(() => mounted && setLoading(false));
        return () => { mounted = false; };
    }, []);

    return { data, isLoading, error };
};

export const useGetTemplate = (id: string | null) => {
    const [data, setData] = useState<Template | null>(null);
    const [isLoading, setLoading] = useState(false);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        let mounted = true;
        if (!id) return;
        setLoading(true);
        getTemplate(id).then((t) => { if (mounted) setData(t); }).catch(e => { if (mounted) setError(e); }).finally(() => mounted && setLoading(false));
        return () => { mounted = false; };
    }, [id]);

    return { data, isLoading, error };
};

export const useGetMessages = () => {
    return { data: [], isLoading: false };
};

export const useSendTemplate = () => {
    return { mutate: (data: any) => console.log("Sending template", data) };
};

export const useSendMessage = () => {
    return { mutate: (data: any) => console.log("Sending message", data) };
};

export const useGetContacts = () => {
    return { data: mockContacts, isLoading: false };
};

export const useAddContact = () => {
    return { mutate: (data: any) => console.log("Adding contact", data) };
};

export const useGetBroadcasts = () => {
    const [data, setData] = useState<any[] | null>(null);
    const [isLoading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        let mounted = true;
        getBroadcasts().then((b) => { if (mounted) setData(b); }).catch(e => { if (mounted) setError(e); }).finally(() => mounted && setLoading(false));
        return () => { mounted = false; };
    }, []);

    return { data, isLoading, error };
};

export const useCreateBroadcast = () => {
    return { mutate: (data: any) => createBroadcast(data) };
};
