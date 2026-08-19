import { useSyncExternalStore } from 'react';

// The Chat-first prototype flips the whole screen between two modes via a
// segmented control: talk to the app (chat) or click through it (ui).
export type ChatFirstMode = 'chat' | 'ui';

let _mode: ChatFirstMode = 'chat';
const listeners = new Set<() => void>();

export function setChatFirstMode(next: ChatFirstMode): void {
  _mode = next;
  listeners.forEach(l => l());
}

export function useChatFirstMode(): ChatFirstMode {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => listeners.delete(cb); },
    () => _mode,
  );
}
