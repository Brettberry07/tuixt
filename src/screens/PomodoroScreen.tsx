import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { Header, StatusBar } from '../components/index.js';
import { useApp } from '../context/index.js';

type PomodoroMode = 'work' | 'short-break' | 'long-break';
type ViewMode = 'timer' | 'settings';

interface PomodoroSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsUntilLongBreak: number;
}

type SettingsField = 'work' | 'shortBreak' | 'longBreak' | 'sessions';

export function PomodoroScreen() {
  const { navigate, error } = useApp();
  
  // Settings
  const [settings, setSettings] = useState<PomodoroSettings>({
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    sessionsUntilLongBreak: 4,
  });
  
  // Timer state
  const [mode, setMode] = useState<PomodoroMode>('work');
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(settings.workMinutes * 60);
  const [completedSessions, setCompletedSessions] = useState(0);
  
  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('timer');
  const [selectedField, setSelectedField] = useState<SettingsField>('work');
  const [editingValue, setEditingValue] = useState('');
  const [isEditingField, setIsEditingField] = useState(false);

  // Timer logic
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Timer completed
          handleTimerComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const handleTimerComplete = useCallback(() => {
    setIsRunning(false);
    
    if (mode === 'work') {
      const newCompletedSessions = completedSessions + 1;
      setCompletedSessions(newCompletedSessions);
      
      // Determine next break type
      if (newCompletedSessions % settings.sessionsUntilLongBreak === 0) {
        setMode('long-break');
        setTimeLeft(settings.longBreakMinutes * 60);
      } else {
        setMode('short-break');
        setTimeLeft(settings.shortBreakMinutes * 60);
      }
    } else {
      // Break completed, back to work
      setMode('work');
      setTimeLeft(settings.workMinutes * 60);
    }
  }, [mode, completedSessions, settings]);

  const startTimer = useCallback(() => {
    setIsRunning(true);
  }, []);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    if (mode === 'work') {
      setTimeLeft(settings.workMinutes * 60);
    } else if (mode === 'short-break') {
      setTimeLeft(settings.shortBreakMinutes * 60);
    } else {
      setTimeLeft(settings.longBreakMinutes * 60);
    }
  }, [mode, settings]);

  const skipToNext = useCallback(() => {
    setIsRunning(false);
    handleTimerComplete();
  }, [handleTimerComplete]);

  const resetSession = useCallback(() => {
    setIsRunning(false);
    setMode('work');
    setTimeLeft(settings.workMinutes * 60);
    setCompletedSessions(0);
  }, [settings]);

  const applySettingsChange = useCallback(() => {
    const value = parseInt(editingValue, 10);
    if (isNaN(value) || value < 1) {
      setIsEditingField(false);
      setEditingValue('');
      return;
    }

    const newSettings = { ...settings };
    switch (selectedField) {
      case 'work':
        newSettings.workMinutes = value;
        break;
      case 'shortBreak':
        newSettings.shortBreakMinutes = value;
        break;
      case 'longBreak':
        newSettings.longBreakMinutes = value;
        break;
      case 'sessions':
        newSettings.sessionsUntilLongBreak = value;
        break;
    }

    setSettings(newSettings);
    setIsEditingField(false);
    setEditingValue('');
    
    // Reset timer with new settings if not running
    if (!isRunning) {
      if (mode === 'work') {
        setTimeLeft(newSettings.workMinutes * 60);
      } else if (mode === 'short-break') {
        setTimeLeft(newSettings.shortBreakMinutes * 60);
      } else {
        setTimeLeft(newSettings.longBreakMinutes * 60);
      }
    }
  }, [editingValue, selectedField, settings, isRunning, mode]);

  useInput((input, key) => {
    if (viewMode === 'settings') {
      if (isEditingField) {
        if (key.escape) {
          setIsEditingField(false);
          setEditingValue('');
        } else if (key.return) {
          applySettingsChange();
        } else if (key.backspace || key.delete) {
          setEditingValue((prev) => prev.slice(0, -1));
        } else if (/^[0-9]$/.test(input)) {
          setEditingValue((prev) => prev + input);
        }
        return;
      }

      if (key.escape) {
        setViewMode('timer');
      } else if (key.upArrow) {
        const fields: SettingsField[] = ['work', 'shortBreak', 'longBreak', 'sessions'];
        const currentIndex = fields.indexOf(selectedField);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : fields.length - 1;
        setSelectedField(fields[prevIndex]);
      } else if (key.downArrow) {
        const fields: SettingsField[] = ['work', 'shortBreak', 'longBreak', 'sessions'];
        const currentIndex = fields.indexOf(selectedField);
        const nextIndex = (currentIndex + 1) % fields.length;
        setSelectedField(fields[nextIndex]);
      } else if (key.return) {
        // Start editing the selected field
        setIsEditingField(true);
        const currentValue = 
          selectedField === 'work' ? settings.workMinutes :
          selectedField === 'shortBreak' ? settings.shortBreakMinutes :
          selectedField === 'longBreak' ? settings.longBreakMinutes :
          settings.sessionsUntilLongBreak;
        setEditingValue(currentValue.toString());
      }
      return;
    }

    // Timer view controls
    if (key.escape) {
      navigate('dashboard');
    } else if (input === ' ') {
      if (isRunning) {
        pauseTimer();
      } else {
        startTimer();
      }
    } else if (input === 'r') {
      resetTimer();
    } else if (input === 's') {
      skipToNext();
    } else if (input === 'x') {
      resetSession();
    } else if (input === 'c') {
      setViewMode('settings');
    }
  });

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getModeDisplay = (): string => {
    switch (mode) {
      case 'work':
        return '🍅 Work Session';
      case 'short-break':
        return '☕ Short Break';
      case 'long-break':
        return '🌴 Long Break';
    }
  };

  const getModeColor = (): string => {
    switch (mode) {
      case 'work':
        return 'red';
      case 'short-break':
        return 'green';
      case 'long-break':
        return 'blue';
    }
  };

  if (viewMode === 'settings') {
    return (
      <Box flexDirection="column" height="100%">
        <Header title="Pomodoro Settings" subtitle="Customize your intervals" />

        <Box flexDirection="column" flexGrow={1} paddingX={4} paddingY={2}>
          <Text bold underline marginBottom={1}>
            Timer Settings
          </Text>

          <Box flexDirection="column" gap={1}>
            <Box
              borderStyle={selectedField === 'work' ? 'single' : undefined}
              borderColor={selectedField === 'work' ? 'cyan' : undefined}
              paddingX={1}
            >
              <Box width={30}>
                <Text color={selectedField === 'work' ? 'cyan' : undefined}>
                  Work Duration (min):
                </Text>
              </Box>
              <Box>
                {isEditingField && selectedField === 'work' ? (
                  <>
                    <Text color="yellow">{editingValue}</Text>
                    <Text color="yellow">█</Text>
                  </>
                ) : (
                  <Text bold>{settings.workMinutes}</Text>
                )}
              </Box>
            </Box>

            <Box
              borderStyle={selectedField === 'shortBreak' ? 'single' : undefined}
              borderColor={selectedField === 'shortBreak' ? 'cyan' : undefined}
              paddingX={1}
            >
              <Box width={30}>
                <Text color={selectedField === 'shortBreak' ? 'cyan' : undefined}>
                  Short Break (min):
                </Text>
              </Box>
              <Box>
                {isEditingField && selectedField === 'shortBreak' ? (
                  <>
                    <Text color="yellow">{editingValue}</Text>
                    <Text color="yellow">█</Text>
                  </>
                ) : (
                  <Text bold>{settings.shortBreakMinutes}</Text>
                )}
              </Box>
            </Box>

            <Box
              borderStyle={selectedField === 'longBreak' ? 'single' : undefined}
              borderColor={selectedField === 'longBreak' ? 'cyan' : undefined}
              paddingX={1}
            >
              <Box width={30}>
                <Text color={selectedField === 'longBreak' ? 'cyan' : undefined}>
                  Long Break (min):
                </Text>
              </Box>
              <Box>
                {isEditingField && selectedField === 'longBreak' ? (
                  <>
                    <Text color="yellow">{editingValue}</Text>
                    <Text color="yellow">█</Text>
                  </>
                ) : (
                  <Text bold>{settings.longBreakMinutes}</Text>
                )}
              </Box>
            </Box>

            <Box
              borderStyle={selectedField === 'sessions' ? 'single' : undefined}
              borderColor={selectedField === 'sessions' ? 'cyan' : undefined}
              paddingX={1}
            >
              <Box width={30}>
                <Text color={selectedField === 'sessions' ? 'cyan' : undefined}>
                  Sessions until long break:
                </Text>
              </Box>
              <Box>
                {isEditingField && selectedField === 'sessions' ? (
                  <>
                    <Text color="yellow">{editingValue}</Text>
                    <Text color="yellow">█</Text>
                  </>
                ) : (
                  <Text bold>{settings.sessionsUntilLongBreak}</Text>
                )}
              </Box>
            </Box>
          </Box>

          <Box marginTop={2}>
            <Text dimColor>
              {isEditingField
                ? 'Type a number and press Enter to save, or Esc to cancel'
                : 'Press Enter to edit, ↑↓ to navigate, Esc to return'}
            </Text>
          </Box>
        </Box>

        <StatusBar
          error={error}
          hints={['↑↓ Navigate', 'Enter Edit', 'Esc Back']}
        />
      </Box>
    );
  }

  // Timer view
  const progressPercent = Math.round((timeLeft / (
    mode === 'work' ? settings.workMinutes * 60 :
    mode === 'short-break' ? settings.shortBreakMinutes * 60 :
    settings.longBreakMinutes * 60
  )) * 100);

  return (
    <Box flexDirection="column" height="100%">
      <Header 
        title="Pomodoro Timer" 
        subtitle={`Session ${completedSessions + 1} • ${completedSessions} completed`}
      />

      <Box flexDirection="column" flexGrow={1} alignItems="center" justifyContent="center">
        <Box flexDirection="column" alignItems="center">
          <Text bold color={getModeColor()} fontSize={16}>
            {getModeDisplay()}
          </Text>

          <Box marginTop={2} marginBottom={2}>
            <Text fontSize={32} bold color={getModeColor()}>
              {formatTime(timeLeft)}
            </Text>
          </Box>

          <Box marginBottom={2}>
            <Text dimColor>
              {progressPercent}% remaining
            </Text>
          </Box>

          <Box flexDirection="column" alignItems="center" gap={1}>
            <Box>
              <Text bold color={isRunning ? 'yellow' : 'green'}>
                {isRunning ? '⏸  [Space] Pause' : '▶  [Space] Start'}
              </Text>
            </Box>
            <Box>
              <Text dimColor>[r] Reset Timer</Text>
            </Box>
            <Box>
              <Text dimColor>[s] Skip to Next</Text>
            </Box>
            <Box>
              <Text dimColor>[x] Reset Session</Text>
            </Box>
            <Box>
              <Text dimColor>[c] Configure Settings</Text>
            </Box>
          </Box>

          <Box marginTop={3} flexDirection="column" alignItems="center">
            <Text bold underline>Progress</Text>
            <Box marginTop={1}>
              <Text>
                {Array.from({ length: settings.sessionsUntilLongBreak }).map((_, i) => (
                  <Text key={i} color={i < completedSessions % settings.sessionsUntilLongBreak ? 'green' : 'gray'}>
                    {i < completedSessions % settings.sessionsUntilLongBreak ? '●' : '○'}{' '}
                  </Text>
                ))}
              </Text>
            </Box>
          </Box>
        </Box>
      </Box>

      <StatusBar
        error={error}
        hints={[
          'Space Start/Pause',
          'r Reset',
          's Skip',
          'c Settings',
          'Esc Back',
        ]}
      />
    </Box>
  );
}
