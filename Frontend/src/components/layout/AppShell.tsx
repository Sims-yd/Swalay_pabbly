"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export function AppShell({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const isAuthRoute = pathname?.startsWith("/login") || pathname?.startsWith("/signup");

    if (isAuthRoute) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-50">
                {children}
            </main>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
                <Topbar />
                <main className="flex-1 overflow-y-auto p-6">{children}</main>
            </div>
        </div>
    );
}
