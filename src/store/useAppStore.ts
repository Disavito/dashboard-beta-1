// @ts-ignore
import { create } from 'zustand';

// Este store de Zustand es para manejar el estado Global de la Interfaz (UI)
// que no necesariamente viene de la base de datos (Supabase).
// Es mucho más rápido y ligero que usar React Context.

interface AppState {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  globalNotification: string | null;
  setGlobalNotification: (msg: string | null) => void;
}

export const useAppStore = create<AppState>((set: any) => ({
  isSidebarCollapsed: false,
  toggleSidebar: () => set((state: any) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  
  globalNotification: null,
  setGlobalNotification: (msg: string | null) => set({ globalNotification: msg }),
}));
