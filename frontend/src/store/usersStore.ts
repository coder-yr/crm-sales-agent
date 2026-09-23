import { create } from 'zustand';
import type { User } from '../types';

interface UsersStore {
  users: User[];
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
}

export const useUsersStore = create<UsersStore>((set) => ({
  users: [],
  setUsers: (users) => set({ users }),
  addUser: (user) => set((state) => ({ users: [...state.users, user] })),
}));
