import React, { createContext, useContext, useState, useCallback } from 'react';
import type { AuthSession, User } from '../types';
import { authenticateUser, MOCK_USERS } from '../data/mockData';

interface AuthContextValue {
  session: AuthSession | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// In-memory user store (mock — not persisted)
const runtimeUsers: User[] = [...MOCK_USERS];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    // Simulate network latency
    await new Promise(r => setTimeout(r, 600));
    const user = runtimeUsers.find(u => u.email === email && u.passwordHash === password);
    if (!user) {
      return { success: false, error: 'Invalid email or password.' };
    }
    const { passwordHash: _p, ...safeUser } = user;
    setSession({ user: safeUser, loggedInAt: Date.now() });
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setSession(null);
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    await new Promise(r => setTimeout(r, 600));
    if (runtimeUsers.find(u => u.email === email)) {
      return { success: false, error: 'An account with this email already exists.' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }
    const newUser: User = {
      id: `u${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: password,
      role: 'viewer',
      avatarInitials: name.trim().split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase(),
      avatarColor: '#10b981',
    };
    runtimeUsers.push(newUser);
    const { passwordHash: _p, ...safeUser } = newUser;
    setSession({ user: safeUser, loggedInAt: Date.now() });
    return { success: true };
  }, []);

  const isAdmin = session?.user.role === 'admin';

  return (
    <AuthContext.Provider value={{ session, login, logout, signup, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
