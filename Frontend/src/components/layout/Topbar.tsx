"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/api/auth";
import { SearchBar } from "@/components/ui/SearchBar";
import { Button } from "@/components/ui/Button";
import { Bell, User } from "lucide-react";

export function Topbar() {
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await logout();
        } catch (err) {
            console.warn("Logout failed", err);
        } finally {
            setIsLoggingOut(false);
            router.replace("/login");
        }
    };

    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-card px-6 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="w-64 hidden md:block">
                    <SearchBar placeholder="Search..." />
                </div>
            </div>

            <div className="flex items-center gap-4">

                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5 text-muted" />
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" />
                </Button>

                <Button variant="ghost" size="icon" className="rounded-full bg-muted">
                    <User className="h-5 w-5 text-muted" />
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    className="ml-2"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                >
                    {isLoggingOut ? "Logging out..." : "Logout"}
                </Button>
            </div>
        </header>
    );
}
