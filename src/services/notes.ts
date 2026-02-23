import { getSupabaseClient } from './supabase.js';
import type { Note, NoteWithWorkspace, Workspace, CreateNoteInput, UpdateNoteInput, ServiceResult } from '../types/index.js';

// Fetch notes, optionally filtered by workspace
// workspaceId: undefined = all notes, null = global notes only, string = specific workspace
export async function fetchNotes(workspaceId?: string | null): Promise<ServiceResult<Note[]>> {
  const supabase = getSupabaseClient();
  
  let query = supabase
    .from('notes')
    .select('*')
    .order('updated_at', { ascending: false });
  
  if (workspaceId === null) {
    // Fetch only global notes (no workspace)
    query = query.is('workspace_id', null);
  } else if (workspaceId !== undefined) {
    // Fetch notes for specific workspace
    query = query.eq('workspace_id', workspaceId);
  }
  // If workspaceId is undefined, fetch all notes
  
  const { data, error } = await query;
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data: data as Note[], error: null };
}

// Fetch notes with workspace info (for global view)
export async function fetchNotesWithWorkspace(): Promise<ServiceResult<NoteWithWorkspace[]>> {
  const supabase = getSupabaseClient();
  
  // Fetch all notes
  const { data: notes, error: notesError } = await supabase
    .from('notes')
    .select('*')
    .order('updated_at', { ascending: false });
  
  if (notesError) {
    return { data: null, error: notesError.message };
  }
  
  // Fetch all workspaces
  const { data: workspaces, error: workspacesError } = await supabase
    .from('workspaces')
    .select('*');
  
  if (workspacesError) {
    return { data: null, error: workspacesError.message };
  }
  
  const workspaceMap = new Map((workspaces as Workspace[]).map(w => [w.id, w]));
  
  const notesWithWorkspace: NoteWithWorkspace[] = (notes as Note[]).map(note => ({
    ...note,
    workspace: note.workspace_id ? workspaceMap.get(note.workspace_id) || null : null,
  }));
  
  return { data: notesWithWorkspace, error: null };
}

export async function fetchNote(id: string): Promise<ServiceResult<Note>> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data: data as Note, error: null };
}

export async function createNote(input: CreateNoteInput): Promise<ServiceResult<Note>> {
  const supabase = getSupabaseClient();
  
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { data: null, error: 'Not authenticated' };
  }
  
  const insertData: Record<string, unknown> = {
    user_id: userData.user.id,
    title: input.title,
    content: input.content,
  };
  
  if (input.date !== undefined) {
    insertData.date = input.date;
  }
  
  if (input.workspace_id !== undefined) {
    insertData.workspace_id = input.workspace_id;
  }
  
  const { data, error } = await supabase
    .from('notes')
    .insert(insertData)
    .select()
    .single();
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data: data as Note, error: null };
}

export async function updateNote(
  id: string,
  input: UpdateNoteInput
): Promise<ServiceResult<Note>> {
  const supabase = getSupabaseClient();
  
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  
  if (input.title !== undefined) {
    updateData.title = input.title;
  }
  if (input.content !== undefined) {
    updateData.content = input.content;
  }
  if (input.date !== undefined) {
    updateData.date = input.date;
  }
  
  if (input.workspace_id !== undefined) {
    updateData.workspace_id = input.workspace_id;
  }
  
  const { data, error } = await supabase
    .from('notes')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data: data as Note, error: null };
}

export async function deleteNote(id: string): Promise<ServiceResult<void>> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase.from('notes').delete().eq('id', id);
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data: undefined, error: null };
}

export async function searchNotes(query: string, workspaceId?: string | null): Promise<ServiceResult<Note[]>> {
  const supabase = getSupabaseClient();
  
  let dbQuery = supabase
    .from('notes')
    .select('*')
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .order('updated_at', { ascending: false });
  
  if (workspaceId === null) {
    dbQuery = dbQuery.is('workspace_id', null);
  } else if (workspaceId !== undefined) {
    dbQuery = dbQuery.eq('workspace_id', workspaceId);
  }
  
  const { data, error } = await dbQuery;
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data: data as Note[], error: null };
}

export async function fetchNotesByDate(date: string, workspaceId?: string | null): Promise<ServiceResult<Note[]>> {
  const supabase = getSupabaseClient();
  
  let query = supabase
    .from('notes')
    .select('*')
    .eq('date', date)
    .order('created_at', { ascending: false });
  
  if (workspaceId === null) {
    query = query.is('workspace_id', null);
  } else if (workspaceId !== undefined) {
    query = query.eq('workspace_id', workspaceId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data: data as Note[], error: null };
}

export async function fetchNotesByDateRange(
  startDate: string,
  endDate: string,
  workspaceId?: string | null
): Promise<ServiceResult<Note[]>> {
  const supabase = getSupabaseClient();
  
  let query = supabase
    .from('notes')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });
  
  if (workspaceId === null) {
    query = query.is('workspace_id', null);
  } else if (workspaceId !== undefined) {
    query = query.eq('workspace_id', workspaceId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data: data as Note[], error: null };
}
