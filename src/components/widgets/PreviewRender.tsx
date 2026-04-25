import { useEffect, useRef, useState } from "react";
import { Award, MessageSquareQuote, X } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ProofRow = Database["public"]["Tables"]["proof_objects"]["Row"];
// `poster_url` and `highlight_phrase` may not yet appear in the generated types.
type Proof = ProofRow & {
  poster_url?: string | null;
  highlight_phrase?: string | null;
};

export interface WidgetConfig {
  variant?: "floating" | "inline" | "badge" | "banner" | "wall";
  position?: string;
  interval_seconds?: number;
  show_avatar?: boolean;
  show_rating?: boolean;
  brand_color?: string;
  powered_by?: boolean;
  default_cta_label?: string;
  default_cta_url?: string;
  business_website_url?: string;
  /** Real review count for the badge variant. Badge is hidden when missing or 0. */
  review_count?: number;
}

function isVideoProof(p?: Proof | null) {
  if (!p) return false;
  if (p.type && /video/i.test(p.type)) return true;
  const u = (p.media_url || "").toLowerCase().split("?")[0];
  return /\.(webm|mp4|mov|m4v)$/.test(u);
}

/** Build the attribution line: Name · Role, Company (graceful fallbacks). */
function buildAttribution(p: Proof): string {
  const name = (p.author_name ?? "").trim();
  const role = (p.author_role ?? "").trim();
  const company = (p.author_company ?? "").trim();
  if (!name) return "";
  if (role && company) return `${name} · ${role}, ${company}`;
  if (role) return `${name} · ${role}`;
  if (company) return `${name} · ${company}`;
  return name;
}

/** Bold the first case-insensitive occurrence of `highlight` inside `text`. */
function renderQuote(text: string, highlight?: string | null) {
  if (!highlight || !highlight.trim()) return text;
  const idx = text.toLowerCase().indexOf(highlight.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-transparent font-semibold text-slate-900">
        {text.slice(idx, idx + highlight.length)}
      </mark>
      {text.slice(idx + highlight.length)}
    </>
  );
}

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  const r = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div className="inline-flex gap-px" aria-label={`${r} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20" fill={i <= r ? "#F5B400" : "#E5E7EB"}>
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
    // Seek positions to try in order — skip black intros / fade-ins.
    const seekTimes = [1.5, 3, 5];
    let attempt = 0;

    const isMostlyDark = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      try {
        let dark = 0;
        const samples = 100;
        for (let i = 0; i < samples; i++) {
          const x = Math.floor(Math.random() * w);
          const y = Math.floor(Math.random() * h);
          const px = ctx.getImageData(x, y, 1, 1).data;
          const lum = 0.2126 * px[0] + 0.7152 * px[1] + 0.0722 * px[2];
          if (lum < 30) dark++;
        }
        return dark / samples > 0.95;
      } catch {
        return false; // tainted — assume fine
      }
    };

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
        if (isMostlyDark(ctx, w, h) && attempt < seekTimes.length - 1) {
          attempt++;
          try { v.currentTime = seekTimes[attempt]; } catch { /* ignore */ }
          return; // wait for next 'seeked' event
        }
        const url = canvas.toDataURL("image/jpeg", 0.82);
        if (!cancelled) {
          setPoster(url);
          captured = true;
        }
      } catch {
        /* tainted — keep video element */
      }
    };

    const onLoaded = () => {
      try { v.currentTime = seekTimes[0]; } catch { /* ignore */ }
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
          src={`${src}#t=1.5`}
          muted
          playsInline
          preload="metadata"
          crossOrigin="anonymous"
          className="w-full h-full object-cover"
        />
      )}
      <PlayOverlay brand={brand} />
    </div>
  );
}

function PlayOverlay({ brand }: { brand: string }) {
  return (
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
  );
}

function NeutralMediaTile({ brand }: { brand: string }) {
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: `${brand}14` }}
    >
      <MessageSquareQuote className="h-7 w-7" style={{ color: brand, opacity: 0.55 }} />
    </div>
  );
}

