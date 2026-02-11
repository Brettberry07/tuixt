import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import InkTextInput from 'ink-text-input';
import { Header, StatusBar, LoadingSpinner, MarkdownPreview } from '../components/index.js';
import { useApp } from '../context/index.js';
import { fetchNote, createNote, updateNote } from '../services/notes.js';
import type { Note } from '../types/index.js';

type FocusField = 'title' | 'content';
type Mode = 'edit' | 'preview';

export function NoteEditorScreen() {
  const { selectedNoteId, navigate, selectNote, setError, error } = useApp();
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<FocusField>('title');
  const [mode, setMode] = useState<Mode>('edit');
  const [message, setMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const isNewNote = !selectedNoteId;
  const contentLines = useRef<string[]>([]);
  const currentLineIndex = useRef(0);

  // Load existing note
  useEffect(() => {
    async function loadNote() {
      if (!selectedNoteId) return;

      setIsLoading(true);
      const result = await fetchNote(selectedNoteId);
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setNote(result.data);
        setTitle(result.data.title);
        setContent(result.data.content);
        contentLines.current = result.data.content.split('\n');
      }
      setIsLoading(false);
    }

    loadNote();
  }, [selectedNoteId, setError]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSaving(true);
    setMessage(null);

    let result;
    if (isNewNote) {
      result = await createNote({ title: title.trim(), content });
    } else {
      result = await updateNote(selectedNoteId, { title: title.trim(), content });
    }

    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setNote(result.data);
      setMessage('Saved!');
      setHasUnsavedChanges(false);
      
      // If this was a new note, update the selected note ID
      if (isNewNote) {
        selectNote(result.data.id);
      }
      
      // Clear message after 2 seconds
      setTimeout(() => setMessage(null), 2000);
    }

    setIsSaving(false);
  }, [title, content, isNewNote, selectedNoteId, selectNote, setError]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    contentLines.current = newContent.split('\n');
    setHasUnsavedChanges(true);
  }, []);

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    setHasUnsavedChanges(true);
  }, []);

  useInput((input, key) => {
    // Handle Ctrl+S for save
    if (input === 's' && key.ctrl) {
      handleSave();
      return;
    }

    // Handle Escape to go back
    if (key.escape) {
      selectNote(null);
      navigate('notes');
      return;
    }

    // Handle Tab to switch between fields
    if (key.tab) {
      if (focusedField === 'title') {
        setFocusedField('content');
      } else {
        setFocusedField('title');
      }
      return;
    }

    // Handle Ctrl+P to toggle preview
    if (input === 'p' && key.ctrl) {
      setMode((prev) => (prev === 'edit' ? 'preview' : 'edit'));
      return;
    }

    // Handle content editing with multi-line support
    if (focusedField === 'content' && mode === 'edit') {
      if (key.return) {
        // Add a newline
        const lines = content.split('\n');
        const currentIndex = Math.min(currentLineIndex.current, lines.length);
        lines.splice(currentIndex + 1, 0, '');
        currentLineIndex.current = currentIndex + 1;
        handleContentChange(lines.join('\n'));
      }
    }
  });

  if (isLoading) {
    return (
      <Box flexDirection="column" padding={2}>
        <Header title="Note" />
        <LoadingSpinner text="Loading note..." />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      <Header
        title={isNewNote ? 'New Note' : 'Edit Note'}
        subtitle={
          hasUnsavedChanges
            ? 'Unsaved changes'
            : note
            ? `Last saved ${new Date(note.updated_at).toLocaleString()}`
            : undefined
        }
      />

      <Box flexGrow={1}>
        {/* Editor Panel */}
        <Box
          flexDirection="column"
          width="50%"
          borderStyle="single"
          borderColor={focusedField === 'title' || focusedField === 'content' ? 'cyan' : 'gray'}
          padding={1}
        >
          <Box marginBottom={1}>
            <Text bold color="yellow">
              Editor
            </Text>
            {isSaving && (
              <Text dimColor> (Saving...)</Text>
            )}
          </Box>

          {/* Title Input */}
          <Box marginBottom={1}>
            <Text bold color={focusedField === 'title' ? 'cyan' : 'gray'}>
              Title:{' '}
            </Text>
            {focusedField === 'title' ? (
              <InkTextInput
                value={title}
                onChange={handleTitleChange}
                placeholder="Enter title..."
              />
            ) : (
              <Text>{title || 'Enter title...'}</Text>
            )}
          </Box>

          {/* Content Input */}
          <Box flexDirection="column" flexGrow={1}>
            <Text bold color={focusedField === 'content' ? 'cyan' : 'gray'}>
              Content:
            </Text>
            <Box marginTop={1} flexDirection="column">
              {focusedField === 'content' ? (
                <InkTextInput
                  value={content}
                  onChange={handleContentChange}
                  placeholder="Write your note in markdown..."
                />
              ) : (
                <Text dimColor>
                  {content || 'Write your note in markdown...'}
                </Text>
              )}
            </Box>
          </Box>
        </Box>

        {/* Preview Panel */}
        <Box
          flexDirection="column"
          width="50%"
          borderStyle="single"
          borderColor="gray"
          padding={1}
        >
          <Box marginBottom={1}>
            <Text bold color="yellow">
              Preview
            </Text>
          </Box>
          <MarkdownPreview content={content || '*No content*'} />
        </Box>
      </Box>

      <StatusBar
        error={error}
        message={message}
        hints={[
          'Tab Switch field',
          'Ctrl+S Save',
          'Ctrl+P Toggle preview',
          'Esc Back',
        ]}
      />
    </Box>
  );
}
