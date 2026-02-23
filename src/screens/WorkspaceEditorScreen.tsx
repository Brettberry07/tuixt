import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { Header, StatusBar, InputField } from '../components/index.js';
import { useApp, useWorkspace } from '../context/index.js';
import type { Workspace } from '../types/index.js';

const WORKSPACE_ICONS = ['📁', '💼', '🎓', '🏠', '🎯', '💡', '🔧', '📚', '🎨', '🚀', '🌟', '⚡', '🎮', '🎵', '📷'];
const WORKSPACE_COLORS = ['blue', 'green', 'yellow', 'red', 'magenta', 'cyan', 'white'];

type Field = 'name' | 'description' | 'icon' | 'color';

export function WorkspaceEditorScreen() {
  const { navigate, selectedWorkspaceId, error, setError, clearError } = useApp();
  const { loadWorkspace, updateWorkspace, createWorkspace } = useWorkspace();
  
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📁');
  const [iconIndex, setIconIndex] = useState(0);
  const [color, setColor] = useState('blue');
  const [colorIndex, setColorIndex] = useState(0);
  const [currentField, setCurrentField] = useState<Field>('name');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const isNewWorkspace = !selectedWorkspaceId;
  
  // Load workspace data if editing
  useEffect(() => {
    async function loadData() {
      if (selectedWorkspaceId) {
        setIsLoading(true);
        const ws = await loadWorkspace(selectedWorkspaceId);
        if (ws) {
          setWorkspace(ws);
          setName(ws.name);
          setDescription(ws.description);
          setIcon(ws.icon);
          setIconIndex(WORKSPACE_ICONS.indexOf(ws.icon));
          setColor(ws.color);
          setColorIndex(WORKSPACE_COLORS.indexOf(ws.color));
        }
        setIsLoading(false);
      }
    }
    
    loadData();
  }, [selectedWorkspaceId, loadWorkspace]);
  
  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setError('Workspace name is required');
      return;
    }
    
    setIsSaving(true);
    clearError();
    
    if (isNewWorkspace) {
      const result = await createWorkspace({
        name: name.trim(),
        description: description.trim(),
        icon,
        color,
      });
      
      if (result) {
        navigate('workspaces');
      }
    } else if (selectedWorkspaceId) {
      const result = await updateWorkspace(selectedWorkspaceId, {
        name: name.trim(),
        description: description.trim(),
        icon,
        color,
      });
      
      if (result) {
        navigate('workspace-view');
      }
    }
    
    setIsSaving(false);
  }, [name, description, icon, color, isNewWorkspace, selectedWorkspaceId, createWorkspace, updateWorkspace, navigate, setError, clearError]);
  
  const fields: Field[] = ['name', 'description', 'icon', 'color'];
  
  // Keyboard navigation
  useInput((input, key) => {
    if (key.escape) {
      if (isNewWorkspace) {
        navigate('workspaces');
      } else {
        navigate('workspace-view');
      }
      return;
    }
    
    if (key.tab || (key.downArrow && currentField !== 'name' && currentField !== 'description')) {
      const currentIndex = fields.indexOf(currentField);
      const nextIndex = (currentIndex + 1) % fields.length;
      setCurrentField(fields[nextIndex]!);
    } else if (key.shift && key.tab) {
      const currentIndex = fields.indexOf(currentField);
      const prevIndex = (currentIndex - 1 + fields.length) % fields.length;
      setCurrentField(fields[prevIndex]!);
    }
    
    // Icon selection with left/right arrows
    if (currentField === 'icon') {
      if (key.leftArrow) {
        const newIndex = (iconIndex - 1 + WORKSPACE_ICONS.length) % WORKSPACE_ICONS.length;
        setIconIndex(newIndex);
        setIcon(WORKSPACE_ICONS[newIndex]!);
      } else if (key.rightArrow) {
        const newIndex = (iconIndex + 1) % WORKSPACE_ICONS.length;
        setIconIndex(newIndex);
        setIcon(WORKSPACE_ICONS[newIndex]!);
      }
    }
    
    // Color selection with left/right arrows
    if (currentField === 'color') {
      if (key.leftArrow) {
        const newIndex = (colorIndex - 1 + WORKSPACE_COLORS.length) % WORKSPACE_COLORS.length;
        setColorIndex(newIndex);
        setColor(WORKSPACE_COLORS[newIndex]!);
      } else if (key.rightArrow) {
        const newIndex = (colorIndex + 1) % WORKSPACE_COLORS.length;
        setColorIndex(newIndex);
        setColor(WORKSPACE_COLORS[newIndex]!);
      }
    }
    
    // Ctrl+S to save
    if (key.ctrl && input === 's') {
      handleSave();
    }
  });
  
  if (isLoading) {
    return (
      <Box flexDirection="column" height="100%">
        <Header title="Edit Workspace" subtitle="Loading..." />
        <Box flexGrow={1} justifyContent="center" alignItems="center">
          <Text color="cyan">Loading...</Text>
        </Box>
      </Box>
    );
  }
  
  return (
    <Box flexDirection="column" height="100%">
      <Header
        title={isNewWorkspace ? 'Create Workspace' : 'Edit Workspace'}
        subtitle={isSaving ? 'Saving...' : undefined}
      />
      
      <Box flexGrow={1} flexDirection="column" padding={2}>
        {/* Preview */}
        <Box marginBottom={2}>
          <Text bold color={color as never}>
            {icon} {name || 'Untitled Workspace'}
          </Text>
        </Box>
        
        {/* Name field */}
        <Box marginBottom={1}>
          <InputField
            label="Name"
            value={name}
            onChange={setName}
            placeholder="Workspace name"
            focused={currentField === 'name'}
          />
        </Box>
        
        {/* Description field */}
        <Box marginBottom={1}>
          <InputField
            label="Description"
            value={description}
            onChange={setDescription}
            placeholder="Optional description"
            focused={currentField === 'description'}
          />
        </Box>
        
        {/* Icon selector */}
        <Box marginBottom={1} flexDirection="column">
          <Text>
            <Text bold color={currentField === 'icon' ? 'cyan' : 'white'}>Icon: </Text>
            <Text>{icon}</Text>
            {currentField === 'icon' && (
              <Text dimColor> (use ←/→ to change)</Text>
            )}
          </Text>
          {currentField === 'icon' && (
            <Box marginTop={1}>
              {WORKSPACE_ICONS.map((i, idx) => (
                <Text key={idx} color={idx === iconIndex ? 'cyan' : 'white'}>
                  {idx === iconIndex ? `[${i}]` : ` ${i} `}
                </Text>
              ))}
            </Box>
          )}
        </Box>
        
        {/* Color selector */}
        <Box marginBottom={1} flexDirection="column">
          <Text>
            <Text bold color={currentField === 'color' ? 'cyan' : 'white'}>Color: </Text>
            <Text color={color as never}>{color}</Text>
            {currentField === 'color' && (
              <Text dimColor> (use ←/→ to change)</Text>
            )}
          </Text>
          {currentField === 'color' && (
            <Box marginTop={1}>
              {WORKSPACE_COLORS.map((c, idx) => (
                <Text key={c} color={c as never}>
                  {idx === colorIndex ? `[${c}]` : ` ${c} `}
                </Text>
              ))}
            </Box>
          )}
        </Box>
        
        {/* Actions */}
        <Box marginTop={2} flexDirection="column">
          <Text dimColor>Tab to switch fields, Ctrl+S to save, Esc to cancel</Text>
        </Box>
      </Box>
      
      <StatusBar
        error={error}
        hints={['Tab Next Field', 'Ctrl+S Save', 'Esc Cancel']}
      />
    </Box>
  );
}
