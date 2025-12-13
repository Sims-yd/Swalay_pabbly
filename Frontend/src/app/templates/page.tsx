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
    const [templateParams, setTemplateParams] = useState<string[]>([]);
    const [sending, setSending] = useState(false);

    // Ideally fetch contacts from API
    const [contacts] = useState([
        { id: "1", name: "Simran", phone: "917007654569" },
        { id: "2", name: "John Doe", phone: "15551234567" },
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
        setTemplateParams([]);
        setSelectedContactPhone("");
        setIsSendDialogOpen(true);
    };

    const handleSendSubmit = async () => {
        if (!selectedTemplate || !selectedContactPhone) return;

        setSending(true);
        try {
            // Import sendTemplate from messages API dynamically or use the one we have
            // We need to import it at top level. 
            // For now, let's assume we imported it.
            // Wait, I need to add the import first.
            await sendTemplate({
                phone: selectedContactPhone,
                template_name: selectedTemplate.name,
                language_code: selectedTemplate.language,
                body_parameters: templateParams
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Send Template: {selectedTemplate?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
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

                        {/* Simple param input for demo */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Body Parameters (comma separated)</label>
                            <Input
                                placeholder="param1, param2"
                                onChange={(e) => setTemplateParams(e.target.value.split(',').map(s => s.trim()))}
                            />
                            <p className="text-xs text-gray-500">
                                If the template has variables like &#123;&#123;1&#125;&#125;, enter values separated by commas.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSendDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSendSubmit} disabled={sending}>
                            {sending ? "Sending..." : "Send"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </PageWrapper>
    );
}
