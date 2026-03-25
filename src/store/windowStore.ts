import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface WindowState {
  id: string;
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  position: { x: number; y: number } | null;
  size: { width: string | number; height: string | number } | null;
}

interface WindowManagerStore {
  windows: WindowState[];
  activeWindowId: string | null;
  openWindow: (id: string, title: string) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  updateWindowBounds: (id: string, position: { x: number; y: number }, size: { width: string | number; height: string | number }) => void;
  closeAllWindows: () => void;
}

// macOS style default window size
const DEFAULT_WIDTH = 1000;
const DEFAULT_HEIGHT = 650;

export const useWindowStore = create<WindowManagerStore>()(
  persist(
    (set, get) => ({
      windows: [],
      activeWindowId: null,

      openWindow: (id, title) => {
        const { windows } = get();
        const existingWindow = windows.find((w) => w.id === id);
        const maxZIndex = windows.length > 0 ? Math.max(...windows.map((w) => w.zIndex)) : 0;

        if (existingWindow) {
          if (existingWindow.isMinimized) {
            set((state) => ({
              windows: state.windows.map((w) =>
                w.id === id ? { ...w, isMinimized: false, zIndex: maxZIndex + 1 } : w
              ),
              activeWindowId: id,
            }));
          } else {
            get().focusWindow(id);
          }
          return;
        }

        // Offset new windows slightly if others are open
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

        set((state) => ({
          windows: [...state.windows, newWindow],
          activeWindowId: id,
        }));
      },

      closeWindow: (id) =>
        set((state) => ({
          windows: state.windows.filter((w) => w.id !== id),
          activeWindowId: state.activeWindowId === id ? null : state.activeWindowId,
        })),

      minimizeWindow: (id) =>
        set((state) => ({
          windows: state.windows.map((w) =>
            w.id === id ? { ...w, isMinimized: true } : w
          ),
          activeWindowId: state.activeWindowId === id ? null : state.activeWindowId,
        })),

      maximizeWindow: (id) => {
        get().focusWindow(id);
        set((state) => ({
          windows: state.windows.map((w) =>
            w.id === id ? { ...w, isMaximized: !w.isMaximized } : w
          ),
        }));
      },

      focusWindow: (id) => {
        const { windows, activeWindowId } = get();
        if (activeWindowId === id) return; // Already focused

        const maxZIndex = Math.max(...windows.map((w) => w.zIndex), 0);
        set((state) => ({
          windows: state.windows.map((w) =>
            w.id === id ? { ...w, zIndex: maxZIndex + 1 } : w
          ),
          activeWindowId: id,
        }));
      },

      updateWindowBounds: (id, position, size) =>
        set((state) => ({
          windows: state.windows.map((w) =>
            w.id === id ? { ...w, position, size } : w
          ),
        })),

      closeAllWindows: () => set({ windows: [], activeWindowId: null }),
    }),
    {
      name: 'symios-window-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
