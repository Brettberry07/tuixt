import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  restoreSession,
  signIn as authSignIn,
  signOut as authSignOut,
  signUp as authSignUp,
  getCurrentUser,
  isSupabaseConfigured,
} from '../services/supabase.js';
import type { Profile, AuthState } from '../types/index.js';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  checkConfiguration: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<Profile | null>(null);

  const checkConfiguration = useCallback(() => {
    return isSupabaseConfigured();
  }, []);

  const loadUser = useCallback(async () => {
    const currentUser = await getCurrentUser();
    if (currentUser) {
      setUser({
        id: currentUser.id,
        email: currentUser.email,
        created_at: new Date().toISOString(),
      });
      setIsAuthenticated(true);
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  // Try to restore session on mount
  useEffect(() => {
    async function init() {
      if (!isSupabaseConfigured()) {
        setIsLoading(false);
        return;
      }

      const { session, error } = await restoreSession();
      
      if (session && !error) {
        await loadUser();
      }
      
      setIsLoading(false);
    }
    
    init();
  }, [loadUser]);

  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    setIsLoading(true);
    
    const { session, error } = await authSignIn(email, password);
    
    if (error) {
      setIsLoading(false);
      return error;
    }
    
    if (session) {
      await loadUser();
    }
    
    setIsLoading(false);
    return null;
  }, [loadUser]);

  const signUp = useCallback(async (email: string, password: string): Promise<string | null> => {
    setIsLoading(true);
    
    const { error } = await authSignUp(email, password);
    
    if (error) {
      setIsLoading(false);
      return error;
    }
    
    // After signup, the user might need to confirm email
    // Try to load user in case auto-confirm is enabled
    await loadUser();
    
    setIsLoading(false);
    return null;
  }, [loadUser]);

  const signOut = useCallback(async () => {
    await authSignOut();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    signIn,
    signUp,
    signOut,
    checkConfiguration,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
