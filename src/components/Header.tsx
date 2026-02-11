import React from 'react';
import { Box, Text } from 'ink';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="cyan"
      paddingX={2}
      marginBottom={1}
    >
      <Text bold color="cyan">
        {title}
      </Text>
      {subtitle && <Text dimColor>{subtitle}</Text>}
    </Box>
  );
}
