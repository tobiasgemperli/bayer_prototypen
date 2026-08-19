import { useSyncExternalStore } from 'react';
import { setAssistantLayout, AssistantLayout } from './assistant-layout';
import { requestAssistantOpen } from './plot-focus';
import { setChatFirstMode } from './chat-first';
import { setAudioMode, AudioMode } from './audio-mode';
import { setOnboardingStep } from './onboarding-flow';
import { clearAllDemoData, resetAllDemoData } from './demo-data';
import { router } from '../routes';

// Demo spine: a single registry of switchable prototype experiences, grouped
// into sections. Adding a prototype = append one entry; the header switcher and
// the /prototypes gallery both read this, so they never drift.
export interface Prototype {
  id: string;
  name: string;
  blurb: string;
  /** Put the app into this prototype's experience. */
  launch: () => void;
}

export interface PrototypeSection {
  title: string;
  /** Shown greyed with a "coming soon" note when there are no prototypes yet. */
  comingSoon?: boolean;
  prototypes: Prototype[];
}

function assistant(id: string, name: string, blurb: string, layout: AssistantLayout, audio: AudioMode = 'toggle'): Prototype {
  return {
    id, name, blurb,
    launch: () => { setAssistantLayout(layout); setAudioMode(audio); requestAssistantOpen(); },
  };
}

export const PROTOTYPE_SECTIONS: PrototypeSection[] = [
  {
    title: 'Placement',
    prototypes: [
      assistant('assistant-floating', 'Assistant · Floating', 'AI in a bottom-right chat bubble that floats over the app.', 'floating'),
      assistant('assistant-sidebar', 'Assistant · Sidebar', 'AI docked as a right rail that pushes the page aside.', 'sidebar'),
      assistant('assistant-inline', 'Assistant · Inline', 'AI docked as a full-width console under the content.', 'inline'),
    ],
  },
  {
    title: 'Audio Interaction',
    prototypes: [
      assistant('just-speak', 'Just Speak', 'Tap the mic, speak freely, and it transcribes and sends automatically.', 'floating', 'toggle'),
      assistant('hold-to-speak', 'Hold to speak', 'Press and hold the mic while speaking; release to send (push-to-talk).', 'floating', 'push'),
    ],
  },
  {
    title: 'Fullscreen',
    prototypes: [
      {
        id: 'chat-first',
        name: 'Chat-first · Segmented',
        blurb: 'A top segmented control flips fullscreen between a chat and the UI; results render inside the chat.',
        launch: () => { setChatFirstMode('chat'); router.navigate('/'); },
      },
    ],
  },
  {
    title: 'Onboarding',
    prototypes: [
      {
        id: 'onboarding',
        name: 'Onboarding · Guided setup',
        blurb: 'A fullscreen 3-step wizard to import plots, treatments and samples by dropping files, speaking or typing.',
        launch: () => { setOnboardingStep(1); router.navigate('/'); },
      },
    ],
  },
];

/** Flat list for lookups / persistence. */
export const PROTOTYPES: Prototype[] = PROTOTYPE_SECTIONS.flatMap(s => s.prototypes);

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
  // Onboarding starts from a blank account; every other prototype gets the
  // standard seeded demo data.
  if (id === 'onboarding') clearAllDemoData();
  else resetAllDemoData();
  p.launch();
}

export function useCurrentPrototype(): Prototype {
  const id = useSyncExternalStore(
    cb => { listeners.add(cb); return () => listeners.delete(cb); },
    () => _current,
  );
  return PROTOTYPES.find(p => p.id === id) ?? PROTOTYPES[0];
}
