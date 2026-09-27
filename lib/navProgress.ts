/**
 * Tiny global store for the top-of-page navigation progress bar.
 *
 * Lives outside React because the <Navbar /> is rendered per page, so it
 * unmounts and remounts on every navigation. Keeping the state here means
 * the bar carries on smoothly across that remount.
 */

type State = { value: number; visible: boolean };

let state: State = { value: 0, visible: false };
const listeners = new Set<() => void>();

let trickleTimer: ReturnType<typeof setInterval> | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let safetyTimer: ReturnType<typeof setTimeout> | null = null;

function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function clearTimers() {
  if (trickleTimer) clearInterval(trickleTimer);
  if (hideTimer) clearTimeout(hideTimer);
  if (safetyTimer) clearTimeout(safetyTimer);
  trickleTimer = hideTimer = safetyTimer = null;
}

export function startNavProgress() {
  if (state.visible && state.value < 1) return; // already running
  clearTimers();
  set({ value: 0.08, visible: true });

  // Creep towards 90% — fast at first, slower as it gets closer.
  trickleTimer = setInterval(() => {
    const v = state.value;
    if (v >= 0.9) return;
    const step = v < 0.3 ? 0.1 : v < 0.6 ? 0.05 : v < 0.8 ? 0.02 : 0.005;
    set({ value: Math.min(v + step, 0.9) });
  }, 200);

  // Never leave the bar stuck if a navigation is cancelled or fails.
  safetyTimer = setTimeout(doneNavProgress, 10000);
}

export function doneNavProgress() {
  if (!state.visible) return;
  clearTimers();
  set({ value: 1 });
  hideTimer = setTimeout(() => {
    set({ visible: false });
    hideTimer = setTimeout(() => set({ value: 0 }), 200);
  }, 250);
}

export function subscribeNavProgress(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getNavProgress() {
  return state;
}

const serverState: State = { value: 0, visible: false };
export function getServerNavProgress() {
  return serverState;
}
