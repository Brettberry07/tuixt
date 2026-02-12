-- tuixt Database Schema
-- Run this in your Supabase SQL editor to set up the database
-- 
-- This script is idempotent and can be run multiple times safely.
-- - Tables use CREATE TABLE IF NOT EXISTS
-- - Indexes use CREATE INDEX IF NOT EXISTS  
-- - Policies are wrapped in DO blocks that catch duplicate_object errors
-- - Triggers use DROP TRIGGER IF EXISTS before creating
-- - Functions use CREATE OR REPLACE
--
-- You can safely re-run this entire script to apply updates without errors.


-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS (safe to run multiple times)
DO $$ BEGIN
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Profiles policies
DO $$ BEGIN
  CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- NOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  date DATE,  -- Optional: associates note with a calendar date
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Indexes for notes
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON notes(user_id);
CREATE INDEX IF NOT EXISTS notes_updated_at_idx ON notes(updated_at DESC);

-- Enable RLS (safe to run multiple times)
DO $$ BEGIN
  ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Notes policies
DO $$ BEGIN
  CREATE POLICY "Users can view their own notes"
    ON notes FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create their own notes"
    ON notes FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own notes"
    ON notes FOR UPDATE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their own notes"
    ON notes FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- BOARDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Indexes for boards
CREATE INDEX IF NOT EXISTS boards_user_id_idx ON boards(user_id);

-- Enable RLS (safe to run multiple times)
DO $$ BEGIN
  ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Boards policies
DO $$ BEGIN
  CREATE POLICY "Users can view their own boards"
    ON boards FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create their own boards"
    ON boards FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own boards"
    ON boards FOR UPDATE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their own boards"
    ON boards FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- COLUMNS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Indexes for columns
CREATE INDEX IF NOT EXISTS columns_board_id_idx ON columns(board_id);
CREATE INDEX IF NOT EXISTS columns_board_position_idx ON columns(board_id, position);

-- Enable RLS (safe to run multiple times)
DO $$ BEGIN
  ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Columns policies (access through board ownership)
DO $$ BEGIN
  CREATE POLICY "Users can view columns of their boards"
    ON columns FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM boards
        WHERE boards.id = columns.board_id
        AND boards.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create columns in their boards"
    ON columns FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM boards
        WHERE boards.id = columns.board_id
        AND boards.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update columns in their boards"
    ON columns FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM boards
        WHERE boards.id = columns.board_id
        AND boards.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete columns in their boards"
    ON columns FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM boards
        WHERE boards.id = columns.board_id
        AND boards.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- CARDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id UUID NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Indexes for cards
CREATE INDEX IF NOT EXISTS cards_column_id_idx ON cards(column_id);
CREATE INDEX IF NOT EXISTS cards_column_position_idx ON cards(column_id, position);

-- Enable RLS (safe to run multiple times)
DO $$ BEGIN
  ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Cards policies (access through board ownership via column)
DO $$ BEGIN
  CREATE POLICY "Users can view cards in their boards"
    ON cards FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM columns
        JOIN boards ON boards.id = columns.board_id
        WHERE columns.id = cards.column_id
        AND boards.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create cards in their boards"
    ON cards FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM columns
        JOIN boards ON boards.id = columns.board_id
        WHERE columns.id = cards.column_id
        AND boards.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update cards in their boards"
    ON cards FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM columns
        JOIN boards ON boards.id = columns.board_id
        WHERE columns.id = cards.column_id
        AND boards.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete cards in their boards"
    ON cards FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM columns
        JOIN boards ON boards.id = columns.board_id
        WHERE columns.id = cards.column_id
        AND boards.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- TODOS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'done', 'cancelled')),
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Indexes for todos
CREATE INDEX IF NOT EXISTS todos_user_id_idx ON todos(user_id);
CREATE INDEX IF NOT EXISTS todos_status_idx ON todos(status);
CREATE INDEX IF NOT EXISTS todos_due_date_idx ON todos(due_date);
CREATE INDEX IF NOT EXISTS todos_updated_at_idx ON todos(updated_at DESC);

-- Enable RLS (safe to run multiple times)
DO $$ BEGIN
  ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Todos policies
DO $$ BEGIN
  CREATE POLICY "Users can view their own todos"
    ON todos FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create their own todos"
    ON todos FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own todos"
    ON todos FOR UPDATE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their own todos"
    ON todos FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- NOTE_TODOS TABLE (Junction Table)
-- ============================================
CREATE TABLE IF NOT EXISTS note_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(note_id, todo_id)
);

-- Indexes for note_todos
CREATE INDEX IF NOT EXISTS note_todos_note_id_idx ON note_todos(note_id);
CREATE INDEX IF NOT EXISTS note_todos_todo_id_idx ON note_todos(todo_id);

-- Enable RLS (safe to run multiple times)
DO $$ BEGIN
  ALTER TABLE note_todos ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Note_todos policies (access through ownership of either note or todo)
DO $$ BEGIN
  CREATE POLICY "Users can view their own note-todo links"
    ON note_todos FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM notes
        WHERE notes.id = note_todos.note_id
        AND notes.user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM todos
        WHERE todos.id = note_todos.todo_id
        AND todos.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create note-todo links for their items"
    ON note_todos FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM notes
        WHERE notes.id = note_todos.note_id
        AND notes.user_id = auth.uid()
      )
      AND
      EXISTS (
        SELECT 1 FROM todos
        WHERE todos.id = note_todos.todo_id
        AND todos.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their own note-todo links"
    ON note_todos FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM notes
        WHERE notes.id = note_todos.note_id
        AND notes.user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM todos
        WHERE todos.id = note_todos.todo_id
        AND todos.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for notes updated_at
DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for todos updated_at
DROP TRIGGER IF EXISTS update_todos_updated_at ON todos;
CREATE TRIGGER update_todos_updated_at
  BEFORE UPDATE ON todos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for cards updated_at
DROP TRIGGER IF EXISTS update_cards_updated_at ON cards;
CREATE TRIGGER update_cards_updated_at
  BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- GRANTS (for Supabase anon/authenticated roles)
-- ============================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions on tables
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON notes TO authenticated;
GRANT ALL ON boards TO authenticated;
GRANT ALL ON columns TO authenticated;
GRANT ALL ON cards TO authenticated;
GRANT ALL ON todos TO authenticated;
GRANT ALL ON note_todos TO authenticated;

-- Grant sequence permissions (for auto-generated UUIDs)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