function Media({ sample, cfg }: { sample: Proof | null; cfg: WidgetConfig }) {
  if (cfg.show_avatar === false) return null;
  const brand = cfg.brand_color ?? "#6366f1";
  const baseClass =
    "self-stretch aspect-square shrink-0 rounded-[10px] overflow-hidden bg-slate-100 flex items-center justify-center";
  const minStyle = { minHeight: 84, maxHeight: 140 } as const;

  if (!sample) {
    return (
      <div className={baseClass} style={minStyle}>
        <NeutralMediaTile brand={brand} />
      </div>
    );
  }

  // Pre-generated server poster wins (when available).
  if (isVideoProof(sample) && sample.poster_url) {
    return (
      <div className={baseClass} style={minStyle}>
        <div className="relative w-full h-full">
          <img src={sample.poster_url} alt="" className="w-full h-full object-cover" />
          <PlayOverlay brand={brand} />
        </div>
      </div>
    );
  }
  if (isVideoProof(sample) && sample.media_url) {
    return (
      <div className={baseClass} style={minStyle}>
        <VideoThumb src={sample.media_url} brand={brand} />
      </div>
    );
  }
  const photo = sample.author_photo_url || sample.author_avatar_url;
  if (photo) {
    return (
      <div className={baseClass} style={minStyle}>
        <img src={photo} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }
  const name = (sample.author_name ?? "").trim();
  if (name) {
    const initial = name.charAt(0).toUpperCase();
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
  return (
    <div className={baseClass} style={minStyle}>
      <NeutralMediaTile brand={brand} />
    </div>
  );
}

function EmptyStateCard({ showPoweredBy }: { showPoweredBy: boolean }) {
  return (
    <div className="bg-white text-slate-900 border border-dashed border-slate-300 rounded-[14px] shadow-sm p-4 flex gap-3 items-center w-[420px] max-w-[420px]">
      <div className="self-stretch aspect-square shrink-0 rounded-[10px] bg-slate-100 flex items-center justify-center" style={{ minHeight: 84, maxHeight: 140 }}>
        <MessageSquareQuote className="h-7 w-7 text-slate-400" />
      </div>
      <div className="flex-1 min-w-0 text-[12.5px] leading-snug flex flex-col text-slate-500">
        <div className="font-medium text-slate-700">No approved proof yet</div>
        <div className="mt-1">This widget will appear here once you have approved proof.</div>
        {showPoweredBy && (
          <div className="mt-auto pt-1 text-right">
            <span className="text-[9px] text-slate-300">powered by NotiProof</span>
          </div>
        )}
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
  if (!sample) return <EmptyStateCard showPoweredBy={showPoweredBy} />;

  const text = sample.content ?? "";
  const trimmed = text.length > 140 ? text.slice(0, 140) + "…" : text;
  const showStars = cfg.show_rating !== false && !!sample.rating;
  const attribution = buildAttribution(sample);

  return (
    <div className="bg-white text-slate-900 border border-slate-900/[.06] rounded-[14px] shadow-[0_12px_32px_rgba(15,23,42,0.18)] p-3.5 flex gap-3 items-stretch relative w-[420px] max-w-[420px]">
      <button
        aria-label="Close"
        className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-900/[.06] hover:text-slate-600"
        onClick={(e) => e.stopPropagation()}
      >
        <X className="h-4 w-4" />
      </button>
      <Media sample={sample} cfg={cfg} />
      <div className="flex-1 min-w-0 leading-snug flex flex-col">
        {showStars && (
          <div className="mb-1">
            <Stars rating={sample.rating as unknown as number} size={14} />
          </div>
        )}
        <div className="text-[13.5px] text-slate-700 line-clamp-3">
          {renderQuote(trimmed, sample.highlight_phrase)}
        </div>
        {attribution && (
          <div className="text-[11px] text-slate-500 mt-1.5 truncate">{attribution}</div>
        )}
        {showPoweredBy && (
          <div className="mt-auto pt-1 text-right">
            <span className="text-[9px] text-slate-300">powered by NotiProof</span>
          </div>
        )}
      </div>
    </div>
  );
}

function BannerVariant({
  sample,
  cfg,
  showPoweredBy,
}: {
  sample: Proof | null;
  cfg: WidgetConfig;
  showPoweredBy: boolean;
}) {
  const brand = cfg.brand_color ?? "#6366f1";

  if (!sample) {
    return (
      <div className="absolute top-0 left-0 right-0 bg-white border-b border-dashed border-slate-300 flex items-center gap-3 px-4 py-2 text-[12.5px] text-slate-500">
        <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: brand }} />
        <span>No approved proof yet — this banner will appear once you have one.</span>
        {showPoweredBy && (
          <span className="ml-auto text-[9px] text-slate-300 hidden sm:inline shrink-0">powered by NotiProof</span>
        )}
      </div>
    );
  }

  const text = sample.content ?? "";
  const trimmed = text.length > 90 ? text.slice(0, 90) + "…" : text;
  const showStars = cfg.show_rating !== false && !!sample.rating;
  const attribution = buildAttribution(sample);

  return (
    <div className="absolute top-0 left-0 right-0 bg-white border-b border-slate-900/[.06] shadow-sm flex items-center gap-3 px-4 py-2 text-[13px] text-slate-900">
      <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: brand }} />
      {showStars && (
        <div className="shrink-0">
          <Stars rating={sample.rating as unknown as number} size={13} />
        </div>
      )}
      <div className="text-slate-700 truncate flex-1 min-w-0">
        {renderQuote(trimmed, sample.highlight_phrase)}
      </div>
      {attribution && (
        <div className="text-[11px] text-slate-500 truncate shrink-0 max-w-[40%]">{attribution}</div>
      )}
      {showPoweredBy && (
        <span className="text-[9px] text-slate-300 hidden sm:inline shrink-0">powered by NotiProof</span>
      )}
      <button aria-label="Close" className="text-slate-400 hover:text-slate-600 shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function WallVariant({
  sample,
  cfg,
  showPoweredBy,
}: {
  sample: Proof | null;
  cfg: WidgetConfig;
  showPoweredBy: boolean;
}) {
  if (!sample) {
    return (
      <div className="absolute bottom-4 left-4 right-4 flex justify-end">
        <EmptyStateCard showPoweredBy={showPoweredBy} />
      </div>
    );
  }
  return (
    <div className="absolute bottom-4 right-4">
      <Card sample={sample} cfg={cfg} showPoweredBy={showPoweredBy} />
    </div>
  );
}

