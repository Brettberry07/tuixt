import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { Header, StatusBar, LoadingSpinner, ConfirmModal } from '../components/index.js';
import { useApp, useWorkspace } from '../context/index.js';
import { fetchTodos, fetchTodosWithWorkspace, deleteTodo, updateTodo } from '../services/todos.js';
import { formatDate } from '../utils/markdown.js';
import type { Todo, TodoWithWorkspace, TodoStatus } from '../types/index.js';

const STATUS_COLORS: Record<TodoStatus, string> = {
  'todo': 'white',
  'in-progress': 'blue',
  'done': 'green',
  'cancelled': 'gray',
};

const STATUS_LABELS: Record<TodoStatus, string> = {
  'todo': '⬜',
  'in-progress': '🔄',
  'done': '✅',
  'cancelled': '❌',
};

export function TodosListScreen() {
  const { navigate, selectTodo, setError, error, isCommandPaletteOpen, currentWorkspaceId } = useApp();
  const { loadWorkspace } = useWorkspace();
  const [todos, setTodos] = useState<TodoWithWorkspace[]>([]);
  const [filteredTodos, setFilteredTodos] = useState<TodoWithWorkspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<TodoWithWorkspace | null>(null);
  const [filterStatus, setFilterStatus] = useState<TodoStatus | 'all'>('all');
  const [workspace, setWorkspace] = useState<{ name: string; icon: string } | null>(null);

  const isGlobalView = currentWorkspaceId === null || currentWorkspaceId === undefined;

  const loadTodos = useCallback(async () => {
    setIsLoading(true);
    
    // Load workspace info if we have a current workspace
    if (currentWorkspaceId) {
      const ws = await loadWorkspace(currentWorkspaceId);
      if (ws) {
        setWorkspace({ name: ws.name, icon: ws.icon });
      }
    } else {
      setWorkspace(null);
    }
    
    // Fetch todos based on context
    if (isGlobalView) {
      const result = await fetchTodosWithWorkspace();
      if (result.error) {
        setError(result.error);
      } else {
        setTodos(result.data || []);
        setFilteredTodos(result.data || []);
      }
    } else {
      const result = await fetchTodos(currentWorkspaceId);
      if (result.error) {
        setError(result.error);
      } else {
        const todosWithWorkspace = (result.data || []).map(t => ({ ...t, workspace: null }));
        setTodos(todosWithWorkspace);
        setFilteredTodos(todosWithWorkspace);
      }
    }
    setIsLoading(false);
  }, [setError, currentWorkspaceId, isGlobalView, loadWorkspace]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  // Filter todos based on search query and status filter
  useEffect(() => {
    let filtered = todos;

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((todo) => todo.status === filterStatus);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (todo) =>
          todo.title.toLowerCase().includes(query) ||
          todo.description.toLowerCase().includes(query)
      );
    }

    setFilteredTodos(filtered);
    setSelectedIndex(0);
  }, [searchQuery, filterStatus, todos]);

  const handleDeleteTodo = useCallback(async () => {
    if (!confirmDelete) return;

    const result = await deleteTodo(confirmDelete.id);
    if (result.error) {
      setError(result.error);
    } else {
      setTodos((prev) => prev.filter((t) => t.id !== confirmDelete.id));
    }
    setConfirmDelete(null);
  }, [confirmDelete, setError]);

  const toggleTodoStatus = useCallback(async () => {
    const todo = filteredTodos[selectedIndex];
    if (!todo) return;

    const newStatus: TodoStatus = todo.status === 'done' ? 'todo' : 'done';
    const result = await updateTodo(todo.id, { status: newStatus });
    
    if (result.error) {
      setError(result.error);
    } else {
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? result.data! : t))
      );
    }
  }, [selectedIndex, filteredTodos, setError]);

  const cycleFilterStatus = useCallback(() => {
    const statuses: Array<TodoStatus | 'all'> = ['all', 'todo', 'in-progress', 'done', 'cancelled'];
    const currentIndex = statuses.indexOf(filterStatus);
    const nextIndex = (currentIndex + 1) % statuses.length;
    setFilterStatus(statuses[nextIndex]);
  }, [filterStatus]);

  useInput((input, key) => {
    if (confirmDelete) return;

    if (isSearching) {
      if (key.escape) {
        setIsSearching(false);
        setSearchQuery('');
      } else if (key.return) {
        setIsSearching(false);
      } else if (key.backspace || key.delete) {
        setSearchQuery((prev) => prev.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        setSearchQuery((prev) => prev + input);
      }
      return;
    }

    if (key.escape) {
      navigate('dashboard');
    } else if (key.upArrow) {
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredTodos.length - 1
      );
    } else if (key.downArrow) {
      setSelectedIndex((prev) =>
        prev < filteredTodos.length - 1 ? prev + 1 : 0
      );
    } else if (key.return) {
      const todo = filteredTodos[selectedIndex];
      if (todo) {
        selectTodo(todo.id);
        navigate('todo-editor');
      }
    } else if (input === 'n') {
      selectTodo(null);
      navigate('todo-editor');
    } else if (input === 'd') {
      const todo = filteredTodos[selectedIndex];
      if (todo) {
        setConfirmDelete(todo);
      }
    } else if (input === 'e') {
      const todo = filteredTodos[selectedIndex];
      if (todo) {
        selectTodo(todo.id);
        navigate('todo-editor');
      }
    } else if (input === ' ') {
      toggleTodoStatus();
    } else if (input === 'f') {
      cycleFilterStatus();
    } else if (input === '/') {
      setIsSearching(true);
    } else if (input === 'r') {
      loadTodos();
    }
  }, { isActive: !isCommandPaletteOpen });

  if (isLoading) {
    return (
      <Box flexDirection="column" padding={2}>
        <Header title="Todos" />
        <LoadingSpinner text="Loading todos..." />
      </Box>
    );
  }

  const filterLabel = filterStatus === 'all' ? 'All' : filterStatus;
  const title = isGlobalView 
    ? 'All Todos' 
    : workspace 
      ? `${workspace.icon} ${workspace.name} - Todos` 
      : 'Todos';

  return (
    <Box flexDirection="column" height="100%">
      <Header 
        title={title} 
        subtitle={`${filteredTodos.length} todo${filteredTodos.length !== 1 ? 's' : ''} • Filter: ${filterLabel}${isGlobalView ? ' (all workspaces)' : ''}`} 
      />

      {isSearching && (
        <Box paddingX={2} marginBottom={1}>
          <Text color="cyan">Search: </Text>
          <Text>{searchQuery}</Text>
          <Text color="gray">█</Text>
        </Box>
      )}

      {confirmDelete ? (
        <Box padding={2}>
          <ConfirmModal
            title="Delete Todo"
            message={`Are you sure you want to delete "${confirmDelete.title}"?`}
            onConfirm={handleDeleteTodo}
            onCancel={() => setConfirmDelete(null)}
          />
        </Box>
      ) : (
        <Box flexDirection="column" flexGrow={1} paddingX={2}>
          {filteredTodos.length === 0 ? (
            <Box flexDirection="column" padding={2}>
              <Text dimColor>
                {todos.length === 0
                  ? 'No todos yet. Press [n] to create one.'
                  : 'No todos match your current filter or search.'}
              </Text>
            </Box>
          ) : (
            filteredTodos.map((todo, index) => {
              const isSelected = index === selectedIndex;
              const statusColor = STATUS_COLORS[todo.status];
              const statusLabel = STATUS_LABELS[todo.status];
              
              return (
                <Box
                  key={todo.id}
                  flexDirection="column"
                  borderStyle={isSelected ? 'single' : undefined}
                  borderColor={isSelected ? 'cyan' : undefined}
                  paddingX={1}
                  marginBottom={1}
                >
                  <Box>
                    <Text
                      color={isSelected ? 'cyan' : undefined}
                      bold={isSelected}
                    >
                      {isSelected ? '▶ ' : '  '}
                      {statusLabel} <Text color={statusColor}>{todo.title}</Text>
                    </Text>
                  </Box>
                  <Box paddingLeft={3} flexDirection="column">
                    {todo.description && (
                      <Box>
                        <Text dimColor>
                          {todo.description.length > 60
                            ? todo.description.slice(0, 60) + '...'
                            : todo.description}
                        </Text>
                      </Box>
                    )}
                    <Box gap={2}>
                      <Text dimColor>Status: </Text>
                      <Text color={statusColor}>{todo.status}</Text>
                      {todo.due_date && (
                        <>
                          <Text dimColor> • Due: </Text>
                          <Text color="yellow">{todo.due_date}</Text>
                        </>
                      )}
                      <Text dimColor> • Updated {formatDate(todo.updated_at)}</Text>
                      {isGlobalView && todo.workspace && (
                        <Text color={todo.workspace.color as never}> • {todo.workspace.icon} {todo.workspace.name}</Text>
                      )}
                      {isGlobalView && !todo.workspace && (
                        <Text dimColor> • 🌐 Global</Text>
                      )}
                    </Box>
                  </Box>
                </Box>
              );
            })
          )}
        </Box>
      )}

      <StatusBar
        error={error}
        hints={[
          '↑↓ Navigate',
          'Enter Edit',
          'Space Toggle',
          'n New',
          'd Delete',
          'f Filter',
          '/ Search',
          'Esc Back',
        ]}
      />
    </Box>
  );
}
