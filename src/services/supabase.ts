import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Session storage path
const SESSION_DIR = path.join(os.homedir(), '.terminal-notes');
const SESSION_FILE = path.join(SESSION_DIR, 'session.json');

// Environment variables for Supabase - these should be set by the user
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error(
        'Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.'
      );
    }
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseClient;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

// Session file management
export function ensureSessionDir(): void {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }
}

export function saveSession(session: Session): void {
  ensureSessionDir();
  const sessionData = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
  };
  fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));
}

export function loadSession(): Session | null {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const data = fs.readFileSync(SESSION_FILE, 'utf-8');
      const sessionData = JSON.parse(data);
      
      // Check if session has expired
      if (sessionData.expires_at && Date.now() / 1000 > sessionData.expires_at) {
        clearSession();
        return null;
      }
      
      return sessionData as Session;
    }
  } catch {
    // Session file corrupted or unreadable
    clearSession();
  }
  return null;
}

export function clearSession(): void {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      fs.unlinkSync(SESSION_FILE);
    }
  } catch {
    // Ignore errors when clearing session
  }
}

// Auth functions
export async function signIn(
  email: string,
  password: string
): Promise<{ session: Session | null; error: string | null }> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    return { session: null, error: error.message };
  }
  
  if (data.session) {
    saveSession(data.session);
    // Set the session in the client so subsequent requests are authenticated
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    return { session: data.session, error: null };
  }
  
  return { session: null, error: 'No session returned' };
}

export async function signUp(
  email: string,
  password: string
): Promise<{ session: Session | null; error: string | null }> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) {
    return { session: null, error: error.message };
  }
  
  if (data.session) {
    saveSession(data.session);
    // Set the session in the client so subsequent requests are authenticated
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    return { session: data.session, error: null };
  }
  
  // Email confirmation might be required
  return { session: null, error: null };
}

export async function restoreSession(): Promise<{
  session: Session | null;
  error: string | null;
}> {
  const savedSession = loadSession();
  
  if (!savedSession) {
    return { session: null, error: null };
  }
  
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase.auth.setSession({
    access_token: savedSession.access_token,
    refresh_token: savedSession.refresh_token,
  });
  
  if (error) {
    clearSession();
    return { session: null, error: error.message };
  }
  
  if (data.session) {
    saveSession(data.session);
    return { session: data.session, error: null };
  }
  
  return { session: null, error: 'Failed to restore session' };
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.auth.signOut();
  clearSession();
}

export async function getCurrentUser(): Promise<{
  id: string;
  email: string;
} | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getUser();
  
  if (data.user) {
    return {
      id: data.user.id,
      email: data.user.email || '',
    };
  }
  
  return null;
}
