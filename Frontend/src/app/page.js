"use client";

import React, { useState } from 'react';
import ChatList from '@/components/ChatList';
import ChatBox from '@/components/ui/ChatBox';

export default function Home() {
    // Dummy Data
    const contactsData = [
        { name: "Aman Sharma", lastMsg: "Hello Simran!", time: "2:45 PM", unread: 2 },
        { name: "SwaLayDigi", lastMsg: "Send the docs", time: "1:10 PM", unread: 0 },
        { name: "Pabbly Team", lastMsg: "Welcome to WhatsApp API", time: "Yesterday", unread: 1 }
    ];

    const initialMessagesData = [
        { sender: "them", text: "Hey there! How can I help you?" },
        { sender: "me", text: "I want to integrate WhatsApp Cloud API." },
        { sender: "them", text: "Sure! I will guide you." }
    ];

    const [selectedContact, setSelectedContact] = useState(contactsData[0]);

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
                    initialMessages={initialMessagesData}
                />
            </div>
        </main>
    );
}
