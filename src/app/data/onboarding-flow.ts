import { useSyncExternalStore } from 'react';

// Step of the Onboarding prototype wizard. 4 = "you're all set" finish screen.
export type OnbStep = 1 | 2 | 3 | 4;
export const ONB_TITLES = ['Your plots', 'Your treatments', 'Your samples'];

let _step: OnbStep = 1;
const listeners = new Set<() => void>();

export function setOnboardingStep(next: OnbStep): void {
  _step = next;
  listeners.forEach(l => l());
}

export function useOnboardingStep(): OnbStep {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => listeners.delete(cb); },
    () => _step,
  );
}
