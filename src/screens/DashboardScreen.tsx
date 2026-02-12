import React, { useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import { Header, Sidebar, StatusBar } from '../components/index.js';
import { useAuth, useApp } from '../context/index.js';
import type { Screen } from '../types/index.js';

interface MenuItem {
  key: string;
  label: string;
  shortcut?: string;
}

const MENU_ITEMS: MenuItem[] = [
  { key: 'notes', label: 'Notes', shortcut: 'n' },
  { key: 'todos', label: 'Todos', shortcut: 't' },
  { key: 'boards', label: 'Boards', shortcut: 'b' },
  { key: 'calendar', label: 'Calendar', shortcut: 'l' },
  { key: 'pomodoro', label: 'Pomodoro Timer', shortcut: 'p' },
  { key: 'create-note', label: 'Create Note', shortcut: 'c' },
  { key: 'create-todo', label: 'Create Todo', shortcut: 'o' },
  { key: 'create-board', label: 'Create Board', shortcut: 'k' },
  { key: 'logout', label: 'Logout', shortcut: 'q' },
];

export function DashboardScreen() {
  const { user, signOut } = useAuth();
  const { navigate, error, clearError } = useApp();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleActivate = useCallback(
    async (key: string) => {
      switch (key) {
        case 'notes':
          navigate('notes');
          break;
        case 'todos':
          navigate('todos');
          break;
        case 'boards':
          navigate('boards');
          break;
        case 'calendar':
          navigate('calendar');
          break;
        case 'pomodoro':
          navigate('pomodoro');
          break;
        case 'create-note':
          navigate('note-editor');
          break;
        case 'create-todo':
          navigate('todo-editor');
          break;
        case 'create-board':
          navigate('boards');
          // The boards screen will handle creation
          break;
        case 'logout':
          await signOut();
          navigate('login');
          break;
        default:
          break;
      }
    },
    [navigate, signOut]
  );

  return (
    <Box flexDirection="column" height="100%">
      <Header
        title="tuixt"
        subtitle={user ? `Logged in as ${user.email}` : undefined}
      />

      <Box flexGrow={1}>
        <Sidebar
          items={MENU_ITEMS}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
          onActivate={handleActivate}
          focused={true}
        />

        <Box
          flexDirection="column"
          flexGrow={1}
          borderStyle="single"
          borderColor="gray"
          padding={2}
        >
          <Text bold color="yellow">
            Welcome to tuixt
          </Text>
          <Box marginTop={1} flexDirection="column">
            <Text>Your terminal-based productivity workspace.</Text>
            <Box marginTop={1}>
              <Text dimColor>
                Use arrow keys to navigate the menu and press Enter to select.
              </Text>
            </Box>
          </Box>

          <Box marginTop={2} flexDirection="column">
            <Text bold underline>
              Quick Actions
            </Text>
            <Box marginTop={1} flexDirection="column">
              <Text>
                <Text color="cyan">[n]</Text> View Notes
              </Text>
              <Text>
                <Text color="cyan">[t]</Text> View Todos
              </Text>
              <Text>
                <Text color="cyan">[b]</Text> View Boards
              </Text>
              <Text>
                <Text color="cyan">[l]</Text> View Calendar
              </Text>
              <Text>
                <Text color="cyan">[p]</Text> Pomodoro Timer
              </Text>
              <Text>
                <Text color="cyan">[c]</Text> Create Note
              </Text>
              <Text>
                <Text color="cyan">[o]</Text> Create Todo
              </Text>
              <Text>
                <Text color="cyan">[k]</Text> Create Board
              </Text>
              <Text>
                <Text color="cyan">[q]</Text> Logout
              </Text>
            </Box>
          </Box>
        </Box>
      </Box>

      <StatusBar
        error={error}
        hints={['↑↓ Navigate', 'Enter Select', 'q Logout']}
      />
    </Box>
  );
}
