import { getSupabaseClient } from './supabase.js';
import type {
  Workspace,
  WorkspaceWithCounts,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  ServiceResult,
} from '../types/index.js';

// Fetch all workspaces for the current user
export async function fetchWorkspaces(): Promise<ServiceResult<Workspace[]>> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .order('position', { ascending: true });
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data: data as Workspace[], error: null };
}

// Fetch a single workspace by ID
export async function fetchWorkspace(id: string): Promise<ServiceResult<Workspace>> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data: data as Workspace, error: null };
}

// Fetch workspaces with item counts (for dashboard display)
export async function fetchWorkspacesWithCounts(): Promise<ServiceResult<WorkspaceWithCounts[]>> {
  const supabase = getSupabaseClient();
  
  // Fetch workspaces
  const { data: workspaces, error: workspacesError } = await supabase
    .from('workspaces')
    .select('*')
    .order('position', { ascending: true });
  
  if (workspacesError) {
    return { data: null, error: workspacesError.message };
  }
  
  const workspacesWithCounts: WorkspaceWithCounts[] = [];
  
  for (const workspace of workspaces as Workspace[]) {
    // Count notes in this workspace
    const { count: notesCount, error: notesError } = await supabase
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id);
    
    if (notesError) {
      return { data: null, error: notesError.message };
    }
    
    // Count todos in this workspace
    const { count: todosCount, error: todosError } = await supabase
      .from('todos')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id);
    
    if (todosError) {
      return { data: null, error: todosError.message };
    }
    
    // Count boards in this workspace
    const { count: boardsCount, error: boardsError } = await supabase
      .from('boards')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id);
    
    if (boardsError) {
      return { data: null, error: boardsError.message };
    }
    
    workspacesWithCounts.push({
      ...workspace,
      notesCount: notesCount || 0,
      todosCount: todosCount || 0,
      boardsCount: boardsCount || 0,
    });
  }
  
  return { data: workspacesWithCounts, error: null };
}

// Create a new workspace
export async function createWorkspace(input: CreateWorkspaceInput): Promise<ServiceResult<Workspace>> {
  const supabase = getSupabaseClient();
  
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { data: null, error: 'Not authenticated' };
  }
  
  // Get the max position for ordering
  const { data: existingWorkspaces } = await supabase
    .from('workspaces')
    .select('position')
    .order('position', { ascending: false })
    .limit(1);
  
  const maxPosition = existingWorkspaces && existingWorkspaces.length > 0 
    ? (existingWorkspaces[0] as { position: number }).position 
    : -1;
  
  const insertData: Record<string, unknown> = {
    user_id: userData.user.id,
    name: input.name,
    description: input.description || '',
    icon: input.icon || '📁',
    color: input.color || 'blue',
    position: input.position ?? (maxPosition + 1),
  };
  
  const { data, error } = await supabase
    .from('workspaces')
    .insert(insertData)
    .select()
    .single();
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data: data as Workspace, error: null };
}

// Update a workspace
export async function updateWorkspace(
  id: string,
  input: UpdateWorkspaceInput
): Promise<ServiceResult<Workspace>> {
  const supabase = getSupabaseClient();
  
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  
  if (input.name !== undefined) {
    updateData.name = input.name;
  }
  if (input.description !== undefined) {
    updateData.description = input.description;
  }
  if (input.icon !== undefined) {
    updateData.icon = input.icon;
  }
  if (input.color !== undefined) {
    updateData.color = input.color;
  }
  if (input.position !== undefined) {
    updateData.position = input.position;
  }
  
  const { data, error } = await supabase
    .from('workspaces')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data: data as Workspace, error: null };
}

// Delete a workspace (items will have workspace_id set to NULL)
export async function deleteWorkspace(id: string): Promise<ServiceResult<void>> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase.from('workspaces').delete().eq('id', id);
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data: undefined, error: null };
}

// Reorder workspaces
export async function reorderWorkspaces(
  workspaceIds: string[]
): Promise<ServiceResult<void>> {
  const supabase = getSupabaseClient();
  
  // Update each workspace's position
  for (let i = 0; i < workspaceIds.length; i++) {
    const { error } = await supabase
      .from('workspaces')
      .update({ position: i })
      .eq('id', workspaceIds[i]);
    
    if (error) {
      return { data: null, error: error.message };
    }
  }
  
  return { data: undefined, error: null };
}

// Get global item counts (items without workspace)
export async function fetchGlobalCounts(): Promise<ServiceResult<{
  notesCount: number;
  todosCount: number;
  boardsCount: number;
}>> {
  const supabase = getSupabaseClient();
  
  // Count global notes (workspace_id is null)
  const { count: notesCount, error: notesError } = await supabase
    .from('notes')
    .select('*', { count: 'exact', head: true })
    .is('workspace_id', null);
  
  if (notesError) {
    return { data: null, error: notesError.message };
  }
  
  // Count global todos
  const { count: todosCount, error: todosError } = await supabase
    .from('todos')
    .select('*', { count: 'exact', head: true })
    .is('workspace_id', null);
  
  if (todosError) {
    return { data: null, error: todosError.message };
  }
  
  // Count global boards
  const { count: boardsCount, error: boardsError } = await supabase
    .from('boards')
    .select('*', { count: 'exact', head: true })
    .is('workspace_id', null);
  
  if (boardsError) {
    return { data: null, error: boardsError.message };
  }
  
  return {
    data: {
      notesCount: notesCount || 0,
      todosCount: todosCount || 0,
      boardsCount: boardsCount || 0,
    },
    error: null,
  };
}

// Get total counts across all workspaces (for global view)
export async function fetchTotalCounts(): Promise<ServiceResult<{
  notesCount: number;
  todosCount: number;
  boardsCount: number;
  workspacesCount: number;
}>> {
  const supabase = getSupabaseClient();
  
  // Count all notes
  const { count: notesCount, error: notesError } = await supabase
    .from('notes')
    .select('*', { count: 'exact', head: true });
  
  if (notesError) {
    return { data: null, error: notesError.message };
  }
  
  // Count all todos
  const { count: todosCount, error: todosError } = await supabase
    .from('todos')
    .select('*', { count: 'exact', head: true });
  
  if (todosError) {
    return { data: null, error: todosError.message };
  }
  
  // Count all boards
  const { count: boardsCount, error: boardsError } = await supabase
    .from('boards')
    .select('*', { count: 'exact', head: true });
  
  if (boardsError) {
    return { data: null, error: boardsError.message };
  }
  
  // Count all workspaces
  const { count: workspacesCount, error: workspacesError } = await supabase
    .from('workspaces')
    .select('*', { count: 'exact', head: true });
  
  if (workspacesError) {
    return { data: null, error: workspacesError.message };
  }
  
  return {
    data: {
      notesCount: notesCount || 0,
      todosCount: todosCount || 0,
      boardsCount: boardsCount || 0,
      workspacesCount: workspacesCount || 0,
    },
    error: null,
  };
}
