import { useSyncExternalStore } from 'react';

// ── Command types ────────────────────────────────────────────────────────────

export interface AddTreatmentCommand {
  action: 'addTreatment';
  plotId?: string;
  date?: string;        // ISO date string
  product?: string;
  method?: string;
  productDoseValue?: string;
  productDoseUnit?: string;
  waterVolumeValue?: string;
  waterVolumeUnit?: string;
}

export interface NavigateCommand {
  action: 'navigate';
  to: string;  // e.g. '/plot/1', '/'
}

export interface SaveCommand {
  action: 'save';
}

export interface MessageCommand {
  action: 'message';
  text: string;
}

export type VoiceCommand =
  | AddTreatmentCommand
  | NavigateCommand
  | SaveCommand
  | MessageCommand;

// ── Store ────────────────────────────────────────────────────────────────────

let pendingCommands: VoiceCommand[] = [];
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version++;
  listeners.forEach(l => l());
}

export function pushCommand(cmd: VoiceCommand) {
  pendingCommands.push(cmd);
  notify();
}

export function consumeCommands(): VoiceCommand[] {
  const cmds = pendingCommands;
  pendingCommands = [];
  return cmds;
}

export function usePendingCommands(): VoiceCommand[] {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => pendingCommands,
  );
}

// ── Status feedback (what the UI did) ────────────────────────────────────────

let statusLog: string[] = [];
let statusVersion = 0;
const statusListeners = new Set<() => void>();

export function pushStatus(msg: string) {
  statusLog.push(msg);
  statusVersion++;
  statusListeners.forEach(l => l());
}

export function consumeStatus(): string[] {
  const msgs = statusLog;
  statusLog = [];
  return msgs;
}
