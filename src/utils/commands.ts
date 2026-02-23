import type { Screen } from '../types/index.js';

export interface Command {
  id: string;
  label: string;
  description?: string;
  action: CommandAction;
  keywords?: string[];
  category?: string;
}

export interface CommandAction {
  type: 'navigate' | 'function';
  screen?: Screen;
  callback?: () => void;
}

export const commands: Command[] = [
  // Navigation Commands
  {
    id: 'nav-dashboard',
    label: 'Go to Dashboard',
    description: 'Return to the main dashboard',
    category: 'Navigation',
    keywords: ['home', 'main', 'start'],
    action: { type: 'navigate', screen: 'dashboard' },
  },
  {
    id: 'nav-workspaces',
    label: 'View Workspaces',
    description: 'Browse all your workspaces',
    category: 'Navigation',
    keywords: ['workspace', 'context', 'project', 'list workspaces'],
    action: { type: 'navigate', screen: 'workspaces' },
  },
  {
    id: 'nav-notes',
    label: 'View Notes',
    description: 'Browse all your notes',
    category: 'Navigation',
    keywords: ['list', 'all notes', 'view notes'],
    action: { type: 'navigate', screen: 'notes' },
  },
  {
    id: 'nav-todos',
    label: 'View Todos',
    description: 'Browse all your todos',
    category: 'Navigation',
    keywords: ['tasks', 'list', 'all todos', 'view todos'],
    action: { type: 'navigate', screen: 'todos' },
  },
  {
    id: 'nav-boards',
    label: 'View Boards',
    description: 'Browse all your kanban boards',
    category: 'Navigation',
    keywords: ['kanban', 'list', 'all boards', 'view boards'],
    action: { type: 'navigate', screen: 'boards' },
  },
  {
    id: 'nav-calendar',
    label: 'View Calendar',
    description: 'View calendar and date-based notes',
    category: 'Navigation',
    keywords: ['dates', 'schedule', 'view calendar'],
    action: { type: 'navigate', screen: 'calendar' },
  },
  {
    id: 'nav-pomodoro',
    label: 'Open Pomodoro Timer',
    description: 'Start a focus session with the Pomodoro technique',
    category: 'Navigation',
    keywords: ['timer', 'focus', 'work', 'study'],
    action: { type: 'navigate', screen: 'pomodoro' },
  },

  // Create Commands
  {
    id: 'create-workspace',
    label: 'Create New Workspace',
    description: 'Create a new workspace to organize your content',
    category: 'Create',
    keywords: ['new workspace', 'add workspace', 'new project', 'new context'],
    action: { type: 'navigate', screen: 'workspace-editor' },
  },
  {
    id: 'create-note',
    label: 'Create New Note',
    description: 'Start writing a new note',
    category: 'Create',
    keywords: ['new note', 'add note', 'write'],
    action: { type: 'navigate', screen: 'note-editor' },
  },
  {
    id: 'create-todo',
    label: 'Create New Todo',
    description: 'Add a new todo task',
    category: 'Create',
    keywords: ['new todo', 'add todo', 'new task', 'add task'],
    action: { type: 'navigate', screen: 'todo-editor' },
  },
  {
    id: 'create-reminder',
    label: 'Create Calendar Reminder',
    description: 'Quick reminder with date (type: reminder Title YYYY-MM-DD)',
    category: 'Create',
    keywords: ['reminder', 'calendar', 'event', 'date', 'schedule'],
    action: { type: 'function', callback: () => {} }, // Placeholder, actual action handled by quick action parser
  },

  // Search
  {
    id: 'global-search',
    label: 'Global Search',
    description: 'Search across all notes, todos, boards, and cards (type >query)',
    category: 'Search',
    keywords: ['search', 'find', 'lookup', '>', 'global'],
    action: { type: 'function', callback: () => {} }, // Placeholder, actual search is triggered by '>' prefix
  },

  // Quick Actions
  {
    id: 'quick-workspaces',
    label: 'Quick Access: Workspaces',
    description: 'Jump to workspaces list',
    category: 'Quick Access',
    keywords: ['w', 'workspaces', 'projects', 'quick'],
    action: { type: 'navigate', screen: 'workspaces' },
  },
  {
    id: 'quick-notes',
    label: 'Quick Access: Notes',
    description: 'Jump to notes list',
    category: 'Quick Access',
    keywords: ['n', 'notes', 'quick'],
    action: { type: 'navigate', screen: 'notes' },
  },
  {
    id: 'quick-todos',
    label: 'Quick Access: Todos',
    description: 'Jump to todos list',
    category: 'Quick Access',
    keywords: ['t', 'todos', 'tasks', 'quick'],
    action: { type: 'navigate', screen: 'todos' },
  },
  {
    id: 'quick-boards',
    label: 'Quick Access: Boards',
    description: 'Jump to boards list',
    category: 'Quick Access',
    keywords: ['b', 'boards', 'kanban', 'quick'],
    action: { type: 'navigate', screen: 'boards' },
  },
  {
    id: 'quick-calendar',
    label: 'Quick Access: Calendar',
    description: 'Jump to calendar view',
    category: 'Quick Access',
    keywords: ['l', 'calendar', 'dates', 'quick'],
    action: { type: 'navigate', screen: 'calendar' },
  },
  {
    id: 'quick-pomodoro',
    label: 'Quick Access: Pomodoro',
    description: 'Jump to Pomodoro timer',
    category: 'Quick Access',
    keywords: ['p', 'pomodoro', 'timer', 'focus', 'quick'],
    action: { type: 'navigate', screen: 'pomodoro' },
  },
];

export function searchCommands(query: string): Command[] {
  if (!query.trim()) {
    return commands;
  }

  const lowerQuery = query.toLowerCase();
  
  return commands.filter((command) => {
    // Search in label
    if (command.label.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    
    // Search in description
    if (command.description?.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    
    // Search in keywords
    if (command.keywords?.some((keyword) => keyword.toLowerCase().includes(lowerQuery))) {
      return true;
    }
    
    // Search in category
    if (command.category?.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    
    return false;
  });
}
