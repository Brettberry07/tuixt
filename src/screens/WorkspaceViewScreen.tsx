import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { Header, Sidebar, StatusBar } from '../components/index.js';
import { useAuth, useApp, useWorkspace } from '../context/index.js';
import { fetchNotes } from '../services/notes.js';
import { fetchTodos } from '../services/todos.js';
import { fetchBoards } from '../services/boards.js';
import type { Note, Todo, Board, Workspace } from '../types/index.js';

interface MenuItem {
  key: string;
  label: string;
  shortcut?: string;
}

export function WorkspaceViewScreen() {
  const { user } = useAuth();
  const { 
    navigate, 
    currentWorkspaceId, 
    selectedWorkspaceId,
    setCurrentWorkspace,
    selectNote, 
    selectTodo, 
    selectBoard,
    selectWorkspace,
    error, 
    setError 
  } = useApp();
  const { loadWorkspace, currentWorkspace, setCurrentWorkspace: setWorkspaceContext } = useWorkspace();
  
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const workspaceId = selectedWorkspaceId || currentWorkspaceId;
  
  // Load workspace and its data
  useEffect(() => {
    async function loadData() {
      if (!workspaceId) {
        navigate('workspaces');
        return;
      }
      
      setIsLoading(true);
      
      // Load workspace details
      const ws = await loadWorkspace(workspaceId);
      if (ws) {
        setWorkspace(ws);
        setWorkspaceContext(ws);
      }
      
      // Load workspace items
      const [notesResult, todosResult, boardsResult] = await Promise.all([
        fetchNotes(workspaceId),
        fetchTodos(workspaceId),
        fetchBoards(workspaceId),
      ]);
      
      if (notesResult.data) setNotes(notesResult.data);
      if (todosResult.data) setTodos(todosResult.data);
      if (boardsResult.data) setBoards(boardsResult.data);
      
      setIsLoading(false);
    }
    
    loadData();
  }, [workspaceId, loadWorkspace, setWorkspaceContext, navigate]);
  
  // Build menu items
  const menuItems: MenuItem[] = [
    // Quick actions
    { key: 'notes', label: `📝 Notes (${notes.length})`, shortcut: 'n' },
    { key: 'todos', label: `✅ Todos (${todos.length})`, shortcut: 't' },
    { key: 'boards', label: `📋 Boards (${boards.length})`, shortcut: 'b' },
    { key: 'calendar', label: '📅 Calendar', shortcut: 'l' },
    { key: 'divider-1', label: '─────────────────' },
    { key: 'create-note', label: '+ Create Note', shortcut: 'c' },
    { key: 'create-todo', label: '+ Create Todo', shortcut: 'o' },
    { key: 'create-board', label: '+ Create Board', shortcut: 'k' },
    { key: 'divider-2', label: '─────────────────' },
    { key: 'edit-workspace', label: '⚙️ Edit Workspace', shortcut: 'e' },
    { key: 'back', label: '← Back to Workspaces', shortcut: 'w' },
    { key: 'dashboard', label: '🏠 Dashboard', shortcut: 'd' },
  ];
  
  const handleActivate = useCallback(async (key: string) => {
    if (key.startsWith('divider')) return;
    
    switch (key) {
      case 'notes':
        // Set current workspace context and navigate to notes
        setCurrentWorkspace(workspaceId);
        navigate('notes');
        break;
      case 'todos':
        setCurrentWorkspace(workspaceId);
        navigate('todos');
        break;
      case 'boards':
        setCurrentWorkspace(workspaceId);
        navigate('boards');
        break;
      case 'calendar':
        setCurrentWorkspace(workspaceId);
        navigate('calendar');
        break;
      case 'create-note':
        setCurrentWorkspace(workspaceId);
        selectNote(null);
        navigate('note-editor');
        break;
      case 'create-todo':
        setCurrentWorkspace(workspaceId);
        selectTodo(null);
        navigate('todo-editor');
        break;
      case 'create-board':
        setCurrentWorkspace(workspaceId);
        navigate('boards');
        break;
      case 'edit-workspace':
        selectWorkspace(workspaceId);
        navigate('workspace-editor');
        break;
      case 'back':
        navigate('workspaces');
        break;
      case 'dashboard':
        navigate('dashboard');
        break;
    }
  }, [workspaceId, navigate, setCurrentWorkspace, selectNote, selectTodo, selectWorkspace]);
  
  // Keyboard navigation  
  useInput((input, key) => {
    if (key.escape) {
      navigate('workspaces');
      return;
    }
    
    if (key.upArrow) {
      let newIndex = selectedIndex - 1;
      while (newIndex >= 0 && menuItems[newIndex]?.key.startsWith('divider')) {
        newIndex--;
      }
      if (newIndex >= 0) setSelectedIndex(newIndex);
    } else if (key.downArrow) {
      let newIndex = selectedIndex + 1;
      while (newIndex < menuItems.length && menuItems[newIndex]?.key.startsWith('divider')) {
        newIndex++;
      }
      if (newIndex < menuItems.length) setSelectedIndex(newIndex);
    } else if (key.return) {
      const item = menuItems[selectedIndex];
      if (item && !item.key.startsWith('divider')) {
        handleActivate(item.key);
      }
    } else {
      // Check for shortcut keys
      const item = menuItems.find(m => m.shortcut === input);
      if (item && !item.key.startsWith('divider')) {
        handleActivate(item.key);
      }
    }
  });
  
  if (isLoading) {
    return (
      <Box flexDirection="column" height="100%">
        <Header title="Workspace" subtitle="Loading..." />
        <Box flexGrow={1} justifyContent="center" alignItems="center">
          <Text color="cyan">Loading workspace...</Text>
        </Box>
      </Box>
    );
  }
  
  if (!workspace) {
    return (
      <Box flexDirection="column" height="100%">
        <Header title="Workspace" subtitle="Not Found" />
        <Box flexGrow={1} justifyContent="center" alignItems="center">
          <Text color="red">Workspace not found</Text>
        </Box>
      </Box>
    );
  }
  
  // Get recent items for preview
  const recentNotes = notes.slice(0, 3);
  const recentTodos = todos.filter(t => t.status !== 'done').slice(0, 3);
  
  return (
    <Box flexDirection="column" height="100%">
      <Header
        title={`${workspace.icon} ${workspace.name}`}
        subtitle={workspace.description || `Workspace`}
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
          {/* Workspace Overview */}
          <Text bold color={workspace.color as never}>
            {workspace.icon} {workspace.name}
          </Text>
          {workspace.description && (
            <Box marginTop={1}>
              <Text dimColor>{workspace.description}</Text>
            </Box>
          )}
          
          {/* Stats */}
          <Box marginTop={2} flexDirection="column">
            <Text bold underline>Overview</Text>
            <Box marginTop={1} flexDirection="row" gap={4}>
              <Text>
                <Text color="yellow">{notes.length}</Text> notes
              </Text>
              <Text>
                <Text color="green">{todos.filter(t => t.status !== 'done').length}</Text> active todos
              </Text>
              <Text>
                <Text color="magenta">{boards.length}</Text> boards
              </Text>
            </Box>
          </Box>
          
          {/* Recent Notes */}
          {recentNotes.length > 0 && (
            <Box marginTop={2} flexDirection="column">
              <Text bold underline>Recent Notes</Text>
              {recentNotes.map(note => (
                <Box key={note.id} marginTop={1}>
                  <Text>
                    <Text color="yellow">•</Text> {note.title}
                  </Text>
                </Box>
              ))}
            </Box>
          )}
          
          {/* Active Todos */}
          {recentTodos.length > 0 && (
            <Box marginTop={2} flexDirection="column">
              <Text bold underline>Active Todos</Text>
              {recentTodos.map(todo => (
                <Box key={todo.id} marginTop={1}>
                  <Text>
                    <Text color={todo.status === 'in-progress' ? 'blue' : 'white'}>
                      {todo.status === 'in-progress' ? '◐' : '○'}
                    </Text>{' '}
                    {todo.title}
                    {todo.due_date && (
                      <Text dimColor> (due: {todo.due_date})</Text>
                    )}
                  </Text>
                </Box>
              ))}
            </Box>
          )}
          
          {/* Quick Actions Hint */}
          <Box marginTop={2}>
            <Text dimColor>
              Press n/t/b to view items, c/o/k to create new ones
            </Text>
          </Box>
        </Box>
      </Box>
      
      <StatusBar
        error={error}
        hints={['↑↓ Navigate', 'Enter Select', 'Esc Back']}
      />
    </Box>
  );
}
