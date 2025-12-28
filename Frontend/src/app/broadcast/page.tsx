"use client";

import { PageWrapper } from "@/components/ui/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Plus, Search, ArrowUpDown, Filter, X } from "lucide-react";
import { useGetBroadcasts } from "@/hooks/useApi";
import { useState, useMemo } from "react";
import { Select } from "@/components/ui/Select";

export default function BroadcastPage() {
    const { data: broadcasts, isLoading } = useGetBroadcasts();
    const router = useRouter();
    const handleAddBroadcast = () => router.push("/broadcast/new");

    // Search, filter, and sort states
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [sortBy, setSortBy] = useState<"date" | "name" | "total" | "sent">("date");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    // Filtered and sorted broadcasts
    const filteredBroadcasts = useMemo(() => {
        if (!broadcasts) return [];

        let result = [...broadcasts];

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (broadcast) =>
                    broadcast.name?.toLowerCase().includes(query) ||
                    broadcast.template_name?.toLowerCase().includes(query)
            );
        }

        // Apply status filter
        if (statusFilter !== "all") {
            result = result.filter((broadcast) => broadcast.status === statusFilter);
        }

        // Apply sorting
        result.sort((a, b) => {
            let compareValue = 0;

            switch (sortBy) {
                case "date":
                    const dateA = new Date(a.sent_at || a.created_at || 0).getTime();
                    const dateB = new Date(b.sent_at || b.created_at || 0).getTime();
                    compareValue = dateA - dateB;
                    break;
                case "name":
                    compareValue = (a.name || "").localeCompare(b.name || "");
                    break;
                case "total":
                    compareValue = (a.total || 0) - (b.total || 0);
                    break;
                case "sent":
                    compareValue = (a.sent || 0) - (b.sent || 0);
                    break;
            }

            return sortOrder === "asc" ? compareValue : -compareValue;
        });

        return result;
    }, [broadcasts, searchQuery, statusFilter, sortBy, sortOrder]);

    const toggleSortOrder = () => {
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    };

    const clearFilters = () => {
        setSearchQuery("");
        setStatusFilter("all");
        setSortBy("date");
        setSortOrder("desc");
    };

    const hasActiveFilters = searchQuery || statusFilter !== "all" || sortBy !== "date" || sortOrder !== "desc";

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
                <CardHeader className="space-y-4">
                    <div className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Broadcasts</CardTitle>
                        <div className="w-64 relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search broadcasts..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Filters and Sort Controls */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">Status:</span>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All</option>
                                <option value="completed">Completed</option>
                                <option value="sending">Sending</option>
                                <option value="pending">Pending</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <ArrowUpDown className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">Sort by:</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="date">Date</option>
                                <option value="name">Name</option>
                                <option value="total">Total Recipients</option>
                                <option value="sent">Sent Count</option>
                            </select>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={toggleSortOrder}
                                className="px-2"
                                title={`Sort ${sortOrder === "asc" ? "Ascending" : "Descending"}`}
                            >
                                {sortOrder === "asc" ? "↑" : "↓"}
                            </Button>
                        </div>

                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="ml-auto text-gray-600 hover:text-gray-900"
                            >
                                <X className="h-4 w-4 mr-1" />
                                Clear Filters
                            </Button>
                        )}
                    </div>

                    {/* Results count */}
                    {!isLoading && (
                        <div className="text-sm text-gray-500">
                            Showing {filteredBroadcasts.length} of {broadcasts?.length || 0} broadcasts
                        </div>
                    )}
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
                                <TableHead>Date & Time</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">Loading broadcasts...</TableCell>
                                </TableRow>
                            ) : filteredBroadcasts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                        {searchQuery || statusFilter !== "all" 
                                            ? "No broadcasts match your filters." 
                                            : "No broadcasts found."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredBroadcasts.map((broadcast: any) => (
                                    <TableRow 
                                        key={broadcast.id}
                                        onClick={() => router.push(`/broadcast/${broadcast.id}`)}
                                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                                    >
                                        <TableCell className="font-medium">{broadcast.name}</TableCell>
                                        <TableCell>{broadcast.template_name}</TableCell>
                                        <TableCell>{broadcast.total}</TableCell>
                                        <TableCell className="text-green-600 font-medium">{broadcast.sent}</TableCell>
                                        <TableCell className="text-red-600 font-medium">{broadcast.failed}</TableCell>
                                        <TableCell>
                                            <Badge variant={broadcast.status === 'completed' ? 'success' : broadcast.status === 'sending' ? 'warning' : 'default'}>
                                                {broadcast.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-600">
                                            {broadcast.sent_at ? (
                                                <div className="flex flex-col">
                                                    <span>{new Date(broadcast.sent_at).toLocaleDateString()}</span>
                                                    <span className="text-xs text-gray-500">{new Date(broadcast.sent_at).toLocaleTimeString()}</span>
                                                </div>
                                            ) : broadcast.created_at ? (
                                                <div className="flex flex-col">
                                                    <span>{new Date(broadcast.created_at).toLocaleDateString()}</span>
                                                    <span className="text-xs text-gray-500">{new Date(broadcast.created_at).toLocaleTimeString()}</span>
                                                </div>
                                            ) : (
                                                '-'
                                            )}
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
