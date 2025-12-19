import { SearchBar } from "@/components/ui/SearchBar";
import { Button } from "@/components/ui/Button";
import { Bell, User } from "lucide-react";

export function Topbar() {
    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-card px-6 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2 text-sm text-muted bg-muted px-3 py-1.5 rounded-md">
                    <span className="font-medium">WhatsApp Number:</span>
                    <span>+91 98765 43210</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="w-64 hidden md:block">
                    <SearchBar placeholder="Search..." />
                </div>

                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5 text-muted" />
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" />
                </Button>

                <Button variant="ghost" size="icon" className="rounded-full bg-muted">
                    <User className="h-5 w-5 text-muted" />
                </Button>
            </div>
        </header>
    );
}
