import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Star, Video, Type, Loader2, CheckCircle2, AlertTriangle, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadToBunny, generateVideoPoster } from "@/lib/bunny-upload";
import { collectTestimonialSchema, parseOrError } from "@/lib/validation";
import { showRateLimitToastIf } from "@/lib/use-rate-limit-toast";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2 MB (avatar headshot)
const MAX_TESTIMONIAL_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB (main testimonial image)
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB
const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

interface CollectionContext {
  business_name: string;
  business_logo_url: string | null;
  brand_color: string | null;
  recipient_name: string | null;
  expired: boolean;
  already_completed: boolean;
  max_video_seconds: number;
}

export default function Collect() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<"text" | "photo" | "video">("text");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  // Optional "About you" details
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  // Main testimonial image (when mode === "photo"). Distinct from the
  // optional avatar headshot above.
  const [mediaPhotoFile, setMediaPhotoFile] = useState<File | null>(null);
  const [mediaPhotoPreview, setMediaPhotoPreview] = useState<string | null>(null);
  const [showAboutYou, setShowAboutYou] = useState(false);
  const [ctx, setCtx] = useState<CollectionContext | null>(null);
  const [ctxError, setCtxError] = useState<string | null>(null);

  // video
  const videoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [recording, setRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [recordSecondsLeft, setRecordSecondsLeft] = useState<number>(0);
  const recordStartRef = useRef<number>(0);
  const countdownRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error } = await supabase.functions.invoke("resolve-testimonial-token", {
        body: { token },
      });
      if (error || !data?.ok) {
        setCtxError("This testimonial link is invalid.");
        return;
      }
      if (data.expired) { setCtxError("This testimonial link has expired."); return; }
      if (data.already_completed) { setCtxError("This testimonial has already been submitted. Thank you!"); return; }
      setCtx({
        business_name: data.business_name,
        business_logo_url: data.business_logo_url,
        brand_color: data.brand_color,
        recipient_name: data.recipient_name,
        expired: data.expired,
        already_completed: data.already_completed,
        max_video_seconds: typeof data.max_video_seconds === "number" ? data.max_video_seconds : 30,
      });
      if (data.recipient_name) setName(data.recipient_name);
    })();
  }, [token]);

  // Pick the best supported MIME type. iOS Safari only supports mp4/h264 — try it
  // first so iPhone visitors don't fall through to an unsupported webm path.
  // Android Chrome and desktop browsers will skip past mp4 candidates and land on webm.
  const pickRecorderMime = (): { mime: string; ext: string; contentType: string } => {
    if (typeof MediaRecorder === "undefined") return { mime: "", ext: "webm", contentType: "video/webm" };
    const candidates: Array<{ mime: string; ext: string; contentType: string }> = [
      { mime: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", ext: "mp4", contentType: "video/mp4" },
      { mime: "video/mp4;codecs=h264,aac", ext: "mp4", contentType: "video/mp4" },
      { mime: "video/mp4", ext: "mp4", contentType: "video/mp4" },
      { mime: "video/webm;codecs=vp9,opus", ext: "webm", contentType: "video/webm" },
      { mime: "video/webm;codecs=vp8,opus", ext: "webm", contentType: "video/webm" },
      { mime: "video/webm", ext: "webm", contentType: "video/webm" },
    ];
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c.mime)) return c;
    }
    return { mime: "", ext: "webm", contentType: "video/webm" };
  };

  const recorderMimeRef = useRef<{ mime: string; ext: string; contentType: string }>({
    mime: "",
    ext: "webm",
    contentType: "video/webm",
  });

  const startRecording = async () => {
    const maxSec = ctx?.max_video_seconds ?? 30;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // iOS Safari requires playsInline + muted to preview a live MediaStream
        videoRef.current.muted = true;
        (videoRef.current as any).playsInline = true;
        videoRef.current.play().catch(() => undefined);
      }
      const picked = pickRecorderMime();
      recorderMimeRef.current = picked;
      const recorder = picked.mime ? new MediaRecorder(stream, { mimeType: picked.mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorderMimeRef.current.contentType });
        setVideoBlob(blob);
        const elapsed = (Date.now() - recordStartRef.current) / 1000;
        setVideoDuration(Math.min(elapsed, maxSec));
        stream.getTracks().forEach((t) => t.stop());
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.src = URL.createObjectURL(blob);
          videoRef.current.muted = false;
        }
        if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
        if (stopTimerRef.current) { clearTimeout(stopTimerRef.current); stopTimerRef.current = null; }
      };
      // Request small timeslices so we get periodic chunks (better for long recordings
      // and helps iOS Safari which sometimes drops a single huge chunk on stop).
      recorder.start(1000);
      recorderRef.current = recorder;
      recordStartRef.current = Date.now();
      setRecording(true);
      setRecordSecondsLeft(maxSec);
      // Hard cap: auto-stop at the plan's max video duration.
      stopTimerRef.current = window.setTimeout(() => {
        if (recorderRef.current && recorderRef.current.state === "recording") recorderRef.current.stop();
        setRecording(false);
      }, maxSec * 1000);
      countdownRef.current = window.setInterval(() => {
        const left = Math.max(0, maxSec - Math.floor((Date.now() - recordStartRef.current) / 1000));
        setRecordSecondsLeft(left);
      }, 250);
    } catch (e) {
      toast({ title: "Camera unavailable", description: (e as Error).message, variant: "destructive" });
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    // Validate the form payload up-front so the UI shows a single clear error
    // before we touch the network or the camera output.
    const validation = parseOrError(collectTestimonialSchema, {
      token,
      author_name: name,
      author_email: email,
      content: mode === "video" && !content.trim() ? `Video testimonial from ${name}` : content,
      rating,
      author_role: role || undefined,
      author_company: company || undefined,
      author_website_url: website
        ? (/^https?:\/\//i.test(website.trim()) ? website.trim() : `https://${website.trim()}`)
        : undefined,
    });
    if (validation.error && mode === "text") {
      return toast({ title: "Check your details", description: validation.error, variant: "destructive" });
    }
    if (mode === "video" && !videoBlob) {
      return toast({ title: "No video recorded", description: "Record a short video before submitting.", variant: "destructive" });
    }
    if (mode === "photo" && !mediaPhotoFile) {
      return toast({ title: "No photo selected", description: "Attach a photo before submitting.", variant: "destructive" });
    }
    if (mode === "photo" && mediaPhotoFile) {
      if (!ALLOWED_PHOTO_TYPES.has(mediaPhotoFile.type)) {
        return toast({ title: "Unsupported photo", description: "Use JPEG, PNG, WebP or GIF.", variant: "destructive" });
      }
      if (mediaPhotoFile.size > MAX_TESTIMONIAL_PHOTO_BYTES) {
        return toast({ title: "Photo too large", description: "Please keep photos under 5 MB.", variant: "destructive" });
      }
    }
    if (videoBlob && videoBlob.size > MAX_VIDEO_BYTES) {
      return toast({ title: "Video too large", description: "Please keep videos under 50 MB.", variant: "destructive" });
    }
    if (photoFile) {
      if (!ALLOWED_PHOTO_TYPES.has(photoFile.type)) {
        return toast({ title: "Unsupported photo", description: "Use JPEG, PNG, WebP or GIF.", variant: "destructive" });
      }
      if (photoFile.size > MAX_PHOTO_BYTES) {
        return toast({ title: "Photo too large", description: "Please keep photos under 2 MB.", variant: "destructive" });
      }
    }

    setSubmitting(true);
    try {
      let mediaUrl: string | null = null;
      if (mode === "video" && videoBlob) {
        const { ext, contentType } = recorderMimeRef.current;
        mediaUrl = await uploadToBunny({
          kind: "media",
          folder: `testimonials/${token}`,
          filename: `${Date.now()}.${ext}`,
          contentType,
          blob: videoBlob,
          collectionToken: token,
        });
      } else if (mode === "photo" && mediaPhotoFile) {
        mediaUrl = await uploadToBunny({
          kind: "media",
          folder: `testimonials/${token}`,
          filename: `photo-${Date.now()}-${mediaPhotoFile.name.replace(/[^a-z0-9.\-_]/gi, "_")}`,
          contentType: mediaPhotoFile.type || "image/jpeg",
          blob: mediaPhotoFile,
          collectionToken: token,
        });
      }

      let photoUrl: string | null = null;
      if (photoFile) {
        try {
          photoUrl = await uploadToBunny({
            kind: "media",
            folder: `testimonials/${token}`,
            filename: `photo-${Date.now()}-${photoFile.name.replace(/[^a-z0-9.\-_]/gi, "_")}`,
            contentType: photoFile.type || "image/jpeg",
            blob: photoFile,
            collectionToken: token,
          });
        } catch (photoErr) {
          console.error("[collect] photo upload failed, continuing without photo", photoErr);
          photoUrl = null;
          toast({
            title: "Photo couldn't be uploaded",
            description: "We'll save your testimonial without the photo. You can add one later.",
          });
        }
      }

      const finalContent = mode === "video"
        ? (content.trim() || `Video testimonial from ${name}`)
        : content.trim();

      const normalizedWebsite = website.trim()
        ? (/^https?:\/\//i.test(website.trim()) ? website.trim() : `https://${website.trim()}`)
        : null;

      // Build payload with only the fields that have values. The edge function
      // validates optional URL fields strictly — sending `null` was triggering
      // `invalid_payload` errors, so we omit empties entirely.
      const submitBody: Record<string, unknown> = {
        token,
        author_name: name,
        author_email: email,
        content: finalContent,
        rating,
      };
      if (mediaUrl) submitBody.media_url = mediaUrl;
      if (role.trim()) submitBody.author_role = role.trim();
      if (company.trim()) submitBody.author_company = company.trim();
      if (photoUrl) submitBody.author_photo_url = photoUrl;
      if (normalizedWebsite) submitBody.author_website_url = normalizedWebsite;
      if (mode === "video" && videoBlob) submitBody.media_size_bytes = videoBlob.size;
      if (mode === "video" && videoDuration > 0) {
        submitBody.media_duration_seconds = Math.round(videoDuration * 10) / 10;
      }

      const { data, error } = await supabase.functions.invoke("submit-testimonial", {
        body: submitBody,
      });
      if (error) {
        if (showRateLimitToastIf(error)) return;
        throw new Error(error.message);
      }
      if (data && (data as { error?: string }).error && showRateLimitToastIf(data)) return;
      if (!data?.ok) throw new Error(data?.error ?? "Submission failed");

      // Best-effort: generate a poster image so the widget thumbnail isn't black.
      if (mode === "video" && mediaUrl && data?.proof_object_id && data?.business_id && token) {
        void generateVideoPoster({
          businessId: data.business_id,
          mediaUrl,
          proofId: data.proof_object_id,
          authorName: name,
          brandColor: ctx?.brand_color ?? undefined,
          collectionToken: token,
        });
      }

      navigate(`/collect/${token}/done`);
    } catch (err) {
      toast({ title: "Submission failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (ctxError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-10 pb-10 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h1 className="text-xl font-semibold">Link unavailable</h1>
            <p className="text-muted-foreground mt-2">{ctxError}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!ctx) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-xl">
        <CardContent className="pt-8">
          <div className="text-center mb-6">
            {ctx.business_logo_url && (
              <img src={ctx.business_logo_url} alt={ctx.business_name} className="h-10 mx-auto mb-3 object-contain" />
            )}
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">CUST-01</div>
            <h1 className="text-2xl font-bold mt-1">Share your experience</h1>
            <p className="text-muted-foreground mt-1 text-sm">Your testimonial helps {ctx.business_name} reach more people.</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-6">
            <Button type="button" variant={mode === "text" ? "default" : "outline"} onClick={() => setMode("text")}><Type className="h-4 w-4 mr-2" /> Write</Button>
            <Button type="button" variant={mode === "video" ? "default" : "outline"} onClick={() => setMode("video")}><Video className="h-4 w-4 mr-2" /> Record video</Button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Your name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} autoComplete="name" /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} inputMode="email" autoComplete="email" /></div>
            </div>
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map((n) => (
                  <button key={n} type="button" onClick={() => setRating(n)} className="p-1" aria-label={`Rate ${n} stars`}>
                    <Star className={cn("h-7 w-7", n <= rating ? "fill-gold text-gold" : "text-muted-foreground")} />
                  </button>
                ))}
              </div>
            </div>

            {mode === "text" ? (
              <div className="space-y-2"><Label>Your testimonial</Label><Textarea rows={5} value={content} onChange={(e) => setContent(e.target.value)} required minLength={10} maxLength={5000} placeholder="What did you like most?" /></div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Video</Label>
                  <div className="rounded-md border bg-muted/30 p-2">
                    {(recording || videoBlob) ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        muted={recording}
                        controls={!!videoBlob && !recording}
                        className="w-full rounded"
                      />
                    ) : (
                      <div className="aspect-video w-full rounded flex flex-col items-center justify-center bg-muted text-muted-foreground gap-2">
                        <Video className="h-10 w-10 opacity-60" />
                        <p className="text-sm">Click "Start recording" to begin</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!recording && !videoBlob && (
                      <Button type="button" variant="outline" onClick={startRecording}>
                        Start recording <span className="ml-2 text-xs opacity-70">(max {ctx.max_video_seconds}s)</span>
                      </Button>
                    )}
                    {recording && (
                      <Button type="button" variant="destructive" onClick={stopRecording}>
                        Stop <span className="ml-2 tabular-nums text-xs">{recordSecondsLeft}s left</span>
                      </Button>
                    )}
                    {videoBlob && !recording && (
                      <Button type="button" variant="ghost" onClick={() => { setVideoBlob(null); setVideoDuration(0); }}>Re-record</Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Optional caption</Label>
                  <Textarea rows={3} value={content} onChange={(e) => setContent(e.target.value)} maxLength={5000} placeholder="A short note to go with your video" />
                </div>
              </div>
            )}

            {/* Optional "About you" — collected to power the rich lightbox modal */}
            <div className="border rounded-md">
              <button
                type="button"
                onClick={() => setShowAboutYou((s) => !s)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/30 rounded-md"
              >
                <span>About you <span className="text-muted-foreground font-normal">(optional, helps your testimonial stand out)</span></span>
                <span className="text-muted-foreground text-lg leading-none">{showAboutYou ? "−" : "+"}</span>
              </button>
              {showAboutYou && (
                <div className="px-4 pb-4 space-y-3 border-t pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Role / position</Label><Input value={role} onChange={(e) => setRole(e.target.value)} maxLength={120} placeholder="Head of Marketing" /></div>
                    <div className="space-y-2"><Label>Company</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} placeholder="Acme Inc." /></div>
                  </div>
                  <div className="space-y-2"><Label>Website (optional)</Label><Input value={website} onChange={(e) => setWebsite(e.target.value)} maxLength={300} placeholder="acme.com" /></div>
                  <div className="space-y-2">
                    <Label>Your photo (optional)</Label>
                    <div className="flex items-center gap-3">
                      {photoPreview && (
                        <img src={photoPreview} alt="" className="h-14 w-14 rounded-full object-cover border" />
                      )}
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          setPhotoFile(f);
                          if (photoPreview) URL.revokeObjectURL(photoPreview);
                          setPhotoPreview(f ? URL.createObjectURL(f) : null);
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit testimonial
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function CollectThanks() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-10 pb-10 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">CUST-02</div>
          <h1 className="text-2xl font-bold mt-1">Thank you!</h1>
          <p className="text-muted-foreground mt-2">Your testimonial has been received. We really appreciate it.</p>
        </CardContent>
      </Card>
    </div>
  );
}
