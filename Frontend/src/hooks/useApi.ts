import { useEffect, useState } from "react";
import { fetchTemplates, getTemplate, Template } from "@/api/templates";
import { getBroadcasts, createBroadcast } from "@/api/broadcasts";
import { type Contact, getContacts, addContact, getContactStats } from "@/api/contacts";
import { getContactLists, createContactList } from "@/api/contactLists";

export const useGetTemplates = () => {
    const [data, setData] = useState<Template[] | null>(null);
    const [isLoading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        let mounted = true;
        fetchTemplates().then((response) => { if (mounted) setData(response.templates); }).catch(e => { if (mounted) setError(e); }).finally(() => mounted && setLoading(false));
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

export const useGetContacts = (listId?: string) => {
    const [data, setData] = useState<Contact[] | null>(null);
    const [isLoading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    const load = async (targetListId?: string) => {
        setLoading(true);
        try {
            const c = await getContacts(targetListId ?? listId);
            setData(c);
        } catch (e) {
            setError(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let mounted = true;
        load(listId).finally(() => {
            if (!mounted) return;
        });
        return () => { mounted = false; };
    }, [listId]);

    return { data, isLoading, error, refetch: () => load(listId) };
};

export const useAddContact = () => {
    return { mutate: (data: { name: string; phone: string; list_ids?: string[] }) => addContact(data) };
};

export const useGetContactStats = () => {
    const [data, setData] = useState<{ total: number } | null>(null);
    const [isLoading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        let mounted = true;
        getContactStats().then((s) => { if (mounted) setData(s); }).catch(e => { if (mounted) setError(e); }).finally(() => mounted && setLoading(false));
        return () => { mounted = false; };
    }, []);

    return { data, isLoading, error };
};

export const useGetContactLists = () => {
    const [data, setData] = useState<Array<{ id: string; name: string; contact_count?: number }> | null>(null);
    const [isLoading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        let mounted = true;
        getContactLists().then((res) => { if (mounted) setData(res.lists); }).catch(e => { if (mounted) setError(e); }).finally(() => mounted && setLoading(false));
        return () => { mounted = false; };
    }, []);

    return { data, isLoading, error, refetch: async () => {
        setLoading(true);
        try { const res = await getContactLists(); setData(res.lists); } finally { setLoading(false); }
    } };
};

export const useCreateContactList = () => {
    return { mutate: (name: string) => createContactList(name) };
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
