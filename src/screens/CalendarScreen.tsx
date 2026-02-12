import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { Header, StatusBar, LoadingSpinner } from '../components/index.js';
import { useApp } from '../context/index.js';
import { fetchNotesByDateRange, createNote } from '../services/notes.js';
import { truncateText } from '../utils/markdown.js';
import type { Note, CalendarDay } from '../types/index.js';

type Mode = 'calendar' | 'day-view' | 'create-note';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function CalendarScreen() {
  const { navigate, selectNote, setError, error, isCommandPaletteOpen } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('calendar');
  const [selectedNoteIndex, setSelectedNoteIndex] = useState(0);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get calendar days for current month
  const calendarDays = useMemo((): CalendarDay[] => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: CalendarDay[] = [];

    // Add previous month's trailing days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const date = new Date(currentYear, currentMonth - 1, day);
      days.push({
        date: date.toISOString().split('T')[0],
        day,
        isCurrentMonth: false,
        isToday: false,
        notes: [],
      });
    }

    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dateStr = date.toISOString().split('T')[0];
      const isToday =
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate();

      days.push({
        date: dateStr,
        day,
        isCurrentMonth: true,
        isToday,
        notes: notes.filter((note) => note.date === dateStr),
      });
    }

    // Add next month's leading days
    const remainingDays = 42 - days.length; // 6 weeks
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(currentYear, currentMonth + 1, day);
      days.push({
        date: date.toISOString().split('T')[0],
        day,
        isCurrentMonth: false,
        isToday: false,
        notes: [],
      });
    }

    return days;
  }, [currentYear, currentMonth, notes, today]);

  // Load notes for the current month
  const loadNotes = useCallback(async () => {
    setIsLoading(true);

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);

    const startDate = firstDay.toISOString().split('T')[0];
    const endDate = lastDay.toISOString().split('T')[0];

    const result = await fetchNotesByDateRange(startDate, endDate);
    if (result.error) {
      setError(result.error);
    } else {
      setNotes(result.data || []);
    }

    setIsLoading(false);
  }, [currentYear, currentMonth, setError]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Navigate months
  const goToPreviousMonth = useCallback(() => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    setMode('calendar');
    setSelectedDay(null);
  }, [currentYear, currentMonth]);

  const goToNextMonth = useCallback(() => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    setMode('calendar');
    setSelectedDay(null);
  }, [currentYear, currentMonth]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
    setMode('calendar');
    setSelectedDay(null);
  }, []);

  // Navigate calendar grid
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  useEffect(() => {
    // Auto-select today when viewing current month (only on month/year change)
    const todayIndex = calendarDays.findIndex((d) => d.isToday && d.isCurrentMonth);
    if (todayIndex >= 0) {
      setSelectedDayIndex(todayIndex);
    } else {
      // Select first day of current month
      const firstCurrentMonthIndex = calendarDays.findIndex((d) => d.isCurrentMonth);
      setSelectedDayIndex(firstCurrentMonthIndex >= 0 ? firstCurrentMonthIndex : 0);
    }
  }, [currentMonth, currentYear]);

  const handleCreateNote = useCallback(
    async (title: string) => {
      if (!selectedDay || !title.trim()) {
        setError('Note title is required');
        return;
      }

      const result = await createNote({
        title: title.trim(),
        content: '',
        date: selectedDay.date,
      });

      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        // Reload notes
        await loadNotes();
        // Open the note editor
        selectNote(result.data.id);
        navigate('note-editor');
      }
    },
    [selectedDay, setError, loadNotes, selectNote, navigate]
  );

  useInput((input, key) => {
    if (mode === 'create-note') {
      // Handled by input component
      return;
    }

    if (mode === 'day-view') {
      if (key.escape) {
        setMode('calendar');
        setSelectedNoteIndex(0);
      } else if (key.upArrow && selectedDay && selectedDay.notes.length > 0) {
        setSelectedNoteIndex((prev) =>
          prev > 0 ? prev - 1 : selectedDay.notes.length - 1
        );
      } else if (key.downArrow && selectedDay && selectedDay.notes.length > 0) {
        setSelectedNoteIndex((prev) =>
          prev < selectedDay.notes.length - 1 ? prev + 1 : 0
        );
      } else if (key.return && selectedDay && selectedDay.notes.length > 0) {
        const note = selectedDay.notes[selectedNoteIndex];
        if (note) {
          selectNote(note.id);
          navigate('note-editor');
        }
      } else if (input === 'n') {
        // Quick create note for selected day
        if (selectedDay) {
          handleCreateNote(`Note for ${selectedDay.date}`);
        }
      }
      return;
    }

    // Calendar navigation mode
    if (key.escape) {
      navigate('dashboard');
    } else if (key.leftArrow) {
      setSelectedDayIndex((prev) => (prev > 0 ? prev - 1 : calendarDays.length - 1));
    } else if (key.rightArrow) {
      setSelectedDayIndex((prev) => (prev < calendarDays.length - 1 ? prev + 1 : 0));
    } else if (key.upArrow) {
      setSelectedDayIndex((prev) => (prev >= 7 ? prev - 7 : prev));
    } else if (key.downArrow) {
      setSelectedDayIndex((prev) =>
        prev + 7 < calendarDays.length ? prev + 7 : prev
      );
    } else if (key.return) {
      const day = calendarDays[selectedDayIndex];
      if (day) {
        setSelectedDay(day);
        setMode('day-view');
        setSelectedNoteIndex(0);
      }
    } else if (input === 'n') {
      // Quick create note for selected day
      const day = calendarDays[selectedDayIndex];
      if (day) {
        handleCreateNote(`Note for ${day.date}`);
      }
    } else if (input === 'p') {
      goToPreviousMonth();
    } else if (input === 'f') {
      goToNextMonth();
    } else if (input === 't') {
      goToToday();
    }
  }, { isActive: !isCommandPaletteOpen });

  if (isLoading) {
    return (
      <Box flexDirection="column" padding={2}>
        <Header title="Calendar" />
        <LoadingSpinner text="Loading calendar..." />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      <Header
        title="Calendar"
        subtitle={`${MONTHS[currentMonth]} ${currentYear}`}
      />

      {mode === 'day-view' && selectedDay ? (
        /* Day view with notes list */
        <Box flexDirection="column" flexGrow={1} paddingX={2}>
          <Box marginBottom={1}>
            <Text bold color="cyan">
              {selectedDay.date}
            </Text>
            <Text dimColor> ({selectedDay.notes.length} notes)</Text>
          </Box>

          {selectedDay.notes.length === 0 ? (
            <Box flexDirection="column" padding={1}>
              <Text dimColor>No notes for this day.</Text>
              <Text dimColor>Press [n] to create one.</Text>
            </Box>
          ) : (
            <Box flexDirection="column">
              {selectedDay.notes.map((note, idx) => {
                const isSelected = idx === selectedNoteIndex;
                return (
                  <Box
                    key={note.id}
                    borderStyle={isSelected ? 'single' : undefined}
                    borderColor="cyan"
                    paddingX={isSelected ? 1 : 0}
                    marginBottom={1}
                  >
                    <Text color={isSelected ? 'cyan' : undefined} bold={isSelected}>
                      {isSelected ? '▶ ' : '  '}
                      {truncateText(note.title, 50)}
                    </Text>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      ) : (
        /* Calendar grid */
        <Box flexDirection="column" flexGrow={1} paddingX={2}>
          {/* Days of week header */}
          <Box marginBottom={1}>
            {DAYS_OF_WEEK.map((day) => (
              <Box key={day} width="14%" justifyContent="center">
                <Text bold color="cyan">
                  {day}
                </Text>
              </Box>
            ))}
          </Box>

          {/* Calendar grid */}
          {Array.from({ length: 6 }).map((_, weekIndex) => (
            <Box key={weekIndex}>
              {Array.from({ length: 7 }).map((_, dayIndex) => {
                const index = weekIndex * 7 + dayIndex;
                const day = calendarDays[index];
                if (!day) return null;

                const isSelected = index === selectedDayIndex;
                const hasNotes = day.notes.length > 0;

                return (
                  <Box
                    key={index}
                    width="14%"
                    height={3}
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    borderStyle={isSelected ? 'single' : undefined}
                    borderColor={isSelected ? 'cyan' : undefined}
                  >
                    <Text
                      color={
                        !day.isCurrentMonth
                          ? 'gray'
                          : day.isToday
                          ? 'yellow'
                          : isSelected
                          ? 'cyan'
                          : undefined
                      }
                      bold={day.isToday || isSelected}
                      inverse={day.isToday && isSelected}
                    >
                      {String(day.day).padStart(2, ' ')}
                    </Text>
                    {hasNotes && day.notes.length > 0 && (
                      <Text
                        color={!day.isCurrentMonth ? 'gray' : 'green'}
                        dimColor
                      >
                        {truncateText(day.notes[0].title, 8)}
                      </Text>
                    )}
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      )}

      <StatusBar
        error={error}
        hints={
          mode === 'day-view'
            ? ['↑ ↓ Select', 'Enter Open', 'n New note', 'Esc Back']
            : [
                '←→↑↓ Navigate',
                'Enter View day',
                'n New note',
                'p Prev month',
                'f Next month',
                't Today',
                'Esc Back',
              ]
        }
      />
    </Box>
  );
}
