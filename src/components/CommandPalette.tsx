import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { searchCommands, type Command } from '../utils/commands.js';
import { useApp } from '../context/index.js';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const { navigate, selectNote, selectTodo, selectBoard, selectCard } = useApp();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredCommands, setFilteredCommands] = useState<Command[]>([]);

  // Update filtered commands when query changes
  useEffect(() => {
    const results = searchCommands(query);
    setFilteredCommands(results);
    setSelectedIndex(0); // Reset selection when results change
  }, [query]);

  // Handle input
  useInput(
    (input, key) => {
      if (!isOpen) return;

      if (key.escape) {
        onClose();
        return;
      }

      if (key.upArrow) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
        return;
      }

      if (key.downArrow) {
        setSelectedIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
        return;
      }

      if (key.return) {
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

      // Add character to query
      if (input && !key.ctrl && !key.meta) {
        setQuery((prev) => prev + input);
      }
    },
    { isActive: isOpen }
  );

  const executeCommand = (command: Command) => {
    // Reset state
    setQuery('');
    setSelectedIndex(0);
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

  if (!isOpen) {
    return null;
  }

  return (
    <Box
      position="absolute"
      width="100%"
      height="100%"
      justifyContent="center"
      alignItems="flex-start"
      paddingTop={3}
    >
      {/* Command Palette Dialog */}
      <Box
        flexDirection="column"
        width="80%"
        borderStyle="double"
        borderColor="cyan"
        backgroundColor="black"
        padding={1}
      >
        {/* Header */}
        <Box marginBottom={1}>
          <Text bold color="cyan">
            ⚡ Command Palette
          </Text>
          <Text dimColor> (Ctrl+K to open/close)</Text>
        </Box>

        {/* Search Input */}
        <Box
          borderStyle="single"
          borderColor="yellow"
          paddingX={1}
          marginBottom={1}
        >
          <Text color="yellow">🔍 </Text>
          <Text>{query}</Text>
          <Text color="yellow">█</Text>
        </Box>

        {/* Results */}
        <Box flexDirection="column" flexGrow={1}>
          {filteredCommands.length === 0 ? (
            <Box paddingX={1}>
              <Text dimColor>No commands found. Try a different search.</Text>
            </Box>
          ) : (
            filteredCommands.slice(0, 10).map((command, index) => {
              const isSelected = index === selectedIndex;
              return (
                <Box
                  key={command.id}
                  paddingX={1}
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
        {filteredCommands.length > 10 && (
          <Box marginTop={1} paddingX={1}>
            <Text dimColor>
              Showing 10 of {filteredCommands.length} results
            </Text>
          </Box>
        )}

        {/* Hints */}
        <Box marginTop={1} paddingX={1} borderTop borderStyle="single" paddingTop={1}>
          <Text dimColor>
            ↑↓ Navigate • Enter Select • Esc Close
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
