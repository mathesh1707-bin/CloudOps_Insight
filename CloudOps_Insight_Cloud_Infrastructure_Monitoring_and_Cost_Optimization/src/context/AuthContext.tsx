import React, { createContext, useContext, useState, useCallback } from 'react';
import type { AuthSession } from '../types';
import { apiLogin, apiSignup, setToken } from '../lib/api';
import { MOCK_USERS } from '../data/mockData';

interface AuthContextValue {
  session: AuthSession | null;
  login:   (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout:  () => void;
  signup:  (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// In-memory runtime user store (for mock-only mode)
type RuntimeUser = typeof MOCK_USERS[number];
const runtimeUsers: RuntimeUser[] = [...MOCK_USERS];

// Use backend when VITE_API_URL is set to a full URL OR when it's empty
// (empty = proxy mode, still hits real backend via Vite proxy)
// Only fall back to mock when explicitly set to "mock" or in unit test context
const USE_BACKEND = import.meta.env.VITE_API_URL !== 'mock';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    try {
      if (USE_BACKEND) {
        // Real backend auth
        const data = await apiLogin(email, password);
        setSession({ user: data.user, loggedInAt: Date.now() });
        return { success: true };
      } else {
        // Pure mock fallback
        await new Promise(r => setTimeout(r, 600));
        const user = runtimeUsers.find(u => u.email === email && u.passwordHash === password);
        if (!user) return { success: false, error: 'Invalid email or password.' };
        const { passwordHash: _p, ...safeUser } = user;
        setSession({ user: safeUser, loggedInAt: Date.now() });
        return { success: true };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Login failed.' };
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setSession(null);
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    try {
      if (USE_BACKEND) {
        const data = await apiSignup(name, email, password);
        setSession({ user: data.user, loggedInAt: Date.now() });
        return { success: true };
      } else {
        await new Promise(r => setTimeout(r, 600));
        if (runtimeUsers.find(u => u.email === email)) {
          return { success: false, error: 'An account with this email already exists.' };
        }
        if (password.length < 6) return { success: false, error: 'Password must be at least 6 characters.' };
        const newUser: RuntimeUser = {
          id:              `u${Date.now()}`,
          name:            name.trim(),
          email:           email.trim().toLowerCase(),
          passwordHash:    password,
          role:            'viewer',
          avatarInitials:  name.trim().split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase(),
          avatarColor:     '#10b981',
        };
        runtimeUsers.push(newUser);
        const { passwordHash: _p, ...safeUser } = newUser;
        setSession({ user: safeUser, loggedInAt: Date.now() });
        return { success: true };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Signup failed.' };
    }
  }, []);

  return (
    <AuthContext.Provider value={{ session, login, logout, signup, isAdmin: session?.user.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
