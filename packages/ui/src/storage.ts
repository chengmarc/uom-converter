// The choices the apps remember (audience, region and the like), in localStorage. It can be
// blocked (a private window, say): reading then finds nothing, and a choice still applies until
// the page closes.

export function stored(key: string): string | undefined {
  try {
    return localStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

export function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Blocked: see above.
  }
}
