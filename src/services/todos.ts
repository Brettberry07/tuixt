import { getSupabaseClient } from './supabase.js';
import type {
  Todo,
  TodoWithNotes,
  TodoWithWorkspace,
  Note,
  Workspace,
  CreateTodoInput,
  UpdateTodoInput,
  ServiceResult,
} from '../types/index.js';

// Fetch todos, optionally filtered by workspace
// workspaceId: undefined = all todos, null = global todos only, string = specific workspace
export async function fetchTodos(workspaceId?: string | null): Promise<ServiceResult<Todo[]>> {
  const supabase = getSupabaseClient();
  
  let query = supabase
    .from('todos')
    .select('*')
    .order('updated_at', { ascending: false });
  
  if (workspaceId === null) {
    query = query.is('workspace_id', null);
  } else if (workspaceId !== undefined) {
    query = query.eq('workspace_id', workspaceId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data: data as Todo[], error: null };
}

// Fetch todos with workspace info (for global view)
export async function fetchTodosWithWorkspace(): Promise<ServiceResult<TodoWithWorkspace[]>> {
  const supabase = getSupabaseClient();
  
  const { data: todos, error: todosError } = await supabase
    .from('todos')
    .select('*')
    .order('updated_at', { ascending: false });
  
  if (todosError) {
    return { data: null, error: todosError.message };
  }
  
  const { data: workspaces, error: workspacesError } = await supabase
    .from('workspaces')
    .select('*');
  
  if (workspacesError) {
    return { data: null, error: workspacesError.message };
  }
  
  const workspaceMap = new Map((workspaces as Workspace[]).map(w => [w.id, w]));
  
  const todosWithWorkspace: TodoWithWorkspace[] = (todos as Todo[]).map(todo => ({
    ...todo,
    workspace: todo.workspace_id ? workspaceMap.get(todo.workspace_id) || null : null,
  }));
  
  return { data: todosWithWorkspace, error: null };
}

export async function fetchTodo(id: string): Promise<ServiceResult<TodoWithNotes>> {
  const supabase = getSupabaseClient();
  
  // Fetch the todo
  const { data: todoData, error: todoError } = await supabase
    .from('todos')
    .select('*')
    .eq('id', id)
    .single();
  
  if (todoError) {
    return { data: null, error: todoError.message };
  }
  
  // Fetch linked notes
  const { data: noteTodoData, error: noteTodoError } = await supabase
    .from('note_todos')
    .select('note_id')
    .eq('todo_id', id);
  
  if (noteTodoError) {
    return { data: null, error: noteTodoError.message };
  }
  
  const noteIds = noteTodoData.map((nt: { note_id: string }) => nt.note_id);
  
  let notes: Note[] = [];
  if (noteIds.length > 0) {
    const { data: notesData, error: notesError } = await supabase
      .from('notes')
      .select('*')
      .in('id', noteIds);
    
    if (notesError) {
      return { data: null, error: notesError.message };
    }
    
    notes = notesData as Note[];
  }
  
  const todoWithNotes: TodoWithNotes = {
    ...(todoData as Todo),
    notes,
  };
  
  return { data: todoWithNotes, error: null };
}

export async function createTodo(input: CreateTodoInput): Promise<ServiceResult<Todo>> {
  const supabase = getSupabaseClient();
  
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { data: null, error: 'Not authenticated' };
  }
  
  const insertData: Record<string, unknown> = {
    user_id: userData.user.id,
    title: input.title,
    description: input.description || '',
    status: input.status || 'todo',
  };
  
  if (input.due_date !== undefined) {
    insertData.due_date = input.due_date;
  }
  
  if (input.workspace_id !== undefined) {
    insertData.workspace_id = input.workspace_id;
  }
  
  const { data, error } = await supabase
    .from('todos')
    .insert(insertData)
    .select()
    .single();
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data: data as Todo, error: null };
}

export async function updateTodo(
  id: string,
  input: UpdateTodoInput
): Promise<ServiceResult<Todo>> {
  const supabase = getSupabaseClient();
  
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  
  if (input.title !== undefined) {
    updateData.title = input.title;
  }
  if (input.description !== undefined) {
    updateData.description = input.description;
  }
  if (input.status !== undefined) {
    updateData.status = input.status;
    // If marking as done, set completed_at timestamp
    if (input.status === 'done') {
      updateData.completed_at = new Date().toISOString();
    } else if (input.status !== 'done') {
      // If changing from done to another status, clear completed_at
      updateData.completed_at = null;
    }
  }
  if (input.due_date !== undefined) {
    updateData.due_date = input.due_date;
  }
  
  if (input.workspace_id !== undefined) {
    updateData.workspace_id = input.workspace_id;
  }
  
  const { data, error } = await supabase
    .from('todos')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data: data as Todo, error: null };
}

export async function deleteTodo(id: string): Promise<ServiceResult<void>> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id);
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data: null, error: null };
}

// Link a note to a todo
export async function linkNoteToTodo(
  noteId: string,
  todoId: string
): Promise<ServiceResult<void>> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('note_todos')
    .insert({ note_id: noteId, todo_id: todoId });
  
  if (error) {
    // Check if it's a unique constraint violation (already linked)
    if (error.code === '23505') {
      return { data: null, error: 'Note is already linked to this todo' };
    }
    return { data: null, error: error.message };
  }
  
  return { data: null, error: null };
}

// Unlink a note from a todo
export async function unlinkNoteFromTodo(
  noteId: string,
  todoId: string
): Promise<ServiceResult<void>> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('note_todos')
    .delete()
    .eq('note_id', noteId)
    .eq('todo_id', todoId);
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data: null, error: null };
}

// Fetch all todos linked to a specific note
export async function fetchTodosForNote(noteId: string): Promise<ServiceResult<Todo[]>> {
  const supabase = getSupabaseClient();
  
  // Fetch todo IDs linked to this note
  const { data: noteTodoData, error: noteTodoError } = await supabase
    .from('note_todos')
    .select('todo_id')
    .eq('note_id', noteId);
  
  if (noteTodoError) {
    return { data: null, error: noteTodoError.message };
  }
  
  const todoIds = noteTodoData.map((nt: { todo_id: string }) => nt.todo_id);
  
  if (todoIds.length === 0) {
    return { data: [], error: null };
  }
  
  const { data: todosData, error: todosError } = await supabase
    .from('todos')
    .select('*')
    .in('id', todoIds)
    .order('updated_at', { ascending: false });
  
  if (todosError) {
    return { data: null, error: todosError.message };
  }
  
  return { data: todosData as Todo[], error: null };
}

// Fetch all notes linked to a specific todo (helper function)
export async function fetchNotesForTodo(todoId: string): Promise<ServiceResult<Note[]>> {
  const supabase = getSupabaseClient();
  
  // Fetch note IDs linked to this todo
  const { data: noteTodoData, error: noteTodoError } = await supabase
    .from('note_todos')
    .select('note_id')
    .eq('todo_id', todoId);
  
  if (noteTodoError) {
    return { data: null, error: noteTodoError.message };
  }
  
  const noteIds = noteTodoData.map((nt: { note_id: string }) => nt.note_id);
  
  if (noteIds.length === 0) {
    return { data: [], error: null };
  }
  
  const { data: notesData, error: notesError } = await supabase
    .from('notes')
    .select('*')
    .in('id', noteIds)
    .order('updated_at', { ascending: false });
  
  if (notesError) {
    return { data: null, error: notesError.message };
  }
  
  return { data: notesData as Note[], error: null };
}
