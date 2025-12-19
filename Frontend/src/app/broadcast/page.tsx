"use client";

import { PageWrapper } from "@/components/ui/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Plus, Search, Radio, Send, Clock, CheckCircle } from "lucide-react";
import { useGetBroadcasts } from "@/hooks/useApi";

export default function BroadcastPage() {
    const { data: broadcasts, isLoading } = useGetBroadcasts();
    const router = useRouter();
    const handleAddBroadcast = () => router.push("/broadcast/new");

    return (
        <PageWrapper
            title="Broadcasts"
            actions={
                <Button onClick={handleAddBroadcast}>
                    <Plus className="mr-2 h-4 w-4" /> New Broadcast
                </Button>
            }
        >
            <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Broadcasts</CardTitle>
                    <div className="w-64 relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input placeholder="Search broadcasts..." className="pl-9" />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Broadcast Name</TableHead>
                                <TableHead>Template</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Sent</TableHead>
                                <TableHead>Failed</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">Loading broadcasts...</TableCell>
                                </TableRow>
                            ) : broadcasts && broadcasts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">No broadcasts found.</TableCell>
                                </TableRow>
                            ) : (
                                broadcasts?.map((broadcast: any) => (
                                    <TableRow key={broadcast.id}>
                                        <TableCell className="font-medium">{broadcast.name}</TableCell>
                                        <TableCell>{broadcast.template_name}</TableCell>
                                        <TableCell>{broadcast.total}</TableCell>
                                        <TableCell>{broadcast.sent}</TableCell>
                                        <TableCell>{broadcast.failed}</TableCell>
                                        <TableCell>
                                            <Badge variant={broadcast.status === 'completed' ? 'success' : 'warning'}>{broadcast.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => router.push(`/broadcast/${broadcast.id}`)}>
                                                View Report
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </PageWrapper>
    );
}
