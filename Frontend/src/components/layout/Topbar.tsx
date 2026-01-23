"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/api/auth";
import { Button } from "@/components/ui/Button";
import { User } from "lucide-react";

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

    const handleProfileClick = () => {
        router.push("/profile");
    };

    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-end border-b bg-card px-6 shadow-sm">
            <div className="flex items-center gap-4">

                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full bg-muted"
                    onClick={handleProfileClick}
                >
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
