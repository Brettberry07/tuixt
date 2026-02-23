import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import InkTextInput from 'ink-text-input';
import { Header, StatusBar, LoadingSpinner, ConfirmModal } from '../components/index.js';
import { useApp, useWorkspace } from '../context/index.js';
import { fetchBoards, fetchBoardsWithWorkspace, createBoard, deleteBoard } from '../services/boards.js';
import { formatDate } from '../utils/markdown.js';
import type { Board, BoardWithWorkspace } from '../types/index.js';

type Mode = 'list' | 'create';

export function BoardsListScreen() {
  const { navigate, selectBoard, setError, error, isCommandPaletteOpen, currentWorkspaceId } = useApp();
  const { loadWorkspace } = useWorkspace();
  const [boards, setBoards] = useState<BoardWithWorkspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<Mode>('list');
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<BoardWithWorkspace | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [workspace, setWorkspace] = useState<{ name: string; icon: string } | null>(null);

  const isGlobalView = currentWorkspaceId === null || currentWorkspaceId === undefined;

  const loadBoards = useCallback(async () => {
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
    
    // Fetch boards based on context
    if (isGlobalView) {
      const result = await fetchBoardsWithWorkspace();
      if (result.error) {
        setError(result.error);
      } else {
        setBoards(result.data || []);
      }
    } else {
      const result = await fetchBoards(currentWorkspaceId);
      if (result.error) {
        setError(result.error);
      } else {
        const boardsWithWorkspace = (result.data || []).map(b => ({ ...b, workspace: null }));
        setBoards(boardsWithWorkspace);
      }
    }
    setIsLoading(false);
  }, [setError, currentWorkspaceId, isGlobalView, loadWorkspace]);

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  const handleCreateBoard = useCallback(async () => {
    if (!newBoardTitle.trim()) {
      setError('Board title is required');
      return;
    }

    setIsCreating(true);
    const result = await createBoard({ 
      title: newBoardTitle.trim(),
      workspace_id: currentWorkspaceId,
    });
    
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setBoards((prev) => [{ ...result.data!, workspace: null }, ...prev]);
      setNewBoardTitle('');
      setMode('list');
    }
    setIsCreating(false);
  }, [newBoardTitle, setError, currentWorkspaceId]);

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

  const title = isGlobalView 
    ? 'All Boards' 
    : workspace 
      ? `${workspace.icon} ${workspace.name} - Boards` 
      : 'Boards';

  return (
    <Box flexDirection="column" height="100%">
      <Header 
        title={title} 
        subtitle={`${boards.length} board${boards.length !== 1 ? 's' : ''}${isGlobalView ? ' (all workspaces)' : ''}`} 
      />

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
                  {isGlobalView && board.workspace && (
                    <Text color={board.workspace.color as never}> • {board.workspace.icon} {board.workspace.name}</Text>
                  )}
                  {isGlobalView && !board.workspace && (
                    <Text dimColor> • 🌐 Global</Text>
                  )}
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
