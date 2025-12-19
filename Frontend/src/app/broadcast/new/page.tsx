"use client";

import { PageWrapper } from "@/components/ui/PageWrapper";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { useGetTemplates, useCreateBroadcast } from "@/hooks/useApi";

export default function NewBroadcastPage() {
    const router = useRouter();
    const [name, setName] = useState("");

    // phones list inputs
    const [phoneInput, setPhoneInput] = useState("");
    const [phones, setPhones] = useState<string[]>([]);

    // templates
    const { data: templates } = useGetTemplates();
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const selectedTemplate = templates?.find((t: any) => t.id === selectedTemplateId) ?? null;

    // parameters derived from template
    const [bodyParams, setBodyParams] = useState<string[]>([]);

    const [submitting, setSubmitting] = useState(false);
    const { mutate: create } = useCreateBroadcast();

    const addPhone = () => {
        const p = phoneInput.trim();
        if (!p) return;
        setPhones((prev) => [...prev, p]);
        setPhoneInput("");
    };

    const removePhone = (idx: number) => {
        setPhones((prev) => prev.filter((_, i) => i !== idx));
    };

    // whenever selectedTemplate changes, reset bodyParams to required count
    useEffect(() => {
        if (!selectedTemplate) return;
        // Count parameters in components (BODY & TEXT HEADER)
        let paramCount = 0;
        for (const comp of selectedTemplate.components || []) {
            if (comp.parameter_count) paramCount += comp.parameter_count;
        }
        setBodyParams(Array(paramCount).fill(""));
    }, [selectedTemplate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || phones.length === 0 || !selectedTemplate) {
            alert('Please provide a name, at least one phone, and select a template');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                name,
                phones,
                template_name: selectedTemplate.name,
                template_id: selectedTemplate.id,
                language_code: selectedTemplate.language,
                body_parameters: bodyParams.filter(Boolean),
            };

            await create(payload);
            alert('Broadcast created');
            router.push('/broadcast');
        } catch (err) {
            console.error(err);
            alert('Failed to create broadcast');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <PageWrapper
            title="Create New Broadcast"
            actions={
                <Button variant="ghost" onClick={() => router.back()}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
            }
        >
            <form className="space-y-6 max-w-2xl" onSubmit={handleSubmit}>
                <div>
                    <label className="text-sm font-medium">Broadcast Name</label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My broadcast" />
                </div>

                <div>
                    <label className="text-sm font-medium">Recipients</label>
                    <div className="flex gap-2">
                        <Input placeholder="Enter phone number" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} />
                        <Button type="button" onClick={addPhone}>Add</Button>
                    </div>
                    <div className="mt-3 space-y-1">
                        {phones.map((p, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-2 border rounded-md px-3 py-2">
                                <div className="text-sm">{p}</div>
                                <Button variant="ghost" size="sm" onClick={() => removePhone(idx)}>Remove</Button>
                            </div>
                        ))}
                        <p className="text-xs text-gray-500">You can add multiple recipients. Use E.164 format where possible.</p>
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium">Template</label>
                    <select className="flex h-10 w-full rounded-md border border-input px-3" value={selectedTemplateId || ''} onChange={(e) => setSelectedTemplateId(e.target.value || null)}>
                        <option value="">Select a template...</option>
                        {templates?.map((t: any) => (
                            <option key={t.id} value={t.id}>{t.name} ({t.language})</option>
                        ))}
                    </select>
                </div>


                {selectedTemplate && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Template Parameters</label>
                        {bodyParams.length === 0 ? (
                            <div className="text-sm text-gray-500">No parameters required.</div>
                        ) : (
                            bodyParams.map((val, idx) => (
                                <Input key={idx} placeholder={`Param ${idx + 1}`} value={val} onChange={(e) => setBodyParams(prev => { const copy = [...prev]; copy[idx] = e.target.value; return copy; })} />
                            ))
                        )}
                    </div>
                )}

                <div className="flex gap-2">
                    <Button type="submit" disabled={submitting}>{submitting ? 'Sending...' : 'Create Broadcast'}</Button>
                    <Button variant="outline" onClick={() => router.push('/broadcast')}>Cancel</Button>
                </div>
            </form>
        </PageWrapper>
    );
}
