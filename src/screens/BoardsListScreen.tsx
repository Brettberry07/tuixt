import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import InkTextInput from 'ink-text-input';
import { Header, StatusBar, LoadingSpinner, ConfirmModal } from '../components/index.js';
import { useApp } from '../context/index.js';
import { fetchBoards, createBoard, deleteBoard } from '../services/boards.js';
import { formatDate } from '../utils/markdown.js';
import type { Board } from '../types/index.js';

type Mode = 'list' | 'create';

export function BoardsListScreen() {
  const { navigate, selectBoard, setError, error, isCommandPaletteOpen } = useApp();
  const [boards, setBoards] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<Mode>('list');
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Board | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const loadBoards = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchBoards();
    if (result.error) {
      setError(result.error);
    } else {
      setBoards(result.data || []);
    }
    setIsLoading(false);
  }, [setError]);

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  const handleCreateBoard = useCallback(async () => {
    if (!newBoardTitle.trim()) {
      setError('Board title is required');
      return;
    }

    setIsCreating(true);
    const result = await createBoard({ title: newBoardTitle.trim() });
    
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setBoards((prev) => [result.data!, ...prev]);
      setNewBoardTitle('');
      setMode('list');
    }
    setIsCreating(false);
  }, [newBoardTitle, setError]);

  const handleDeleteBoard = useCallback(async () => {
    if (!confirmDelete) return;

    const result = await deleteBoard(confirmDelete.id);
    if (result.error) {
      setError(result.error);
    } else {
      setBoards((prev) => prev.filter((b) => b.id !== confirmDelete.id));
    }
    setConfirmDelete(null);
  }, [confirmDelete, setError]);

  useInput((input, key) => {
    if (confirmDelete) return;

    if (mode === 'create') {
      if (key.escape) {
        setMode('list');
        setNewBoardTitle('');
      } else if (key.return) {
        handleCreateBoard();
      }
      return;
    }

    if (key.escape) {
      navigate('dashboard');
    } else if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : boards.length - 1));
    } else if (key.downArrow) {
      setSelectedIndex((prev) => (prev < boards.length - 1 ? prev + 1 : 0));
    } else if (key.return) {
      const board = boards[selectedIndex];
      if (board) {
        selectBoard(board.id);
        navigate('board-view');
      }
    } else if (input === 'n' || input === 'c') {
      setMode('create');
    } else if (input === 'd') {
      const board = boards[selectedIndex];
      if (board) {
        setConfirmDelete(board);
      }
    } else if (input === 'r') {
      loadBoards();
    }
  }, { isActive: !isCommandPaletteOpen });

  if (isLoading) {
    return (
      <Box flexDirection="column" padding={2}>
        <Header title="Boards" />
        <LoadingSpinner text="Loading boards..." />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      <Header title="Boards" subtitle={`${boards.length} boards`} />

      {mode === 'create' && (
        <Box paddingX={2} marginBottom={1} flexDirection="column">
          <Text bold color="cyan">
            New Board Title:
          </Text>
          <Box>
            <Text dimColor>{'> '}</Text>
            <InkTextInput
              value={newBoardTitle}
              onChange={setNewBoardTitle}
              placeholder="Enter board title..."
            />
          </Box>
          {isCreating && <LoadingSpinner text="Creating..." />}
        </Box>
      )}

      {confirmDelete ? (
        <Box padding={2}>
          <ConfirmModal
            title="Delete Board"
            message={`Are you sure you want to delete "${confirmDelete.title}"? This will also delete all columns and cards.`}
            onConfirm={handleDeleteBoard}
            onCancel={() => setConfirmDelete(null)}
          />
        </Box>
      ) : mode === 'list' ? (
        <Box flexDirection="column" flexGrow={1} paddingX={2}>
          {boards.length === 0 ? (
            <Box flexDirection="column" padding={2}>
              <Text dimColor>
                No boards yet. Press [n] to create one.
              </Text>
            </Box>
          ) : (
            boards.map((board, index) => {
              const isSelected = index === selectedIndex;
              return (
                <Box
                  key={board.id}
                  borderStyle={isSelected ? 'single' : undefined}
                  borderColor={isSelected ? 'cyan' : undefined}
                  paddingX={1}
                  marginBottom={1}
                >
                  <Text
                    color={isSelected ? 'cyan' : undefined}
                    bold={isSelected}
                  >
                    {isSelected ? '▶ ' : '  '}
                    {board.title}
                  </Text>
                  <Text dimColor> - Created {formatDate(board.created_at)}</Text>
                </Box>
              );
            })
          )}
        </Box>
      ) : null}

      <StatusBar
        error={error}
        hints={
          mode === 'create'
            ? ['Enter Create', 'Esc Cancel']
            : ['↑↓ Navigate', 'Enter Open', 'n New', 'd Delete', 'Esc Back']
        }
      />
    </Box>
  );
}
