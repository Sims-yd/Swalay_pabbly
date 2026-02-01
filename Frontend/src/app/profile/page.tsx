"use client";

import { useEffect, useState } from "react";
import { getProfile, ProfileResponse } from "@/api/profile";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { Mail, User, Calendar, CheckCircle, XCircle } from "lucide-react";

export default function ProfilePage() {
    const [profile, setProfile] = useState<ProfileResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // const [disconnecting, setDisconnecting] = useState(false);
    const router = useRouter();

    const fetchProfile = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getProfile();
            setProfile(data);
        } catch (err: any) {
            console.error("Failed to fetch profile:", err);
            setError(err.message || "Failed to load profile");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    // const handleDisconnect = async () => {
    //     if (!confirm("Are you sure you want to disconnect WhatsApp?")) {
    //         return;
    //     }
    //
    //     try {
    //         setDisconnecting(true);
    //         await disconnectWhatsApp();
    //         // Refresh profile
    //         await fetchProfile();
    //     } catch (err: any) {
    //         console.error("Failed to disconnect:", err);
    //         alert(err.message || "Failed to disconnect WhatsApp");
    //     } finally {
    //         setDisconnecting(false);
    //     }
    // };
    //
    // const handleWhatsAppConnected = () => {
    //     // Refresh profile after successful connection
    //     fetchProfile();
    // };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="p-6 max-w-md">
                    <div className="text-center">
                        <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Error Loading Profile</h2>
                        <p className="text-muted-foreground mb-4">{error}</p>
                        <Button onClick={fetchProfile}>Try Again</Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8">Profile</h1>

            {/* User Information */}
            <Card className="p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Account Information
                </h2>
                
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p className="font-medium">{profile?.email}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                            <p className="text-sm text-muted-foreground">Member Since</p>
                            <p className="font-medium">
                                {profile?.created_at
                                    ? new Date(profile.created_at).toLocaleDateString('en-US', {
                                          year: 'numeric',
                                          month: 'long',
                                          day: 'numeric',
                                      })
                                    : 'N/A'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                            <p className="text-sm text-muted-foreground">User ID</p>
                            <p className="font-mono text-sm">{profile?.id}</p>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
