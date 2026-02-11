import { getSupabaseClient } from './supabase.js';
import type {
  Board,
  Column,
  Card,
  CreateBoardInput,
  CreateColumnInput,
  UpdateColumnInput,
  CreateCardInput,
  UpdateCardInput,
  ServiceResult,
  BoardWithColumns,
  ColumnWithCards,
} from '../types/index.js';

// Board operations
export async function fetchBoards(): Promise<ServiceResult<Board[]>> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data: data as Board[], error: null };
}

export async function fetchBoard(id: string): Promise<ServiceResult<Board>> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data: data as Board, error: null };
}

export async function fetchBoardWithColumns(
  id: string
): Promise<ServiceResult<BoardWithColumns>> {
  const supabase = getSupabaseClient();
  
  // Fetch board
  const { data: board, error: boardError } = await supabase
    .from('boards')
    .select('*')
    .eq('id', id)
    .single();
  
  if (boardError) {
    return { data: null, error: boardError.message };
  }
  
  // Fetch columns
  const { data: columns, error: columnsError } = await supabase
    .from('columns')
    .select('*')
    .eq('board_id', id)
    .order('position', { ascending: true });
  
  if (columnsError) {
    return { data: null, error: columnsError.message };
  }
  
  // Fetch all cards for these columns
  const columnIds = (columns as Column[]).map((c) => c.id);
  
  let cards: Card[] = [];
  if (columnIds.length > 0) {
    const { data: cardsData, error: cardsError } = await supabase
      .from('cards')
      .select('*')
      .in('column_id', columnIds)
      .order('position', { ascending: true });
    
    if (cardsError) {
      return { data: null, error: cardsError.message };
    }
    
    cards = cardsData as Card[];
  }
  
  // Organize cards into columns
  const columnsWithCards: ColumnWithCards[] = (columns as Column[]).map((column) => ({
    ...column,
    cards: cards.filter((card) => card.column_id === column.id),
  }));
  
  const boardWithColumns: BoardWithColumns = {
    ...(board as Board),
    columns: columnsWithCards,
  };
  
  return { data: boardWithColumns, error: null };
}

export async function createBoard(input: CreateBoardInput): Promise<ServiceResult<Board>> {
  const supabase = getSupabaseClient();
  
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { data: null, error: 'Not authenticated' };
  }
  
  const { data, error } = await supabase
    .from('boards')
    .insert({
      user_id: userData.user.id,
      title: input.title,
    })
    .select()
    .single();
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data: data as Board, error: null };
}

export async function deleteBoard(id: string): Promise<ServiceResult<void>> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase.from('boards').delete().eq('id', id);
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data: undefined, error: null };
}

// Column operations
export async function createColumn(
  input: CreateColumnInput
): Promise<ServiceResult<Column>> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('columns')
    .insert({
      board_id: input.board_id,
      title: input.title,
      position: input.position,
    })
    .select()
    .single();
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data: data as Column, error: null };
}

export async function updateColumn(
  id: string,
  input: UpdateColumnInput
): Promise<ServiceResult<Column>> {
  const supabase = getSupabaseClient();
  
  const updateData: Record<string, unknown> = {};
  
  if (input.title !== undefined) {
    updateData.title = input.title;
  }
  if (input.position !== undefined) {
    updateData.position = input.position;
  }
  
  const { data, error } = await supabase
    .from('columns')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data: data as Column, error: null };
}

export async function deleteColumn(id: string): Promise<ServiceResult<void>> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase.from('columns').delete().eq('id', id);
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data: undefined, error: null };
}

// Card operations
export async function fetchCard(id: string): Promise<ServiceResult<Card>> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data: data as Card, error: null };
}

export async function createCard(input: CreateCardInput): Promise<ServiceResult<Card>> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('cards')
    .insert({
      column_id: input.column_id,
      title: input.title,
      description: input.description || '',
      position: input.position,
    })
    .select()
    .single();
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data: data as Card, error: null };
}

export async function updateCard(
  id: string,
  input: UpdateCardInput
): Promise<ServiceResult<Card>> {
  const supabase = getSupabaseClient();
  
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  
  if (input.title !== undefined) {
    updateData.title = input.title;
  }
  if (input.description !== undefined) {
    updateData.description = input.description;
  }
  if (input.position !== undefined) {
    updateData.position = input.position;
  }
  if (input.column_id !== undefined) {
    updateData.column_id = input.column_id;
  }
  
  const { data, error } = await supabase
    .from('cards')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data: data as Card, error: null };
}

export async function deleteCard(id: string): Promise<ServiceResult<void>> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase.from('cards').delete().eq('id', id);
  
  if (error) {
    return { data: null, error: error.message };
  }
  
  return { data: undefined, error: null };
}

export async function moveCard(
  cardId: string,
  targetColumnId: string,
  position: number
): Promise<ServiceResult<Card>> {
  return updateCard(cardId, {
    column_id: targetColumnId,
    position,
  });
}
