import React from 'react';
import { Box, Text } from 'ink';
import { renderMarkdown } from '../utils/markdown.js';

interface MarkdownPreviewProps {
  content: string;
  title?: string;
}

export function MarkdownPreview({ content, title }: MarkdownPreviewProps) {
  const rendered = renderMarkdown(content);

  return (
    <Box flexDirection="column" padding={1}>
      {title && (
        <Box marginBottom={1}>
          <Text bold color="yellow" underline>
            Preview
          </Text>
        </Box>
      )}
      <Box flexDirection="column">
        <Text>{rendered}</Text>
      </Box>
    </Box>
  );
}
