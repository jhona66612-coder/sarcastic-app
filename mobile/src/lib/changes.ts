const listeners = new Set<() => void>();
export function notifyChanges() { listeners.forEach(listener => listener()); }
export function subscribeChanges(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
