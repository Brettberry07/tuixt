import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { Header, StatusBar, LoadingSpinner } from '../components/index.js';
import { useApp } from '../context/index.js';
import { fetchNote, createNote, updateNote } from '../services/notes.js';
import { renderMarkdown } from '../utils/markdown.js';
import type { Note } from '../types/index.js';

type Mode = 'edit' | 'preview';
type FocusField = 'title' | 'content';

export function NoteEditorScreen() {
  const { selectedNoteId, navigate, selectNote, setError, error, isCommandPaletteOpen } = useApp();
  const { stdout } = useStdout();
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState<Mode>(selectedNoteId ? 'preview' : 'edit');
  const [focusedField, setFocusedField] = useState<FocusField>('title');
  const [message, setMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Cursor position for content editing
  const [cursorLine, setCursorLine] = useState(0);
  const [cursorCol, setCursorCol] = useState(0);
  
  // Scroll offset for viewing long content
  const [scrollOffset, setScrollOffset] = useState(0);
  
  const isNewNote = !selectedNoteId;
  const lines = content.split('\n');
  const terminalHeight = stdout?.rows || 24;
  const visibleLines = Math.max(terminalHeight - 12, 5);

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
      
      if (isNewNote) {
        selectNote(result.data.id);
      }
      
      setTimeout(() => setMessage(null), 2000);
    }

    setIsSaving(false);
  }, [title, content, isNewNote, selectedNoteId, selectNote, setError]);

  // Update content
  const updateContent = useCallback((newLines: string[]) => {
    setContent(newLines.join('\n'));
    setHasUnsavedChanges(true);
  }, []);

  // Ensure cursor stays within scroll view
  useEffect(() => {
    if (cursorLine < scrollOffset) {
      setScrollOffset(cursorLine);
    } else if (cursorLine >= scrollOffset + visibleLines) {
      setScrollOffset(cursorLine - visibleLines + 1);
    }
  }, [cursorLine, scrollOffset, visibleLines]);

  useInput((input, key) => {
    // Global shortcuts
    if (input === 's' && key.ctrl) {
      handleSave();
      return;
    }

    if (key.escape) {
      selectNote(null);
      navigate('notes');
      return;
    }

    // Toggle between edit and preview mode
    if (input === 'p' && key.ctrl) {
      setMode((prev) => (prev === 'edit' ? 'preview' : 'edit'));
      setScrollOffset(0);
      return;
    }

    // In preview mode, only allow scrolling
    if (mode === 'preview') {
      if (key.upArrow || input === 'k') {
        setScrollOffset((prev) => Math.max(0, prev - 1));
      } else if (key.downArrow || input === 'j') {
        setScrollOffset((prev) => Math.min(Math.max(0, lines.length - visibleLines), prev + 1));
      }
      return;
    }

    // Edit mode - title field
    if (focusedField === 'title') {
      if (key.tab || key.downArrow) {
        setFocusedField('content');
        return;
      }
      if (key.backspace || key.delete) {
        setTitle((prev) => prev.slice(0, -1));
        setHasUnsavedChanges(true);
        return;
      }
      if (key.return) {
        setFocusedField('content');
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setTitle((prev) => prev + input);
        setHasUnsavedChanges(true);
        return;
      }
      return;
    }

    // Edit mode - content field
    if (focusedField === 'content') {
      // Navigation
      if (key.upArrow) {
        if (cursorLine > 0) {
          setCursorLine((prev) => prev - 1);
          setCursorCol((prev) => Math.min(prev, lines[cursorLine - 1]?.length || 0));
        } else {
          setFocusedField('title');
        }
        return;
      }
      if (key.downArrow) {
        if (cursorLine < lines.length - 1) {
          setCursorLine((prev) => prev + 1);
          setCursorCol((prev) => Math.min(prev, lines[cursorLine + 1]?.length || 0));
        }
        return;
      }
      if (key.leftArrow) {
        if (cursorCol > 0) {
          setCursorCol((prev) => prev - 1);
        } else if (cursorLine > 0) {
          setCursorLine((prev) => prev - 1);
          setCursorCol(lines[cursorLine - 1]?.length || 0);
        }
        return;
      }
      if (key.rightArrow) {
        const currentLineLength = lines[cursorLine]?.length || 0;
        if (cursorCol < currentLineLength) {
          setCursorCol((prev) => prev + 1);
        } else if (cursorLine < lines.length - 1) {
          setCursorLine((prev) => prev + 1);
          setCursorCol(0);
        }
        return;
      }

      // Enter - insert new line
      if (key.return) {
        const currentLine = lines[cursorLine] || '';
        const beforeCursor = currentLine.slice(0, cursorCol);
        const afterCursor = currentLine.slice(cursorCol);
        const newLines = [...lines];
        newLines[cursorLine] = beforeCursor;
        newLines.splice(cursorLine + 1, 0, afterCursor);
        updateContent(newLines);
        setCursorLine((prev) => prev + 1);
        setCursorCol(0);
        return;
      }

      // Backspace
      if (key.backspace || key.delete) {
        if (cursorCol > 0) {
          const currentLine = lines[cursorLine] || '';
          const newLine = currentLine.slice(0, cursorCol - 1) + currentLine.slice(cursorCol);
          const newLines = [...lines];
          newLines[cursorLine] = newLine;
          updateContent(newLines);
          setCursorCol((prev) => prev - 1);
        } else if (cursorLine > 0) {
          const prevLine = lines[cursorLine - 1] || '';
          const currentLine = lines[cursorLine] || '';
          const newLines = [...lines];
          newLines[cursorLine - 1] = prevLine + currentLine;
          newLines.splice(cursorLine, 1);
          updateContent(newLines);
          setCursorLine((prev) => prev - 1);
          setCursorCol(prevLine.length);
        }
        return;
      }

      // Tab to insert spaces
      if (key.tab) {
        const currentLine = lines[cursorLine] || '';
        const newLine = currentLine.slice(0, cursorCol) + '  ' + currentLine.slice(cursorCol);
        const newLines = [...lines];
        newLines[cursorLine] = newLine;
        updateContent(newLines);
        setCursorCol((prev) => prev + 2);
        return;
      }

      // Regular character input
      if (input && !key.ctrl && !key.meta) {
        const currentLine = lines[cursorLine] || '';
        const newLine = currentLine.slice(0, cursorCol) + input + currentLine.slice(cursorCol);
        const newLines = [...lines];
        newLines[cursorLine] = newLine;
        updateContent(newLines);
        setCursorCol((prev) => prev + input.length);
        return;
      }
    }
  }, { isActive: !isCommandPaletteOpen });

  if (isLoading) {
    return (
      <Box flexDirection="column" padding={2}>
        <Header title="Note" />
        <LoadingSpinner text="Loading note..." />
      </Box>
    );
  }

  // Tab bar for mode switching
  const TabBar = () => (
    <Box marginBottom={1}>
      <Text
        color={mode === 'edit' ? 'black' : 'gray'}
        backgroundColor={mode === 'edit' ? 'cyan' : undefined}
        bold={mode === 'edit'}
      >
        {' Edit '}
      </Text>
      <Text> </Text>
      <Text
        color={mode === 'preview' ? 'black' : 'gray'}
        backgroundColor={mode === 'preview' ? 'cyan' : undefined}
        bold={mode === 'preview'}
      >
        {' Preview '}
      </Text>
      <Text dimColor>  Ctrl+P</Text>
      {isSaving && <Text color="yellow"> Saving...</Text>}
      {message && <Text color="green"> {message}</Text>}
    </Box>
  );

  // Render edit mode
  const renderEditMode = () => {
    const visibleLineStart = scrollOffset;
    const visibleLineEnd = Math.min(scrollOffset + visibleLines, lines.length);
    const displayLines = lines.slice(visibleLineStart, visibleLineEnd);

    return (
      <Box flexDirection="column" flexGrow={1}>
        {/* Title input */}
        <Box marginBottom={1}>
          <Text bold color={focusedField === 'title' ? 'cyan' : 'gray'}>
            Title:{' '}
          </Text>
          <Text color={focusedField === 'title' ? 'white' : 'gray'}>
            {title || (focusedField === 'title' ? '' : 'Untitled')}
          </Text>
          {focusedField === 'title' && <Text backgroundColor="cyan"> </Text>}
        </Box>

        {/* Content editor */}
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={focusedField === 'content' ? 'cyan' : 'gray'}
          paddingX={1}
          flexGrow={1}
        >
          <Box marginBottom={1}>
            <Text dimColor>
              Line {cursorLine + 1}:{cursorCol + 1} | {lines.length} lines
              {scrollOffset > 0 && ` | ↑${scrollOffset}`}
            </Text>
          </Box>
          
          {displayLines.length === 0 || (displayLines.length === 1 && displayLines[0] === '') ? (
            focusedField === 'content' ? (
              <Box>
                <Text dimColor>  1 │ </Text>
                <Text backgroundColor="cyan"> </Text>
              </Box>
            ) : (
              <Text dimColor>  1 │ Start typing...</Text>
            )
          ) : (
            displayLines.map((line, displayIndex) => {
              const actualLineIndex = visibleLineStart + displayIndex;
              const isCurrentLine = actualLineIndex === cursorLine && focusedField === 'content';
              const lineNum = String(actualLineIndex + 1).padStart(3, ' ');

              if (isCurrentLine) {
                const beforeCursor = line.slice(0, cursorCol);
                const cursorChar = line.charAt(cursorCol) || ' ';
                const afterCursor = line.slice(cursorCol + 1);
                return (
                  <Box key={actualLineIndex}>
                    <Text color="cyan">{lineNum} │ </Text>
                    <Text>{beforeCursor}</Text>
                    <Text backgroundColor="cyan" color="black">{cursorChar}</Text>
                    <Text>{afterCursor}</Text>
                  </Box>
                );
              }

              return (
                <Box key={actualLineIndex}>
                  <Text dimColor>{lineNum} │ </Text>
                  <Text>{line}</Text>
                </Box>
              );
            })
          )}
          
          {visibleLineEnd < lines.length && (
            <Text dimColor>    ↓ {lines.length - visibleLineEnd} more</Text>
          )}
        </Box>
      </Box>
    );
  };

  // Render preview mode  
  const renderPreviewMode = () => {
    const rendered = renderMarkdown(content || '*No content yet*');
    const previewLines = rendered.split('\n');
    const visiblePreviewLines = previewLines.slice(
      scrollOffset,
      scrollOffset + visibleLines
    );

    return (
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="cyan"
        paddingX={1}
        flexGrow={1}
      >
        <Box marginBottom={1} borderStyle="single" borderColor="gray" paddingX={1}>
          <Text bold color="yellow">
            {title || 'Untitled'}
          </Text>
        </Box>
        
        {scrollOffset > 0 && (
          <Text dimColor>↑ {scrollOffset} lines above</Text>
        )}
        
        <Box flexDirection="column" flexGrow={1}>
          {visiblePreviewLines.map((line, index) => (
            <Text key={scrollOffset + index}>{line}</Text>
          ))}
        </Box>
        
        {scrollOffset + visibleLines < previewLines.length && (
          <Text dimColor>
            ↓ {previewLines.length - scrollOffset - visibleLines} lines below
          </Text>
        )}
      </Box>
    );
  };

  return (
    <Box flexDirection="column" height="100%">
      <Header
        title={isNewNote ? 'New Note' : 'Edit Note'}
        subtitle={hasUnsavedChanges ? 'Unsaved changes' : undefined}
      />

      <TabBar />

      <Box flexGrow={1} flexDirection="column">
        {mode === 'edit' ? renderEditMode() : renderPreviewMode()}
      </Box>

      <StatusBar
        error={error}
        hints={
          mode === 'edit'
            ? ['↑↓←→ Move', 'Enter Newline', 'Ctrl+S Save', 'Ctrl+P Preview', 'Esc Back']
            : ['↑↓ Scroll', 'Ctrl+P Edit', 'Ctrl+S Save', 'Esc Back']
        }
      />
    </Box>
  );
}
