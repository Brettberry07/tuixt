import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import InkTextInput from 'ink-text-input';
import { Header, StatusBar, LoadingSpinner, ConfirmModal } from '../components/index.js';
import { useApp } from '../context/index.js';
import {
  fetchBoardWithColumns,
  createColumn,
  createCard,
  deleteCard,
  moveCard,
} from '../services/boards.js';
import { truncateText } from '../utils/markdown.js';
import type { BoardWithColumns, ColumnWithCards, Card } from '../types/index.js';

type Mode = 'navigate' | 'create-column' | 'create-card' | 'move-card';

export function BoardViewScreen() {
  const { selectedBoardId, navigate, selectCard, setError, error } = useApp();
  const [board, setBoard] = useState<BoardWithColumns | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedColumnIndex, setSelectedColumnIndex] = useState(0);
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const [mode, setMode] = useState<Mode>('navigate');
  const [inputValue, setInputValue] = useState('');
  const [confirmDeleteCard, setConfirmDeleteCard] = useState<Card | null>(null);
  const [moveTargetColumn, setMoveTargetColumn] = useState(0);

  const loadBoard = useCallback(async () => {
    if (!selectedBoardId) return;

    setIsLoading(true);
    const result = await fetchBoardWithColumns(selectedBoardId);
    if (result.error) {
      setError(result.error);
    } else {
      setBoard(result.data);
    }
    setIsLoading(false);
  }, [selectedBoardId, setError]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const getCurrentColumn = (): ColumnWithCards | null => {
    if (!board || board.columns.length === 0) return null;
    return board.columns[selectedColumnIndex] || null;
  };

  const getCurrentCard = (): Card | null => {
    const column = getCurrentColumn();
    if (!column || column.cards.length === 0) return null;
    return column.cards[selectedCardIndex] || null;
  };

  const handleCreateColumn = useCallback(async () => {
    if (!board || !inputValue.trim()) {
      setError('Column title is required');
      return;
    }

    const result = await createColumn({
      board_id: board.id,
      title: inputValue.trim(),
      position: board.columns.length,
    });

    if (result.error) {
      setError(result.error);
    } else {
      await loadBoard();
      setInputValue('');
      setMode('navigate');
    }
  }, [board, inputValue, loadBoard, setError]);

  const handleCreateCard = useCallback(async () => {
    const column = getCurrentColumn();
    if (!column || !inputValue.trim()) {
      setError('Card title is required');
      return;
    }

    const result = await createCard({
      column_id: column.id,
      title: inputValue.trim(),
      position: column.cards.length,
    });

    if (result.error) {
      setError(result.error);
    } else {
      await loadBoard();
      setInputValue('');
      setMode('navigate');
    }
  }, [getCurrentColumn, inputValue, loadBoard, setError]);

  const handleDeleteCard = useCallback(async () => {
    if (!confirmDeleteCard) return;

    const result = await deleteCard(confirmDeleteCard.id);
    if (result.error) {
      setError(result.error);
    } else {
      await loadBoard();
    }
    setConfirmDeleteCard(null);
  }, [confirmDeleteCard, loadBoard, setError]);

  const handleMoveCard = useCallback(async () => {
    const card = getCurrentCard();
    if (!card || !board) return;

    const targetColumn = board.columns[moveTargetColumn];
    if (!targetColumn || targetColumn.id === card.column_id) {
      setMode('navigate');
      return;
    }

    const result = await moveCard(card.id, targetColumn.id, targetColumn.cards.length);
    
    if (result.error) {
      setError(result.error);
    } else {
      await loadBoard();
    }
    setMode('navigate');
  }, [getCurrentCard, board, moveTargetColumn, loadBoard, setError]);

  useInput((input, key) => {
    if (confirmDeleteCard) return;

    // Handle input modes
    if (mode === 'create-column' || mode === 'create-card') {
      if (key.escape) {
        setMode('navigate');
        setInputValue('');
      } else if (key.return) {
        if (mode === 'create-column') {
          handleCreateColumn();
        } else {
          handleCreateCard();
        }
      }
      return;
    }

    if (mode === 'move-card') {
      if (key.escape) {
        setMode('navigate');
      } else if (key.leftArrow) {
        setMoveTargetColumn((prev) =>
          prev > 0 ? prev - 1 : (board?.columns.length || 1) - 1
        );
      } else if (key.rightArrow) {
        setMoveTargetColumn((prev) =>
          prev < (board?.columns.length || 1) - 1 ? prev + 1 : 0
        );
      } else if (key.return) {
        handleMoveCard();
      }
      return;
    }

    // Navigation mode
    if (key.escape) {
      navigate('boards');
    } else if (key.leftArrow) {
      setSelectedColumnIndex((prev) =>
        prev > 0 ? prev - 1 : (board?.columns.length || 1) - 1
      );
      setSelectedCardIndex(0);
    } else if (key.rightArrow) {
      setSelectedColumnIndex((prev) =>
        prev < (board?.columns.length || 1) - 1 ? prev + 1 : 0
      );
      setSelectedCardIndex(0);
    } else if (key.upArrow) {
      const column = getCurrentColumn();
      if (column) {
        setSelectedCardIndex((prev) =>
          prev > 0 ? prev - 1 : column.cards.length - 1
        );
      }
    } else if (key.downArrow) {
      const column = getCurrentColumn();
      if (column) {
        setSelectedCardIndex((prev) =>
          prev < column.cards.length - 1 ? prev + 1 : 0
        );
      }
    } else if (input === 'c') {
      setMode('create-column');
    } else if (input === 'n') {
      if (getCurrentColumn()) {
        setMode('create-card');
      }
    } else if (input === 'd') {
      const card = getCurrentCard();
      if (card) {
        setConfirmDeleteCard(card);
      }
    } else if (input === 'm') {
      const card = getCurrentCard();
      if (card && board && board.columns.length > 1) {
        setMoveTargetColumn(selectedColumnIndex);
        setMode('move-card');
      }
    } else if (key.return) {
      const card = getCurrentCard();
      if (card) {
        selectCard(card.id);
        navigate('card-editor');
      }
    } else if (input === 'r') {
      loadBoard();
    }
  });

  if (isLoading || !board) {
    return (
      <Box flexDirection="column" padding={2}>
        <Header title="Board" />
        <LoadingSpinner text="Loading board..." />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      <Header title={board.title} subtitle={`${board.columns.length} columns`} />

      {/* Input area */}
      {(mode === 'create-column' || mode === 'create-card') && (
        <Box paddingX={2} marginBottom={1} flexDirection="column">
          <Text bold color="cyan">
            {mode === 'create-column' ? 'New Column Title:' : 'New Card Title:'}
          </Text>
          <Box>
            <Text dimColor>{'> '}</Text>
            <InkTextInput
              value={inputValue}
              onChange={setInputValue}
              placeholder={
                mode === 'create-column'
                  ? 'Enter column title...'
                  : 'Enter card title...'
              }
            />
          </Box>
        </Box>
      )}

      {/* Move card mode */}
      {mode === 'move-card' && (
        <Box paddingX={2} marginBottom={1}>
          <Text bold color="cyan">
            Move to column:{' '}
          </Text>
          <Text color="yellow" bold>
            {board.columns[moveTargetColumn]?.title || 'Unknown'}
          </Text>
          <Text dimColor> (← → to select, Enter to confirm)</Text>
        </Box>
      )}

      {/* Delete confirmation */}
      {confirmDeleteCard ? (
        <Box padding={2}>
          <ConfirmModal
            title="Delete Card"
            message={`Are you sure you want to delete "${confirmDeleteCard.title}"?`}
            onConfirm={handleDeleteCard}
            onCancel={() => setConfirmDeleteCard(null)}
          />
        </Box>
      ) : (
        /* Kanban columns */
        <Box flexGrow={1} paddingX={1}>
          {board.columns.length === 0 ? (
            <Box padding={2}>
              <Text dimColor>No columns yet. Press [c] to create one.</Text>
            </Box>
          ) : (
            board.columns.map((column, colIndex) => {
              const isSelectedColumn = colIndex === selectedColumnIndex;
              const columnWidth = Math.floor(100 / board.columns.length);

              return (
                <Box
                  key={column.id}
                  flexDirection="column"
                  width={`${columnWidth}%`}
                  borderStyle="single"
                  borderColor={
                    mode === 'move-card' && colIndex === moveTargetColumn
                      ? 'yellow'
                      : isSelectedColumn
                      ? 'cyan'
                      : 'gray'
                  }
                  marginRight={1}
                >
                  {/* Column header */}
                  <Box paddingX={1} borderStyle="single" borderColor="gray">
                    <Text bold color={isSelectedColumn ? 'cyan' : undefined}>
                      {column.title}
                    </Text>
                    <Text dimColor> ({column.cards.length})</Text>
                  </Box>

                  {/* Cards */}
                  <Box flexDirection="column" paddingX={1} paddingY={1}>
                    {column.cards.length === 0 ? (
                      <Text dimColor>No cards</Text>
                    ) : (
                      column.cards.map((card, cardIndex) => {
                        const isSelectedCard =
                          isSelectedColumn && cardIndex === selectedCardIndex;

                        return (
                          <Box
                            key={card.id}
                            flexDirection="column"
                            borderStyle={isSelectedCard ? 'single' : undefined}
                            borderColor={isSelectedCard ? 'cyan' : undefined}
                            marginBottom={1}
                            paddingX={isSelectedCard ? 1 : 0}
                          >
                            <Text
                              color={isSelectedCard ? 'cyan' : undefined}
                              bold={isSelectedCard}
                            >
                              {isSelectedCard ? '▶ ' : '  '}
                              {truncateText(card.title, 25)}
                            </Text>
                            {card.description && (
                              <Text dimColor>
                                {'  '}
                                {truncateText(card.description, 23)}
                              </Text>
                            )}
                          </Box>
                        );
                      })
                    )}
                  </Box>
                </Box>
              );
            })
          )}
        </Box>
      )}

      <StatusBar
        error={error}
        hints={
          mode === 'create-column' || mode === 'create-card'
            ? ['Enter Create', 'Esc Cancel']
            : mode === 'move-card'
            ? ['← → Select column', 'Enter Confirm', 'Esc Cancel']
            : [
                '← → Columns',
                '↑ ↓ Cards',
                'Enter Edit',
                'n New card',
                'c New column',
                'm Move',
                'd Delete',
                'Esc Back',
              ]
        }
      />
    </Box>
  );
}
