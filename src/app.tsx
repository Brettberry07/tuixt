import React, { useEffect } from 'react';
import { Box } from 'ink';
import { AuthProvider, AppProvider, useAuth, useApp } from './context/index.js';
import { LoadingSpinner } from './components/index.js';
import {
  LoginScreen,
  DashboardScreen,
  NotesListScreen,
  NoteEditorScreen,
  BoardsListScreen,
  BoardViewScreen,
  CardEditorScreen,
} from './screens/index.js';

function AppContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { currentScreen, navigate } = useApp();

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
    default:
      return <DashboardScreen />;
  }
}

export function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Box flexDirection="column" height="100%">
          <AppContent />
        </Box>
      </AppProvider>
    </AuthProvider>
  );
}
