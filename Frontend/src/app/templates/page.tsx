"use client";

import { PageWrapper } from "@/components/ui/PageWrapper";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/DataTable";
import { Plus, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { fetchTemplates, syncTemplates, Template, deleteTemplate } from "@/api/templates";
import { sendTemplate } from "@/api/messages";
import TemplateRow from "@/components/templates/TemplateRow";
import TemplateFilters from "@/components/templates/TemplateFilters";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";

const tabs = ["All", "Approved", "Pending", "Draft", "Rejected"];

export default function TemplatesPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [activeTab, setActiveTab] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");

    const [deleteLoading, setDeleteLoading] = useState(false);

    // Send Dialog State
    const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [selectedContactPhone, setSelectedContactPhone] = useState("");

    // New State for detailed params
    const [headerParams, setHeaderParams] = useState<string[]>([]);
    const [bodyParams, setBodyParams] = useState<string[]>([]);
    const [sending, setSending] = useState(false);

    // Ideally fetch contacts from API
    const [contacts] = useState([
        { id: "1", name: "Simran", phone: "917007654569" },
        { id: "2", name: "Ammar", phone: "917365993869" },
    ]);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const data = await fetchTemplates();
            setTemplates(data);
        } catch (error) {
            console.error("Failed to load templates", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            await syncTemplates();
            await loadTemplates();
        } catch (error) {
            console.error("Failed to sync templates", error);
        } finally {
            setSyncing(false);
        }
    };

    const handleAddTemplate = () => {
        router.push("/templates/new");
    };

    const handleDeleteTemplate = async (template: Template) => {
        if (!confirm(`Are you sure you want to delete template "${template.name}"?`)) return;

        setDeleteLoading(true);
        try {
            await deleteTemplate(template.name);
            // Remove from local state
            setTemplates(prev => prev.filter(t => t.name !== template.name));
        } catch (error) {
            console.error("Failed to delete template", error);
            alert("Failed to delete template");
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleSendClick = (template: Template) => {
        setSelectedTemplate(template);
        setSelectedContactPhone("");

        // Initialize params based on template components
        const headerComp = template.components.find(c => c.type === 'HEADER');
        const bodyComp = template.components.find(c => c.type === 'BODY');

        const hParams: string[] = [];
        if (headerComp) {
            if (headerComp.format === 'TEXT' && headerComp.parameter_count) {
                for (let i = 0; i < headerComp.parameter_count; i++) hParams.push('');
            } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComp.format || '')) {
                hParams.push(''); // One slot for media URL
            }
        }
        setHeaderParams(hParams);

        const bParams: string[] = [];
        if (bodyComp?.parameter_count) {
            for (let i = 0; i < bodyComp.parameter_count; i++) bParams.push('');
        }
        setBodyParams(bParams);

        setIsSendDialogOpen(true);
    };

    const handleSendSubmit = async () => {
        if (!selectedTemplate || !selectedContactPhone) return;

        setSending(true);
        try {
            // Determine header type
            const headerComp = selectedTemplate.components.find(c => c.type === 'HEADER');
            let headerType = undefined;
            if (headerComp && headerComp.format) {
                headerType = headerComp.format;
            }

            await sendTemplate({
                phone: selectedContactPhone,
                template_name: selectedTemplate.name,
                language_code: selectedTemplate.language,
                body_parameters: bodyParams,
                header_parameters: headerParams,
                header_type: headerType
            });
            alert("Template sent successfully!");
            setIsSendDialogOpen(false);
        } catch (error) {
            console.error("Failed to send template", error);
            alert("Failed to send template");
        } finally {
            setSending(false);
        }
    };

    const filteredTemplates = templates.filter((template) => {
        const matchesTab = activeTab === "All" || template.status.toUpperCase() === activeTab.toUpperCase();
        const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            template.category.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });

    // Helper to render preview text with replaced params
    const renderPreviewText = (text: string, params: string[]) => {
        let preview = text;
        params.forEach((param, index) => {
            const placeholder = param || `{{${index + 1}}}`;
            // Replace {{1}}, {{2}} etc. Note: This is a simple replacement, might need regex for robustness
            // Using regex to replace {{1}} specifically
            const regex = new RegExp(`\\{\\{${index + 1}\\}\\}`, 'g');
            preview = preview.replace(regex, placeholder);
        });
        return preview;
    };

    return (
        <PageWrapper
            title="Templates"
            actions={
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleSync} disabled={syncing}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                        {syncing ? "Syncing..." : "Sync Templates"}
                    </Button>
                    <Button onClick={handleAddTemplate}>
                        <Plus className="mr-2 h-4 w-4" /> Add Template
                    </Button>
                </div>
            }
        >
            <Card className="border-none shadow-sm">
                <CardHeader className="pb-4">
                    <TemplateFilters
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        tabs={tabs}
                    />
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Template Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Language</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                        Loading templates...
                                    </TableCell>
                                </TableRow>
                            ) : filteredTemplates.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                        No templates found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTemplates.map((template) => (
                                    <TemplateRow
                                        key={template.id}
                                        template={template}
                                        onDelete={handleDeleteTemplate}
                                        onSend={handleSendClick}
                                    />
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Send Template Dialog */}
            <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
                <DialogContent className="sm:max-w-[800px]">
                    <DialogHeader>
                        <DialogTitle>Send Template: {selectedTemplate?.name}</DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                        {/* Left Column: Preview */}
                        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                            <h3 className="text-sm font-semibold mb-3 text-gray-500 uppercase tracking-wider">Preview</h3>
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border max-w-[300px] mx-auto">
                                {selectedTemplate?.components.map((comp, idx) => {
                                    if (comp.type === 'HEADER') {
                                        if (comp.format === 'TEXT') {
                                            return <div key={idx} className="font-bold mb-2 text-lg">{renderPreviewText(comp.text || '', headerParams)}</div>;
                                        } else {
                                            return (
                                                <div key={idx} className="bg-gray-200 h-32 w-full rounded mb-2 flex items-center justify-center text-gray-500 text-sm">
                                                    {comp.format} Header
                                                </div>
                                            );
                                        }
                                    }
                                    if (comp.type === 'BODY') {
                                        return <div key={idx} className="whitespace-pre-wrap text-sm mb-2">{renderPreviewText(comp.text || '', bodyParams)}</div>;
                                    }
                                    if (comp.type === 'FOOTER') {
                                        return <div key={idx} className="text-xs text-gray-400 mt-2">{comp.text}</div>;
                                    }
                                    if (comp.type === 'BUTTONS') {
                                        return (
                                            <div key={idx} className="mt-3 space-y-2">
                                                {comp.buttons?.map((btn: any, bIdx: number) => (
                                                    <div key={bIdx} className="bg-blue-50 text-blue-600 text-center py-2 rounded text-sm font-medium border border-blue-100">
                                                        {btn.text}
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    }
                                    return null;
                                })}
                            </div>
                        </div>

                        {/* Right Column: Inputs */}
                        <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select Contact</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={selectedContactPhone}
                                    onChange={(e) => setSelectedContactPhone(e.target.value)}
                                >
                                    <option value="">Select a contact...</option>
                                    {contacts.map(c => (
                                        <option key={c.id} value={c.phone}>{c.name} ({c.phone})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Header Params */}
                            {headerParams.length > 0 && (
                                <div className="space-y-3 pt-2 border-t">
                                    <h4 className="text-sm font-semibold">Header Parameters</h4>
                                    {selectedTemplate?.components.find(c => c.type === 'HEADER')?.format === 'TEXT' ? (
                                        headerParams.map((val, idx) => (
                                            <div key={`h-${idx}`} className="space-y-1">
                                                <label className="text-xs text-gray-500">Variable {'{{'}{idx + 1}{'}}'}</label>
                                                <Input
                                                    value={val}
                                                    onChange={(e) => {
                                                        const newParams = [...headerParams];
                                                        newParams[idx] = e.target.value;
                                                        setHeaderParams(newParams);
                                                    }}
                                                    placeholder={`Value for {{${idx + 1}}}`}
                                                />
                                            </div>
                                        ))
                                    ) : (
                                        <div className="space-y-1">
                                            <label className="text-xs text-gray-500">Media URL ({selectedTemplate?.components.find(c => c.type === 'HEADER')?.format})</label>
                                            <Input
                                                value={headerParams[0]}
                                                onChange={(e) => {
                                                    const newParams = [...headerParams];
                                                    newParams[0] = e.target.value;
                                                    setHeaderParams(newParams);
                                                }}
                                                placeholder="https://example.com/image.jpg"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Body Params */}
                            {bodyParams.length > 0 && (
                                <div className="space-y-3 pt-2 border-t">
                                    <h4 className="text-sm font-semibold">Body Parameters</h4>
                                    {bodyParams.map((val, idx) => (
                                        <div key={`b-${idx}`} className="space-y-1">
                                            <label className="text-xs text-gray-500">Variable {'{{'}{idx + 1}{'}}'}</label>
                                            <Input
                                                value={val}
                                                onChange={(e) => {
                                                    const newParams = [...bodyParams];
                                                    newParams[idx] = e.target.value;
                                                    setBodyParams(newParams);
                                                }}
                                                placeholder={`Value for {{${idx + 1}}}`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSendDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSendSubmit} disabled={sending}>
                            {sending ? "Sending..." : "Send Message"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </PageWrapper>
    );
}
