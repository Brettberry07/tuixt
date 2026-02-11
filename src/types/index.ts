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

// Input types for creating/updating entities
export interface CreateNoteInput {
  title: string;
  content: string;
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
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

// Application state types
export type Screen =
  | 'login'
  | 'dashboard'
  | 'notes'
  | 'note-editor'
  | 'boards'
  | 'board-view'
  | 'card-editor';

export interface AppState {
  currentScreen: Screen;
  selectedNoteId: string | null;
  selectedBoardId: string | null;
  selectedCardId: string | null;
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
