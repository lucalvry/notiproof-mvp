// Turns Supabase auth errors into readable messages. Timeouts and server
// outages often arrive with an empty message ("{}"), which confused users.
const OUTAGE_MESSAGE = "We couldn't reach the sign-in service. Please try again in a minute.";

export function friendlyAuthError(error: unknown): string {
  const e = error as { message?: string; status?: number; name?: string } | null;
  const msg = typeof e?.message === "string" ? e.message.trim() : "";
  if (
    !msg ||
    msg === "{}" ||
    (typeof e?.status === "number" && e.status >= 500) ||
    e?.name === "AuthRetryableFetchError" ||
    /failed to fetch|timeout|deadline|network/i.test(msg)
  ) {
    return OUTAGE_MESSAGE;
  }
  return msg;
}
