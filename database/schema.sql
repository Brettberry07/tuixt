-- tuixt Database Schema
-- Run this in your Supabase SQL editor to set up the database

-- Enable Row Level Security
ALTER DATABASE postgres SET "auth.uid" TO '';

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Indexes for notes
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON notes(user_id);
CREATE INDEX IF NOT EXISTS notes_updated_at_idx ON notes(updated_at DESC);

-- Enable RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Notes policies
CREATE POLICY "Users can view their own notes"
  ON notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes"
  ON notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON notes FOR DELETE
  USING (auth.uid() = user_id);

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

-- Enable RLS
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;

-- Boards policies
CREATE POLICY "Users can view their own boards"
  ON boards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own boards"
  ON boards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own boards"
  ON boards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own boards"
  ON boards FOR DELETE
  USING (auth.uid() = user_id);

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

-- Enable RLS
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;

-- Columns policies (access through board ownership)
CREATE POLICY "Users can view columns of their boards"
  ON columns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = columns.board_id
      AND boards.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create columns in their boards"
  ON columns FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = columns.board_id
      AND boards.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update columns in their boards"
  ON columns FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = columns.board_id
      AND boards.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete columns in their boards"
  ON columns FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = columns.board_id
      AND boards.user_id = auth.uid()
    )
  );

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

-- Enable RLS
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Cards policies (access through board ownership via column)
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

-- Grant sequence permissions (for auto-generated UUIDs)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
