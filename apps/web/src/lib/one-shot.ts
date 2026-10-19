/**
 * Wraps `fn` so only the first call runs; every later call is a no-op.
 * The guard is set before `fn` runs, so a throwing or re-entrant call
 * (e.g. a blocking `window.print()` that lets a timer fire) still counts.
 */
export function oneShot(fn: () => void): () => void {
  let done = false;
  return () => {
    if (done) return;
    done = true;
    fn();
  };
}
