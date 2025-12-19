import React from 'react';
import { Search, Plus, Check, CheckCheck } from 'lucide-react';

const ChatList = ({ contacts, selectedContact, onSelectContact }) => {
    return (
        <div className="w-full md:w-[350px] lg:w-[400px] h-screen bg-card border-r border-gray-200 flex flex-col flex-shrink-0">
            {/* Header */}
            <div className="h-16 px-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <h1 className="text-xl font-semibold text-card-foreground">Inbox</h1>
                <div className="flex space-x-2">
                    {/* Icons could go here */}
                </div>
            </div>

            {/* Search & Add */}
            <div className="p-4 space-y-3 flex-shrink-0">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" size={18} />
                    <input
                        type="text"
                        placeholder="Search"
                        className="w-full bg-muted text-card-foreground pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-gray-300 placeholder-slate-400 text-sm"
                    />
                </div>
                <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors text-sm font-medium">
                    <Plus size={18} />
                    <span>Add New Contact</span>
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {contacts.map((contact, index) => (
                    <div
                        key={index}
                        onClick={() => onSelectContact(contact)}
                        className={`px-4 py-3 cursor-pointer transition-colors border-b border-gray-200/50 hover:bg-muted/50 ${selectedContact?.name === contact.name ? 'bg-primary/10' : ''}`}
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex space-x-3 overflow-hidden">
                                <div className="w-10 h-10 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-[var(--primary-foreground)] font-medium">
                                    {contact.name.charAt(0)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="text-sm font-medium text-card-foreground truncate pr-2">
                                            {contact.name}
                                        </h3>
                                    </div>
                                    <p className="text-xs text-muted truncate mt-0.5">
                                        {contact.lastMsg}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end space-y-1 flex-shrink-0 ml-2">
                                <span className={`text-[10px] ${contact.unread > 0 ? 'text-green-500 font-medium' : 'text-muted'}`}>
                                    {contact.time}
                                </span>
                                {contact.unread > 0 && (
                                    <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                                        {contact.unread}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ChatList;
