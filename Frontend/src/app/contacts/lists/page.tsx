"use client";

import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/ui/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/Dialog";
import { getContactLists, updateContactList, deleteContactList, getContactsInList } from "@/api/contactLists";
import { removeContactFromList, addContactToList, getContacts } from "@/api/contacts";
import { Plus, Trash2, Pencil, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ContactListsPage() {
    const [lists, setLists] = useState<Array<{ id: string; name: string; contact_count?: number }>>([]);
    const [activeListId, setActiveListId] = useState<string | null>(null);
    const [listContacts, setListContacts] = useState<Array<{ id: string; name: string; phone: string }>>([]);
    const [allContacts, setAllContacts] = useState<Array<{ id: string; name: string; phone: string }>>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [renameName, setRenameName] = useState("");

    useEffect(() => {
        refreshLists();
        getContacts().then(setAllContacts);
    }, []);

    const refreshLists = async () => {
        const res = await getContactLists();
        setLists(res.lists);
        if (res.lists.length && !activeListId) {
            setActiveListId(res.lists[0].id);
        }
    };

    useEffect(() => {
        if (!activeListId) return;
        getContactsInList(activeListId).then((items) => {
            setListContacts(items);
            setSelectedIds(items.map((c) => c.id));
        });
    }, [activeListId]);

    const handleDeleteList = async (id: string) => {
        await deleteContactList(id);
        await refreshLists();
        if (activeListId === id) setActiveListId(null);
    };

    const handleRenameList = async () => {
        if (!activeListId || !renameName) return;
        await updateContactList(activeListId, renameName);
        setIsRenameOpen(false);
        setRenameName("");
        await refreshLists();
    };

    const handleUpdateMembership = async () => {
        if (!activeListId) return;
        const currentIds = new Set(listContacts.map((c) => c.id));
        const targetIds = new Set(selectedIds);

        const toAdd = allContacts.filter((c) => targetIds.has(c.id) && !currentIds.has(c.id));
        const toRemove = listContacts.filter((c) => !targetIds.has(c.id));

        await Promise.all([
            ...toAdd.map((c) => addContactToList(c.id, activeListId)),
            ...toRemove.map((c) => removeContactFromList(c.id, activeListId)),
        ]);

        const updated = await getContactsInList(activeListId);
        setListContacts(updated);
        setSelectedIds(updated.map((c) => c.id));
        await refreshLists();
    };

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (!allContacts.length) return;
        if (selectedIds.length === allContacts.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(allContacts.map((c) => c.id));
        }
    };

    return (
        <PageWrapper
            title="Contact Lists"
            actions={
                <Link href="/contacts">
                    <Button variant="ghost"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Contacts</Button>
                </Link>
            }
        >
            <div className="grid gap-6 md:grid-cols-[300px_1fr]">
                <Card className="h-fit border-none shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Lists</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {lists.map((l) => (
                            <div key={l.id} className="flex items-center gap-2">
                                <Button
                                    variant={activeListId === l.id ? "secondary" : "ghost"}
                                    className="w-full justify-start font-normal"
                                    onClick={() => setActiveListId(l.id)}
                                >
                                    {l.name} ({l.contact_count ?? 0})
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => { setIsRenameOpen(true); setRenameName(l.name); setActiveListId(l.id); }}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteList(l.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle className="text-lg">Contacts in List</CardTitle>
                        <Button variant="secondary" onClick={handleUpdateMembership} disabled={!activeListId}>
                            Update Membership
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10">
                                        <input
                                            type="checkbox"
                                            checked={allContacts.length ? selectedIds.length === allContacts.length : false}
                                            onChange={toggleSelectAll}
                                        />
                                    </TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Phone</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {allContacts.map((c) => (
                                    <TableRow key={c.id}>
                                        <TableCell>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(c.id)}
                                                onChange={() => toggleSelect(c.id)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">{c.name}</TableCell>
                                        <TableCell>{c.phone}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename List</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div>
                            <label className="text-sm font-medium">Name</label>
                            <Input value={renameName} onChange={(e) => setRenameName(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleRenameList}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </PageWrapper>
    );
}
