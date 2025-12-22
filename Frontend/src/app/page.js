"use client";

import React, { useState, useEffect } from 'react';
import ChatList from '@/components/ChatList';
import ChatBox from '@/components/ui/ChatBox';
import { getCurrentUser } from '@/api/auth';

export default function Home() {
    const [userId, setUserId] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Dummy Data
    const contactsData = [
        { name: "Aman Sharma", phone: "+911234567890", lastMsg: "Hello Simran!", time: "2:45 PM", unread: 2 },
        { name: "SwaLayDigi", phone: "+911234567891", lastMsg: "Send the docs", time: "1:10 PM", unread: 0 },
        { name: "Pabbly Team", phone: "+911234567892", lastMsg: "Welcome to WhatsApp API", time: "Yesterday", unread: 1 }
    ];

    const [selectedContact, setSelectedContact] = useState(contactsData[0]);

    // Fetch current user on mount
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const user = await getCurrentUser();
                setUserId(user.id);
            } catch (error) {
                console.error('Failed to get current user:', error);
                // User might not be logged in, handle accordingly
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    if (loading) {
        return (
            <main className="flex h-screen w-full items-center justify-center bg-background">
                <p className="text-muted">Loading...</p>
            </main>
        );
    }

    return (
        <main className="flex h-screen w-full overflow-hidden bg-background">
            {/* Sidebar provided by RootLayout */}

            {/* Middle Chat List */}
            <div className={`${selectedContact ? 'hidden md:flex' : 'flex'} w-full md:w-auto flex-shrink-0`}>
                <ChatList
                    contacts={contactsData}
                    selectedContact={selectedContact}
                    onSelectContact={setSelectedContact}
                />
            </div>

            {/* Right Chat Box */}
            <div className={`${!selectedContact ? 'hidden md:flex' : 'flex'} flex-1 h-full`}>
                <ChatBox
                    contact={selectedContact}
                    userId={userId}
                />
            </div>
        </main>
    );
}
