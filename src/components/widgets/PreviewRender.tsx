import { Award } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Proof = Database["public"]["Tables"]["proof_objects"]["Row"];

export interface WidgetConfig {
  variant?: "floating" | "inline" | "badge";
  position?: string;
  interval_seconds?: number;
  show_avatar?: boolean;
  show_rating?: boolean;
  brand_color?: string;
  powered_by?: boolean;
}

export function PreviewRender({
  variant,
  cfg,
  sample,
  showPoweredBy = true,
}: {
  variant: "floating" | "inline" | "badge";
  cfg: WidgetConfig;
  sample?: Proof | null;
  showPoweredBy?: boolean;
}) {
  const author = sample?.author_name ?? "Jamie Smith";
  const text = sample?.content ?? "Just signed up for Pro!";

  if (variant === "badge") {
    return (
      <div className="inline-flex items-center gap-2 bg-card border rounded-full px-3 py-1.5 shadow-sm">
        <Award className="h-4 w-4" style={{ color: cfg.brand_color ?? "hsl(var(--gold))" }} />
        <span className="text-xs font-semibold">142 verified reviews</span>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className="bg-card border rounded-lg p-4 max-w-sm w-full mx-4">
        <div className="text-sm font-medium">"{text}"</div>
        <div className="text-xs text-muted-foreground mt-2">— {author}</div>
        {showPoweredBy && (
          <div className="text-[10px] text-muted-foreground/70 mt-2">Powered by NotiProof</div>
        )}
      </div>
    );
  }

  const posClass =
    cfg.position === "bottom-right"
      ? "bottom-4 right-4"
      : cfg.position === "top-left"
      ? "top-4 left-4"
      : cfg.position === "top-right"
      ? "top-4 right-4"
      : "bottom-4 left-4";

  return (
    <div className={`absolute ${posClass} bg-card border rounded-lg shadow-lg p-3 flex items-center gap-3 max-w-[260px]`}>
      {cfg.show_avatar !== false && (
        <div
          className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold text-accent-foreground"
          style={{ backgroundColor: cfg.brand_color ?? "hsl(var(--accent))" }}
        >
          {author.charAt(0)}
        </div>
      )}
      <div className="text-xs">
        <div className="font-semibold">{author}</div>
        <div className="text-muted-foreground">{text.length > 40 ? text.slice(0, 40) + "…" : text}</div>
        {showPoweredBy && (
          <div className="text-[10px] text-muted-foreground/70 mt-1">Powered by NotiProof</div>
        )}
      </div>
    </div>
  );
}
