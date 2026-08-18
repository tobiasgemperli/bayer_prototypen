import { useSyncExternalStore } from 'react';

// Switchable assistant layout — compared as three "variants" from one prototype:
//   floating — bottom-right chat bubble (support-bot pattern; the original)
//   sidebar  — docked right rail that pushes page content (Copilot / Gemini)
//   inline   — docked bottom console that pushes content up (in-workspace)
export type AssistantLayout = 'floating' | 'sidebar' | 'inline';

export const ASSISTANT_LAYOUTS: { id: AssistantLayout; label: string; hint: string }[] = [
  { id: 'floating', label: 'Floating window', hint: 'Bottom-right chat bubble' },
  { id: 'sidebar', label: 'Docked sidebar', hint: 'Right rail beside the page' },
  { id: 'inline', label: 'Bottom console', hint: 'Docked under the content' },
];

const KEY = 'resiyou:assistant-layout';

function load(): AssistantLayout {
  const v = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
  return v === 'sidebar' || v === 'inline' || v === 'floating' ? v : 'floating';
}

let _layout: AssistantLayout = load();
const _listeners = new Set<() => void>();

export function setAssistantLayout(next: AssistantLayout): void {
  _layout = next;
  try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
  _listeners.forEach(l => l());
}

export function useAssistantLayout(): AssistantLayout {
  return useSyncExternalStore(
    cb => { _listeners.add(cb); return () => _listeners.delete(cb); },
    () => _layout,
  );
}
