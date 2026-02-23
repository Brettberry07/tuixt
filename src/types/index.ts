// Type definitions for the application

export interface Profile {
  id: string;
  email: string;
  created_at: string;
}

// Workspace represents a context (like "Work", "School") for organizing items
export interface Workspace {
  id: string;
  user_id: string;
  name: string;
  description: string;
  icon: string;  // Emoji icon
  color: string; // Color theme
  position: number;
  created_at: string;
  updated_at: string;
}

// Workspace with counts for dashboard display
export interface WorkspaceWithCounts extends Workspace {
  notesCount: number;
  todosCount: number;
  boardsCount: number;
}

export interface Note {
  id: string;
  user_id: string;
  workspace_id?: string | null;  // null = global/unassigned
  title: string;
  content: string;
  date?: string | null;  // ISO date string (YYYY-MM-DD) for calendar association
  created_at: string;
  updated_at: string;
}

// Note with workspace info for global view
export interface NoteWithWorkspace extends Note {
  workspace?: Workspace | null;
}

export interface Board {
  id: string;
  user_id: string;
  workspace_id?: string | null;  // null = global/unassigned
  title: string;
  created_at: string;
}

// Board with workspace info for global view
export interface BoardWithWorkspace extends Board {
  workspace?: Workspace | null;
}

export interface Column {
  id: string;
  board_id: string;
  title: string;
  position: number;
  created_at: string;
}

export interface Card {
  id: string;
  column_id: string;
  title: string;
  description: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export type TodoStatus = 'todo' | 'in-progress' | 'done' | 'cancelled';

export interface Todo {
  id: string;
  user_id: string;
  workspace_id?: string | null;  // null = global/unassigned
  title: string;
  description: string;
  status: TodoStatus;
  due_date?: string | null;  // ISO date string (YYYY-MM-DD)
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

// Todo with workspace info for global view
export interface TodoWithWorkspace extends Todo {
  workspace?: Workspace | null;
}

export interface NoteTodo {
  id: string;
  note_id: string;
  todo_id: string;
  created_at: string;
}

export interface TodoWithNotes extends Todo {
  notes: Note[];
}

// Workspace input types
export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  position?: number;
}

export interface UpdateWorkspaceInput {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  position?: number;
}

// Input types for creating/updating entities
export interface CreateNoteInput {
  title: string;
  content: string;
  date?: string | null;  // ISO date string (YYYY-MM-DD)
  workspace_id?: string | null;
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  date?: string | null;  // ISO date string (YYYY-MM-DD)
  workspace_id?: string | null;
}

export interface CreateBoardInput {
  title: string;
  workspace_id?: string | null;
}

export interface CreateColumnInput {
  board_id: string;
  title: string;
  position: number;
}

export interface UpdateColumnInput {
  title?: string;
  position?: number;
}

export interface CreateCardInput {
  column_id: string;
  title: string;
  description?: string;
  position: number;
}

export interface UpdateCardInput {
  title?: string;
  description?: string;
  position?: number;
  column_id?: string;
}

export interface CreateTodoInput {
  title: string;
  description?: string;
  status?: TodoStatus;
  due_date?: string | null;  // ISO date string (YYYY-MM-DD)
  workspace_id?: string | null;
}

export interface UpdateTodoInput {
  title?: string;
  description?: string;
  status?: TodoStatus;
  due_date?: string | null;  // ISO date string (YYYY-MM-DD)
  workspace_id?: string | null;
}

// Application state types
export type Screen =
  | 'login'
  | 'dashboard'
  | 'workspaces'
  | 'workspace-view'
  | 'workspace-editor'
  | 'notes'
  | 'note-editor'
  | 'boards'
  | 'board-view'
  | 'card-editor'
  | 'calendar'
  | 'todos'
  | 'todo-editor'
  | 'pomodoro';

export interface AppState {
  currentScreen: Screen;
  currentWorkspaceId: string | null;  // null = global view
  selectedWorkspaceId: string | null; // For workspace editing
  selectedNoteId: string | null;
  selectedBoardId: string | null;
  selectedCardId: string | null;
  selectedTodoId: string | null;
  error: string | null;
}

// Auth types
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: Profile | null;
}

export interface SessionData {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
}

// Service result types
export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

// Board with columns and cards for display
export interface BoardWithColumns extends Board {
  columns: ColumnWithCards[];
}

export interface ColumnWithCards extends Column {
  cards: Card[];
}

// Calendar types
export interface CalendarDay {
  date: string;  // ISO date string (YYYY-MM-DD)
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  notes: Note[];
}
