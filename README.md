# tuixt

A terminal-based, cloud-backed notes and kanban application built with React/Ink and Supabase.

## Features

- **User Authentication**: Email/password authentication via Supabase Auth
- **Markdown Notes**: Create, edit, and manage notes with live markdown preview
- **Kanban Boards**: Organize tasks with boards, columns, and cards
- **Cloud Storage**: All data stored securely in Supabase with Row Level Security
- **Keyboard-Driven**: Full keyboard navigation, zero mouse interaction required

## Prerequisites

- Node.js 20+ (LTS)
- A Supabase account and project

## Installation

### From npm (when published)

```bash
npm install -g tuixt
```

### From source

```bash
git clone <repository-url>
cd tuixt
npm install
npm run build
npm link
```

## Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Navigate to the SQL Editor in your Supabase dashboard

3. Copy and paste the contents of `database/schema.sql` and execute it

4. Enable email/password authentication in Authentication → Providers

## Configuration

Set the following environment variables:

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
```

You can find these values in your Supabase project settings under API.

### Optional: Add to shell profile

```bash
# Add to ~/.zshrc or ~/.bashrc
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
```

## Usage

```bash
tuixt
```

### Authentication

On first launch, you'll be prompted to sign in or create an account. Your session is stored locally at `~/.terminal-notes/session.json`.

### Navigation

| Key | Action |
|-----|--------|
| `↑` `↓` | Navigate lists |
| `←` `→` | Navigate columns (in kanban) |
| `Enter` | Select/Open |
| `Esc` | Go back |
| `Tab` | Switch fields |

### Dashboard

| Key | Action |
|-----|--------|
| `n` | Open Notes |
| `b` | Open Boards |
| `c` | Create Note |
| `k` | Create Board |
| `q` | Logout |

### Notes List

| Key | Action |
|-----|--------|
| `n` | New note |
| `e` / `Enter` | Edit note |
| `d` | Delete note |
| `/` | Search |
| `r` | Refresh |

### Note Editor

| Key | Action |
|-----|--------|
| `Tab` | Switch between title/content |
| `Ctrl+S` | Save |
| `Ctrl+P` | Toggle preview |

### Boards List

| Key | Action |
|-----|--------|
| `n` / `c` | New board |
| `Enter` | Open board |
| `d` | Delete board |
| `r` | Refresh |

### Board View (Kanban)

| Key | Action |
|-----|--------|
| `←` `→` | Move between columns |
| `↑` `↓` | Move between cards |
| `c` | New column |
| `n` | New card |
| `Enter` | Edit card |
| `m` | Move card to another column |
| `d` | Delete card |
| `r` | Refresh |

### Card Editor

| Key | Action |
|-----|--------|
| `Tab` | Switch between title/description |
| `Ctrl+S` | Save |

## Development

```bash
# Install dependencies
npm install

# Run in development mode (with watch)
npm run dev

# Build for production
npm run build

# Type check
npm run typecheck

# Run the built application
npm start
```

## Tech Stack

- **Runtime**: Node.js (latest LTS)
- **Language**: TypeScript (strict mode)
- **UI Framework**: React + Ink
- **Styling**: chalk
- **Markdown**: remark, remark-parse, strip-markdown
- **Backend**: Supabase (Postgres + Auth)
- **Bundler**: tsup

## Architecture

```
src/
├── app.tsx              # Main application component
├── index.tsx            # Entry point
├── components/          # Reusable UI components
│   ├── ConfirmModal.tsx
│   ├── Header.tsx
│   ├── InputField.tsx
│   ├── LoadingSpinner.tsx
│   ├── MarkdownPreview.tsx
│   ├── Sidebar.tsx
│   └── StatusBar.tsx
├── context/             # React context providers
│   ├── AppContext.tsx
│   └── AuthContext.tsx
├── screens/             # Application screens
│   ├── BoardsListScreen.tsx
│   ├── BoardViewScreen.tsx
│   ├── CardEditorScreen.tsx
│   ├── DashboardScreen.tsx
│   ├── LoginScreen.tsx
│   ├── NoteEditorScreen.tsx
│   └── NotesListScreen.tsx
├── services/            # Supabase API layer
│   ├── boards.ts
│   ├── notes.ts
│   └── supabase.ts
├── types/               # TypeScript type definitions
│   └── index.ts
└── utils/               # Utility functions
    └── markdown.ts
```

## Data Flow

1. **UI Components** render the interface and handle user input
2. **Screens** manage screen-specific state and orchestrate business logic
3. **Context** provides global state (auth, navigation)
4. **Services** communicate with Supabase (all database operations)
5. **Supabase** stores data with Row Level Security for multi-tenant isolation

## Security

- All database operations use Row Level Security (RLS)
- Each user can only access their own data
- Sessions are stored locally and automatically refreshed
- Passwords are handled by Supabase Auth (never stored locally)

## License

MIT
