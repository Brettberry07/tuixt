import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Screen, AppState } from '../types/index.js';

interface AppContextType extends AppState {
  navigate: (screen: Screen) => void;
  selectNote: (noteId: string | null) => void;
  selectBoard: (boardId: string | null) => void;
  selectCard: (cardId: string | null) => void;
  selectTodo: (todoId: string | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [error, setErrorState] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const navigate = useCallback((screen: Screen) => {
    setCurrentScreen(screen);
    // Clear error when navigating
    setErrorState(null);
  }, []);

  const selectNote = useCallback((noteId: string | null) => {
    setSelectedNoteId(noteId);
  }, []);

  const selectBoard = useCallback((boardId: string | null) => {
    setSelectedBoardId(boardId);
  }, []);

  const selectCard = useCallback((cardId: string | null) => {
    setSelectedCardId(cardId);
  }, []);

  const selectTodo = useCallback((todoId: string | null) => {
    setSelectedTodoId(todoId);
  }, []);

  const setError = useCallback((error: string | null) => {
    setErrorState(error);
  }, []);

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  const value: AppContextType = {
    currentScreen,
    selectedNoteId,
    selectedBoardId,
    selectedCardId,
    selectedTodoId,
    error,
    navigate,
    selectNote,
    selectBoard,
    selectCard,
    selectTodo,
    setError,
    clearError,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
