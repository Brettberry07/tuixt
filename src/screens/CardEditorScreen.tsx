import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import InkTextInput from 'ink-text-input';
import { Header, StatusBar, LoadingSpinner, MarkdownPreview } from '../components/index.js';
import { useApp } from '../context/index.js';
import { fetchCard, updateCard } from '../services/boards.js';
import type { Card } from '../types/index.js';

type FocusField = 'title' | 'description';

export function CardEditorScreen() {
  const { selectedCardId, selectedBoardId, navigate, selectCard, setError, error } = useApp();
  const [card, setCard] = useState<Card | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<FocusField>('title');
  const [message, setMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load existing card
  useEffect(() => {
    async function loadCard() {
      if (!selectedCardId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const result = await fetchCard(selectedCardId);
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setCard(result.data);
        setTitle(result.data.title);
        setDescription(result.data.description);
      }
      setIsLoading(false);
    }

    loadCard();
  }, [selectedCardId, setError]);

  const handleSave = useCallback(async () => {
    if (!selectedCardId) return;

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const result = await updateCard(selectedCardId, {
      title: title.trim(),
      description,
    });

    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setCard(result.data);
      setMessage('Saved!');
      setHasUnsavedChanges(false);

      // Clear message after 2 seconds
      setTimeout(() => setMessage(null), 2000);
    }

    setIsSaving(false);
  }, [selectedCardId, title, description, setError]);

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    setHasUnsavedChanges(true);
  }, []);

  const handleDescriptionChange = useCallback((newDescription: string) => {
    setDescription(newDescription);
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
      selectCard(null);
      navigate('board-view');
      return;
    }

    // Handle Tab to switch between fields
    if (key.tab) {
      setFocusedField((prev) => (prev === 'title' ? 'description' : 'title'));
      return;
    }
  });

  if (isLoading) {
    return (
      <Box flexDirection="column" padding={2}>
        <Header title="Card" />
        <LoadingSpinner text="Loading card..." />
      </Box>
    );
  }

  if (!card) {
    return (
      <Box flexDirection="column" padding={2}>
        <Header title="Card" />
        <Text color="red">Card not found</Text>
        <StatusBar hints={['Esc Back']} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      <Header
        title="Edit Card"
        subtitle={
          hasUnsavedChanges
            ? 'Unsaved changes'
            : `Last saved ${new Date(card.updated_at).toLocaleString()}`
        }
      />

      <Box flexGrow={1}>
        {/* Editor Panel */}
        <Box
          flexDirection="column"
          width="50%"
          borderStyle="single"
          borderColor="cyan"
          padding={1}
        >
          <Box marginBottom={1}>
            <Text bold color="yellow">
              Editor
            </Text>
            {isSaving && <Text dimColor> (Saving...)</Text>}
          </Box>

          {/* Title Input */}
          <Box marginBottom={1} flexDirection="column">
            <Text bold color={focusedField === 'title' ? 'cyan' : 'gray'}>
              Title:
            </Text>
            <Box>
              <Text dimColor>{'> '}</Text>
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
          </Box>

          {/* Description Input */}
          <Box flexDirection="column" flexGrow={1}>
            <Text bold color={focusedField === 'description' ? 'cyan' : 'gray'}>
              Description (Markdown):
            </Text>
            <Box marginTop={1}>
              <Text dimColor>{'> '}</Text>
              {focusedField === 'description' ? (
                <InkTextInput
                  value={description}
                  onChange={handleDescriptionChange}
                  placeholder="Enter description..."
                />
              ) : (
                <Text dimColor>
                  {description || 'Enter description...'}
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
          <Box flexDirection="column">
            <Text bold>{title || 'Untitled'}</Text>
            <Box marginTop={1}>
              <MarkdownPreview content={description || '*No description*'} />
            </Box>
          </Box>
        </Box>
      </Box>

      <StatusBar
        error={error}
        message={message}
        hints={['Tab Switch field', 'Ctrl+S Save', 'Esc Back']}
      />
    </Box>
  );
}
