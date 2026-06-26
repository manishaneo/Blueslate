import React, { useState } from 'react';
import { format } from 'date-fns';
import { Lock, Send, User } from 'lucide-react';
import { EmptyState } from './EmptyState';

export const InternalNotesPanel = ({ notes = [], onAddNote, isSubmitting }) => {
    const [newNote, setNewNote] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newNote.trim()) return;
        await onAddNote(newNote);
        setNewNote("");
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold text-sm">
                    <Lock size={14} className="text-gray-400" />
                    Internal Notes
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                    Admin Only
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px]">
                {notes.length === 0 ? (
                    <EmptyState title="No internal notes yet" description="Add notes to communicate with other team members." />
                ) : (
                    notes.map((note) => (
                        <div key={note.id} className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                                    <div className="w-5 h-5 rounded bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-500">
                                        <User size={12} />
                                    </div>
                                    {note.author?.name || "Admin"}
                                </div>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                    {format(new Date(note.createdAt), "MMM d, h:mm a")}
                                </span>
                            </div>
                            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                                {note.content}
                            </p>
                        </div>
                    ))
                )}
            </div>

            <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                <form onSubmit={handleSubmit} className="relative">
                    <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Type an internal note..."
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg px-3 py-2.5 pr-10 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500/50 transition-shadow min-h-[80px]"
                        disabled={isSubmitting}
                    />
                    <button
                        type="submit"
                        disabled={!newNote.trim() || isSubmitting}
                        className="absolute bottom-2 right-2 p-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:dark:bg-gray-700 text-white rounded-md transition-colors"
                    >
                        <Send size={14} />
                    </button>
                </form>
            </div>
        </div>
    );
};
