import { fetchNotes } from '../services/notes.js';
import { fetchTodos } from '../services/todos.js';
import { fetchBoards, fetchBoardWithColumns } from '../services/boards.js';
import type { Note, Todo, Board, Card } from '../types/index.js';

export type SearchResultType = 'note' | 'todo' | 'board' | 'card';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  description?: string;
  metadata?: string;
  // For navigation
  parentId?: string; // For cards, this is the board ID
}

/**
 * Performs a global search across all data types
 */
export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query.trim()) {
    return [];
  }

  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  // Search notes
  const notesResult = await fetchNotes();
  if (!notesResult.error && notesResult.data) {
    for (const note of notesResult.data) {
      const titleMatch = note.title.toLowerCase().includes(lowerQuery);
      const contentMatch = note.content.toLowerCase().includes(lowerQuery);
      
      if (titleMatch || contentMatch) {
        results.push({
          id: note.id,
          type: 'note',
          title: note.title,
          description: truncate(note.content, 80),
          metadata: note.date ? `Date: ${note.date}` : undefined,
        });
      }
    }
  }

  // Search todos
  const todosResult = await fetchTodos();
  if (!todosResult.error && todosResult.data) {
    for (const todo of todosResult.data) {
      const titleMatch = todo.title.toLowerCase().includes(lowerQuery);
      const descMatch = todo.description?.toLowerCase().includes(lowerQuery);
      
      if (titleMatch || descMatch) {
        results.push({
          id: todo.id,
          type: 'todo',
          title: todo.title,
          description: todo.description ? truncate(todo.description, 80) : undefined,
          metadata: `Status: ${todo.status}${todo.due_date ? ` • Due: ${todo.due_date}` : ''}`,
        });
      }
    }
  }

  // Search boards and cards
  const boardsResult = await fetchBoards();
  if (!boardsResult.error && boardsResult.data) {
    for (const board of boardsResult.data) {
      const titleMatch = board.title.toLowerCase().includes(lowerQuery);
      
      if (titleMatch) {
        results.push({
          id: board.id,
          type: 'board',
          title: board.title,
        });
      }

      // Also search within board cards
      const boardWithColumnsResult = await fetchBoardWithColumns(board.id);
      if (!boardWithColumnsResult.error && boardWithColumnsResult.data) {
        for (const column of boardWithColumnsResult.data.columns) {
          for (const card of column.cards) {
            const cardTitleMatch = card.title.toLowerCase().includes(lowerQuery);
            const cardDescMatch = card.description?.toLowerCase().includes(lowerQuery);
            
            if (cardTitleMatch || cardDescMatch) {
              results.push({
                id: card.id,
                type: 'card',
                title: card.title,
                description: card.description ? truncate(card.description, 80) : undefined,
                metadata: `Board: ${board.title} • Column: ${column.title}`,
                parentId: board.id,
              });
            }
          }
        }
      }
    }
  }

  return results;
}

/**
 * Truncate text to a maximum length
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength).trim() + '...';
}
