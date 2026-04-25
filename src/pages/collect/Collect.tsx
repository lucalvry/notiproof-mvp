import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Star, Video, Type, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadToBunny } from "@/lib/bunny-upload";

interface CollectionContext {
  business_name: string;
  business_logo_url: string | null;
  brand_color: string | null;
  recipient_name: string | null;
  expired: boolean;
  already_completed: boolean;
}

export default function Collect() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<"text" | "video">("text");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [ctx, setCtx] = useState<CollectionContext | null>(null);
  const [ctxError, setCtxError] = useState<string | null>(null);

  // video
  const videoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [recording, setRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);

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
      });
      if (data.recipient_name) setName(data.recipient_name);
    })();
  }, [token]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setVideoBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.src = URL.createObjectURL(blob);
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
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
    if (mode === "text" && content.trim().length < 10) {
      return toast({ title: "Testimonial too short", description: "Please share at least a sentence (10+ characters).", variant: "destructive" });
    }
    if (mode === "video" && !videoBlob) {
      return toast({ title: "No video recorded", description: "Record a short video before submitting.", variant: "destructive" });
    }

    setSubmitting(true);
    try {
      let mediaUrl: string | null = null;
      if (mode === "video" && videoBlob) {
        mediaUrl = await uploadToBunny({
          kind: "media",
          folder: `testimonials/${token}`,
          filename: `${Date.now()}.webm`,
          contentType: "video/webm",
          blob: videoBlob,
        });
      }

      const finalContent = mode === "video"
        ? (content.trim() || `Video testimonial from ${name}`)
        : content.trim();

      const { data, error } = await supabase.functions.invoke("submit-testimonial", {
        body: {
          token,
          author_name: name,
          author_email: email,
          content: finalContent,
          rating,
          media_url: mediaUrl,
        },
      });
      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.error ?? "Submission failed");

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
              <div className="space-y-2"><Label>Your name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
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
                    <video ref={videoRef} autoPlay muted={recording} controls={!!videoBlob && !recording} className="w-full rounded" />
                  </div>
                  <div className="flex gap-2">
                    {!recording && !videoBlob && <Button type="button" variant="outline" onClick={startRecording}>Start recording</Button>}
                    {recording && <Button type="button" variant="destructive" onClick={stopRecording}>Stop</Button>}
                    {videoBlob && !recording && <Button type="button" variant="ghost" onClick={() => { setVideoBlob(null); }}>Re-record</Button>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Optional caption</Label>
                  <Textarea rows={3} value={content} onChange={(e) => setContent(e.target.value)} maxLength={5000} placeholder="A short note to go with your video" />
                </div>
              </div>
            )}

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
