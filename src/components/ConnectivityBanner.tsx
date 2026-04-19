import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Subtle banner shown when the browser reports it's offline OR when a
 * recent fetch failure has been recorded. Driven by `navigator.onLine`
 * and a custom `app:fetch-failed` window event that pages can dispatch.
 */
export function ConnectivityBanner() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [recentFailure, setRecentFailure] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setRecentFailure(false);
    };
    const handleOffline = () => setOnline(false);
    const handleFailure = () => {
      setRecentFailure(true);
      // Auto-clear after 6s in case it was a one-off blip
      window.setTimeout(() => setRecentFailure(false), 6000);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("app:fetch-failed", handleFailure);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("app:fetch-failed", handleFailure);
    };
  }, []);

  if (online && !recentFailure) return null;

  const message = !online
    ? "You appear to be offline — your data is safe, retrying when you're back."
    : "Connection issue — retrying…";

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 border-b border-border bg-warning/10 px-4 py-2 text-sm text-foreground backdrop-blur">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
