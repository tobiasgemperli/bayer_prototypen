import { useSyncExternalStore } from 'react';
import { setAssistantLayout, AssistantLayout } from './assistant-layout';
import { requestAssistantOpen } from './plot-focus';

// Demo spine: a single registry of switchable prototype experiences. Adding a
// new prototype = append one entry; the header switcher and the /prototypes
// gallery both read this list, so they never drift.
export interface Prototype {
  id: string;
  name: string;
  blurb: string;
  /** Put the app into this prototype's experience. */
  launch: () => void;
}

function assistant(id: string, name: string, blurb: string, layout: AssistantLayout): Prototype {
  return { id, name, blurb, launch: () => { setAssistantLayout(layout); requestAssistantOpen(); } };
}

export const PROTOTYPES: Prototype[] = [
  assistant('assistant-floating', 'Assistant · Floating', 'AI in a bottom-right chat bubble that floats over the app.', 'floating'),
  assistant('assistant-sidebar', 'Assistant · Sidebar', 'AI docked as a right rail that pushes the page aside.', 'sidebar'),
  assistant('assistant-inline', 'Assistant · Inline', 'AI docked as a full-width console under the content.', 'inline'),
  // Chat-first (segmented Chat/UI) will be appended here once built.
];

const KEY = 'resiyou:prototype';
const listeners = new Set<() => void>();

function loadCurrent(): string {
  const v = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
  return PROTOTYPES.some(p => p.id === v) ? (v as string) : PROTOTYPES[0].id;
}
let _current = loadCurrent();

/** Switch to a prototype and remember it (survives reloads mid-demo). */
export function launchPrototype(id: string): void {
  const p = PROTOTYPES.find(x => x.id === id);
  if (!p) return;
  _current = id;
  try { localStorage.setItem(KEY, id); } catch { /* ignore */ }
  listeners.forEach(l => l());
  p.launch();
}

export function useCurrentPrototype(): Prototype {
  const id = useSyncExternalStore(
    cb => { listeners.add(cb); return () => listeners.delete(cb); },
    () => _current,
  );
  return PROTOTYPES.find(p => p.id === id) ?? PROTOTYPES[0];
}
