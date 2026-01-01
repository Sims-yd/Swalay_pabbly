"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageWrapper } from "@/components/ui/PageWrapper";
import { getContactStats } from "@/api/contacts";
import { getContactLists } from "@/api/contactLists";
import { fetchTemplates } from "@/api/templates";
import { getBroadcasts } from "@/api/broadcasts";
import { Megaphone, Phone, FileText, ListChecks, Loader2, AlertCircle } from "lucide-react";

type DashboardCounts = {
    contacts: number;
    contactLists: number;
    templates: number;
    broadcasts: number;
};

export default function DashboardPage() {
    const [counts, setCounts] = useState<DashboardCounts>({ contacts: 0, contactLists: 0, templates: 0, broadcasts: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            setIsLoading(true);
            try {
                const [contactStats, listsRes, templatesRes, broadcastsRes] = await Promise.all([
                    getContactStats(),
                    getContactLists(),
                    fetchTemplates(),
                    getBroadcasts(),
                ]);

                if (!mounted) return;

                setCounts({
                    contacts: contactStats?.total ?? 0,
                    contactLists: listsRes?.lists?.length ?? 0,
                    templates: templatesRes?.templates?.length ?? 0,
                    broadcasts: Array.isArray(broadcastsRes) ? broadcastsRes.length : 0,
                });
                setError(null);
            } catch (err: any) {
                if (!mounted) return;
                setError(err?.message || "Failed to load dashboard data.");
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, []);

    const metrics = [
        { title: "Contacts", value: counts.contacts, icon: Phone, color: "text-emerald-600", bg: "bg-emerald-50", href: "/contacts" },
        { title: "Contact Lists", value: counts.contactLists, icon: ListChecks, color: "text-blue-600", bg: "bg-blue-50", href: "/contacts/lists" },
        { title: "Templates", value: counts.templates, icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50", href: "/templates" },
        { title: "Broadcasts", value: counts.broadcasts, icon: Megaphone, color: "text-orange-600", bg: "bg-orange-50", href: "/broadcast" },
    ];

    return (
        <PageWrapper title="Dashboard">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {metrics.map((metric) => (
                    <Link key={metric.title} href={metric.href} className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/60 rounded-lg">
                        <Card className="border-none shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-gray-600 group-hover:text-gray-900">
                                    {metric.title}
                                </CardTitle>
                                <div className={`p-2 rounded-full ${metric.bg}`}>
                                    <metric.icon className={`h-4 w-4 ${metric.color}`} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : metric.value.toLocaleString()}
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {error && (
                <div className="mt-6 flex items-center gap-2 rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                </div>
            )}

            <div className="mt-8 bg-blue-50 p-6 rounded-lg border border-blue-100">
                <h3 className="text-lg font-semibold mb-2 text-blue-800">Points to Remember</h3>
                <ul className="list-disc list-inside space-y-2 text-blue-700 text-sm">
                    <li>Ensure your WhatsApp number is connected to send messages.</li>
                    <li>Templates must be approved by Meta before sending broadcasts.</li>
                    <li>Check your credit balance regularly to avoid service interruption.</li>
                </ul>
            </div>
        </PageWrapper>
    );
}
