import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { fetchTemplates, Template } from '@/api/templates';

interface TemplateSelectorModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (template: Template) => void;
}

export default function TemplateSelectorModal({ open, onOpenChange, onSelect }: TemplateSelectorModalProps) {
    const [search, setSearch] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            loadTemplates();
        }
    }, [open]);

    const loadTemplates = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchTemplates();
            // Filter only approved templates if needed, or show all
            setTemplates(data.filter(t => t.status === 'APPROVED'));
        } catch (err: any) {
            setError(err.message || "Failed to load templates");
        } finally {
            setLoading(false);
        }
    };

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleConfirm = () => {
        const template = templates.find(t => t.id === selectedId);
        if (template) {
            onSelect(template);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Select Template</DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search templates..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="border rounded-md max-h-[300px] overflow-y-auto min-h-[200px]">
                        {loading ? (
                            <div className="flex items-center justify-center h-[200px]">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center h-[200px] text-red-500 gap-2">
                                <p>{error}</p>
                                <Button variant="outline" size="sm" onClick={loadTemplates}>Retry</Button>
                            </div>
                        ) : filteredTemplates.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">No templates found</div>
                        ) : (
                            <div className="divide-y">
                                {filteredTemplates.map((template) => (
                                    <div
                                        key={template.id}
                                        className={`p-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${selectedId === template.id ? 'bg-blue-50 hover:bg-blue-50' : ''}`}
                                        onClick={() => setSelectedId(template.id)}
                                    >
                                        <div>
                                            <div className="font-medium text-sm">{template.name}</div>
                                            <div className="text-xs text-gray-500 flex gap-2">
                                                <span>{template.language}</span>
                                                <span>•</span>
                                                <span>{template.category}</span>
                                            </div>
                                        </div>
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedId === template.id ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
                                            {selectedId === template.id && <div className="w-2 h-2 bg-white rounded-full" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={!selectedId}>Select Template</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
