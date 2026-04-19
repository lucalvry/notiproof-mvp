/**
 * Helpers to make data-fetching in pages resilient to transient
 * network failures (e.g. brief Supabase blips). The goal: a single
 * dropped fetch should never make a page look "wiped".
 */

const FETCH_FAILURE_EVENT = "app:fetch-failed";

function isTransientNetworkError(err: unknown): boolean {
  if (!err) return false;
  // Browser fetch wrappers throw `TypeError: Failed to fetch` on
  // network-layer failures; supabase-js rethrows these directly.
  if (err instanceof TypeError) return true;
  const msg = (err as { message?: string })?.message?.toLowerCase() ?? "";
  return (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("load failed")
  );
}

/**
 * Run an async query with a single retry on transient network errors.
 * If both attempts fail, dispatches the global `app:fetch-failed` event
 * (so the ConnectivityBanner can surface it) and returns `fallback`.
 */
export async function safeQuery<T>(
  fn: () => Promise<T>,
  fallback: T,
  opts: { label?: string; retryDelayMs?: number } = {}
): Promise<T> {
  const { label = "query", retryDelayMs = 1000 } = opts;
  try {
    return await fn();
  } catch (err) {
    if (!isTransientNetworkError(err)) {
      console.error(`[safeQuery:${label}] non-transient error`, err);
      return fallback;
    }
    console.warn(`[safeQuery:${label}] transient failure, retrying in ${retryDelayMs}ms`, err);
    await new Promise((r) => setTimeout(r, retryDelayMs));
    try {
      return await fn();
    } catch (retryErr) {
      console.error(`[safeQuery:${label}] retry also failed`, retryErr);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(FETCH_FAILURE_EVENT));
      }
      return fallback;
    }
  }
}
