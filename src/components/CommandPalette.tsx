import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { searchCommands, type Command } from '../utils/commands.js';
import { globalSearch, type SearchResult } from '../utils/search.js';
import { useApp } from '../context/index.js';
import { createNote } from '../services/notes.js';
import { createTodo } from '../services/todos.js';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const { navigate, selectNote, selectTodo, selectBoard, selectCard, setError } = useApp();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredCommands, setFilteredCommands] = useState<Command[]>([]);
  const [quickActionPreview, setQuickActionPreview] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState(false);

  // Parse quick action from query
  const parseQuickAction = (input: string): { type: 'note' | 'todo' | 'pomodoro' | null; title: string; content?: string } => {
    const trimmed = input.trim();
    
    // Pattern: "start pomodoro" or "pomodoro" or "pomo"
    const pomodoroMatch = trimmed.match(/^(?:start\s+)?(?:pomodoro|pomo)(?:\s+start)?$/i);
    if (pomodoroMatch) {
      return { type: 'pomodoro', title: '' };
    }
    
    // Pattern: "new note <title> <content>"
    const noteMatch = trimmed.match(/^(?:new\s+)?note\s+(.+)$/i);
    if (noteMatch) {
      const rest = noteMatch[1].trim();
      // Split on first occurrence of two spaces or pipe to separate title from content
      const splitMatch = rest.match(/^([^|]+)(?:\||\s{2,})(.+)$/);
      if (splitMatch) {
        return { type: 'note', title: splitMatch[1].trim(), content: splitMatch[2].trim() };
      }
      return { type: 'note', title: rest, content: '' };
    }
    
    // Pattern: "new todo <title>"
    const todoMatch = trimmed.match(/^(?:new\s+)?todo\s+(.+)$/i);
    if (todoMatch) {
      return { type: 'todo', title: todoMatch[1].trim() };
    }
    
    return { type: null, title: '' };
  };

  // Update filtered commands and quick action preview when query changes
  useEffect(() => {
    // Check if in global search mode (query starts with '>')
    if (query.startsWith('>')) {
      setSearchMode(true);
      const searchQuery = query.slice(1).trim();
      
      if (searchQuery.length > 0) {
        setIsSearching(true);
        globalSearch(searchQuery).then((results) => {
          setSearchResults(results);
          setIsSearching(false);
        });
      } else {
        setSearchResults([]);
      }
      
      setQuickActionPreview(null);
      setFilteredCommands([]);
      setSelectedIndex(0);
      return;
    }
    
    setSearchMode(false);
    setSearchResults([]);
    
    const quickAction = parseQuickAction(query);
    
    if (quickAction.type === 'note') {
      setQuickActionPreview(`⚡ Quick create note: "${quickAction.title}"${quickAction.content ? ` with content` : ''}`);
      setFilteredCommands([]);
    } else if (quickAction.type === 'todo') {
      setQuickActionPreview(`⚡ Quick create todo: "${quickAction.title}"`);
      setFilteredCommands([]);
    } else if (quickAction.type === 'pomodoro') {
      setQuickActionPreview(`⚡ Quick start Pomodoro timer`);
      setFilteredCommands([]);
    } else {
      setQuickActionPreview(null);
      const results = searchCommands(query);
      setFilteredCommands(results);
    }
    
    setSelectedIndex(0); // Reset selection when results change
  }, [query]);

  // Handle input - this should be the ONLY active handler when palette is open
  useInput(
    (input, key) => {
      // Always consume input when palette is open to prevent it reaching other screens
      if (!isOpen) return;

      if (key.escape) {
        onClose();
        return;
      }

      if (key.upArrow) {
        const maxIndex = searchMode ? searchResults.length - 1 : filteredCommands.length - 1;
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
        return;
      }

      if (key.downArrow) {
        const maxIndex = searchMode ? searchResults.length - 1 : filteredCommands.length - 1;
        setSelectedIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
        return;
      }

      if (key.return) {
        // Check for search mode
        if (searchMode && searchResults.length > 0) {
          const result = searchResults[selectedIndex];
          if (result) {
            executeSearchResult(result);
          }
          return;
        }
        
        // Check for quick actions first
        const quickAction = parseQuickAction(query);
        if (quickAction.type) {
          executeQuickAction(quickAction);
          return;
        }
        
        // Otherwise execute selected command
        const command = filteredCommands[selectedIndex];
        if (command) {
          executeCommand(command);
        }
        return;
      }

      if (key.backspace || key.delete) {
        setQuery((prev) => prev.slice(0, -1));
        return;
      }

      // Add character to query (but not Ctrl+K which is handled globally)
      if (input && !key.ctrl && !key.meta) {
        setQuery((prev) => prev + input);
      }
    },
    { isActive: isOpen }
  );

  const executeQuickAction = async (action: { type: 'note' | 'todo' | 'pomodoro' | null; title: string; content?: string }) => {
    // Reset state
    setQuery('');
    setSelectedIndex(0);
    setQuickActionPreview(null);
    onClose();

    if (action.type === 'note') {
      const result = await createNote({
        title: action.title,
        content: action.content || '',
      });
      
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        // Navigate to the newly created note
        selectNote(result.data.id);
        navigate('note-editor');
      }
    } else if (action.type === 'todo') {
      const result = await createTodo({
        title: action.title,
        description: '',
        status: 'todo',
      });
      
      if (result.error) {
        setError(result.error);
      } else {
        // Navigate to todos list to see the new todo
        navigate('todos');
      }
    } else if (action.type === 'pomodoro') {
      // Navigate to pomodoro timer
      navigate('pomodoro');
    }
  };

  const executeCommand = (command: Command) => {
    // Reset state
    setQuery('');
    setSelectedIndex(0);
    setQuickActionPreview(null);
    onClose();

    // Execute the command action
    if (command.action.type === 'navigate' && command.action.screen) {
      // Clear selections based on screen
      switch (command.action.screen) {
        case 'note-editor':
          selectNote(null); // New note
          break;
        case 'todo-editor':
          selectTodo(null); // New todo
          break;
        case 'board-view':
          // Keep current board selected
          break;
        case 'card-editor':
          selectCard(null); // New card
          break;
      }
      navigate(command.action.screen);
    } else if (command.action.type === 'function' && command.action.callback) {
      command.action.callback();
    }
  };

  const executeSearchResult = (result: SearchResult) => {
    // Reset state
    setQuery('');
    setSelectedIndex(0);
    setSearchMode(false);
    setSearchResults([]);
    onClose();

    // Navigate based on result type
    switch (result.type) {
      case 'note':
        selectNote(result.id);
        navigate('note-editor');
        break;
      case 'todo':
        selectTodo(result.id);
        navigate('todo-editor');
        break;
      case 'board':
        selectBoard(result.id);
        navigate('board-view');
        break;
      case 'card':
        if (result.parentId) {
          selectBoard(result.parentId);
          selectCard(result.id);
          navigate('card-editor');
        }
        break;
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Box
      position="absolute"
      width="100%"
      height="100%"
      justifyContent="center"
      alignItems="center"
    >
      {/* Command Palette Dialog */}
      <Box
        flexDirection="column"
        width={80}
        borderStyle="double"
        borderColor="cyan"
        backgroundColor="black"
        padding={1}
      >
        {/* Header */}
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color="cyan">
            ⚡ Command Palette
          </Text>
          <Text dimColor>  (Ctrl+K to open/close)</Text>
        </Box>

        {/* Search Input */}
        <Box justifyContent="center" marginBottom={1}>
          <Box
            borderStyle="single"
            borderColor="yellow"
            paddingX={1}
            width={60}
          >
            <Text color="yellow">🔍 </Text>
            <Text>{query}</Text>
            <Text color="yellow">█</Text>
          </Box>
        </Box>

        {/* Results */}
        <Box flexDirection="column">
          {searchMode ? (
            // Global search mode
            isSearching ? (
              <Box paddingX={1}>
                <Text color="yellow">Searching...</Text>
              </Box>
            ) : searchResults.length === 0 ? (
              <Box flexDirection="column" paddingX={1}>
                <Text dimColor>
                  {query.length > 1 ? 'No results found.' : 'Type to search across all notes, todos, boards, and cards'}
                </Text>
              </Box>
            ) : (
              searchResults.slice(0, 10).map((result, index) => {
                const isSelected = index === selectedIndex;
                const typeColors: Record<string, string> = {
                  note: 'blue',
                  todo: 'green',
                  board: 'magenta',
                  card: 'yellow',
                };
                const typeIcons: Record<string, string> = {
                  note: '📝',
                  todo: '✓',
                  board: '📋',
                  card: '🗂',
                };
                
                return (
                  <Box
                    key={`${result.type}-${result.id}`}
                    backgroundColor={isSelected ? 'cyan' : undefined}
                    paddingX={1}
                    marginBottom={0}
                  >
                    <Box width={3}>
                      <Text color={isSelected ? 'black' : 'cyan'}>
                        {isSelected ? '▶' : ' '}
                      </Text>
                    </Box>
                    <Box width={3}>
                      <Text>{typeIcons[result.type]}</Text>
                    </Box>
                    <Box flexDirection="column" flexGrow={1}>
                      <Text
                        bold={isSelected}
                        color={isSelected ? 'black' : undefined}
                      >
                        {result.title}
                      </Text>
                      {result.description && (
                        <Text
                          dimColor={!isSelected}
                          color={isSelected ? 'black' : undefined}
                        >
                          {result.description}
                        </Text>
                      )}
                      {result.metadata && (
                        <Text
                          dimColor={!isSelected}
                          color={isSelected ? 'black' : undefined}
                          italic
                        >
                          {result.metadata}
                        </Text>
                      )}
                    </Box>
                    <Box marginLeft={1}>
                      <Text
                        color={isSelected ? 'black' : typeColors[result.type]}
                        bold={!isSelected}
                      >
                        {result.type.toUpperCase()}
                      </Text>
                    </Box>
                  </Box>
                );
              })
            )
          ) : quickActionPreview ? (
            <Box flexDirection="column">
              <Box backgroundColor="green" paddingX={1}>
                <Text bold color="black">Quick Action Ready</Text>
              </Box>
              <Box marginTop={1} paddingX={1}>
                <Text color="green">{quickActionPreview}</Text>
              </Box>
              <Box marginTop={1} paddingX={1}>
                <Text dimColor>Press Enter to create</Text>
              </Box>
            </Box>
          ) : filteredCommands.length === 0 ? (
            <Box flexDirection="column">
              <Text dimColor>No commands found.</Text>
              <Box marginTop={1}>
                <Text dimColor>Try: </Text>
                <Text color="cyan">note Title | Content</Text>
                <Text dimColor> or </Text>
                <Text color="cyan">todo Task name</Text>
                <Text dimColor> or </Text>
                <Text color="cyan">start pomodoro</Text>
              </Box>
              <Box marginTop={1}>
                <Text dimColor>Global search: </Text>
                <Text color="magenta">&gt;search query</Text>
              </Box>
            </Box>
          ) : (
            filteredCommands.slice(0, 10).map((command, index) => {
              const isSelected = index === selectedIndex;
              return (
                <Box
                  key={command.id}
                  backgroundColor={isSelected ? 'cyan' : undefined}
                >
                  <Box width={3}>
                    <Text color={isSelected ? 'black' : 'cyan'}>
                      {isSelected ? '▶' : ' '}
                    </Text>
                  </Box>
                  <Box flexDirection="column" flexGrow={1}>
                    <Text
                      bold={isSelected}
                      color={isSelected ? 'black' : undefined}
                    >
                      {command.label}
                    </Text>
                    {command.description && (
                      <Text
                        dimColor={!isSelected}
                        color={isSelected ? 'black' : undefined}
                      >
                        {command.description}
                      </Text>
                    )}
                  </Box>
                  {command.category && (
                    <Box marginLeft={2}>
                      <Text
                        dimColor={!isSelected}
                        color={isSelected ? 'black' : undefined}
                        italic
                      >
                        [{command.category}]
                      </Text>
                    </Box>
                  )}
                </Box>
              );
            })
          )}
        </Box>

        {/* Footer */}
        {searchMode && searchResults.length > 10 && (
          <Box marginTop={1}>
            <Text dimColor>
              Showing 10 of {searchResults.length} results
            </Text>
          </Box>
        )}
        {!quickActionPreview && !searchMode && filteredCommands.length > 10 && (
          <Box marginTop={1}>
            <Text dimColor>
              Showing 10 of {filteredCommands.length} results
            </Text>
          </Box>
        )}

        {/* Hints */}
        <Box marginTop={1} borderTop borderStyle="single" paddingTop={1} flexDirection="column">
          <Text dimColor>
            ↑↓ Navigate • Enter Select • Esc Close
          </Text>
          {searchMode ? (
            <Text dimColor>
              Global search mode: <Text color="magenta">&gt;query</Text> to search everywhere
            </Text>
          ) : !quickActionPreview && (
            <Text dimColor>
              Quick: <Text color="cyan">note Title|Content</Text> • <Text color="cyan">todo Task</Text> • <Text color="cyan">pomo</Text> • <Text color="magenta">&gt;search</Text>
            </Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}
