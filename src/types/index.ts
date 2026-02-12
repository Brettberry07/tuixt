// Type definitions for the application

export interface Profile {
  id: string;
  email: string;
  created_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  date?: string | null;  // ISO date string (YYYY-MM-DD) for calendar association
  created_at: string;
  updated_at: string;
}

export interface Board {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
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
  title: string;
  description: string;
  status: TodoStatus;
  due_date?: string | null;  // ISO date string (YYYY-MM-DD)
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
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

// Input types for creating/updating entities
export interface CreateNoteInput {
  title: string;
  content: string;
  date?: string | null;  // ISO date string (YYYY-MM-DD)
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  date?: string | null;  // ISO date string (YYYY-MM-DD)
}

export interface CreateBoardInput {
  title: string;
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
}

export interface UpdateTodoInput {
  title?: string;
  description?: string;
  status?: TodoStatus;
  due_date?: string | null;  // ISO date string (YYYY-MM-DD)
}

// Application state types
export type Screen =
  | 'login'
  | 'dashboard'
  | 'notes'
  | 'note-editor'
  | 'boards'
  | 'board-view'
  | 'card-editor'
  | 'calendar'
  | 'todos'
  | 'todo-editor';

export interface AppState {
  currentScreen: Screen;
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
