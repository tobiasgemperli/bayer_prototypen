import { useSyncExternalStore } from 'react';

// ── Last-opened plot ─────────────────────────────────────────────────────────
// Remembered so the assistant can assume a target plot when the user is on the
// plots list (no plot in the URL) and doesn't name one.

let _lastOpenedPlot: string | null = null;

export function setLastOpenedPlot(id: string): void { _lastOpenedPlot = id; }
export function getLastOpenedPlot(): string | null { return _lastOpenedPlot; }

// ── Plot-row blink signal ────────────────────────────────────────────────────
// The assistant asks the plots list to blink a row (to "browse into" a plot)
// before opening it. `nonce` makes re-blinking the same plot re-fire.

interface FocusState { plotId: string; nonce: number }

let _focus: FocusState | null = null;
let _nonce = 0;
const _listeners = new Set<() => void>();

export function focusPlotRow(plotId: string): void {
  _focus = { plotId, nonce: ++_nonce };
  _listeners.forEach(l => l());
}

export function useFocusedPlot(): FocusState | null {
  return useSyncExternalStore(
    cb => { _listeners.add(cb); return () => _listeners.delete(cb); },
    () => _focus,
  );
}
