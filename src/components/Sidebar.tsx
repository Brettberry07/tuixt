import React from 'react';
import { Box, Text, useInput } from 'ink';

interface SidebarItem {
  key: string;
  label: string;
  shortcut?: string;
}

interface SidebarProps {
  items: SidebarItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onActivate: (key: string) => void;
  focused?: boolean;
}

export function Sidebar({
  items,
  selectedIndex,
  onSelect,
  onActivate,
  focused = true,
}: SidebarProps) {
  useInput(
    (input, key) => {
      if (!focused) return;

      if (key.upArrow) {
        const newIndex = selectedIndex > 0 ? selectedIndex - 1 : items.length - 1;
        onSelect(newIndex);
      } else if (key.downArrow) {
        const newIndex = selectedIndex < items.length - 1 ? selectedIndex + 1 : 0;
        onSelect(newIndex);
      } else if (key.return) {
        const item = items[selectedIndex];
        if (item) {
          onActivate(item.key);
        }
      } else {
        // Check for shortcut keys
        const item = items.find((i) => i.shortcut?.toLowerCase() === input.toLowerCase());
        if (item) {
          onActivate(item.key);
        }
      }
    },
    { isActive: focused }
  );

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={focused ? 'cyan' : 'gray'}
      width={24}
      paddingX={1}
    >
      <Text bold color="yellow" underline>
        Menu
      </Text>
      <Box marginTop={1} flexDirection="column">
        {items.map((item, index) => {
          const isSelected = index === selectedIndex && focused;
          return (
            <Box key={item.key}>
              <Text
                color={isSelected ? 'cyan' : undefined}
                inverse={isSelected}
              >
                {isSelected ? '▶ ' : '  '}
                {item.label}
                {item.shortcut && (
                  <Text dimColor> [{item.shortcut}]</Text>
                )}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
