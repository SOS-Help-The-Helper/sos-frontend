/**
 * Shared state store for agent → map communication.
 * Agent writes MapCommands, map page subscribes and reacts.
 * Simple event emitter pattern — no external dependencies.
 */

export interface MapResult {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  distance_km?: number;
  description?: string;
  address?: string;
  phone?: string;
  source: 'partner' | '211' | 'sos';
}

export interface MapCommand {
  type: 'show_results' | 'clear' | 'focus';
  results?: MapResult[];
  fitBounds?: { sw: [number, number]; ne: [number, number] };
  zoom?: number;
  center?: [number, number]; // [lng, lat]
  query?: string; // what the user searched for
}

type Listener = (cmd: MapCommand) => void;

const listeners = new Set<Listener>();
let lastCommand: MapCommand | null = null;

export function emitMapCommand(cmd: MapCommand) {
  lastCommand = cmd;
  listeners.forEach(fn => fn(cmd));
}

export function onMapCommand(fn: Listener): () => void {
  listeners.add(fn);
  // Deliver last command immediately if exists
  if (lastCommand) fn(lastCommand);
  return () => { listeners.delete(fn); };
}

export function clearMapCommand() {
  lastCommand = null;
  emitMapCommand({ type: 'clear' });
}

export function getLastCommand(): MapCommand | null {
  return lastCommand;
}
