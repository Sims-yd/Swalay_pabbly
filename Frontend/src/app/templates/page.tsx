"use client";

import { PageWrapper } from "@/components/ui/PageWrapper";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/DataTable";
import { Plus, RefreshCw, Upload, FileText, Video } from "lucide-react";
import { useState, useEffect } from "react";
import { fetchTemplates, Template, deleteTemplate, syncTemplates } from "@/api/templates";
import { sendTemplate } from "@/api/messages";
import { uploadMedia } from "@/api/whatsappApi";
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
    const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"date" | "name">("date");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    const [deleteLoading, setDeleteLoading] = useState(false);

    // Send Dialog State
    const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [selectedContactPhone, setSelectedContactPhone] = useState("");

    // New State for detailed params
    const [headerParams, setHeaderParams] = useState<string[]>([]);
    const [bodyParams, setBodyParams] = useState<string[]>([]);
    const [sending, setSending] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Ideally fetch contacts from API
    const [contacts] = useState([
        { id: "1", name: "Simran", phone: "917007654569" },
        { id: "2", name: "Ammar", phone: "917365993869" },
        { id: "3", name: "Nikhil", phone: "917042300378" },
        { id: "4", name: "Subhankar", phone: "918145873319" },
        { id: "5", name: "Vartika", phone: "919336037838" }

    ]);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const data = await fetchTemplates();
            setTemplates(data.templates);
            setLastSyncedAt(data.last_synced_at);
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
            alert("Failed to sync templates");
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
        setSelectedFile(null);

        // Initialize params based on template components
        const headerComp = template.components.find(c => c.type === 'HEADER');
        const bodyComp = template.components.find(c => c.type === 'BODY');

        const hParams: string[] = [];
        if (headerComp) {
            if (headerComp.format === 'TEXT' && headerComp.parameter_count) {
                for (let i = 0; i < headerComp.parameter_count; i++) hParams.push('');
            } else if (['VIDEO', 'DOCUMENT'].includes(headerComp.format || '')) {
                hParams.push(''); // Media URL for video/document
            } else if (headerComp.format === 'IMAGE') {
                // URL is fetched by backend, no user input needed
                // header params remain empty
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
            let finalHeaderParams = [...headerParams];

            if (headerComp && headerComp.format) {
                headerType = headerComp.format;

                // Handle Media Upload (IMAGE, VIDEO, DOCUMENT)
                if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType)) {
                    if (selectedFile) {
                        try {
                            const uploadResp = await uploadMedia(selectedFile);
                            if (uploadResp && uploadResp.id) {
                                finalHeaderParams = [uploadResp.id];
                            } else {
                                throw new Error('Failed to get media ID from upload');
                            }
                        } catch (uploadError: any) {
                            alert(`${headerType} upload failed: ` + uploadError.message);
                            setSending(false);
                            return;
                        }
                    } else {
                        // Enforce upload for media templates
                        alert(`Please upload a ${headerType.toLowerCase()} for this template.`);
                        setSending(false);
                        return;
                    }
                }
            }

            await sendTemplate({
                phone: selectedContactPhone,
                template_name: selectedTemplate.name,
                template_id: selectedTemplate.id,
                language_code: selectedTemplate.language,
                body_parameters: bodyParams,
                header_parameters: finalHeaderParams,
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

    const filteredTemplates = (() => {
        let result = templates.filter((template) => {
            const matchesTab = activeTab === "All" || template.status.toUpperCase() === activeTab.toUpperCase();
            const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                template.category.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesTab && matchesSearch;
        });

        // Sort templates
        result.sort((a, b) => {
            let compareValue = 0;
            
            if (sortBy === "date") {
                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                compareValue = dateA - dateB;
            } else if (sortBy === "name") {
                compareValue = a.name.localeCompare(b.name);
            }
            
            return sortOrder === "asc" ? compareValue : -compareValue;
        });

        return result;
    })();

    // Helper to render preview text with replaced params
    const renderPreviewText = (text: string, params: string[]) => {
        let preview = text;
        params.forEach((param, index) => {
            const placeholder = param || `{{${index + 1}}}`;
            const regex = new RegExp(`\\{\\{${index + 1}\\}\\}`, 'g');
            preview = preview.replace(regex, placeholder);
        });
        return preview;
    };

    const getAcceptType = (format?: string) => {
        switch (format) {
            case 'IMAGE': return 'image/*';
            case 'VIDEO': return 'video/*';
            case 'DOCUMENT': return '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt';
            default: return '*/*';
        }
    };

    const formatSyncTime = (dateString: string | null) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    return (
        <PageWrapper
            title="Templates"
            actions={
                <div className="flex gap-2 items-center">
                    {lastSyncedAt && (
                        <span className="text-xs text-gray-500 mr-2">
                            Last synced: {formatSyncTime(lastSyncedAt)}
                        </span>
                    )}
                    <Button variant="outline" onClick={handleSync} disabled={syncing}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                        {syncing ? "Syncing..." : "Sync"}
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
                        sortBy={sortBy}
                        setSortBy={setSortBy}
                        sortOrder={sortOrder}
                        setSortOrder={setSortOrder}
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
                                <TableHead>Created At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                        Loading templates...
                                    </TableCell>
                                </TableRow>
                            ) : filteredTemplates.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
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
                                        } else if (comp.format === 'IMAGE') {
                                            return (
                                                <div key={idx} className="mb-2">
                                                    {selectedFile ? (
                                                        <img
                                                            src={URL.createObjectURL(selectedFile)}
                                                            alt="Header Preview"
                                                            className="w-full h-auto rounded"
                                                        />
                                                    ) : (
                                                        <div className="bg-gray-200 h-32 w-full rounded flex items-center justify-center text-gray-500 text-sm">
                                                            Image Header
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        } else if (comp.format === 'VIDEO') {
                                            return (
                                                <div key={idx} className="mb-2">
                                                    {selectedFile ? (
                                                        <video
                                                            src={URL.createObjectURL(selectedFile)}
                                                            controls
                                                            className="w-full h-auto rounded"
                                                        />
                                                    ) : (
                                                        <div className="bg-gray-200 h-32 w-full rounded flex flex-col items-center justify-center text-gray-500 text-sm gap-2">
                                                            <Video className="w-8 h-8 opacity-50" />
                                                            Video Header
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        } else if (comp.format === 'DOCUMENT') {
                                            return (
                                                <div key={idx} className="mb-2">
                                                    {selectedFile ? (
                                                        <div className="bg-blue-50 border border-blue-200 rounded p-4 flex items-center gap-3">
                                                            <FileText className="w-8 h-8 text-blue-500" />
                                                            <div className="overflow-hidden">
                                                                <p className="text-sm font-medium text-blue-900 truncate">{selectedFile.name}</p>
                                                                <p className="text-xs text-blue-700">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-gray-200 h-32 w-full rounded flex flex-col items-center justify-center text-gray-500 text-sm gap-2">
                                                            <FileText className="w-8 h-8 opacity-50" />
                                                            Document Header
                                                        </div>
                                                    )}
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

                            {/* Upload Button for Media Header */}
                            {selectedTemplate?.components.find(c => c.type === 'HEADER' && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(c.format || '')) && (
                                <div className="mt-4 flex justify-center">
                                    <label className="cursor-pointer">
                                        <input
                                            type="file"
                                            accept={getAcceptType(selectedTemplate.components.find(c => c.type === 'HEADER')?.format)}
                                            className="hidden"
                                            onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                                        />
                                        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors">
                                            <Upload className="w-4 h-4" />
                                            {selectedFile ? "Change File" : `Upload ${selectedTemplate.components.find(c => c.type === 'HEADER')?.format?.toLowerCase()}`}
                                        </div>
                                    </label>
                                </div>
                            )}
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
                                                disabled={!!selectedFile} // Disable if file is uploaded
                                            />
                                            {selectedFile && <p className="text-xs text-green-600">File selected for upload. URL input disabled.</p>}
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
