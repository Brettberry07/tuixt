import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { Header, StatusBar, LoadingSpinner } from '../components/index.js';
import { useApp, useWorkspace } from '../context/index.js';
import {
  fetchTodo,
  createTodo,
  updateTodo,
  linkNoteToTodo,
  unlinkNoteFromTodo,
} from '../services/todos.js';
import { fetchNotes } from '../services/notes.js';
import type { TodoWithNotes, TodoStatus, Note } from '../types/index.js';

type FocusField = 'title' | 'description' | 'status' | 'due_date' | 'notes';

const STATUS_OPTIONS: TodoStatus[] = ['todo', 'in-progress', 'done', 'cancelled'];

export function TodoEditorScreen() {
  const { selectedTodoId, currentWorkspaceId, navigate, selectTodo, setError, error, isCommandPaletteOpen } = useApp();
  const { loadWorkspace } = useWorkspace();
  const [todo, setTodo] = useState<TodoWithNotes | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TodoStatus>('todo');
  const [dueDate, setDueDate] = useState('');
  const [linkedNotes, setLinkedNotes] = useState<Note[]>([]);
  const [availableNotes, setAvailableNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<FocusField>('title');
  const [message, setMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedNoteIndex, setSelectedNoteIndex] = useState(0);
  const [showNotePicker, setShowNotePicker] = useState(false);
  const [workspace, setWorkspace] = useState<{ name: string; icon: string } | null>(null);

  const isNewTodo = !selectedTodoId;

  // Load existing todo and linked notes
  useEffect(() => {
    async function loadTodo() {
      // Load workspace info
      if (currentWorkspaceId) {
        const ws = await loadWorkspace(currentWorkspaceId);
        if (ws) {
          setWorkspace({ name: ws.name, icon: ws.icon });
        }
      }
      
      if (!selectedTodoId) {
        // Load all notes for linking (from current workspace or all)
        const notesResult = await fetchNotes(currentWorkspaceId);
        if (!notesResult.error && notesResult.data) {
          setAvailableNotes(notesResult.data);
        }
        return;
      }

      setIsLoading(true);
      const result = await fetchTodo(selectedTodoId);
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setTodo(result.data);
        setTitle(result.data.title);
        setDescription(result.data.description);
        setStatus(result.data.status);
        setDueDate(result.data.due_date || '');
        setLinkedNotes(result.data.notes);
      }

      // Load all notes for linking (from current workspace or all)
      const notesResult = await fetchNotes(currentWorkspaceId);
      if (!notesResult.error && notesResult.data) {
        setAvailableNotes(notesResult.data);
      }

      setIsLoading(false);
    }

    loadTodo();
  }, [selectedTodoId, setError, currentWorkspaceId, loadWorkspace]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const todoData = {
      title: title.trim(),
      description: description.trim(),
      status,
      due_date: dueDate || null,
      workspace_id: isNewTodo ? currentWorkspaceId : undefined,
    };

    let result;
    if (isNewTodo) {
      result = await createTodo(todoData);
    } else {
      result = await updateTodo(selectedTodoId, todoData);
    }

    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setMessage('Saved!');
      setHasUnsavedChanges(false);

      if (isNewTodo) {
        selectTodo(result.data.id);
      }

      setTimeout(() => setMessage(null), 2000);
    }

    setIsSaving(false);
  }, [title, description, status, dueDate, isNewTodo, selectedTodoId, selectTodo, setError]);

  const cycleStatus = useCallback(() => {
    const currentIndex = STATUS_OPTIONS.indexOf(status);
    const nextIndex = (currentIndex + 1) % STATUS_OPTIONS.length;
    setStatus(STATUS_OPTIONS[nextIndex]);
    setHasUnsavedChanges(true);
  }, [status]);

  const handleLinkNote = useCallback(
    async (noteId: string) => {
      if (!selectedTodoId) {
        setError('Please save the todo first before linking notes');
        return;
      }

      const result = await linkNoteToTodo(noteId, selectedTodoId);
      if (result.error) {
        setError(result.error);
      } else {
        // Reload todo to get updated notes list
        const todoResult = await fetchTodo(selectedTodoId);
        if (todoResult.data) {
          setLinkedNotes(todoResult.data.notes);
        }
        setMessage('Note linked!');
        setTimeout(() => setMessage(null), 2000);
      }
      setShowNotePicker(false);
    },
    [selectedTodoId, setError]
  );

  const handleUnlinkNote = useCallback(
    async (noteId: string) => {
      if (!selectedTodoId) return;

      const result = await unlinkNoteFromTodo(noteId, selectedTodoId);
      if (result.error) {
        setError(result.error);
      } else {
        setLinkedNotes((prev) => prev.filter((n) => n.id !== noteId));
        setMessage('Note unlinked!');
        setTimeout(() => setMessage(null), 2000);
      }
    },
    [selectedTodoId, setError]
  );

  useInput((input, key) => {
    // Global shortcuts
    if (input === 's' && key.ctrl) {
      handleSave();
      return;
    }

    if (key.escape) {
      if (showNotePicker) {
        setShowNotePicker(false);
        return;
      }
      selectTodo(null);
      navigate('todos');
      return;
    }

    // Note picker mode
    if (showNotePicker) {
      if (key.upArrow) {
        setSelectedNoteIndex((prev) =>
          prev > 0 ? prev - 1 : availableNotes.length - 1
        );
      } else if (key.downArrow) {
        setSelectedNoteIndex((prev) =>
          prev < availableNotes.length - 1 ? prev + 1 : 0
        );
      } else if (key.return) {
        const selectedNote = availableNotes[selectedNoteIndex];
        if (selectedNote) {
          handleLinkNote(selectedNote.id);
        }
      }
      return;
    }

    // Field navigation
    if (key.tab || key.downArrow) {
      const fields: FocusField[] = ['title', 'description', 'status', 'due_date', 'notes'];
      const currentIndex = fields.indexOf(focusedField);
      const nextIndex = (currentIndex + 1) % fields.length;
      setFocusedField(fields[nextIndex]);
      return;
    }

    if (key.upArrow && focusedField !== 'title') {
      const fields: FocusField[] = ['title', 'description', 'status', 'due_date', 'notes'];
      const currentIndex = fields.indexOf(focusedField);
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : fields.length - 1;
      setFocusedField(fields[prevIndex]);
      return;
    }

    // Field-specific input
    if (focusedField === 'title') {
      if (key.backspace || key.delete) {
        setTitle((prev) => prev.slice(0, -1));
        setHasUnsavedChanges(true);
      } else if (input && !key.ctrl && !key.meta) {
        setTitle((prev) => prev + input);
        setHasUnsavedChanges(true);
      }
    } else if (focusedField === 'description') {
      if (key.backspace || key.delete) {
        setDescription((prev) => prev.slice(0, -1));
        setHasUnsavedChanges(true);
      } else if (key.return) {
        setDescription((prev) => prev + '\n');
        setHasUnsavedChanges(true);
      } else if (input && !key.ctrl && !key.meta) {
        setDescription((prev) => prev + input);
        setHasUnsavedChanges(true);
      }
    } else if (focusedField === 'status') {
      if (key.return || input === ' ') {
        cycleStatus();
      }
    } else if (focusedField === 'due_date') {
      if (key.backspace || key.delete) {
        setDueDate((prev) => prev.slice(0, -1));
        setHasUnsavedChanges(true);
      } else if (input && !key.ctrl && !key.meta && /[0-9\-]/.test(input)) {
        setDueDate((prev) => prev + input);
        setHasUnsavedChanges(true);
      }
    } else if (focusedField === 'notes') {
      if (input === 'a') {
        if (!selectedTodoId) {
          setError('Please save the todo first before linking notes');
        } else {
          setShowNotePicker(true);
          setSelectedNoteIndex(0);
        }
      } else if (input === 'd' && linkedNotes.length > 0) {
        const noteToUnlink = linkedNotes[0];
        if (noteToUnlink) {
          handleUnlinkNote(noteToUnlink.id);
        }
      }
    }
  }, { isActive: !isCommandPaletteOpen });

  if (isLoading) {
    return (
      <Box flexDirection="column" padding={2}>
        <Header title={isNewTodo ? 'New Todo' : 'Edit Todo'} />
        <LoadingSpinner text="Loading todo..." />
      </Box>
    );
  }

  // Show note picker
  if (showNotePicker) {
    return (
      <Box flexDirection="column" height="100%">
        <Header title="Link Note to Todo" subtitle="Select a note to link" />
        <Box flexDirection="column" flexGrow={1} paddingX={2}>
          {availableNotes.map((note, index) => {
            const isSelected = index === selectedNoteIndex;
            const isAlreadyLinked = linkedNotes.some((ln) => ln.id === note.id);
            return (
              <Box
                key={note.id}
                borderStyle={isSelected ? 'single' : undefined}
                borderColor={isSelected ? 'cyan' : undefined}
                paddingX={1}
                marginBottom={1}
              >
                <Text color={isSelected ? 'cyan' : undefined} bold={isSelected}>
                  {isSelected ? '▶ ' : '  '}
                  {note.title}
                  {isAlreadyLinked && <Text dimColor> (already linked)</Text>}
                </Text>
              </Box>
            );
          })}
        </Box>
        <StatusBar
          error={error}
          hints={['↑↓ Navigate', 'Enter Select', 'Esc Cancel']}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      <Header
        title={isNewTodo ? 'New Todo' : 'Edit Todo'}
        subtitle={message || (hasUnsavedChanges ? 'Unsaved changes' : '')}
      />

      <Box flexDirection="column" flexGrow={1} paddingX={2} paddingY={1}>
        {/* Title field */}
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color={focusedField === 'title' ? 'cyan' : 'gray'}>
            Title:
          </Text>
          <Box
            borderStyle="single"
            borderColor={focusedField === 'title' ? 'cyan' : 'gray'}
            paddingX={1}
          >
            <Text>{title}</Text>
            {focusedField === 'title' && <Text color="cyan">█</Text>}
          </Box>
        </Box>

        {/* Description field */}
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color={focusedField === 'description' ? 'cyan' : 'gray'}>
            Description:
          </Text>
          <Box
            borderStyle="single"
            borderColor={focusedField === 'description' ? 'cyan' : 'gray'}
            paddingX={1}
            minHeight={3}
          >
            <Text>{description || <Text dimColor>(optional)</Text>}</Text>
            {focusedField === 'description' && <Text color="cyan">█</Text>}
          </Box>
        </Box>

        {/* Status field */}
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color={focusedField === 'status' ? 'cyan' : 'gray'}>
            Status:
          </Text>
          <Box
            borderStyle="single"
            borderColor={focusedField === 'status' ? 'cyan' : 'gray'}
            paddingX={1}
          >
            <Text>{status}</Text>
            {focusedField === 'status' && (
              <Text dimColor> (press Space or Enter to cycle)</Text>
            )}
          </Box>
        </Box>

        {/* Due Date field */}
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color={focusedField === 'due_date' ? 'cyan' : 'gray'}>
            Due Date (YYYY-MM-DD):
          </Text>
          <Box
            borderStyle="single"
            borderColor={focusedField === 'due_date' ? 'cyan' : 'gray'}
            paddingX={1}
          >
            <Text>{dueDate || <Text dimColor>(optional)</Text>}</Text>
            {focusedField === 'due_date' && <Text color="cyan">█</Text>}
          </Box>
        </Box>

        {/* Linked Notes */}
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color={focusedField === 'notes' ? 'cyan' : 'gray'}>
            Linked Notes:
          </Text>
          <Box
            borderStyle="single"
            borderColor={focusedField === 'notes' ? 'cyan' : 'gray'}
            paddingX={1}
            flexDirection="column"
            minHeight={3}
          >
            {linkedNotes.length === 0 ? (
              <Text dimColor>No notes linked</Text>
            ) : (
              linkedNotes.map((note) => (
                <Text key={note.id}>
                  • {note.title}
                </Text>
              ))
            )}
            {focusedField === 'notes' && (
              <Text dimColor>
                {selectedTodoId
                  ? '[a] Add note  [d] Remove first'
                  : 'Save todo first to link notes'}
              </Text>
            )}
          </Box>
        </Box>
      </Box>

      <StatusBar
        error={error}
        message={isSaving ? 'Saving...' : message}
        hints={[
          'Tab/↑↓ Navigate',
          'Ctrl+S Save',
          'Esc Back',
        ]}
      />
    </Box>
  );
}
