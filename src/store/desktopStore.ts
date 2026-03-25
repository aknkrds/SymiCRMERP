import { create } from 'zustand';

export interface DesktopItem {
    id: string;
    type: 'folder' | 'file';
    name: string;
    x: number;
    y: number;
    content?: string; // base64 for files (legacy), or url (new)
    mimeType?: string;
    extension?: string;
    url?: string;
}

interface DesktopStore {
    items: DesktopItem[];
    activeFileId: string | null;
    username: string | null;
    setUsername: (username: string | null) => void;
    fetchDesktopData: (username: string) => Promise<void>;
    setActiveFileId: (id: string | null) => void;
    addItem: (item: Omit<DesktopItem, 'id'>) => void;
    updateItemPosition: (id: string, x: number, y: number) => void;
    deleteItem: (id: string) => void;
    renameItem: (id: string, newName: string) => void;
}

const syncToServer = async (username: string | null, items: DesktopItem[]) => {
    if (!username) return;
    try {
        await fetch(`/api/users/${username}/desktop-data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ desktopItems: items })
        });
    } catch (e) {
        console.error('Failed to sync desktop items', e);
    }
};

export const useDesktopStore = create<DesktopStore>()((set) => ({
    items: [],
    activeFileId: null,
    username: null,
    setUsername: (username) => set({ username }),
    fetchDesktopData: async (username: string) => {
        set({ username });
        try {
            const res = await fetch(`/api/users/${username}/desktop-data`);
            const data = await res.json();
            if (data && data.desktopItems) {
                set({ items: data.desktopItems });
            }
        } catch (e) {
            console.error('Failed to fetch desktop data', e);
        }
    },
    setActiveFileId: (id) => set({ activeFileId: id }),
    addItem: (item) => set((state) => {
        const newItems = [...state.items, { ...item, id: Date.now().toString() }];
        syncToServer(state.username, newItems);
        return { items: newItems };
    }),
    updateItemPosition: (id, x, y) => set((state) => {
        const newItems = state.items.map(i => i.id === id ? { ...i, x, y } : i);
        syncToServer(state.username, newItems);
        return { items: newItems };
    }),
    deleteItem: (id) => set((state) => {
        const newItems = state.items.filter(i => i.id !== id);
        syncToServer(state.username, newItems);
        return { items: newItems };
    }),
    renameItem: (id, name) => set((state) => {
        const newItems = state.items.map(i => i.id === id ? { ...i, name } : i);
        syncToServer(state.username, newItems);
        return { items: newItems };
    })
}));
