import React from 'react';
import { RouterProvider } from 'react-router';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { theme } from './theme';
import { router } from './routes';
import { Toaster } from 'sonner';
import { ChatAssistant } from './main/ChatAssistant';
import { ChatFirstWorkspace } from './variants/chat-first-v1/ChatFirstWorkspace';
import { useCurrentPrototype } from './data/prototypes';

/** Renders the assistant experience for the active prototype. */
function AssistantHost() {
  const proto = useCurrentPrototype();
  return proto.id === 'chat-first' ? <ChatFirstWorkspace /> : <ChatAssistant />;
}

export default function App(props: any) {
  // Filter out Figma-specific tracking properties (data-fg-* and data-fgid-*) to prevent MUI warnings
  const filteredProps = Object.keys(props).reduce((acc, key) => {
    if (!key.startsWith('data-fg') && !key.startsWith('data-fgid')) {
      acc[key] = props[key];
    }
    return acc;
  }, {} as Record<string, any>);

  return (
    <div id="app-root" {...filteredProps}>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <CssBaseline />
          <Toaster position="top-right" richColors />
          <RouterProvider router={router} />
          <AssistantHost />
        </LocalizationProvider>
      </ThemeProvider>
    </div>
  );
}