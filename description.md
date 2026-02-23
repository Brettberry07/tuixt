tuixt - Complete Feature Documentation
tuixt is a terminal-based, cloud-backed productivity application built with React/Ink and Supabase. It provides a keyboard-driven interface for managing notes, tasks, kanban boards, calendars, todos, and tracking work sessions with a Pomodoro timer—all without leaving your terminal.

Core Architecture
Technology Stack
Frontend: React 19 with Ink (terminal UI framework)
Backend: Supabase (PostgreSQL + Auth)
Language: TypeScript
Authentication: Supabase Email/Password Auth with Session Persistence
Database: PostgreSQL with Row Level Security (RLS) policies
Application Structure
11 Main Screens with full keyboard navigation
5 Database Tables (profiles, notes, boards, columns, cards, todos, note_todos)
Authentication System with session persistence to ~/.terminal-notes/session.json
Real-time CRUD Operations with optimized Supabase queries
Error Handling & User Feedback with status bars and messages
Major Features
1. Authentication & User Management
Login System
Email/password authentication via Supabase Auth
Session persistence across terminal sessions
Automatic token refresh handling
Graceful logout with session cleanup
User profile storage with email tracking
Keyboard Controls:

Type email/password in input fields
Tab to navigate between fields
Enter to submit
Full error messaging
2. Notes Management
Notes List Screen
View all notes sorted by last updated (newest first)
Full-text search with live filtering by title or content
Multiple views and quick access
Quick actions: Create, edit, delete, search
Features:

Notes display with truncated previews
Last updated timestamp
Total note count
Real-time sync with Supabase
Keyboard Controls:

↑↓ Navigate notes
Enter Edit selected note
[n] Create new note
[d] Delete selected note
[/] Search notes (type to filter)
[r] Refresh list
Esc Back to dashboard
Note Editor
Rich Text Editing with live markdown support
Multi-line Content with cursor positioning
Markdown Preview Mode (Ctrl+P to toggle)
Auto-save with unsaved changes indicator
Markdown Rendering with proper text formatting
Features:

Title and content fields
Date association (optional) for calendar linking
Split between edit and preview modes
Line-by-line cursor navigation
Scrollable content view for long notes
Keyboard Controls:

Tab/↓ Move to content field
↑/Esc from content Move to title
Ctrl+P Toggle preview mode
Arrow keys Navigate content
Enter New line in content
Ctrl+S Save
Esc Back to notes list
Calendar Integration
View notes associated with specific dates
See all notes linked to calendar dates
Navigate by month with full date view
Visual indicators for notes on dates
3. Todo List Management
Todos List Screen
View all todos with customizable status filtering
Status System: todo, in-progress, done, cancelled
Color-coded display (White, Blue, Green, Gray)
Visual status indicators (⬜ 🔄 ✅ ❌)
Due date tracking with visual highlighting
Session counter showing completed work sessions
Features:

Filter by status (all/todo/in-progress/done/cancelled)
Real-time status toggle
Multi-field search (title + description)
Session progress tracking
Linked notes display
Keyboard Controls:

↑↓ Navigate todos
Enter Edit selected todo
Space Toggle done/todo status (quick toggle)
[n] Create new todo
[d] Delete selected todo
[f] Cycle through status filters
[/] Search todos
[r] Refresh list
Esc Back to dashboard
Todo Editor
Rich editable fields: Title, Description, Status, Due Date
Status cycling through all 4 states
Date input (YYYY-MM-DD format)
Note linking system for connecting todos to notes
Automatic timestamps for completion tracking
Features:

Tab-based field navigation
Status cycling with visual confirmation
Date picker support
Link multiple notes to a single todo
Add/remove note links dynamically
Unsaved changes tracking
Keyboard Controls:

Tab/↑↓ Navigate between fields
Space/Enter Cycle status (in status field)
[a] Add linked note (when focused on notes field)
[d] Remove first linked note
Ctrl+S Save
Esc Back to todos list
Note-Todo Linking
Link notes to todos for contextual work
One-way association (notes → todos)
Quick access to related notes while editing todos
Prevents duplicate links with UNIQUE constraint
Automatic cleanup when notes/todos deleted
4. Kanban Board System
Boards List Screen
View all boards you've created
Create new boards immediately
Enter board view for full editing
Board count display
Keyboard Controls:

↑↓ Navigate boards
Enter View/edit selected board
[n] Create new board
[d] Delete board
[r] Refresh list
Esc Back to dashboard
Board View Screen - Two Views
Table View (Default)
2D spreadsheet layout with actual board columns as headers
Column headers show column names and card counts
Grid display with cards organized under their columns
No editing allowed (view-only mode)
Read-only navigation for quick review
Features:

Cards organized vertically under columns
Empty cells shown as "—" for consistent layout
Card titles and descriptions displayed
Pending items marked with asterisk (*)
Column selection indicator (highlighted header)
Dynamic layout based on board columns
Keyboard Controls:

← → Switch between columns
↑↓ Navigate cards within column
Enter View/edit selected card details
[v] Toggle to Kanban view
[r] Refresh board
Esc Back to boards list
Kanban View (Editable)
Traditional column-based layout with vertical columns
Full editing capabilities (create, move, delete)
Drag-and-drop equivalent card movement
Collaborative editing with local pending changes
Multi-operation batching with saved to database
Features:

Create columns dynamically
Create cards in columns
Move cards between columns
Delete cards and columns
Undo with refresh
Real-time save synchronization
Pending changes indicator
Card selection with borders
Description preview for cards
Keyboard Controls (Kanban):

