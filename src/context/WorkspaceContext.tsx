import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { Workspace, WorkspaceWithCounts } from '../types/index.js';
import {
  fetchWorkspaces,
  fetchWorkspacesWithCounts,
  fetchWorkspace,
  createWorkspace as createWorkspaceService,
  updateWorkspace as updateWorkspaceService,
  deleteWorkspace as deleteWorkspaceService,
  fetchGlobalCounts,
  fetchTotalCounts,
} from '../services/workspaces.js';
import type { CreateWorkspaceInput, UpdateWorkspaceInput } from '../types/index.js';

interface WorkspaceContextType {
  // Data
  workspaces: Workspace[];
  workspacesWithCounts: WorkspaceWithCounts[];
  currentWorkspace: Workspace | null;
  globalCounts: { notesCount: number; todosCount: number; boardsCount: number } | null;
  totalCounts: { notesCount: number; todosCount: number; boardsCount: number; workspacesCount: number } | null;
  
  // Loading states
  isLoading: boolean;
  isLoadingCounts: boolean;
  
  // Error
  error: string | null;
  
  // Actions
  loadWorkspaces: () => Promise<void>;
  loadWorkspacesWithCounts: () => Promise<void>;
  loadWorkspace: (id: string) => Promise<Workspace | null>;
  loadGlobalCounts: () => Promise<void>;
  loadTotalCounts: () => Promise<void>;
  createWorkspace: (input: CreateWorkspaceInput) => Promise<Workspace | null>;
  updateWorkspace: (id: string, input: UpdateWorkspaceInput) => Promise<Workspace | null>;
  deleteWorkspace: (id: string) => Promise<boolean>;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  clearError: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspacesWithCounts, setWorkspacesWithCounts] = useState<WorkspaceWithCounts[]>([]);
  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace | null>(null);
  const [globalCounts, setGlobalCounts] = useState<{ notesCount: number; todosCount: number; boardsCount: number } | null>(null);
  const [totalCounts, setTotalCounts] = useState<{ notesCount: number; todosCount: number; boardsCount: number; workspacesCount: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspaces = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    const result = await fetchWorkspaces();
    
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setWorkspaces(result.data);
    }
    
    setIsLoading(false);
  }, []);

  const loadWorkspacesWithCounts = useCallback(async () => {
    setIsLoadingCounts(true);
    setError(null);
    
    const result = await fetchWorkspacesWithCounts();
    
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setWorkspacesWithCounts(result.data);
      // Also update the base workspaces array
      setWorkspaces(result.data);
    }
    
    setIsLoadingCounts(false);
  }, []);

  const loadWorkspace = useCallback(async (id: string): Promise<Workspace | null> => {
    setIsLoading(true);
    setError(null);
    
    const result = await fetchWorkspace(id);
    
    if (result.error) {
      setError(result.error);
      setIsLoading(false);
      return null;
    }
    
    setIsLoading(false);
    return result.data;
  }, []);

  const loadGlobalCounts = useCallback(async () => {
    const result = await fetchGlobalCounts();
    
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setGlobalCounts(result.data);
    }
  }, []);

  const loadTotalCounts = useCallback(async () => {
    const result = await fetchTotalCounts();
    
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setTotalCounts(result.data);
    }
  }, []);

  const createWorkspace = useCallback(async (input: CreateWorkspaceInput): Promise<Workspace | null> => {
    setIsLoading(true);
    setError(null);
    
    const result = await createWorkspaceService(input);
    
    if (result.error) {
      setError(result.error);
      setIsLoading(false);
      return null;
    }
    
    if (result.data) {
      // Add to workspaces list
      setWorkspaces(prev => [...prev, result.data!]);
    }
    
    setIsLoading(false);
    return result.data;
  }, []);

  const updateWorkspace = useCallback(async (id: string, input: UpdateWorkspaceInput): Promise<Workspace | null> => {
    setIsLoading(true);
    setError(null);
    
    const result = await updateWorkspaceService(id, input);
    
    if (result.error) {
      setError(result.error);
      setIsLoading(false);
      return null;
    }
    
    if (result.data) {
      // Update in workspaces list
      setWorkspaces(prev => prev.map(w => w.id === id ? result.data! : w));
      
      // Update current workspace if it's the one being edited
      if (currentWorkspace?.id === id) {
        setCurrentWorkspaceState(result.data);
      }
    }
    
    setIsLoading(false);
    return result.data;
  }, [currentWorkspace]);

  const deleteWorkspace = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    const result = await deleteWorkspaceService(id);
    
    if (result.error) {
      setError(result.error);
      setIsLoading(false);
      return false;
    }
    
    // Remove from workspaces list
    setWorkspaces(prev => prev.filter(w => w.id !== id));
    
    // Clear current workspace if it was deleted
    if (currentWorkspace?.id === id) {
      setCurrentWorkspaceState(null);
    }
    
    setIsLoading(false);
    return true;
  }, [currentWorkspace]);

  const setCurrentWorkspace = useCallback((workspace: Workspace | null) => {
    setCurrentWorkspaceState(workspace);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: WorkspaceContextType = {
    workspaces,
    workspacesWithCounts,
    currentWorkspace,
    globalCounts,
    totalCounts,
    isLoading,
    isLoadingCounts,
    error,
    loadWorkspaces,
    loadWorkspacesWithCounts,
    loadWorkspace,
    loadGlobalCounts,
    loadTotalCounts,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    setCurrentWorkspace,
    clearError,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextType {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
