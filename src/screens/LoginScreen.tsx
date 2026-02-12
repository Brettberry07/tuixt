import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { Header, InputField, StatusBar, LoadingSpinner } from '../components/index.js';
import { useAuth, useApp } from '../context/index.js';

type LoginMode = 'signin' | 'signup';
type FocusField = 'email' | 'password' | 'submit';

interface LoginScreenProps {
  onSuccess: () => void;
}

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const { signIn, signUp, isLoading, checkConfiguration } = useAuth();
  const { isCommandPaletteOpen } = useApp();
  const [mode, setMode] = useState<LoginMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focusedField, setFocusedField] = useState<FocusField>('email');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isConfigured = checkConfiguration();

  const handleSubmit = useCallback(async () => {
    setError(null);
    setMessage(null);

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    const authError =
      mode === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password);

    if (authError) {
      setError(authError);
    } else {
      if (mode === 'signup') {
        setMessage('Account created! Check your email to confirm.');
      }
      onSuccess();
    }
  }, [email, password, mode, signIn, signUp, onSuccess]);

  useInput((input, key) => {
    if (isLoading) return;

    if (key.tab || key.downArrow) {
      // Move to next field
      setFocusedField((prev) => {
        if (prev === 'email') return 'password';
        if (prev === 'password') return 'submit';
        return 'email';
      });
    } else if (key.upArrow) {
      // Move to previous field
      setFocusedField((prev) => {
        if (prev === 'submit') return 'password';
        if (prev === 'password') return 'email';
        return 'submit';
      });
    } else if (key.return && focusedField === 'submit') {
      handleSubmit();
    } else if (input === 's' && key.ctrl) {
      // Toggle between signin and signup
      setMode((prev) => (prev === 'signin' ? 'signup' : 'signin'));
      setError(null);
      setMessage(null);
    }
  }, { isActive: !isCommandPaletteOpen });

  if (!isConfigured) {
    return (
      <Box flexDirection="column" padding={2}>
        <Header title="tuixt" subtitle="Terminal Notes & Kanban" />
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor="red"
          padding={2}
        >
          <Text bold color="red">
            Configuration Required
          </Text>
          <Box marginTop={1} flexDirection="column">
            <Text>Please set the following environment variables:</Text>
            <Text color="yellow">SUPABASE_URL</Text>
            <Text color="yellow">SUPABASE_ANON_KEY</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>
              You can get these from your Supabase project settings.
            </Text>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={2}>
      <Header
        title="tuixt"
        subtitle={mode === 'signin' ? 'Sign In' : 'Create Account'}
      />

      {isLoading ? (
        <Box padding={2}>
          <LoadingSpinner text="Authenticating..." />
        </Box>
      ) : (
        <Box flexDirection="column" padding={1}>
          <InputField
            label="Email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            focused={focusedField === 'email'}
          />

          <InputField
            label="Password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            mask="•"
            focused={focusedField === 'password'}
          />

          <Box marginTop={1}>
            <Text
              color={focusedField === 'submit' ? 'cyan' : undefined}
              inverse={focusedField === 'submit'}
              bold
            >
              {focusedField === 'submit' ? '▶ ' : '  '}
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Text>
          </Box>

          <Box marginTop={2} flexDirection="column">
            <Text dimColor>
              {mode === 'signin' ? (
                <>
                  Don't have an account? Press{' '}
                  <Text color="cyan">Ctrl+S</Text> to sign up
                </>
              ) : (
                <>
                  Already have an account? Press{' '}
                  <Text color="cyan">Ctrl+S</Text> to sign in
                </>
              )}
            </Text>
            <Text dimColor>
              Use <Text color="cyan">Tab</Text> or{' '}
              <Text color="cyan">↑↓</Text> to navigate
            </Text>
          </Box>
        </Box>
      )}

      <StatusBar error={error} message={message} />
    </Box>
  );
}
