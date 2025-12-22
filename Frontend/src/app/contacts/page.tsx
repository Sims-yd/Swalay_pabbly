"use client";

import { PageWrapper } from "@/components/ui/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Plus, Search, UserCheck, UserX, Users, MessageSquare, Send, RefreshCw } from "lucide-react";
import { useGetContacts } from "@/hooks/useApi";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/Dialog";
import { sendMessage, sendTemplate, getLegacyMessages, ReceivedMessage } from "@/api/messages";
import { fetchTemplates, Template } from "@/api/templates";

export default function ContactsPage() {
    const { data: contacts } = useGetContacts();
    const [selectedContact, setSelectedContact] = useState<any>(null);
    const [messageText, setMessageText] = useState("");
    const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
    const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);

    // Template state
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<string>("");
    const [templateParams, setTemplateParams] = useState<string[]>([]);

    // Received messages state
    const [receivedMessages, setReceivedMessages] = useState<ReceivedMessage[]>([]);

    useEffect(() => {
        loadTemplates();
        loadReceivedMessages();
        // Poll for new messages every 5 seconds
        const interval = setInterval(loadReceivedMessages, 5000);
        return () => clearInterval(interval);
    }, []);

    const loadTemplates = async () => {
        try {
            const data = await fetchTemplates();
            setTemplates(data.filter(t => t.status === 'APPROVED'));
        } catch (error) {
            console.error("Failed to load templates", error);
        }
    };

    const loadReceivedMessages = async () => {
        try {
            const msgs = await getLegacyMessages();
            setReceivedMessages(msgs);
        } catch (error) {
            console.error("Failed to load messages", error);
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
            await sendTemplate({
                phone: selectedContact.phone,
                template_name: selectedTemplate,
                language_code: template?.language || 'en_US',
                body_parameters: templateParams
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
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add Contact
                </Button>
            }
        >
            <div className="grid gap-4 md:grid-cols-3 mb-6">
                <Card className="border-none shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Contacts</CardTitle>
                        <Users className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">1,234</div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Opted-in</CardTitle>
                        <UserCheck className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">1,100</div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Opted-out</CardTitle>
                        <UserX className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">134</div>
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
                            {["All Contacts", "VIP Customers", "New Leads", "Inactive"].map((list) => (
                                <Button key={list} variant="ghost" className="w-full justify-start font-normal">
                                    {list}
                                </Button>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="h-fit border-none shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-lg">Received Messages</CardTitle>
                            <Button variant="ghost" size="sm" onClick={loadReceivedMessages}>
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="max-h-[400px] overflow-y-auto space-y-4">
                            {receivedMessages.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-4">No messages received yet.</p>
                            ) : (
                                receivedMessages.map((msg, idx) => (
                                    <div key={idx} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-sm">
                                        <div className="flex justify-between mb-1">
                                            <span className="font-semibold text-blue-600">{msg.from}</span>
                                            <span className="text-xs text-gray-500">
                                                {new Date(parseInt(msg.timestamp) * 1000).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <p className="text-gray-700 dark:text-gray-300">{msg.text || `[${msg.type}]`}</p>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-none shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">All Contacts</CardTitle>
                        <div className="w-64 relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input placeholder="Search contacts..." className="pl-9" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {contacts?.map((contact) => (
                                    <TableRow key={contact.id}>
                                        <TableCell className="font-medium">{contact.name}</TableCell>
                                        <TableCell>{contact.phone}</TableCell>
                                        <TableCell>
                                            <Badge variant={contact.status === "opted-in" ? "success" : "destructive"}>
                                                {contact.status}
                                            </Badge>
                                        </TableCell>
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
