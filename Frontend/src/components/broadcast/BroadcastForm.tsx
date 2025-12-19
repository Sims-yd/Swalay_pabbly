"use client";

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import TemplateSelectorModal from './TemplateSelectorModal';
import { ChevronDown, Info, CheckCircle, XCircle, Loader2, X, Plus } from 'lucide-react';
import { broadcastTemplate } from '@/api/messages';

// Simplified Schema Definition
const broadcastSchema = z.object({
    templateId: z.string().min(1, "Template is required"),
    templateName: z.string().min(1, "Template is required"),
    contactListId: z.string().optional(),
});

type BroadcastFormValues = z.infer<typeof broadcastSchema>;

const CONTACT_LISTS = [
    { id: '1', name: 'All Customers', count: 1250 },
    { id: '2', name: 'New Signups', count: 45 },
    { id: '3', name: 'VIP Clients', count: 120 },
];

export default function BroadcastForm() {
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [recipientType, setRecipientType] = useState<'list' | 'custom'>('custom');
    const [customNumbers, setCustomNumbers] = useState<string[]>([]);
    const [currentNumberInput, setCurrentNumberInput] = useState("");

    const form = useForm<BroadcastFormValues>({
        resolver: zodResolver(broadcastSchema),
        defaultValues: {
            templateName: '',
            contactListId: '',
        }
    });

    const { register, control, handleSubmit, setValue, watch, formState: { errors, isValid } } = form;
    const watchedTemplateName = watch("templateName");

    const [isSending, setIsSending] = useState(false);
    const [broadcastResults, setBroadcastResults] = useState<any>(null);

    const handleAddNumber = () => {
        if (!currentNumberInput.trim()) return;

        // Basic validation/cleanup
        const cleanNumber = currentNumberInput.trim().replace(/[^0-9]/g, '');

        if (cleanNumber.length < 10) {
            alert("Please enter a valid phone number");
            return;
        }

        if (!customNumbers.includes(cleanNumber)) {
            setCustomNumbers([...customNumbers, cleanNumber]);
        }
        setCurrentNumberInput("");
    };

    const handleRemoveNumber = (numberToRemove: string) => {
        setCustomNumbers(customNumbers.filter(n => n !== numberToRemove));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddNumber();
        }
    };

    const onSubmit = async (data: BroadcastFormValues) => {
        setIsSending(true);
        setBroadcastResults(null);
        try {
            let numbers: string[] = [];

            if (recipientType === 'custom') {
                numbers = customNumbers;
                if (numbers.length === 0) {
                    alert("Please add at least one phone number.");
                    setIsSending(false);
                    return;
                }
            } else {
                // Mock logic for contact list
                if (!data.contactListId) {
                    alert("Please select a contact list.");
                    setIsSending(false);
                    return;
                }
                // In a real app, we might fetch numbers for this list or send the list ID to backend
                alert(`Sending to list ${data.contactListId} is not yet implemented in this demo. Please use Custom Numbers.`);
                setIsSending(false);
                return;
            }

            const result = await broadcastTemplate({
                phone_numbers: numbers,
                template_name: data.templateName,
                language_code: "en_US" // Hardcoded for now, should be from template
            });

            setBroadcastResults(result);
            alert("Broadcast processed!");
        } catch (error: any) {
            console.error("Broadcast failed:", error);
            alert("Failed to send broadcast: " + error.message);
        } finally {
            setIsSending(false);
        }
    };

    const handleTemplateSelect = (template: any) => {
        setValue("templateId", template.id);
        setValue("templateName", template.name, { shouldValidate: true });
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-semibold mb-6 text-gray-800">WhatsApp Broadcast</h1>

            <Card className="border-none shadow-sm bg-white">
                <CardContent className="p-8 space-y-8">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

                        {/* 1. Recipient Selection */}
                        <div className="space-y-4">
                            <label className="text-sm font-medium text-gray-700">Recipients <span className="text-red-500">*</span></label>

                            <div className="flex gap-6">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={recipientType === 'custom'}
                                        onChange={() => setRecipientType('custom')}
                                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">Custom Numbers</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={recipientType === 'list'}
                                        onChange={() => setRecipientType('list')}
                                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">Contact List</span>
                                </label>
                            </div>

                            {recipientType === 'custom' ? (
                                <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="flex gap-2">
                                        <Input
                                            value={currentNumberInput}
                                            onChange={(e) => setCurrentNumberInput(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Enter phone number (e.g. 15550001)"
                                            className="bg-white"
                                        />
                                        <Button type="button" onClick={handleAddNumber} size="icon" className="shrink-0">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-gray-500">Press Enter to add. Enter numbers with country code (without +).</p>

                                    {customNumbers.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {customNumbers.map((num) => (
                                                <Badge key={num} variant="secondary" className="px-3 py-1 bg-white border border-gray-200 text-gray-700 flex items-center gap-2">
                                                    {num}
                                                    <X
                                                        className="h-3 w-3 cursor-pointer hover:text-red-500"
                                                        onClick={() => handleRemoveNumber(num)}
                                                    />
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="relative">
                                    <select
                                        {...register("contactListId")}
                                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                                    >
                                        <option value="">Select a list...</option>
                                        {CONTACT_LISTS.map(list => (
                                            <option key={list.id} value={list.id}>{list.name} ({list.count})</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
                                </div>
                            )}
                        </div>

                        {/* 2. Select WhatsApp Template */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Select WhatsApp Template <span className="text-red-500">*</span></label>
                            <div
                                onClick={() => setIsTemplateModalOpen(true)}
                                className={`flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${errors.templateName ? "border-red-500" : "border-input"}`}
                            >
                                <span className={watchedTemplateName ? "text-gray-900" : "text-muted-foreground"}>
                                    {watchedTemplateName || "Select a template..."}
                                </span>
                                <ChevronDown className="h-4 w-4 opacity-50" />
                            </div>
                            {errors.templateName && <p className="text-xs text-red-500">{errors.templateName.message}</p>}
                        </div>

                        {/* 3. Footer Buttons */}
                        <div className="flex items-center gap-4 pt-4 border-t">
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 px-8" disabled={isSending}>
                                {isSending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                                    </>
                                ) : (
                                    "Send Broadcast"
                                )}
                            </Button>
                        </div>

                        {/* 4. Results Display */}
                        {broadcastResults && (
                            <div className="mt-8 border rounded-lg overflow-hidden">
                                <div className="bg-gray-50 px-4 py-3 border-b">
                                    <h3 className="font-medium text-gray-900">Broadcast Results</h3>
                                    <p className="text-sm text-gray-500">Total: {broadcastResults.total}</p>
                                </div>
                                <div className="max-h-[300px] overflow-y-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2">Phone</th>
                                                <th className="px-4 py-2">Status</th>
                                                <th className="px-4 py-2">Details</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {broadcastResults.results.map((res: any, idx: number) => (
                                                <tr key={idx} className="bg-white border-b hover:bg-gray-50">
                                                    <td className="px-4 py-2 font-medium">{res.phone}</td>
                                                    <td className="px-4 py-2">
                                                        {res.status === 'sent' ? (
                                                            <span className="flex items-center text-green-600">
                                                                <CheckCircle className="w-4 h-4 mr-1" /> Sent
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center text-red-600">
                                                                <XCircle className="w-4 h-4 mr-1" /> Failed
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2 text-gray-500 truncate max-w-[200px]">
                                                        {JSON.stringify(res.details)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                    </form>
                </CardContent>
            </Card>

            <TemplateSelectorModal
                open={isTemplateModalOpen}
                onOpenChange={setIsTemplateModalOpen}
                onSelect={handleTemplateSelect}
            />
        </div>
    );
}
