"use client";

import { PageWrapper } from "@/components/ui/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/DataTable";
import { Plus, Search, Users, MessageSquare, Send, Trash2 } from "lucide-react";
import { useGetContacts, useAddContact, useGetContactStats, useGetContactLists, useCreateContactList } from "@/hooks/useApi";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/Dialog";
import { sendMessage, sendTemplate } from "@/api/messages";
import { fetchTemplates, Template } from "@/api/templates";
import Link from "next/link";
import { deleteContact } from "@/api/contacts";

export default function ContactsPage() {
    const [activeListId, setActiveListId] = useState<string | undefined>(undefined);
    const { data: contacts, refetch: refetchContacts } = useGetContacts(activeListId);
    const { data: stats } = useGetContactStats();
    const { data: lists, refetch: refetchLists } = useGetContactLists();
    const addContact = useAddContact();
    const createList = useCreateContactList();

    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const [selectedContact, setSelectedContact] = useState<any>(null);
    const [messageText, setMessageText] = useState("");
    const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
    const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);

    // Template state
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<string>("");
    const [templateParams, setTemplateParams] = useState<string[]>([]);

    // Add Contact modal state
    const [isAddContactOpen, setIsAddContactOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [newPhone, setNewPhone] = useState("");
    const [newContactListId, setNewContactListId] = useState<string>("");

    // Add List modal state
    const [isAddListOpen, setIsAddListOpen] = useState(false);
    const [newListName, setNewListName] = useState("");

    useEffect(() => {
        loadTemplates();
    }, []);

    useEffect(() => {
        // clear selection when contacts change
        setSelectedIds([]);
    }, [contacts]);

    const loadTemplates = async () => {
        try {
            const data = await fetchTemplates();
            setTemplates(data.templates.filter(t => t.status === 'APPROVED'));
        } catch (error) {
            console.error("Failed to load templates", error);
        }
    };

    const handleAddContact = async () => {
        if (!newName || !newPhone) return;
        try {
            await addContact.mutate({ name: newName, phone: newPhone, list_ids: newContactListId ? [newContactListId] : [] });
            setIsAddContactOpen(false);
            setNewName("");
            setNewPhone("");
            setNewContactListId("");
        } catch (e: any) {
            alert(e.message || "Failed to add contact");
        }
    };

    const handleCreateList = async () => {
        if (!newListName) return;
        try {
            await createList.mutate(newListName);
            setIsAddListOpen(false);
            setNewListName("");
            await refetchLists();
        } catch (e: any) {
            alert(e.message || "Failed to create list");
        }
    };

    const handleDeleteContact = async (id: string) => {
        try {
            await deleteContact(id);
            await refetchContacts();
        } catch (e: any) {
            alert(e.message || "Failed to delete contact");
        }
    };

    const handleBulkDelete = async () => {
        if (!selectedIds.length) return;
        try {
            await Promise.all(selectedIds.map((id) => deleteContact(id)));
            setSelectedIds([]);
            await refetchContacts();
        } catch (e: any) {
            alert(e.message || "Failed to delete selected contacts");
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (!contacts) return;
        if (selectedIds.length === contacts.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(contacts.map((c) => c.id));
        }
    };

    const handleSendMessage = async () => {
        if (!selectedContact || !messageText) return;
        try {
            await sendMessage({
                phone: selectedContact.phone,
                message: messageText
            });
            setIsMessageDialogOpen(false);
            setMessageText("");
            alert("Message sent successfully!");
        } catch (error) {
            console.error(error);
            alert("Failed to send message");
        }
    };

    const handleSendTemplate = async () => {
        if (!selectedContact || !selectedTemplate) return;
        try {
            const template = templates.find(t => t.name === selectedTemplate);
            const headerComp = template?.components.find(c => c.type === 'HEADER');
            const headerType = headerComp?.format;
            await sendTemplate({
                phone: selectedContact.phone,
                template_name: selectedTemplate,
                template_id: template?.id,
                language_code: template?.language || 'en_US',
                body_parameters: templateParams,
                header_type: headerType
            });
            setIsTemplateDialogOpen(false);
            setSelectedTemplate("");
            setTemplateParams([]);
            alert("Template sent successfully!");
        } catch (error) {
            console.error(error);
            alert("Failed to send template");
        }
    };

    return (
        <PageWrapper
            title="Contacts"
            actions={
                <div className="flex gap-2">
                    <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> Add Contact
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add Contact</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3 py-2">
                                <div>
                                    <label className="text-sm font-medium">Name</label>
                                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="John Doe" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Phone</label>
                                    <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+1234567890" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Contact List (optional)</label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none"
                                        value={newContactListId}
                                        onChange={(e) => setNewContactListId(e.target.value)}
                                    >
                                        <option value="">None</option>
                                        {lists?.map((l) => (
                                            <option key={l.id} value={l.id}>{l.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAddContact}>Save</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isAddListOpen} onOpenChange={setIsAddListOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Plus className="mr-2 h-4 w-4" /> Add List
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create Contact List</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3 py-2">
                                <div>
                                    <label className="text-sm font-medium">Name</label>
                                    <Input value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="VIP Customers" />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleCreateList}>Create</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            }
        >
            <div className="grid gap-4 md:grid-cols-1 mb-6">
                <Card className="border-none shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Contacts</CardTitle>
                        <Users className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-[300px_1fr]">
                <div className="space-y-6">
                    <Card className="h-fit border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">Contact Lists</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button
                                variant={activeListId ? "ghost" : "secondary"}
                                className="w-full justify-start font-normal"
                                onClick={() => setActiveListId(undefined)}
                            >
                                All Contacts
                            </Button>
                            {lists?.map((list) => (
                                <div key={list.id} className="flex items-center gap-2">
                                    <Button
                                        variant={activeListId === list.id ? "secondary" : "ghost"}
                                        className="w-full justify-start font-normal"
                                        onClick={() => setActiveListId(list.id)}
                                    >
                                        {list.name} ({list.contact_count ?? 0})
                                    </Button>
                                    <Link href={`/contacts/lists`} className="text-xs text-blue-600">Manage</Link>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-none shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">All Contacts</CardTitle>
                        <div className="flex items-center gap-2">
                            <Button variant="destructive" size="sm" disabled={!selectedIds.length} onClick={handleBulkDelete}>
                                <Trash2 className="h-4 w-4 mr-1" /> Delete Selected
                            </Button>
                            <div className="w-64 relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                <Input placeholder="Search contacts..." className="pl-9" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10">
                                        <input
                                            type="checkbox"
                                            checked={contacts?.length ? selectedIds.length === contacts.length : false}
                                            onChange={() => toggleSelectAll()}
                                        />
                                    </TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {contacts?.map((contact) => (
                                    <TableRow key={contact.id}>
                                        <TableCell>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(contact.id)}
                                                onChange={() => toggleSelect(contact.id)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">{contact.name}</TableCell>
                                        <TableCell>{contact.phone}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Dialog open={isMessageDialogOpen && selectedContact?.id === contact.id} onOpenChange={(open) => {
                                                    setIsMessageDialogOpen(open);
                                                    if (open) setSelectedContact(contact);
                                                }}>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline" size="sm">
                                                            <MessageSquare className="h-4 w-4 mr-1" /> Msg
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Send Message to {contact.name}</DialogTitle>
                                                        </DialogHeader>
                                                        <div className="space-y-4 py-4">
                                                            <div className="space-y-2">
                                                                <label className="text-sm font-medium">Message</label>
                                                                <textarea
                                                                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                                    value={messageText}
                                                                    onChange={(e) => setMessageText(e.target.value)}
                                                                    placeholder="Type your message..."
                                                                />
                                                            </div>
                                                        </div>
                                                        <DialogFooter>
                                                            <Button onClick={handleSendMessage}>Send</Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>

                                                <Dialog open={isTemplateDialogOpen && selectedContact?.id === contact.id} onOpenChange={(open) => {
                                                    setIsTemplateDialogOpen(open);
                                                    if (open) setSelectedContact(contact);
                                                }}>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline" size="sm">
                                                            <Send className="h-4 w-4 mr-1" /> Tpl
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Send Template to {contact.name}</DialogTitle>
                                                        </DialogHeader>
                                                        <div className="space-y-4 py-4">
                                                            <div className="space-y-2">
                                                                <label className="text-sm font-medium">Select Template</label>
                                                                <select
                                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                                    value={selectedTemplate}
                                                                    onChange={(e) => setSelectedTemplate(e.target.value)}
                                                                >
                                                                    <option value="">Select a template...</option>
                                                                    {templates.map(t => (
                                                                        <option key={t.id} value={t.name}>{t.name} ({t.language})</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            {/* Simple param input for demo - ideally dynamic based on template */}
                                                            {selectedTemplate && (
                                                                <div className="space-y-2">
                                                                    <label className="text-sm font-medium">Body Parameters (comma separated)</label>
                                                                    <Input
                                                                        placeholder="param1, param2"
                                                                        onChange={(e) => setTemplateParams(e.target.value.split(',').map(s => s.trim()))}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <DialogFooter>
                                                            <Button onClick={handleSendTemplate}>Send</Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>

                                                <Button variant="ghost" size="sm" onClick={() => handleDeleteContact(contact.id)}>
                                                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </PageWrapper>
    );
}
