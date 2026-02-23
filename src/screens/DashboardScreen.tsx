import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Header, Sidebar, StatusBar } from '../components/index.js';
import { useAuth, useApp, useWorkspace } from '../context/index.js';
import type { Screen } from '../types/index.js';

interface MenuItem {
  key: string;
  label: string;
  shortcut?: string;
}

export function DashboardScreen() {
  const { user, signOut } = useAuth();
  const { navigate, currentWorkspaceId, setCurrentWorkspace, error, clearError } = useApp();
  const { 
    workspacesWithCounts, 
    totalCounts,
    globalCounts,
    loadWorkspacesWithCounts,
    loadTotalCounts,
    loadGlobalCounts,
    isLoadingCounts,
  } = useWorkspace();
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Load data on mount
  useEffect(() => {
    loadWorkspacesWithCounts();
    loadTotalCounts();
    loadGlobalCounts();
  }, [loadWorkspacesWithCounts, loadTotalCounts, loadGlobalCounts]);

  // Build menu items - clean and simple
  const menuItems: MenuItem[] = [
    { key: 'workspaces', label: `📂 Workspaces`, shortcut: 'w' },
    { key: 'all-notes', label: `📝 Notes`, shortcut: 'n' },
    { key: 'all-todos', label: `✅ Todos`, shortcut: 't' },
    { key: 'all-boards', label: `📋 Boards`, shortcut: 'b' },
    { key: 'calendar', label: '📅 Calendar', shortcut: 'l' },
    { key: 'pomodoro', label: '🍅 Pomodoro', shortcut: 'p' },
    { key: 'logout', label: '🚪 Logout', shortcut: 'q' },
  ];

  const handleActivate = useCallback(
    async (key: string) => {
      switch (key) {
        case 'workspaces':
          navigate('workspaces');
          break;
        case 'all-notes':
          setCurrentWorkspace(null); // Global context
          navigate('notes');
          break;
        case 'all-todos':
          setCurrentWorkspace(null);
          navigate('todos');
          break;
        case 'all-boards':
          setCurrentWorkspace(null);
          navigate('boards');
          break;
        case 'calendar':
          setCurrentWorkspace(null);
          navigate('calendar');
          break;
        case 'pomodoro':
          navigate('pomodoro');
          break;
        case 'logout':
          await signOut();
          navigate('login');
          break;
        default:
          break;
      }
    },
    [navigate, signOut, setCurrentWorkspace]
  );

  // Keyboard input
  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : menuItems.length - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => (prev < menuItems.length - 1 ? prev + 1 : 0));
    } else if (key.return) {
      const item = menuItems[selectedIndex];
      if (item) handleActivate(item.key);
    } else {
      const item = menuItems.find(m => m.shortcut === input);
      if (item) handleActivate(item.key);
    }
  });

  return (
    <Box flexDirection="column" height="100%">
      <Header
        title="tuixt"
        subtitle={user ? `Logged in as ${user.email}` : undefined}
      />

      <Box flexGrow={1}>
        <Sidebar
          items={menuItems}
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
          </Box>

          {/* Global Stats */}
          <Box marginTop={2} flexDirection="column">
            <Text bold underline>
              Overview
            </Text>
            <Box marginTop={1} flexDirection="column">
              <Text>
                <Text color="cyan">{workspacesWithCounts.length}</Text> workspace{workspacesWithCounts.length !== 1 ? 's' : ''}
              </Text>
              <Text>
                <Text color="yellow">{totalCounts?.notesCount || 0}</Text> total notes
              </Text>
              <Text>
                <Text color="green">{totalCounts?.todosCount || 0}</Text> total todos
              </Text>
              <Text>
                <Text color="magenta">{totalCounts?.boardsCount || 0}</Text> total boards
              </Text>
            </Box>
          </Box>

          {/* Workspaces Preview */}
          {workspacesWithCounts.length > 0 && (
            <Box marginTop={2} flexDirection="column">
              <Text bold underline>
                Your Workspaces
              </Text>
              <Box marginTop={1} flexDirection="column">
                {workspacesWithCounts.slice(0, 5).map((ws, i) => (
                  <Text key={ws.id}>
                    <Text color="cyan">[{i + 1}]</Text>{' '}
                    <Text color={ws.color as never}>{ws.icon}</Text> {ws.name}
                    <Text dimColor> ({ws.notesCount}n, {ws.todosCount}t, {ws.boardsCount}b)</Text>
                  </Text>
                ))}
                {workspacesWithCounts.length > 5 && (
                  <Text dimColor>...and {workspacesWithCounts.length - 5} more</Text>
                )}
              </Box>
            </Box>
          )}

          {/* Quick Actions */}
          <Box marginTop={2} flexDirection="column">
            <Text bold underline>
              Quick Actions
            </Text>
            <Box marginTop={1} flexDirection="column">
              <Text>
                <Text color="cyan">[w]</Text> Workspaces
              </Text>
              <Text>
                <Text color="cyan">[n]</Text> Notes
              </Text>
              <Text>
                <Text color="cyan">[t]</Text> Todos
              </Text>
              <Text>
                <Text color="cyan">[b]</Text> Boards
              </Text>
            </Box>
          </Box>
        </Box>
      </Box>

      <StatusBar
        error={error}
        hints={['↑↓ Navigate', 'Enter Select', 'Ctrl+K Command Palette']}
      />
    </Box>
  );
}

