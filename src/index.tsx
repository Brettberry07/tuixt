import 'dotenv/config';
import React from 'react';
import { render } from 'ink';
import { App } from './app.js';

// Clear the screen and render the app
console.clear();

const { waitUntilExit } = render(<App />);

// Handle graceful shutdown
process.on('SIGINT', () => {
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});

// Wait until the app exits
waitUntilExit().then(() => {
  process.exit(0);
});