← → Navigate between columns
↑↓ Navigate cards within column
Enter Edit selected card
[n] Create new card in current column
[c] Create new column
[m] Move selected card (then ← → to select target column, Enter to confirm)
[d] Delete selected card
[v] Toggle to table view
[r] Refresh/undo pending changes
Ctrl+S Save all pending changes
Esc Back to boards list
Card Editor
Full card details editing
Title field (required)
Description field (optional, supports multi-line)
Position tracking within columns
Move between columns from editor
Keyboard Controls:

↑↓ Navigate fields
Tab Move to next field
Enter New line in description
Ctrl+S Save
Esc Back to board
5. Pomodoro Timer
Timer View (Default)
Large, readable time display (MM:SS format)
Work Mode: 🍅 Default 25 minutes
Short Break: ☕ Default 5 minutes
Long Break: 🌴 Default 15 minutes
Automatic progression between modes
Session counter tracking completed work sessions
Features:

Color-coded modes (Red, Green, Blue)
Visual progress indicator (% remaining)
Progress dots showing sessions until long break
Auto-transition to next mode on timer completion
Current session number display
Completed sessions counter
Keyboard Controls:

Space Start/Pause timer
[r] Reset current timer
[s] Skip to next session
[x] Reset entire session (clears progress counter)
[c] Open configuration
Esc Back to dashboard
Settings Screen
Customize work duration (default 25 min)
Customize short break (default 5 min)
Customize long break (default 15 min)
Set sessions until long break (default 4)
Real-time validation with number input
Live timer adjustment when not running
Features:

Navigate with ↑↓
Edit fields individually
Minimum value validation (must be ≥1)
Reset timer on settings change when idle
Visual border around selected field
Keyboard Controls:

↑↓ Navigate settings
Enter Edit selected setting
Type numbers to set value
Enter Confirm new value
Esc Cancel edit or return to timer
Timer Behavior
Automatic break assignment (short vs long)
Session counting for long break triggers
Timer continues running in background
Perfect for focused work sessions
Customizable for any work/break intervals
6. Dashboard
Main Navigation Hub
Menu-driven interface with 9 major options
Quick action display with keyboard shortcuts
Welcome message and instructions
User email display showing logged-in user
Keyboard shortcut reference
Navigation Options:

[n] View Notes
[t] View Todos
[b] View Boards
[l] View Calendar
[p] Pomodoro Timer
[c] Create Note
[o] Create Todo
[k] Create Board
[q] Logout
Features:

Sidebar-based menu system
Visual feedback on selected menu item
Quick reference for all available actions
Status bar showing current mode
Clean, organized layout
7. Calendar View
Calendar Interface
Monthly calendar display with full month view
Date-based note association
Visual indicators for dates with notes
Navigation between months
Notes preview for selected dates
Today indicator highlighting current date
Features:

Previous/next month navigation
Shows notes associated with specific dates
Color-coded date indicators
Display current date clearly
Multi-note support per date
Technical Capabilities
Database Features
Row Level Security (RLS) - Each user only sees their own data
Cascading deletes - Automatic cleanup of related records
Unique constraints - Prevent duplicate note-todo links
Indexes - Optimized queries for user_id, updated_at, status, due_date
Timestamps - Automatic created_at, updated_at tracking
Trigger functions - Auto-update timestamp on modifications
Data Relationships
Notes → Todos (many-to-many via note_todos junction table)
Boards → Columns (one-to-many, cascading)
Columns → Cards (one-to-many, cascading)
Users → All entities (one-to-many, cascading on delete)
Session Management
Persistent authentication tokens saved to disk
Automatic session restoration on app restart
Secure token refresh handling
Automatic logout with session cleanup
Search & Filtering
Full-text search across notes (title + content)
Status filtering for todos
Date-based filtering for calendar
Real-time search results
Error Handling
Comprehensive error messages for all operations
Graceful failure modes
User feedback on every operation
Validation before database operations
Keyboard-Driven Design
Global Controls
Esc - Always returns to previous screen or dashboard
[r] - Refresh current data (most screens)
Enter - Confirm/Select in most contexts
↑↓← → - Navigation arrows for all lists and grids
Tab - Field navigation in editors
Context-Specific Controls
Different control schemes for different screens
Status bar always shows current available commands
Intuitive shortcuts for common operations
Zero mouse requirement
User Experience Features
Visual Feedback
Status bar on every screen showing available commands
Error messages displayed prominently
Success confirmations with "Saved!" indicator
Unsaved changes warning before losing data
Loading spinners for async operations
Visual selection with colored borders and arrows
Data Persistence
All data stored in Supabase cloud
Automatic backups via Supabase
Real-time synchronization
Works offline (then syncs on reconnect)
Responsive Layout
Dynamic width calculations for boards
Flexible text truncation
Scrollable content areas
Adapts to terminal size changes
Counts & Metrics
11 Screens - Full navigation coverage
24 Keyboard Commands+ - Comprehensive shortcuts
5 Data Models - Notes, Todos, Boards, Columns, Cards
2 Board Views - Table (preview) and Kanban (edit)
4 Todo Statuses - Complete workflow coverage
3 Pomodoro Modes - Work, short break, long break
100% Keyboard - No mouse required
Installation & Setup
Prerequisites
Node.js 20+ (LTS)
Supabase account and project
Installation
Database Setup
Create Supabase project
Run schema.sql in Supabase SQL Editor
Enable email/password authentication
Configuration
Summary
tuixt is a comprehensive terminal-based productivity suite combining:

✅ Note-taking with markdown support
✅ Todo management with statuses and dates
✅ Kanban boards with dual view modes
✅ Calendar integration for date-based organization
✅ Pomodoro timer for time management
✅ Cloud synchronization via Supabase
✅ Full keyboard control for efficiency
✅ Secure authentication with row-level security
Perfect for developers, writers, and productivity enthusiasts who live in the terminal.
