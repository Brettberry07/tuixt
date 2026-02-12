import React, { useEffect } from 'react';
import { Box, useInput } from 'ink';
import { AuthProvider, AppProvider, useAuth, useApp } from './context/index.js';
import { LoadingSpinner, CommandPalette } from './components/index.js';
import {
  LoginScreen,
  DashboardScreen,
  NotesListScreen,
  NoteEditorScreen,
  BoardsListScreen,
  BoardViewScreen,
  CardEditorScreen,
  CalendarScreen,
  TodosListScreen,
  TodoEditorScreen,
  PomodoroScreen,
} from './screens/index.js';

function AppContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { currentScreen, navigate, isCommandPaletteOpen, setIsCommandPaletteOpen } = useApp();

  // Global keyboard shortcut for command palette (Ctrl+K)
  // This runs with high priority to prevent conflicts with other 'k' shortcuts
  useInput(
    (input, key) => {
      if (key.ctrl && input === 'k') {
        setIsCommandPaletteOpen(!isCommandPaletteOpen);
      }
    },
    { isActive: true }
  );

  // Redirect based on auth state
  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated && currentScreen === 'login') {
        navigate('dashboard');
      } else if (!isAuthenticated && currentScreen !== 'login') {
        navigate('login');
      }
    }
  }, [isAuthenticated, authLoading, currentScreen, navigate]);

  if (authLoading) {
    return (
      <Box padding={2}>
        <LoadingSpinner text="Initializing..." />
      </Box>
    );
  }

  // Render the appropriate screen
  const currentScreenElement = (() => {
    switch (currentScreen) {
      case 'login':
        return <LoginScreen onSuccess={() => navigate('dashboard')} />;
      case 'dashboard':
        return <DashboardScreen />;
      case 'notes':
        return <NotesListScreen />;
      case 'note-editor':
        return <NoteEditorScreen />;
      case 'boards':
        return <BoardsListScreen />;
      case 'board-view':
        return <BoardViewScreen />;
      case 'card-editor':
        return <CardEditorScreen />;
      case 'calendar':
        return <CalendarScreen />;
      case 'todos':
        return <TodosListScreen />;
      case 'todo-editor':
        return <TodoEditorScreen />;
      case 'pomodoro':
        return <PomodoroScreen />;
      default:
        return <DashboardScreen />;
    }
  })();

  return (
    <Box flexDirection="column" height="100%" position="relative">
      {/* Render screen */}
      {currentScreenElement}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </Box>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}
