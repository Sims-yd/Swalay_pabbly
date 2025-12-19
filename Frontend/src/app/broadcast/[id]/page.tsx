"use client";

import { PageWrapper } from "@/components/ui/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getBroadcast } from "@/api/broadcasts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";

export default function BroadcastDetails() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();
    const [broadcast, setBroadcast] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        if (!id) return;
        setLoading(true);
        getBroadcast(id).then((b) => { if (mounted) setBroadcast(b); }).catch(e => console.error(e)).finally(() => mounted && setLoading(false));
        return () => { mounted = false; };
    }, [id]);

    return (
        <PageWrapper title={broadcast?.name || 'Broadcast Details'} actions={<Button variant="ghost" onClick={() => router.push('/broadcast')}>Back</Button>}>
            <Card>
                <CardHeader>
                    <CardTitle>Recipients</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div>Loading...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Details</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {broadcast?.recipients?.map((r: any, idx: number) => (
                                    <TableRow key={idx}>
                                        <TableCell>{r.phone}</TableCell>
                                        <TableCell>{r.status}</TableCell>
                                        <TableCell className="text-sm text-gray-700">{r.details ? JSON.stringify(r.details) : '-'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </PageWrapper>
    );
}