export function PreviewRender({
  variant,
  cfg,
  sample,
  showPoweredBy = true,
}: {
  variant: "floating" | "inline" | "badge" | "banner" | "wall";
  cfg: WidgetConfig;
  sample?: Proof | null;
  showPoweredBy?: boolean;
}) {
  const proof = sample ?? null;

  if (variant === "badge") {
    const count = cfg.review_count ?? 0;
    if (!count || count <= 0) {
      return (
        <div className="inline-flex items-center gap-2 bg-card border border-dashed rounded-full px-3 py-1.5 text-xs text-muted-foreground">
          <Award className="h-4 w-4" />
          <span>Badge will appear once you have approved reviews.</span>
        </div>
      );
    }
    return (
      <div className="inline-flex items-center gap-2 bg-card border rounded-full px-3 py-1.5 shadow-sm">
        <Award className="h-4 w-4" style={{ color: cfg.brand_color ?? "hsl(var(--gold))" }} />
        <span className="text-xs font-semibold">
          {count} verified review{count === 1 ? "" : "s"}
        </span>
      </div>
    );
  }

  if (variant === "banner") {
    return <BannerVariant sample={proof} cfg={cfg} showPoweredBy={showPoweredBy} />;
  }

  if (variant === "wall") {
    return <WallVariant sample={proof} cfg={cfg} showPoweredBy={showPoweredBy} />;
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
