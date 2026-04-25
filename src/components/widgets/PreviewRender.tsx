import { useEffect, useRef, useState } from "react";
import { Award, X } from "lucide-react";
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

function isVideoProof(p?: Proof | null) {
  if (!p) return false;
  if (p.type && /video/i.test(p.type)) return true;
  const u = (p.media_url || "").toLowerCase().split("?")[0];
  return /\.(webm|mp4|mov|m4v)$/.test(u);
}

function Stars({ rating }: { rating: number }) {
  const r = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div className="inline-flex gap-px mt-0.5" aria-label={`${r} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="12" height="12" viewBox="0 0 20 20" fill={i <= r ? "#F5B400" : "#E5E7EB"}>
          <path d="M10 1.5l2.7 5.47 6.04.88-4.37 4.26 1.03 6.01L10 15.27l-5.4 2.85 1.03-6.01L1.26 7.85l6.04-.88L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

function VideoThumb({ src, brand }: { src: string; brand: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [poster, setPoster] = useState<string | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let cancelled = false;
    let captured = false;
    const capture = () => {
      if (cancelled || captured) return;
      try {
        const w = v.videoWidth, h = v.videoHeight;
        if (!w || !h) return;
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(v, 0, 0, w, h);
        const url = canvas.toDataURL("image/jpeg", 0.82);
        if (!cancelled) {
          setPoster(url);
          captured = true;
        }
      } catch {
        /* tainted — keep video */
      }
    };
    const onLoaded = () => {
      try { v.currentTime = 0.1; } catch { /* ignore */ }
      setTimeout(capture, 60);
    };
    v.addEventListener("loadeddata", onLoaded);
    v.addEventListener("seeked", capture);
    return () => {
      cancelled = true;
      v.removeEventListener("loadeddata", onLoaded);
      v.removeEventListener("seeked", capture);
    };
  }, [src]);

  return (
    <div className="relative w-full h-full">
      {poster ? (
        <img src={poster} alt="" className="w-full h-full object-cover" />
      ) : (
        <video
          ref={videoRef}
          src={`${src}#t=0.1`}
          muted
          playsInline
          preload="metadata"
          crossOrigin="anonymous"
          className="w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
        <div
          className="w-9 h-9 rounded-full bg-white/95 flex items-center justify-center shadow-md"
          style={{ boxShadow: `0 0 0 2px ${brand}55, 0 2px 8px rgba(0,0,0,.3)` }}
        >
          <svg width="14" height="14" viewBox="0 0 10 10" fill="#0f172a">
            <path d="M2 1l7 4-7 4z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Media({ sample, cfg }: { sample: Proof | null; cfg: WidgetConfig }) {
  if (cfg.show_avatar === false) return null;
  const brand = cfg.brand_color ?? "#6366f1";
  const author = sample?.author_name ?? "Jamie";
  const baseClass =
    "self-stretch aspect-square shrink-0 rounded-[10px] overflow-hidden bg-slate-100 flex items-center justify-center";
  const minStyle = { minHeight: 84, maxHeight: 140 } as const;

  if (isVideoProof(sample) && sample?.media_url) {
    return (
      <div className={baseClass} style={minStyle}>
        <VideoThumb src={sample.media_url} brand={brand} />
      </div>
    );
  }
  if (sample?.author_avatar_url) {
    return (
      <div className={baseClass} style={minStyle}>
        <img src={sample.author_avatar_url} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }
  const initial = author.trim().charAt(0).toUpperCase();
  return (
    <div className={baseClass} style={minStyle}>
      <div
        className="w-full h-full flex items-center justify-center text-white font-bold text-2xl"
        style={{ background: brand }}
      >
        {initial}
      </div>
    </div>
  );
}

function Card({
  sample,
  cfg,
  showPoweredBy,
}: {
  sample: Proof | null;
  cfg: WidgetConfig;
  showPoweredBy: boolean;
}) {
  const author = sample?.author_name ?? "Jamie Smith";
  const text = sample?.content ?? "Just signed up for Pro!";
  const trimmed = text.length > 160 ? text.slice(0, 160) + "…" : text;
  const isVerified = sample?.source === "testimonial_request";
  const showStars = cfg.show_rating !== false && !!sample?.rating;

  return (
    <div
      className="bg-white text-slate-900 border border-slate-900/[.06] rounded-[14px] shadow-[0_12px_32px_rgba(15,23,42,0.18)] p-3.5 flex gap-3 items-stretch relative max-w-[360px] w-[300px]"
    >
      <button
        aria-label="Close"
        className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-900/[.06] hover:text-slate-600"
        onClick={(e) => e.stopPropagation()}
      >
        <X className="h-4 w-4" />
      </button>
      <Media sample={sample} cfg={cfg} />
      <div className="flex-1 min-w-0 text-[13px] leading-snug">
        <div className="font-semibold text-slate-900 truncate">{author}</div>
        {showStars && <Stars rating={sample!.rating as unknown as number} />}
        {isVerified && <div className="text-[11px] text-slate-500 mt-0.5">Verified testimonial</div>}
        <div className="text-slate-700 mt-1 line-clamp-3">{trimmed}</div>
        {showPoweredBy && (
          <div className="mt-2 text-right">
            <span className="text-[10px] text-slate-400">Powered by NotiProof</span>
          </div>
        )}
      </div>
    </div>
  );
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
  const proof = sample ?? null;

  if (variant === "badge") {
    return (
      <div className="inline-flex items-center gap-2 bg-card border rounded-full px-3 py-1.5 shadow-sm">
        <Award className="h-4 w-4" style={{ color: cfg.brand_color ?? "hsl(var(--gold))" }} />
        <span className="text-xs font-semibold">142 verified reviews</span>
      </div>
    );
  }

  if (variant === "inline") {
    return <Card sample={proof} cfg={cfg} showPoweredBy={showPoweredBy} />;
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
    <div className={`absolute ${posClass}`}>
      <Card sample={proof} cfg={cfg} showPoweredBy={showPoweredBy} />
    </div>
  );
}
