import React from 'react';
import { Box, Text, useInput } from 'ink';
import { useApp } from '../context/index.js';

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { isCommandPaletteOpen } = useApp();

  useInput((input, key) => {
    if (input.toLowerCase() === 'y' || key.return) {
      onConfirm();
    } else if (input.toLowerCase() === 'n' || key.escape) {
      onCancel();
    }
  }, { isActive: !isCommandPaletteOpen });

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="yellow"
      padding={1}
      width={50}
    >
      <Text bold color="yellow">
        {title}
      </Text>
      <Box marginY={1}>
        <Text>{message}</Text>
      </Box>
      <Box>
        <Text dimColor>
          Press <Text color="green">[Y]</Text> to confirm or{' '}
          <Text color="red">[N]</Text> to cancel
        </Text>
      </Box>
    </Box>
  );
}
