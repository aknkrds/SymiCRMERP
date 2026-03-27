import { create } from 'zustand';
import type { WindowState } from '../types';

interface WindowManagerStore {
  windows: WindowState[];
  activeWindowId: string | null;
  username: string | null;
  setUsername: (username: string | null) => void;
  setWindows: (windows: WindowState[]) => void;
  openWindow: (id: string, title: string) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  updateWindowBounds: (id: string, position: { x: number; y: number }, size: { width: string | number; height: string | number }) => void;
  closeAllWindows: () => void;
}

const DEFAULT_WIDTH = 1000;
const DEFAULT_HEIGHT = 650;

const syncToServer = async (username: string | null, windows: WindowState[]) => {
    if (!username) return;
    try {
        await fetch(`/api/users/${username}/desktop-data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ windows })
        });
    } catch (e) {
        console.error('Failed to sync window state', e);
    }
};

export const useWindowStore = create<WindowManagerStore>()((set, get) => ({
  windows: [],
  activeWindowId: null,
  username: null,
  
  setUsername: (username) => set({ username }),
  setWindows: (windows) => set({ windows }),

  openWindow: (id, title) => {
    const { windows, username } = get();
    const existingWindow = windows.find((w) => w.id === id);
    const maxZIndex = windows.length > 0 ? Math.max(...windows.map((w) => w.zIndex)) : 0;

    if (existingWindow) {
      if (existingWindow.isMinimized) {
        const newWindows = windows.map((w) =>
            w.id === id ? { ...w, isMinimized: false, zIndex: maxZIndex + 1 } : w
        );
        set({ windows: newWindows, activeWindowId: id });
        syncToServer(username, newWindows);
      } else {
        get().focusWindow(id);
      }
      return;
    }

    const offset = (windows.length % 5) * 30;
    const newWindow: WindowState = {
      id,
      title,
      isOpen: true,
      isMinimized: false,
      isMaximized: false,
      zIndex: maxZIndex + 1,
      position: {
        x: Math.max(50, (window.innerWidth - DEFAULT_WIDTH) / 2 + offset),
        y: Math.max(50, (window.innerHeight - DEFAULT_HEIGHT) / 2 + offset)
      },
      size: { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT },
    };

    const updatedWindows = [...windows, newWindow];
    set({ windows: updatedWindows, activeWindowId: id });
    syncToServer(username, updatedWindows);
  },

  closeWindow: (id) => set((state) => {
    const updated = state.windows.filter((w) => w.id !== id);
    syncToServer(state.username, updated);
    return {
      windows: updated,
      activeWindowId: state.activeWindowId === id ? null : state.activeWindowId,
    };
  }),

  minimizeWindow: (id) => set((state) => {
    const updated = state.windows.map((w) => w.id === id ? { ...w, isMinimized: true } : w);
    syncToServer(state.username, updated);
    return {
      windows: updated,
      activeWindowId: state.activeWindowId === id ? null : state.activeWindowId,
    };
  }),

  maximizeWindow: (id) => {
    const { username } = get();
    set((state) => {
        const updated = state.windows.map((w) => w.id === id ? { ...w, isMaximized: !w.isMaximized } : w);
        syncToServer(username, updated);
        return { windows: updated };
    });
    get().focusWindow(id);
  },

  focusWindow: (id) => {
    const { windows, activeWindowId, username } = get();
    if (activeWindowId === id) return;

    const maxZIndex = Math.max(...windows.map((w) => w.zIndex), 0);
    const updated = windows.map((w) => w.id === id ? { ...w, zIndex: maxZIndex + 1 } : w);
    set({ windows: updated, activeWindowId: id });
    syncToServer(username, updated);
  },

  updateWindowBounds: (id, position, size) => set((state) => {
    const updated = state.windows.map((w) => w.id === id ? { ...w, position, size } : w);
    syncToServer(state.username, updated);
    return { windows: updated };
  }),

  closeAllWindows: () => {
    const { username } = get();
    set({ windows: [], activeWindowId: null });
    syncToServer(username, []);
  },
}));
