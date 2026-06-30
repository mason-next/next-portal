// Client-side broadcast bus: after any mutation completes, call mutationBus.notify()
// and all subscribed polling hooks (notifications, tasks, etc.) will immediately refetch
// rather than waiting for their next scheduled interval.
type Listener = () => void;
const listeners = new Set<Listener>();

export const mutationBus = {
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  notify() {
    listeners.forEach((fn) => fn());
  },
};
