import { useSyncExternalStore } from 'react';

export type AuthPhase = 'signed-in' | 'needs-completion' | 'completed';
export type DemoMode = 'seeded' | 'empty' | 'onboarding';
export type OnboardingStep = 'create-plot' | 'add-treatment' | 'view-forecast' | 'done';

let _phase: AuthPhase = 'signed-in';
let _demoMode: DemoMode = 'seeded';
let _onboardingStep: OnboardingStep = 'create-plot';
let _stepProgress: number = 0;
let _coachActive: boolean = false;
const _listeners = new Set<() => void>();

function emit() { _listeners.forEach((l) => l()); }
function subscribe(listener: () => void) {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

export function useAuthPhase(): AuthPhase { return useSyncExternalStore(subscribe, () => _phase); }
export function useDemoMode(): DemoMode { return useSyncExternalStore(subscribe, () => _demoMode); }
export function useOnboardingStep(): OnboardingStep { return useSyncExternalStore(subscribe, () => _onboardingStep); }
export function useStepProgress(): number { return useSyncExternalStore(subscribe, () => _stepProgress); }
export function useCoachActive(): boolean { return useSyncExternalStore(subscribe, () => _coachActive); }

export function setAuthPhase(phase: AuthPhase) { _phase = phase; emit(); }
export function setDemoMode(mode: DemoMode) { _demoMode = mode; emit(); }
export function setOnboardingStep(step: OnboardingStep) { _onboardingStep = step; _stepProgress = 0; emit(); }
export function setStepProgress(progress: number) {
  const clamped = Math.max(0, Math.min(1, progress));
  if (clamped !== _stepProgress) { _stepProgress = clamped; emit(); }
}
export function setCoachActive(active: boolean) {
  if (active !== _coachActive) { _coachActive = active; emit(); }
}

export function startOnboarding() {
  _demoMode = 'onboarding';
  _phase = 'completed';
  _onboardingStep = 'create-plot';
  _stepProgress = 0;
  _coachActive = false;
  emit();
}
