-- Workspaces Migration
-- Run this after schema.sql to add workspace support
-- 
-- This migration adds a "workspaces" system (Notion-style contexts)
-- allowing users to organize their todos, notes, and boards by workspace.
-- Items can belong to a workspace (e.g., "Work", "School") or be global (null workspace_id).
--
-- This script is idempotent and can be run multiple times safely.

-- ============================================
-- WORKSPACES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT DEFAULT '📁',  -- Emoji icon for the workspace
  color TEXT DEFAULT 'blue',  -- Color theme for the workspace
  position INTEGER NOT NULL DEFAULT 0,  -- For ordering workspaces
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Indexes for workspaces
CREATE INDEX IF NOT EXISTS workspaces_user_id_idx ON workspaces(user_id);
CREATE INDEX IF NOT EXISTS workspaces_user_position_idx ON workspaces(user_id, position);

-- Enable RLS
DO $$ BEGIN
  ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Workspaces policies
DO $$ BEGIN
  CREATE POLICY "Users can view their own workspaces"
    ON workspaces FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create their own workspaces"
    ON workspaces FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own workspaces"
    ON workspaces FOR UPDATE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their own workspaces"
    ON workspaces FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Trigger for workspaces updated_at
DROP TRIGGER IF EXISTS update_workspaces_updated_at ON workspaces;
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ADD workspace_id TO EXISTING TABLES
-- ============================================

-- Add workspace_id to notes (nullable for global/unassigned notes)
DO $$ BEGIN
  ALTER TABLE notes ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS notes_workspace_id_idx ON notes(workspace_id);

-- Add workspace_id to todos (nullable for global/unassigned todos)
DO $$ BEGIN
  ALTER TABLE todos ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS todos_workspace_id_idx ON todos(workspace_id);

-- Add workspace_id to boards (nullable for global/unassigned boards)
DO $$ BEGIN
  ALTER TABLE boards ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS boards_workspace_id_idx ON boards(workspace_id);

-- ============================================
-- UPDATE RLS POLICIES FOR WORKSPACE ACCESS
-- ============================================

-- Notes: Users can only see notes in their workspaces or global notes they own
-- (The existing policy already enforces user_id, so workspace access is implicit)

-- We add additional policies to ensure workspace access is checked
DO $$ BEGIN
  CREATE POLICY "Users can view notes in their workspaces"
    ON notes FOR SELECT
    USING (
      auth.uid() = user_id 
      AND (
        workspace_id IS NULL 
        OR EXISTS (
          SELECT 1 FROM workspaces 
          WHERE workspaces.id = notes.workspace_id 
          AND workspaces.user_id = auth.uid()
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view todos in their workspaces"
    ON todos FOR SELECT
    USING (
      auth.uid() = user_id 
      AND (
        workspace_id IS NULL 
        OR EXISTS (
          SELECT 1 FROM workspaces 
          WHERE workspaces.id = todos.workspace_id 
          AND workspaces.user_id = auth.uid()
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view boards in their workspaces"
    ON boards FOR SELECT
    USING (
      auth.uid() = user_id 
      AND (
        workspace_id IS NULL 
        OR EXISTS (
          SELECT 1 FROM workspaces 
          WHERE workspaces.id = boards.workspace_id 
          AND workspaces.user_id = auth.uid()
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- GRANTS
-- ============================================
GRANT ALL ON workspaces TO authenticated;
