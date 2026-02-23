# tuixt — Complete Feature Documentation

`tuixt` is a terminal-first, cloud-backed productivity app built with React + Ink and Supabase. It provides a keyboard-driven interface for managing notes, todos, kanban boards, calendars, and Pomodoro sessions.

## Core Architecture

### Technology stack

- Frontend: React 19 + Ink (terminal UI)
- Backend: Supabase (Postgres + Auth)
- Language: TypeScript
- Authentication: Supabase email/password with session persistence
- Database: PostgreSQL with Row Level Security (RLS)

### Application structure

- 11 main screens with full keyboard navigation
- Database tables: `profiles`, `notes`, `boards`, `columns`, `cards`, `todos`, `note_todos`
- Session persisted to `~/.terminal-notes/session.json`
- Real-time CRUD via Supabase
- UX: status bar, loading spinners, and clear error/success feedback

## Major features

### 1. Authentication & user management

- Email/password login via Supabase Auth
- Session persistence and automatic token refresh
- Graceful logout and session cleanup
- User profile storage

**Keyboard controls**

- Type email/password, `Tab` to switch fields, `Enter` to submit

### 2. Notes

**Notes list**

- Sorted by last-updated (newest first)
- Full-text search (title + content)
- Actions: create, edit, delete, refresh

**Keyboard controls**

- `↑/↓` navigate, `Enter` edit, `n` new, `d` delete, `/` search, `r` refresh, `Esc` back

**Note editor**

- Markdown editing with live preview (toggle: `Ctrl+P`)
- Multi-line editing, auto-save, unsaved-changes indicator
- Optional date association for calendar linking

**Editor controls**

- `Tab`/`↓` move to content, `↑`/`Esc` move to title, `Ctrl+S` save, `Enter` new line

### 3. Todos

**Todos list**

- Statuses: `todo`, `in-progress`, `done`, `cancelled` (color coded)
- Filtering, due dates, linked notes, session counters

**Keyboard controls**

- `↑/↓` navigate, `Enter` edit, `Space` toggle done, `n` create, `d` delete, `f` cycle filters, `/` search, `r` refresh

**Todo editor**

- Fields: title, description, status, due date (YYYY-MM-DD)
- Note-linking (prevents duplicates)
- Unsaved changes tracking

**Editor controls**

- `Tab`/`↑↓` navigate fields, `Space`/`Enter` cycle status, `a` add note link, `d` remove linked note, `Ctrl+S` save

### 4. Kanban boards

**Boards list**

- Create, open, and delete boards; quick navigation

**Board views**

- Table view: 2D spreadsheet-like preview (read-only)
- Kanban view: editable columns/cards with move/create/delete and local pending changes

**Kanban controls**

- `←/→` switch columns, `↑/↓` navigate cards, `Enter` edit card, `n` new card, `c` new column, `m` move card, `d` delete card, `Ctrl+S` save changes

**Card editor**

- Title (required), description (multi-line), position tracking, move between columns

### 5. Pomodoro timer

- Modes: Work (default 25m), Short Break (5m), Long Break (15m)
- Auto-progression, session counter, configurable durations and long-break frequency

**Controls**

- `Space` start/pause, `r` reset, `s` skip, `x` reset sessions, `c` open settings

**Settings**

- Edit durations and sessions-until-long-break (minimum 1)

### 6. Dashboard

- Central navigation hub with quick shortcuts and logged-in user display
- Shortcuts: `n` Notes, `t` Todos, `b` Boards, `l` Calendar, `p` Pomodoro, `c` Create note, `o` Create todo, `k` Create board, `q` Logout

### 7. Calendar

- Monthly view with date-based note association and previews
- Navigate months, indicators for dates with notes, today highlight

## Technical capabilities

### Database features

- Row Level Security (RLS): per-user access
- Cascading deletes and unique constraints (e.g., `note_todos`)
- Indexes on common query fields (`user_id`, `updated_at`, `status`, `due_date`)
- Automatic timestamps and triggers for `updated_at`

### Data relationships

- Notes ↔ Todos: many-to-many (`note_todos`)
- Boards → Columns → Cards: one-to-many cascading
- Users → all entities (cascade on delete)

### Session management

- Persistent tokens on disk, automatic restoration, secure refresh handling

### Search & filtering

- Full-text search for notes, status/date filters for todos and calendar

### Error handling & security

- Clear error messages, graceful failure modes, input validation before DB operations

## UX & keyboard design

- Global controls: `Esc` (back), `r` refresh, `Enter` confirm/select, arrow keys navigate, `Tab` for fields
- Context-specific shortcuts shown in status bar; no mouse required

**UX highlights**

- Status bar with available commands
- Loading spinners and visual selection indicators
- Unsaved changes warnings and success confirmations

## Persistence & responsiveness

- Data stored in Supabase with real-time sync and offline support (sync on reconnect)
- Responsive terminal layout, scrollable areas, and dynamic board sizing

## Counts & metrics

- 11 screens
- 24+ keyboard commands
- 5 data models (Notes, Todos, Boards, Columns, Cards)
- 2 board views (Table, Kanban)
- 4 todo statuses
- 3 Pomodoro modes

## Installation & setup

### Prerequisites

- Node.js 20+ (LTS)
- Supabase account and project

### Setup steps

1. Create a Supabase project
2. Run `database/schema.sql` (or open `database/migration_workspaces.sql`) in the Supabase SQL editor
3. Enable email/password auth in Supabase
4. Configure environment variables for Supabase in your local project

## Summary

`tuixt` combines:

- Note-taking with Markdown
- Todo management with statuses and dates
- Kanban boards with preview and edit modes
- Calendar linking for date-based notes
- Pomodoro timer with configurable sessions
- Cloud sync via Supabase and full keyboard control

Perfect for developers, writers, and productivity-focused terminal users.
