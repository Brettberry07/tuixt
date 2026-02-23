import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { Header, Sidebar, StatusBar, InputField, ConfirmModal } from '../components/index.js';
import { useAuth, useApp, useWorkspace } from '../context/index.js';
import type { WorkspaceWithCounts } from '../types/index.js';

interface MenuItem {
  key: string;
  label: string;
  shortcut?: string;
}

const WORKSPACE_COLORS = ['blue', 'green', 'yellow', 'red', 'magenta', 'cyan', 'white'];
const WORKSPACE_ICONS = ['📁', '💼', '🎓', '🏠', '🎯', '💡', '🔧', '📚', '🎨', '🚀'];

export function WorkspacesListScreen() {
  const { user } = useAuth();
  const { navigate, setCurrentWorkspace, selectWorkspace, error, setError, clearError } = useApp();
  const { 
    workspacesWithCounts, 
    isLoadingCounts, 
    loadWorkspacesWithCounts,
    createWorkspace,
    deleteWorkspace,
    globalCounts,
    loadGlobalCounts,
  } = useWorkspace();
  
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<'list' | 'create'>('list');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Load workspaces on mount
  useEffect(() => {
    loadWorkspacesWithCounts();
    loadGlobalCounts();
  }, [loadWorkspacesWithCounts, loadGlobalCounts]);
  
  // Build menu items
  const menuItems: MenuItem[] = [
    // Global context option
    { key: 'global', label: '🌐 Global', shortcut: 'g' },
    // Workspace items
    ...workspacesWithCounts.map((ws, i) => ({
      key: ws.id,
      label: `${ws.icon} ${ws.name}`,
      shortcut: i < 9 ? String(i + 1) : undefined,
    })),
    // Create new option
    { key: 'create', label: '+ Create New', shortcut: 'c' },
    // Back
    { key: 'back', label: '← Back', shortcut: 'b' },
  ];
  
  const handleActivate = useCallback(async (key: string) => {
    if (key === 'global') {
      // Set to global context (null workspace)
      setCurrentWorkspace(null);
      navigate('dashboard');
    } else if (key === 'create') {
      setMode('create');
      setNewWorkspaceName('');
    } else if (key === 'back') {
      navigate('dashboard');
    } else {
      // Selected a workspace - navigate to workspace view
      const workspace = workspacesWithCounts.find(w => w.id === key);
      if (workspace) {
        selectWorkspace(workspace.id);
        setCurrentWorkspace(workspace.id);
        navigate('workspace-view');
      }
    }
  }, [navigate, setCurrentWorkspace, selectWorkspace, workspacesWithCounts]);
  
  const handleCreateWorkspace = useCallback(async () => {
    if (!newWorkspaceName.trim()) {
      setError('Workspace name is required');
      return;
    }
    
    const randomIcon = WORKSPACE_ICONS[Math.floor(Math.random() * WORKSPACE_ICONS.length)];
    const randomColor = WORKSPACE_COLORS[Math.floor(Math.random() * WORKSPACE_COLORS.length)];
    
    const result = await createWorkspace({
      name: newWorkspaceName.trim(),
      icon: randomIcon,
      color: randomColor,
    });
    
    if (result) {
      setMode('list');
      setNewWorkspaceName('');
      await loadWorkspacesWithCounts();
    }
  }, [newWorkspaceName, createWorkspace, loadWorkspacesWithCounts, setError]);
  
  const handleDeleteWorkspace = useCallback(async () => {
    const selectedItem = menuItems[selectedIndex];
    if (selectedItem && selectedItem.key !== 'global' && selectedItem.key !== 'create' && selectedItem.key !== 'back') {
      await deleteWorkspace(selectedItem.key);
      await loadWorkspacesWithCounts();
      await loadGlobalCounts();
      setShowDeleteConfirm(false);
      setSelectedIndex(0);
    }
  }, [selectedIndex, menuItems, deleteWorkspace, loadWorkspacesWithCounts, loadGlobalCounts]);
  
  // Keyboard navigation (only for non-arrow key actions - Sidebar handles arrows)
  useInput((input, key) => {
    if (mode === 'create') {
      if (key.escape) {
        setMode('list');
        setNewWorkspaceName('');
      } else if (key.return) {
        handleCreateWorkspace();
      }
      return;
    }
    
    if (showDeleteConfirm) {
      return; // Let ConfirmModal handle input
    }
    
    if (key.escape) {
      navigate('dashboard');
      return;
    }
    
    if (input === 'd' || key.delete) {
      // Delete selected workspace
      const selectedItem = menuItems[selectedIndex];
      if (selectedItem && selectedItem.key !== 'global' && selectedItem.key !== 'create' && selectedItem.key !== 'back') {
        setShowDeleteConfirm(true);
      }
    }
  }, { isActive: !showDeleteConfirm });
  
  if (isLoadingCounts) {
    return (
      <Box flexDirection="column" height="100%">
        <Header title="Workspaces" subtitle="Loading..." />
        <Box flexGrow={1} justifyContent="center" alignItems="center">
          <Text color="cyan">Loading workspaces...</Text>
        </Box>
      </Box>
    );
  }
  
  return (
    <Box flexDirection="column" height="100%">
      <Header
        title="Workspaces"
        subtitle={user ? `${workspacesWithCounts.length} workspace${workspacesWithCounts.length !== 1 ? 's' : ''}` : undefined}
      />
      
      <Box flexGrow={1}>
        <Sidebar
          items={menuItems}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
          onActivate={handleActivate}
          focused={mode === 'list' && !showDeleteConfirm}
        />
        
        <Box
          flexDirection="column"
          flexGrow={1}
          borderStyle="single"
          borderColor="gray"
          padding={2}
        >
          {mode === 'create' ? (
            <Box flexDirection="column">
              <Text bold color="yellow">Create New Workspace</Text>
              <Box marginTop={1}>
                <InputField
                  label="Name"
                  value={newWorkspaceName}
                  onChange={setNewWorkspaceName}
                  placeholder="e.g., Work, School, Personal"
                  focused={true}
                />
              </Box>
              <Box marginTop={1}>
                <Text dimColor>Press Enter to create, Escape to cancel</Text>
              </Box>
            </Box>
          ) : selectedIndex < menuItems.length && menuItems[selectedIndex] ? (
            <Box flexDirection="column">
              {menuItems[selectedIndex]!.key === 'global' ? (
                <>
                  <Text bold color="cyan">🌐 Global Context</Text>
                  <Box marginTop={1} flexDirection="column">
                    <Text>View all items across all workspaces.</Text>
                    <Box marginTop={1}>
                      <Text>
                        <Text color="yellow">{globalCounts?.notesCount || 0}</Text> unassigned notes
                      </Text>
                    </Box>
                    <Box>
                      <Text>
                        <Text color="green">{globalCounts?.todosCount || 0}</Text> unassigned todos
                      </Text>
                    </Box>
                    <Box>
                      <Text>
                        <Text color="magenta">{globalCounts?.boardsCount || 0}</Text> unassigned boards
                      </Text>
                    </Box>
                  </Box>
                </>
              ) : menuItems[selectedIndex]!.key === 'create' ? (
                <>
                  <Text bold color="green">Create New Workspace</Text>
                  <Box marginTop={1}>
                    <Text>Create a new workspace to organize your notes, todos, and boards.</Text>
                  </Box>
                  <Box marginTop={1}>
                    <Text dimColor>Press Enter to start creating a workspace.</Text>
                  </Box>
                </>
              ) : menuItems[selectedIndex]!.key === 'back' ? (
                <>
                  <Text bold color="gray">Back to Dashboard</Text>
                  <Box marginTop={1}>
                    <Text dimColor>Return to the main dashboard.</Text>
                  </Box>
                </>
              ) : (
                // Workspace details
                (() => {
                  const ws = workspacesWithCounts.find(w => w.id === menuItems[selectedIndex]!.key);
                  if (!ws) return null;
                  return (
                    <>
                      <Text bold color={ws.color as never}>
                        {ws.icon} {ws.name}
                      </Text>
                      {ws.description && (
                        <Box marginTop={1}>
                          <Text>{ws.description}</Text>
                        </Box>
                      )}
                      <Box marginTop={1} flexDirection="column">
                        <Text>
                          <Text color="yellow">{ws.notesCount}</Text> note{ws.notesCount !== 1 ? 's' : ''}
                        </Text>
                        <Text>
                          <Text color="green">{ws.todosCount}</Text> todo{ws.todosCount !== 1 ? 's' : ''}
                        </Text>
                        <Text>
                          <Text color="magenta">{ws.boardsCount}</Text> board{ws.boardsCount !== 1 ? 's' : ''}
                        </Text>
                      </Box>
                      <Box marginTop={2}>
                        <Text dimColor>Press Enter to open, D to delete</Text>
                      </Box>
                    </>
                  );
                })()
              )}
            </Box>
          ) : null}
        </Box>
      </Box>
      
      <StatusBar
        error={error}
        hints={['↑↓ Navigate', 'Enter Select', 'c Create', 'd Delete', 'Esc Back']}
      />
      
      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete Workspace"
          message="Are you sure you want to delete this workspace? Items will be moved to Global."
          onConfirm={handleDeleteWorkspace}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </Box>
  );
}
