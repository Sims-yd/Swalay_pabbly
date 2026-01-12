"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/use-toast";
import Script from "next/script";

declare global {
    interface Window {
        FB: any;
        fbAsyncInit: () => void;
    }
}

export default function ConnectWhatsApp() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [sdkLoaded, setSdkLoaded] = useState(false);

    // Initialize Facebook SDK
    useEffect(() => {
        window.fbAsyncInit = function () {
            window.FB.init({
                appId: process.env.NEXT_PUBLIC_META_APP_ID,
                cookie: true,
                xfbml: false, // Must be false for Embedded Signup
                version: "v20.0",
            });
            setSdkLoaded(true);
        };
    }, []);

    const handleLogin = () => {
        if (!sdkLoaded || !window.FB) {
            toast({
                title: "Error",
                description: "Facebook SDK not loaded yet. Please refresh the page.",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);

        // Launch Embedded Signup
        // The ONLY valid Embedded Signup trigger is:
        // FB.login(cb, {
        //   scope: "whatsapp_business_management, whatsapp_business_messaging",
        //   extras: {
        //     setup: {
        //       config_id: process.env.NEXT_PUBLIC_META_CONFIG_ID
        //     }
        //   }
        // })
        window.FB.login(
            function (response: any) {
                if (response.authResponse) {
                    const code = response.authResponse.code;
                    if (code) {
                        sendToBackend(code);
                    } else {
                        setLoading(false);
                        toast({ title: "Error", description: "No code received from Facebook Login.", variant: "destructive" });
                    }
                } else {
                    setLoading(false);
                    console.log("User cancelled login or did not fully authorize.");
                }
            },
            {
                scope: "whatsapp_business_management, whatsapp_business_messaging",
                extras: {
                    setup: {
                        config_id: process.env.NEXT_PUBLIC_META_CONFIG_ID
                    }
                }
            }
        );
    };

    const sendToBackend = async (code: string) => {
        try {
            // Send ONLY code to backend
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/onboarding/whatsapp/signup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // Add auth token if needed
                },
                body: JSON.stringify({
                    code
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || "Backend failed");
            }

            const data = await res.json();
            toast({
                title: "Success",
                description: "WhatsApp connected successfully!",
            });
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Error",
                description: error.message || "Failed to connect WhatsApp.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4 p-6 border rounded-lg shadow-sm">
            <Script
                src="https://connect.facebook.net/en_US/sdk.js"
                strategy="lazyOnload"
                onLoad={() => {
                    // SDK loaded
                }}
            />
            <h2 className="text-xl font-semibold">Connect WhatsApp Business</h2>
            <p className="text-gray-500 text-center max-w-md">
                Link your WhatsApp Business Account to start sending messages and campaigns.
            </p>
            <Button onClick={handleLogin} disabled={loading || !sdkLoaded}>
                {loading ? "Connecting..." : "Connect WhatsApp"}
            </Button>
        </div>
    );
}
