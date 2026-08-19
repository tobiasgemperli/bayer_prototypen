import { useSyncExternalStore } from 'react';

// How the assistant's mic behaves:
//   toggle — tap to start/stop; final transcript auto-sends ("Just Speak").
//   push   — press and hold to talk; release to send ("Hold to speak").
export type AudioMode = 'toggle' | 'push';

let _mode: AudioMode = 'toggle';
const listeners = new Set<() => void>();

export function setAudioMode(next: AudioMode): void {
  _mode = next;
  listeners.forEach(l => l());
}

export function useAudioMode(): AudioMode {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => listeners.delete(cb); },
    () => _mode,
  );
}
