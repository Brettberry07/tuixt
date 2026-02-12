import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import InkTextInput from 'ink-text-input';
import { Header, StatusBar, LoadingSpinner } from '../components/index.js';
import { useApp } from '../context/index.js';
import { fetchCard, updateCard } from '../services/boards.js';
import { renderMarkdown } from '../utils/markdown.js';
import type { Card } from '../types/index.js';

type Mode = 'edit' | 'preview';
type FocusField = 'title' | 'description';

export function CardEditorScreen() {
  const { selectedCardId, navigate, selectCard, setError, error, isCommandPaletteOpen } = useApp();
  const [card, setCard] = useState<Card | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState<Mode>('edit');
  const [focusedField, setFocusedField] = useState<FocusField>('title');
  const [message, setMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Description multi-line editor state
  const [descLines, setDescLines] = useState<string[]>(['']);
  const [descCursorLine, setDescCursorLine] = useState(0);
  const [descCursorCol, setDescCursorCol] = useState(0);
  const [descScrollOffset, setDescScrollOffset] = useState(0);

  const VISIBLE_LINES = 15;

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
        const desc = result.data.description || '';
        setDescription(desc);
        const lines = desc.split('\n');
        setDescLines(lines.length > 0 ? lines : ['']);
      }
      setIsLoading(false);
    }

    loadCard();
  }, [selectedCardId, setError]);

  // Sync description from lines
  useEffect(() => {
    setDescription(descLines.join('\n'));
  }, [descLines]);

  // Auto-scroll for description
  useEffect(() => {
    if (descCursorLine < descScrollOffset) {
      setDescScrollOffset(descCursorLine);
    } else if (descCursorLine >= descScrollOffset + VISIBLE_LINES) {
      setDescScrollOffset(descCursorLine - VISIBLE_LINES + 1);
    }
  }, [descCursorLine]);

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
      description: description.trim() || null,
    });

    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setCard(result.data);
      setMessage('Saved!');
      setHasUnsavedChanges(false);
      setTimeout(() => setMessage(null), 2000);
    }

    setIsSaving(false);
  }, [selectedCardId, title, description, setError]);

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    setHasUnsavedChanges(true);
  }, []);

  // Rendered markdown for preview
  const renderedPreview = useMemo(() => {
    return renderMarkdown(description);
  }, [description]);

  const previewLines = useMemo(() => {
    return renderedPreview.split('\n');
  }, [renderedPreview]);

  useInput((input, key) => {
    // Ctrl+S for save
    if (input === 's' && key.ctrl) {
      handleSave();
      return;
    }

    // Ctrl+P to toggle preview
    if (input === 'p' && key.ctrl) {
      setMode((prev) => (prev === 'edit' ? 'preview' : 'edit'));
      return;
    }

    // Escape to go back
    if (key.escape) {
      selectCard(null);
      navigate('board-view');
      return;
    }

    // Preview mode - no editing
    if (mode === 'preview') {
      return;
    }

    // Tab to switch fields
    if (key.tab) {
      setFocusedField((prev) => (prev === 'title' ? 'description' : 'title'));
      return;
    }

    // Title field handled by InkTextInput
    if (focusedField === 'title') {
      return;
    }

    // Description field multi-line editing
    if (focusedField === 'description') {
      const currentLine = descLines[descCursorLine] || '';

      if (key.return) {
        // Split line at cursor
        const before = currentLine.slice(0, descCursorCol);
        const after = currentLine.slice(descCursorCol);
        const newLines = [...descLines];
        newLines[descCursorLine] = before;
        newLines.splice(descCursorLine + 1, 0, after);
        setDescLines(newLines);
        setDescCursorLine(descCursorLine + 1);
        setDescCursorCol(0);
        setHasUnsavedChanges(true);
      } else if (key.backspace || key.delete) {
        if (descCursorCol > 0) {
          // Delete char before cursor
          const newLine =
            currentLine.slice(0, descCursorCol - 1) + currentLine.slice(descCursorCol);
          const newLines = [...descLines];
          newLines[descCursorLine] = newLine;
          setDescLines(newLines);
          setDescCursorCol(descCursorCol - 1);
          setHasUnsavedChanges(true);
        } else if (descCursorLine > 0) {
          // Merge with previous line
          const prevLine = descLines[descCursorLine - 1];
          const newLines = [...descLines];
          newLines[descCursorLine - 1] = prevLine + currentLine;
          newLines.splice(descCursorLine, 1);
          setDescLines(newLines);
          setDescCursorLine(descCursorLine - 1);
          setDescCursorCol(prevLine.length);
          setHasUnsavedChanges(true);
        }
      } else if (key.upArrow) {
        if (descCursorLine > 0) {
          setDescCursorLine(descCursorLine - 1);
          const prevLineLen = descLines[descCursorLine - 1]?.length || 0;
          setDescCursorCol(Math.min(descCursorCol, prevLineLen));
        }
      } else if (key.downArrow) {
        if (descCursorLine < descLines.length - 1) {
          setDescCursorLine(descCursorLine + 1);
          const nextLineLen = descLines[descCursorLine + 1]?.length || 0;
          setDescCursorCol(Math.min(descCursorCol, nextLineLen));
        }
      } else if (key.leftArrow) {
        if (descCursorCol > 0) {
          setDescCursorCol(descCursorCol - 1);
        } else if (descCursorLine > 0) {
          setDescCursorLine(descCursorLine - 1);
          setDescCursorCol(descLines[descCursorLine - 1]?.length || 0);
        }
      } else if (key.rightArrow) {
        if (descCursorCol < currentLine.length) {
          setDescCursorCol(descCursorCol + 1);
        } else if (descCursorLine < descLines.length - 1) {
          setDescCursorLine(descCursorLine + 1);
          setDescCursorCol(0);
        }
      } else if (input && !key.ctrl && !key.meta) {
        // Insert character
        const newLine =
          currentLine.slice(0, descCursorCol) + input + currentLine.slice(descCursorCol);
        const newLines = [...descLines];
        newLines[descCursorLine] = newLine;
        setDescLines(newLines);
        setDescCursorCol(descCursorCol + input.length);
        setHasUnsavedChanges(true);
      }
    }
  }, { isActive: !isCommandPaletteOpen });

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
        subtitle={hasUnsavedChanges ? 'Unsaved changes' : undefined}
      />

      {/* Status messages */}
      {(isSaving || message) && (
        <Box paddingX={2}>
          {isSaving && <Text color="yellow">Saving...</Text>}
          {message && <Text color="green">{message}</Text>}
        </Box>
      )}

      {/* Mode tabs */}
      <Box paddingX={2} marginBottom={1}>
        <Box marginRight={2}>
          <Text
            color={mode === 'edit' ? 'cyan' : undefined}
            bold={mode === 'edit'}
            inverse={mode === 'edit'}
          >
            {' Edit '}
          </Text>
        </Box>
        <Box>
          <Text
            color={mode === 'preview' ? 'cyan' : undefined}
            bold={mode === 'preview'}
            inverse={mode === 'preview'}
          >
            {' Preview '}
          </Text>
        </Box>
        <Box marginLeft={2}>
          <Text dimColor>(Ctrl+P to toggle)</Text>
        </Box>
      </Box>

      {mode === 'edit' ? (
        /* Edit mode */
        <Box flexDirection="column" flexGrow={1} paddingX={2}>
          {/* Title field */}
          <Box marginBottom={1} flexDirection="column">
            <Text bold color={focusedField === 'title' ? 'cyan' : undefined}>
              Title:
            </Text>
            <Box
              borderStyle={focusedField === 'title' ? 'single' : undefined}
              borderColor="cyan"
              paddingX={focusedField === 'title' ? 1 : 0}
            >
              {focusedField === 'title' ? (
                <InkTextInput
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="Card title..."
                />
              ) : (
                <Text>{title || <Text dimColor>No title</Text>}</Text>
              )}
            </Box>
          </Box>

          {/* Description field (multi-line) */}
          <Box flexDirection="column" flexGrow={1}>
            <Text bold color={focusedField === 'description' ? 'cyan' : undefined}>
              Description (Markdown):
            </Text>
            <Box
              borderStyle="single"
              borderColor={focusedField === 'description' ? 'cyan' : 'gray'}
              flexDirection="column"
              flexGrow={1}
              paddingX={1}
            >
              {descLines
                .slice(descScrollOffset, descScrollOffset + VISIBLE_LINES)
                .map((line, idx) => {
                  const actualLineIndex = idx + descScrollOffset;
                  const lineNum = String(actualLineIndex + 1).padStart(3, ' ');
                  const isCurrentLine =
                    focusedField === 'description' && actualLineIndex === descCursorLine;

                  if (isCurrentLine) {
                    const before = line.slice(0, descCursorCol);
                    const cursor = line[descCursorCol] || ' ';
                    const after = line.slice(descCursorCol + 1);

                    return (
                      <Box key={actualLineIndex}>
                        <Text dimColor>{lineNum} </Text>
                        <Text color="cyan">│ </Text>
                        <Text>{before}</Text>
                        <Text inverse>{cursor}</Text>
                        <Text>{after}</Text>
                      </Box>
                    );
                  }

                  return (
                    <Box key={actualLineIndex}>
                      <Text dimColor>{lineNum} </Text>
                      <Text dimColor>│ </Text>
                      <Text>{line || ' '}</Text>
                    </Box>
                  );
                })}
            </Box>
            {descLines.length > VISIBLE_LINES && (
              <Text dimColor>
                Lines {descScrollOffset + 1}-
                {Math.min(descScrollOffset + VISIBLE_LINES, descLines.length)} of{' '}
                {descLines.length}
              </Text>
            )}
          </Box>
        </Box>
      ) : (
        /* Preview mode */
        <Box flexDirection="column" flexGrow={1} paddingX={2}>
          <Box
            borderStyle="single"
            borderColor="gray"
            flexDirection="column"
            flexGrow={1}
            paddingX={1}
          >
            <Text bold color="cyan">
              {title || 'Untitled Card'}
            </Text>
            <Box marginTop={1} flexDirection="column">
              {description ? (
                previewLines.map((line, idx) => <Text key={idx}>{line}</Text>)
              ) : (
                <Text dimColor>No description</Text>
              )}
            </Box>
          </Box>
        </Box>
      )}

      <StatusBar
        error={error}
        message={message}
        hints={
          mode === 'edit'
            ? ['Tab Switch field', 'Ctrl+P Preview', 'Ctrl+S Save', 'Esc Back']
            : ['Ctrl+P Edit', 'Ctrl+S Save', 'Esc Back']
        }
      />
    </Box>
  );
}
