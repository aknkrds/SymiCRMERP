import React, { useState, useEffect } from 'react';
import { Plus, Trash2, StickyNote } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Note {
    id: string;
    title: string;
    content: string;
    date: string;
}

export default function NotesApp() {
    const { user } = useAuth();
    const [notes, setNotes] = useState<Note[]>([]);
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

    // Initial load from server
    useEffect(() => {
        if (!user?.username) return;
        fetch(`/api/users/${user.username}/desktop-data`)
            .then(res => res.json())
            .then(data => {
                if (data && data.notes) {
                    setNotes(data.notes);
                    if (data.notes.length > 0) setActiveNoteId(data.notes[0].id);
                }
            })
            .catch(e => console.error('Failed to load notes', e));
    }, [user]);

    const saveNotes = (newNotes: Note[]) => {
        setNotes(newNotes);
        if (!user?.username) return;
        fetch(`/api/users/${user.username}/desktop-data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes: newNotes })
        }).catch(e => console.error('Failed to save notes', e));
    };

    const activeNote = notes.find(n => n.id === activeNoteId);

    const createNote = () => {
        const newNote: Note = {
            id: Date.now().toString(),
            title: 'Yeni Not',
            content: '',
            date: new Date().toLocaleDateString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        };
        saveNotes([newNote, ...notes]);
        setActiveNoteId(newNote.id);
    };

    const updateNote = (content: string) => {
        if (!activeNoteId) return;
        const lines = content.split('\n');
        const title = lines[0] ? lines[0].substring(0, 30) : 'Yeni Not';

        saveNotes(notes.map(n =>
            n.id === activeNoteId ? { ...n, title, content } : n
        ));
    };

    const deleteNote = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newNotes = notes.filter(n => n.id !== id);
        saveNotes(newNotes);
        if (activeNoteId === id) {
            setActiveNoteId(newNotes.length > 0 ? newNotes[0].id : null);
        }
    };

    return (
        <div className="flex h-full w-full bg-[#f6f6f6] rounded-b-xl overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 border-r border-[#d9d9d9] bg-[#f0f0f0] flex flex-col shrink-0">
                <div className="h-12 flex items-center justify-between px-3 shrink-0 border-b border-[#e0e0e0]">
                    <div className="flex items-center gap-2 text-slate-700">
                        <StickyNote size={16} className="text-amber-500" />
                        <span className="font-semibold text-sm">Notlar</span>
                    </div>
                    <button onClick={createNote} className="p-1 hover:bg-[#e0e0e0] rounded transition-colors" title="Yeni Not">
                        <Plus size={16} className="text-slate-600" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
                    {notes.length === 0 && (
                        <div className="text-center text-xs text-slate-500 mt-4">Not bulunamadı.</div>
                    )}
                    {notes.map(note => (
                        <div
                            key={note.id}
                            onClick={() => setActiveNoteId(note.id)}
                            className={`p-3 rounded-lg cursor-pointer flex flex-col group ${activeNoteId === note.id ? 'bg-[#ffca28] text-amber-900 shadow-sm' : 'hover:bg-[#e0e0e0] text-slate-700'
                                }`}
                        >
                            <div className="flex justify-between items-start">
                                <span className="font-bold text-sm truncate pr-2 leading-tight">{note.title}</span>
                                <button onClick={(e) => deleteNote(note.id, e)} className="opacity-0 group-hover:opacity-100 text-amber-900/60 hover:bg-amber-400/50 rounded p-0.5 transition-all">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                            <span className="text-[11px] opacity-70 mt-1">{note.date}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 bg-white relative">
                {activeNote ? (
                    <textarea
                        value={activeNote.content}
                        onChange={(e) => updateNote(e.target.value)}
                        className="w-full h-full p-8 resize-none focus:outline-none text-slate-800 text-sm leading-relaxed font-medium bg-transparent"
                        placeholder="Notunuzu yazmaya başlayın..."
                        autoFocus
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-slate-400 text-sm">
                        Görüntülemek için bir not seçin veya yeni not oluşturun.
                    </div>
                )}
            </div>
        </div>
    );
}
