import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthState, Tenant } from '../types';

interface AuthStore extends AuthState {
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setTenant: (tenant: Tenant) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      tenantId: null,
      setAuth: (user, accessToken, refreshToken) => set({ 
        user, 
        accessToken, 
        refreshToken,
        isAuthenticated: true, 
        tenantId: user.tenantId 
      }),
      setTenant: (tenant) => set({ tenant }),
      setTokens: (accessToken, refreshToken) => set({ 
        accessToken, 
        refreshToken 
      }),
      logout: () => set({ 
        user: null, 
        tenant: null,
        accessToken: null, 
        refreshToken: null,
        isAuthenticated: false, 
        tenantId: null 
      }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
