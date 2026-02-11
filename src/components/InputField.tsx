import React from 'react';
import { Box, Text } from 'ink';
import InkTextInput from 'ink-text-input';

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mask?: string;
  focused?: boolean;
}

export function InputField({
  label,
  value,
  onChange,
  placeholder = '',
  mask,
  focused = true,
}: InputFieldProps) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color={focused ? 'cyan' : 'gray'}>
        {label}
      </Text>
      <Box>
        <Text dimColor>{'> '}</Text>
        {focused ? (
          <InkTextInput
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            mask={mask}
          />
        ) : (
          <Text dimColor>{mask ? value.replace(/./g, mask) : value || placeholder}</Text>
        )}
      </Box>
    </Box>
  );
}
