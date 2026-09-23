import { create } from 'zustand';

interface UIStore {
  modals: { [key: string]: boolean };
  loading: { [key: string]: boolean };
  notifications: any[];
  setModal: (key: string, isOpen: boolean) => void;
  setLoading: (key: string, isLoading: boolean) => void;
  addNotification: (notification: any) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  modals: {},
  loading: {},
  notifications: [],
  setModal: (key, isOpen) => set((state) => ({ 
    modals: { ...state.modals, [key]: isOpen } 
  })),
  setLoading: (key, isLoading) => set((state) => ({ 
    loading: { ...state.loading, [key]: isLoading } 
  })),
  addNotification: (notification) => set((state) => ({ 
    notifications: [...state.notifications, notification] 
  })),
}));
