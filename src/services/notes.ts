import { getSupabaseClient } from './supabase.js';
import type { Note, CreateNoteInput, UpdateNoteInput, ServiceResult } from '../types/index.js';

export async function fetchNotes(): Promise<ServiceResult<Note[]>> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('updated_at', { ascending: false });
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data: data as Note[], error: null };
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
  
  const { data, error } = await supabase
    .from('notes')
    .insert({
      user_id: userData.user.id,
      title: input.title,
      content: input.content,
    })
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

export async function searchNotes(query: string): Promise<ServiceResult<Note[]>> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .order('updated_at', { ascending: false });
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data: data as Note[], error: null };
}
