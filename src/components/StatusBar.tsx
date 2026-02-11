import React from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';

interface StatusBarProps {
  error?: string | null;
  message?: string | null;
  hints?: string[];
}

export function StatusBar({ error, message, hints = [] }: StatusBarProps) {
  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
    >
      {error ? (
        <Text color="red">{chalk.bold('Error:')} {error}</Text>
      ) : message ? (
        <Text color="green">{message}</Text>
      ) : hints.length > 0 ? (
        <Text dimColor>{hints.join(' | ')}</Text>
      ) : (
        <Text dimColor>Ready</Text>
      )}
    </Box>
  );
}
