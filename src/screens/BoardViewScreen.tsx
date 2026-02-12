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
  deleteColumn,
} from '../services/boards.js';
import { truncateText } from '../utils/markdown.js';
import type { BoardWithColumns, ColumnWithCards, Card, Column } from '../types/index.js';

type Mode = 'navigate' | 'create-column' | 'create-card' | 'move-card';
type ViewMode = 'table' | 'kanban';

interface PendingColumn {
  tempId: string;
  title: string;
  position: number;
}

interface PendingCard {
  tempId: string;
  columnId: string; // Can be temp ID or real ID
  title: string;
  position: number;
}

interface PendingMove {
  cardId: string;
  fromColumnId: string;
  toColumnId: string;
  position: number;
}

interface PendingDelete {
  type: 'card' | 'column';
  id: string;
}

export function BoardViewScreen() {
  const { selectedBoardId, navigate, selectCard, setError, error, isCommandPaletteOpen } = useApp();
  const [board, setBoard] = useState<BoardWithColumns | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table'); // Default to table view
  const [selectedColumnIndex, setSelectedColumnIndex] = useState(0);
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const [selectedTableColumn, setSelectedTableColumn] = useState(0); // For table view column selection
  const [selectedTableRow, setSelectedTableRow] = useState(0); // For table view row selection within column
  const [mode, setMode] = useState<Mode>('navigate');
  const [inputValue, setInputValue] = useState('');
  const [confirmDeleteCard, setConfirmDeleteCard] = useState<Card | null>(null);
  const [moveTargetColumn, setMoveTargetColumn] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  // Pending changes (local state)
  const [pendingColumns, setPendingColumns] = useState<PendingColumn[]>([]);
  const [pendingCards, setPendingCards] = useState<PendingCard[]>([]);
  const [pendingMoves, setPendingMoves] = useState<PendingMove[]>([]);
  const [pendingDeletes, setPendingDeletes] = useState<PendingDelete[]>([]);

  const hasUnsavedChanges =
    pendingColumns.length > 0 ||
    pendingCards.length > 0 ||
    pendingMoves.length > 0 ||
    pendingDeletes.length > 0;

  const loadBoard = useCallback(async () => {
    if (!selectedBoardId) return;

    setIsLoading(true);
    const result = await fetchBoardWithColumns(selectedBoardId);
    if (result.error) {
      setError(result.error);
    } else {
      setBoard(result.data);
      // Clear pending changes on fresh load
      setPendingColumns([]);
      setPendingCards([]);
      setPendingMoves([]);
      setPendingDeletes([]);
    }
    setIsLoading(false);
  }, [selectedBoardId, setError]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  // Generate temp ID for pending items
  const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Get merged view of board with pending changes
  const getMergedBoard = useCallback((): BoardWithColumns | null => {
    if (!board) return null;

    // Start with a copy of the board
    let columns: ColumnWithCards[] = board.columns
      .filter((col) => !pendingDeletes.some((d) => d.type === 'column' && d.id === col.id))
      .map((col) => ({
        ...col,
        cards: col.cards.filter(
          (card) => !pendingDeletes.some((d) => d.type === 'card' && d.id === card.id)
        ),
      }));

    // Add pending columns
    pendingColumns.forEach((pc) => {
      columns.push({
        id: pc.tempId,
        board_id: board.id,
        title: pc.title,
        position: pc.position,
        created_at: new Date().toISOString(),
        cards: [],
      });
    });

    // Apply pending moves
    pendingMoves.forEach((move) => {
      // Find and remove card from source
      let movedCard: Card | null = null;
      columns = columns.map((col) => {
        if (col.id === move.fromColumnId) {
          const cardIndex = col.cards.findIndex((c) => c.id === move.cardId);
          if (cardIndex !== -1) {
            movedCard = col.cards[cardIndex];
            return {
              ...col,
              cards: col.cards.filter((c) => c.id !== move.cardId),
            };
          }
        }
        return col;
      });
      // Add to target column
      if (movedCard) {
        columns = columns.map((col) => {
          if (col.id === move.toColumnId) {
            return {
              ...col,
              cards: [...col.cards, { ...movedCard!, column_id: move.toColumnId }],
            };
          }
          return col;
        });
      }
    });

    // Add pending cards
    pendingCards.forEach((pc) => {
      columns = columns.map((col) => {
        if (col.id === pc.columnId) {
          return {
            ...col,
            cards: [
              ...col.cards,
              {
                id: pc.tempId,
                column_id: pc.columnId,
                title: pc.title,
                description: '',
                position: pc.position,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
          };
        }
        return col;
      });
    });

    return { ...board, columns };
  }, [board, pendingColumns, pendingCards, pendingMoves, pendingDeletes]);

  const mergedBoard = getMergedBoard();

  const getCurrentColumn = (): ColumnWithCards | null => {
    if (!mergedBoard || mergedBoard.columns.length === 0) return null;
    return mergedBoard.columns[selectedColumnIndex] || null;
  };

  const getCurrentCard = (): Card | null => {
    const column = getCurrentColumn();
    if (!column || column.cards.length === 0) return null;
    return column.cards[selectedCardIndex] || null;
  };

  // Add column locally
  const handleAddColumn = useCallback(() => {
    if (!mergedBoard || !inputValue.trim()) {
      setError('Column title is required');
      return;
    }

    setPendingColumns((prev) => [
      ...prev,
      {
        tempId: generateTempId(),
        title: inputValue.trim(),
        position: mergedBoard.columns.length,
      },
    ]);
    setInputValue('');
    setMode('navigate');
  }, [mergedBoard, inputValue, setError]);

  // Add card locally
  const handleAddCard = useCallback(() => {
    const column = getCurrentColumn();
    if (!column || !inputValue.trim()) {
      setError('Card title is required');
      return;
    }

    setPendingCards((prev) => [
      ...prev,
      {
        tempId: generateTempId(),
        columnId: column.id,
        title: inputValue.trim(),
        position: column.cards.length,
      },
    ]);
    setInputValue('');
    setMode('navigate');
  }, [getCurrentColumn, inputValue, setError]);

  // Delete card locally
  const handleDeleteCardLocal = useCallback(() => {
    if (!confirmDeleteCard) return;

    // If it's a pending card, just remove it from pending
    if (confirmDeleteCard.id.startsWith('temp_')) {
      setPendingCards((prev) => prev.filter((pc) => pc.tempId !== confirmDeleteCard.id));
    } else {
      setPendingDeletes((prev) => [...prev, { type: 'card', id: confirmDeleteCard.id }]);
    }
    setConfirmDeleteCard(null);
  }, [confirmDeleteCard]);

  // Move card locally
  const handleMoveCardLocal = useCallback(() => {
    const card = getCurrentCard();
    if (!card || !mergedBoard) return;

    const targetColumn = mergedBoard.columns[moveTargetColumn];
    if (!targetColumn || targetColumn.id === card.column_id) {
      setMode('navigate');
      return;
    }

    // If it's a pending card, update its columnId
    if (card.id.startsWith('temp_')) {
      setPendingCards((prev) =>
        prev.map((pc) =>
          pc.tempId === card.id
            ? { ...pc, columnId: targetColumn.id, position: targetColumn.cards.length }
            : pc
        )
      );
    } else {
      // Remove any existing move for this card
      setPendingMoves((prev) => prev.filter((m) => m.cardId !== card.id));
      // Add new move
      setPendingMoves((prev) => [
        ...prev,
        {
          cardId: card.id,
          fromColumnId: card.column_id,
          toColumnId: targetColumn.id,
          position: targetColumn.cards.length,
        },
      ]);
    }
    setMode('navigate');
  }, [getCurrentCard, mergedBoard, moveTargetColumn]);

  // Save all pending changes
  const handleSave = useCallback(async () => {
    if (!board || !hasUnsavedChanges) return;

    setIsSaving(true);
    setMessage(null);

    try {
      // Create columns first
      const columnIdMap: Record<string, string> = {};
      for (const pc of pendingColumns) {
        const result = await createColumn({
          board_id: board.id,
          title: pc.title,
          position: pc.position,
        });
        if (result.error) {
          setError(result.error);
          setIsSaving(false);
          return;
        }
        if (result.data) {
          columnIdMap[pc.tempId] = result.data.id;
        }
      }

      // Create cards (resolve temp column IDs)
      for (const pc of pendingCards) {
        const realColumnId = columnIdMap[pc.columnId] || pc.columnId;
        const result = await createCard({
          column_id: realColumnId,
          title: pc.title,
          position: pc.position,
        });
        if (result.error) {
          setError(result.error);
          setIsSaving(false);
          return;
        }
      }

      // Process moves
      for (const move of pendingMoves) {
        const realToColumnId = columnIdMap[move.toColumnId] || move.toColumnId;
        const result = await moveCard(move.cardId, realToColumnId, move.position);
        if (result.error) {
          setError(result.error);
          setIsSaving(false);
          return;
        }
      }

      // Process deletes
      for (const del of pendingDeletes) {
        if (del.type === 'card') {
          const result = await deleteCard(del.id);
          if (result.error) {
            setError(result.error);
            setIsSaving(false);
            return;
          }
        } else if (del.type === 'column') {
          const result = await deleteColumn(del.id);
          if (result.error) {
            setError(result.error);
            setIsSaving(false);
            return;
          }
        }
      }

      setMessage('Saved!');
      setTimeout(() => setMessage(null), 2000);
      
      // Reload board to get fresh data
      await loadBoard();
    } catch (err) {
      setError('Failed to save changes');
    }

    setIsSaving(false);
  }, [board, hasUnsavedChanges, pendingColumns, pendingCards, pendingMoves, pendingDeletes, loadBoard, setError]);

  useInput((input, key) => {
    if (confirmDeleteCard) return;

    // Global: Ctrl+S to save
    if (input === 's' && key.ctrl) {
      handleSave();
      return;
    }

    // Global: Toggle view mode
    if (input === 'v') {
      setViewMode((prev) => {
        const newMode = prev === 'table' ? 'kanban' : 'table';
        // Reset selection when switching views
        if (newMode === 'table') {
          setSelectedTableColumn(0);
          setSelectedTableRow(0);
        } else {
          setSelectedColumnIndex(0);
          setSelectedCardIndex(0);
        }
        return newMode;
      });
      return;
    }

    // Table view mode - simplified navigation
    if (viewMode === 'table') {
      if (!mergedBoard) return;
      
      if (key.escape) {
        navigate('boards');
      } else if (key.leftArrow) {
        setSelectedTableColumn((prev) => {
          const newCol = prev > 0 ? prev - 1 : mergedBoard.columns.length - 1;
          setSelectedTableRow(0); // Reset row when changing columns
          return newCol;
        });
      } else if (key.rightArrow) {
        setSelectedTableColumn((prev) => {
          const newCol = prev < mergedBoard.columns.length - 1 ? prev + 1 : 0;
          setSelectedTableRow(0); // Reset row when changing columns
          return newCol;
        });
      } else if (key.upArrow) {
        const currentColumn = mergedBoard.columns[selectedTableColumn];
        if (currentColumn && currentColumn.cards.length > 0) {
          setSelectedTableRow((prev) => 
            prev > 0 ? prev - 1 : currentColumn.cards.length - 1
          );
        }
      } else if (key.downArrow) {
        const currentColumn = mergedBoard.columns[selectedTableColumn];
        if (currentColumn && currentColumn.cards.length > 0) {
          setSelectedTableRow((prev) => 
            prev < currentColumn.cards.length - 1 ? prev + 1 : 0
          );
        }
      } else if (key.return) {
        const currentColumn = mergedBoard.columns[selectedTableColumn];
        const card = currentColumn?.cards[selectedTableRow];
        if (card && !card.id.startsWith('temp_')) {
          selectCard(card.id);
          navigate('card-editor');
        }
      } else if (input === 'r') {
        loadBoard();
      }
      return;
    }

    // Handle input modes (Kanban only)
    if (mode === 'create-column' || mode === 'create-card') {
      if (key.escape) {
        setMode('navigate');
        setInputValue('');
      } else if (key.return) {
        if (mode === 'create-column') {
          handleAddColumn();
        } else {
          handleAddCard();
        }
      }
      return;
    }

    if (mode === 'move-card') {
      if (key.escape) {
        setMode('navigate');
      } else if (key.leftArrow) {
        setMoveTargetColumn((prev) =>
          prev > 0 ? prev - 1 : (mergedBoard?.columns.length || 1) - 1
        );
      } else if (key.rightArrow) {
        setMoveTargetColumn((prev) =>
          prev < (mergedBoard?.columns.length || 1) - 1 ? prev + 1 : 0
        );
      } else if (key.return) {
        handleMoveCardLocal();
      }
      return;
    }

    // Navigation mode
    if (key.escape) {
      navigate('boards');
    } else if (key.leftArrow) {
      setSelectedColumnIndex((prev) =>
        prev > 0 ? prev - 1 : (mergedBoard?.columns.length || 1) - 1
      );
      setSelectedCardIndex(0);
    } else if (key.rightArrow) {
      setSelectedColumnIndex((prev) =>
        prev < (mergedBoard?.columns.length || 1) - 1 ? prev + 1 : 0
      );
      setSelectedCardIndex(0);
    } else if (key.upArrow) {
      const column = getCurrentColumn();
      if (column && column.cards.length > 0) {
        setSelectedCardIndex((prev) =>
          prev > 0 ? prev - 1 : column.cards.length - 1
        );
      }
    } else if (key.downArrow) {
      const column = getCurrentColumn();
      if (column && column.cards.length > 0) {
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
      if (card && mergedBoard && mergedBoard.columns.length > 1) {
        setMoveTargetColumn(selectedColumnIndex);
        setMode('move-card');
      }
    } else if (key.return) {
      const card = getCurrentCard();
      if (card && !card.id.startsWith('temp_')) {
        selectCard(card.id);
        navigate('card-editor');
      }
    } else if (input === 'r') {
      loadBoard();
    }
  }, { isActive: !isCommandPaletteOpen });

  if (isLoading || !mergedBoard) {
    return (
      <Box flexDirection="column" padding={2}>
        <Header title="Board" />
        <LoadingSpinner text="Loading board..." />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      <Header
        title={mergedBoard.title}
        subtitle={
          hasUnsavedChanges
            ? 'Unsaved changes - Ctrl+S to save'
            : `${mergedBoard.columns.length} columns • ${viewMode === 'table' ? 'Table View' : 'Kanban View'}`
        }
      />

      {/* Status messages */}
      {(isSaving || message) && (
        <Box paddingX={2}>
          {isSaving && <Text color="yellow">Saving...</Text>}
          {message && <Text color="green">{message}</Text>}
        </Box>
      )}

      {/* View mode indicator */}
      <Box paddingX={2} marginBottom={1}>
        <Text dimColor>
          {viewMode === 'table' ? '📊 Table View' : '📋 Kanban View'} • Press [v] to toggle
        </Text>
      </Box>

      {/* Table View */}
      {viewMode === 'table' && !confirmDeleteCard && (
        <Box flexDirection="column" flexGrow={1} paddingX={2}>
          {mergedBoard.columns.length === 0 ? (
            <Box padding={2}>
              <Text dimColor>No columns yet. Switch to Kanban view [v] to create columns.</Text>
            </Box>
          ) : (
            <>
              {/* Table Header - Show column titles */}
              <Box borderStyle="double" borderColor="cyan" paddingX={1} marginBottom={1}>
                {mergedBoard.columns.map((column, colIndex) => {
                  const isSelected = colIndex === selectedTableColumn;
                  const columnWidth = Math.floor(100 / mergedBoard.columns.length);
                  const isPending = column.id.startsWith('temp_');
                  
                  return (
                    <Box key={column.id} width={`${columnWidth}%`} paddingX={1}>
                      <Text 
                        bold 
                        color={isSelected ? 'yellow' : 'cyan'}
                        underline={isSelected}
                      >
                        {truncateText(column.title, 20)}
                      </Text>
                      <Text dimColor> ({column.cards.length})</Text>
                      {isPending && <Text color="yellow"> *</Text>}
                    </Box>
                  );
                })}
              </Box>

              {/* Table Body - Show cards in columns */}
              <Box flexGrow={1}>
                {(() => {
                  // Find the maximum number of cards in any column for row count
                  const maxRows = Math.max(
                    ...mergedBoard.columns.map(col => col.cards.length),
                    1
                  );
                  
                  return (
                    <Box flexDirection="column">
                      {Array.from({ length: maxRows }).map((_, rowIndex) => (
                        <Box key={rowIndex} marginBottom={1}>
                          {mergedBoard.columns.map((column, colIndex) => {
                            const columnWidth = Math.floor(100 / mergedBoard.columns.length);
                            const card = column.cards[rowIndex];
                            const isSelected = 
                              colIndex === selectedTableColumn && 
                              rowIndex === selectedTableRow &&
                              card !== undefined;
                            
                            return (
                              <Box 
                                key={`${column.id}-${rowIndex}`}
                                width={`${columnWidth}%`}
                                paddingX={1}
                                borderStyle={isSelected ? 'round' : undefined}
                                borderColor={isSelected ? 'yellow' : undefined}
                              >
                                {card ? (
                                  <Box flexDirection="column" width="100%">
                                    <Text 
                                      color={isSelected ? 'yellow' : undefined}
                                      bold={isSelected}
                                    >
                                      {isSelected ? '▶ ' : ''}
                                      {truncateText(card.title, 18)}
                                      {card.id.startsWith('temp_') && (
                                        <Text color="yellow"> *</Text>
                                      )}
                                    </Text>
                                    {card.description && (
                                      <Text dimColor={!isSelected} wrap="truncate">
                                        {truncateText(card.description, 18)}
                                      </Text>
                                    )}
                                  </Box>
                                ) : (
                                  <Text dimColor>—</Text>
                                )}
                              </Box>
                            );
                          })}
                        </Box>
                      ))}
                    </Box>
                  );
                })()}
              </Box>
            </>
          )}
        </Box>
      )}

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <>
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
                {mergedBoard.columns[moveTargetColumn]?.title || 'Unknown'}
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
                onConfirm={handleDeleteCardLocal}
                onCancel={() => setConfirmDeleteCard(null)}
              />
            </Box>
          ) : (
            /* Kanban columns */
            <Box flexGrow={1} paddingX={1}>
              {mergedBoard.columns.length === 0 ? (
                <Box padding={2}>
                  <Text dimColor>No columns yet. Press [c] to create one.</Text>
                </Box>
              ) : (
                mergedBoard.columns.map((column, colIndex) => {
              const isSelectedColumn = colIndex === selectedColumnIndex;
              const columnWidth = Math.floor(100 / mergedBoard.columns.length);
              const isPending = column.id.startsWith('temp_');

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
                    {isPending && <Text color="yellow"> *</Text>}
                  </Box>

                  {/* Cards */}
                  <Box flexDirection="column" paddingX={1} paddingY={1}>
                    {column.cards.length === 0 ? (
                      <Text dimColor>No cards</Text>
                    ) : (
                      column.cards.map((card, cardIndex) => {
                        const isSelectedCard =
                          isSelectedColumn && cardIndex === selectedCardIndex;
                        const isCardPending = card.id.startsWith('temp_');

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
                              {isCardPending && <Text color="yellow"> *</Text>}
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
        </>
      )}

      <StatusBar
        error={error}
        hints={
          viewMode === 'table'
            ? ['← → Columns', '↑↓ Cards', 'Enter View', 'v Toggle View', 'r Refresh', 'Esc Back']
            : mode === 'create-column' || mode === 'create-card'
            ? ['Enter Create', 'Esc Cancel']
            : mode === 'move-card'
            ? ['← → Select column', 'Enter Confirm', 'Esc Cancel']
            : [
                '← → Columns',
                '↑ ↓ Cards',
                'Enter Edit',
                'n Card',
                'c Column',
                'm Move',
                'd Delete',
                'v Toggle View',
                'Ctrl+S Save',
                'Esc Back',
              ]
        }
      />
    </Box>
  );
}
