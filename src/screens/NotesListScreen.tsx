import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { Header, StatusBar, LoadingSpinner, ConfirmModal } from '../components/index.js';
import { useApp } from '../context/index.js';
import { fetchNotes, deleteNote } from '../services/notes.js';
import { formatDate, truncateText } from '../utils/markdown.js';
import type { Note } from '../types/index.js';

export function NotesListScreen() {
  const { navigate, selectNote, setError, error } = useApp();
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Note | null>(null);

  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchNotes();
    if (result.error) {
      setError(result.error);
    } else {
      setNotes(result.data || []);
      setFilteredNotes(result.data || []);
    }
    setIsLoading(false);
  }, [setError]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Filter notes based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredNotes(notes);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredNotes(
        notes.filter(
          (note) =>
            note.title.toLowerCase().includes(query) ||
            note.content.toLowerCase().includes(query)
        )
      );
    }
    setSelectedIndex(0);
  }, [searchQuery, notes]);

  const handleDeleteNote = useCallback(async () => {
    if (!confirmDelete) return;

    const result = await deleteNote(confirmDelete.id);
    if (result.error) {
      setError(result.error);
    } else {
      setNotes((prev) => prev.filter((n) => n.id !== confirmDelete.id));
    }
    setConfirmDelete(null);
  }, [confirmDelete, setError]);

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
        prev > 0 ? prev - 1 : filteredNotes.length - 1
      );
    } else if (key.downArrow) {
      setSelectedIndex((prev) =>
        prev < filteredNotes.length - 1 ? prev + 1 : 0
      );
    } else if (key.return) {
      const note = filteredNotes[selectedIndex];
      if (note) {
        selectNote(note.id);
        navigate('note-editor');
      }
    } else if (input === 'n') {
      selectNote(null);
      navigate('note-editor');
    } else if (input === 'd') {
      const note = filteredNotes[selectedIndex];
      if (note) {
        setConfirmDelete(note);
      }
    } else if (input === 'e') {
      const note = filteredNotes[selectedIndex];
      if (note) {
        selectNote(note.id);
        navigate('note-editor');
      }
    } else if (input === '/') {
      setIsSearching(true);
    } else if (input === 'r') {
      loadNotes();
    }
  });

  if (isLoading) {
    return (
      <Box flexDirection="column" padding={2}>
        <Header title="Notes" />
        <LoadingSpinner text="Loading notes..." />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      <Header title="Notes" subtitle={`${filteredNotes.length} notes`} />

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
            title="Delete Note"
            message={`Are you sure you want to delete "${confirmDelete.title}"?`}
            onConfirm={handleDeleteNote}
            onCancel={() => setConfirmDelete(null)}
          />
        </Box>
      ) : (
        <Box flexDirection="column" flexGrow={1} paddingX={2}>
          {filteredNotes.length === 0 ? (
            <Box flexDirection="column" padding={2}>
              <Text dimColor>
                {notes.length === 0
                  ? 'No notes yet. Press [n] to create one.'
                  : 'No notes match your search.'}
              </Text>
            </Box>
          ) : (
            filteredNotes.map((note, index) => {
              const isSelected = index === selectedIndex;
              return (
                <Box
                  key={note.id}
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
                      {note.title}
                    </Text>
                  </Box>
                  <Box paddingLeft={3}>
                    <Text dimColor>
                      {truncateText(note.content.replace(/\n/g, ' '), 60)}
                    </Text>
                  </Box>
                  <Box paddingLeft={3}>
                    <Text dimColor>Updated {formatDate(note.updated_at)}</Text>
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
          'n New',
          'd Delete',
          '/ Search',
          'Esc Back',
        ]}
      />
    </Box>
  );
}
