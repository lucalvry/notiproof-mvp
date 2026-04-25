import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Check,
  Loader2,
  Star,
  Trash2,
  X,
  ExternalLink,
  Plus,
  ShieldCheck,
  Sparkles,
  MonitorSmartphone,
  Send,
  Info,
} from "lucide-react";
import { Link } from "react-router-dom";
import { AssignToWidgetDialog } from "./AssignToWidgetDialog";
import { RequestTestimonialModal } from "./RequestTestimonialModal";
import type { Database } from "@/integrations/supabase/types";

type ProofRow = Database["public"]["Tables"]["proof_objects"]["Row"];
type ProofStatus = Database["public"]["Enums"]["proof_status"];

interface Props {
  proofId: string | null;
  businessId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}

const TIER_LABEL: Record<string, { label: string; description: string; tone: string }> = {
  manual: {
    label: "Manual",
    description: "Added or edited by your team. No external verification.",
    tone: "bg-muted text-muted-foreground",
  },
  verified: {
    label: "Verified",
    description: "Customer email or signed link confirmed the author.",
    tone: "bg-teal/10 text-teal",
  },
  platform: {
    label: "Platform",
    description: "Imported directly from a connected platform (Stripe, Shopify, Google, etc.).",
    tone: "bg-accent/10 text-accent",
  },
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function ProofDetailSheet({ proofId, businessId, open, onOpenChange, onChanged }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [proof, setProof] = useState<ProofRow | null>(null);
  const [tagDraft, setTagDraft] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [followupOpen, setFollowupOpen] = useState(false);

  useEffect(() => {
    if (!open || !proofId || !businessId) return;
    setLoading(true);
    supabase
      .from("proof_objects")
      .select("*")
      .eq("id", proofId)
      .eq("business_id", businessId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
        setProof(data);
        setLoading(false);
      });
  }, [proofId, businessId, open, toast]);

  const setStatus = async (status: ProofStatus) => {
    if (!proof) return;
    setSaving(true);
    const { error } = await supabase.from("proof_objects").update({ status }).eq("id", proof.id);
    setSaving(false);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setProof({ ...proof, status });
    toast({ title: status === "approved" ? "Approved" : status });
    onChanged?.();
  };

  const saveEdits = async () => {
    if (!proof) return;
    setSaving(true);
    const { error } = await supabase
      .from("proof_objects")
      .update({
        author_name: proof.author_name,
        content: proof.content,
        rating: proof.rating,
        media_url: proof.media_url,
        verified: proof.verified,
        outcome_claim: proof.outcome_claim,
        tags: proof.tags ?? [],
        transcript: proof.transcript,
      })
      .eq("id", proof.id);
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Changes saved" });
    onChanged?.();
  };

  const remove = async () => {
    if (!proof) return;
    const { error } = await supabase.from("proof_objects").delete().eq("id", proof.id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Proof deleted" });
    onChanged?.();
    onOpenChange(false);
  };

  const addTag = () => {
    const v = tagDraft.trim();
    if (!v || !proof) return;
    if ((proof.tags ?? []).includes(v)) {
      setTagDraft("");
      return;
    }
    setProof({ ...proof, tags: [...(proof.tags ?? []), v] });
    setTagDraft("");
  };
  const removeTag = (t: string) => {
    if (!proof) return;
    setProof({ ...proof, tags: (proof.tags ?? []).filter((x) => x !== t) });
  };

  const isVideo = (proof?.media_type ?? "").startsWith("video") || !!proof?.video_url;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Proof detail</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="space-y-4 mt-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !proof ? (
          <div className="py-16 text-center text-muted-foreground">Not found.</div>
        ) : (
          <div className="space-y-6 mt-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant={proof.status === "approved" ? "default" : "secondary"}
                  className="capitalize"
                >
                  {proof.status}
                </Badge>
                <span className="text-sm text-muted-foreground capitalize">
                  {proof.source ?? proof.type}
                </span>
                {proof.verified && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <ShieldCheck className="h-3 w-3 text-teal" /> Verified
                  </Badge>
                )}
                {proof.verification_tier && TIER_LABEL[proof.verification_tier] && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${TIER_LABEL[proof.verification_tier].tone}`}
                      >
                        <Info className="h-3 w-3" />
                        {TIER_LABEL[proof.verification_tier].label}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <div className="text-xs">
                        <div className="font-semibold mb-0.5">
                          {TIER_LABEL[proof.verification_tier].label} verification
                        </div>
                        <div>{TIER_LABEL[proof.verification_tier].description}</div>
                        {proof.verification_method && (
                          <div className="mt-1 text-muted-foreground">
                            Method: <span className="capitalize">{proof.verification_method}</span>
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/proof/${proof.id}`}>
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open
                </Link>
              </Button>
            </div>

            {/* Action row */}
            <div className="flex items-center gap-2 flex-wrap">
              {proof.status !== "approved" ? (
                <Button size="sm" onClick={() => setStatus("approved")} disabled={saving}>
                  <Check className="h-4 w-4 mr-1" /> Approve
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setStatus("pending_review")}
                  disabled={saving}
                >
                  <X className="h-4 w-4 mr-1" /> Unapprove
                </Button>
              )}
              {proof.status !== "rejected" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setStatus("rejected")}
                  disabled={saving}
                >
                  Reject
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>
                <MonitorSmartphone className="h-4 w-4 mr-1" /> Add to widget
              </Button>
              {(proof.author_email || proof.customer_email_hash) && (
                <Button size="sm" variant="outline" onClick={() => setFollowupOpen(true)}>
                  <Send className="h-4 w-4 mr-1" /> Request follow-up
                </Button>
              )}
            </div>

            {/* Media */}
            {(proof.media_url || proof.video_url) && (
              <div className="rounded-md border bg-muted/30 p-2">
                {isVideo ? (
                  <video
                    src={proof.video_url ?? proof.media_url ?? undefined}
                    controls
                    className="w-full max-h-72 rounded"
                  />
                ) : (
                  <img
                    src={proof.media_url ?? undefined}
                    alt="media preview"
                    className="max-h-72 rounded mx-auto"
                    onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                  />
                )}
              </div>
            )}

            {/* Tabbed content */}
            <Tabs defaultValue="content">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="ai">AI</TabsTrigger>
                <TabsTrigger value="transcript" disabled={!isVideo && !proof.transcript}>
                  Transcript
                </TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-3 pt-4">
                <div className="space-y-1.5">
                  <Label>Author name</Label>
                  <Input
                    value={proof.author_name ?? ""}
                    onChange={(e) => setProof({ ...proof, author_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Rating</Label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setProof({ ...proof, rating: n })}
                        className="p-1"
                      >
                        <Star
                          className={`h-5 w-5 ${n <= (proof.rating ?? 0) ? "fill-gold text-gold" : "text-muted-foreground"}`}
                        />
                      </button>
                    ))}
                    {proof.rating && (
                      <button
                        type="button"
                        onClick={() => setProof({ ...proof, rating: null })}
                        className="ml-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        clear
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Content</Label>
                  <Textarea
                    rows={5}
                    value={proof.content ?? ""}
                    onChange={(e) => setProof({ ...proof, content: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Media URL</Label>
                  <Input
                    type="url"
                    value={proof.media_url ?? ""}
                    onChange={(e) => setProof({ ...proof, media_url: e.target.value })}
                  />
                </div>
              </TabsContent>

              <TabsContent value="ai" className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-accent" /> Outcome claim
                  </Label>
                  <Textarea
                    rows={2}
                    placeholder="A one-sentence summary of the customer's outcome…"
                    value={proof.outcome_claim ?? ""}
                    onChange={(e) => setProof({ ...proof, outcome_claim: e.target.value })}
                  />
                  {proof.ai_confidence !== null && proof.ai_confidence !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      AI confidence: {Math.round(Number(proof.ai_confidence) * 100)}%
                    </p>
                  )}
                </div>

                {proof.ai_summary && (
                  <div className="space-y-1.5">
                    <Label>AI summary</Label>
                    <p className="text-sm text-muted-foreground rounded-md bg-muted/40 p-3">
                      {proof.ai_summary}
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Tags</Label>
                  {proof.tags && proof.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {proof.tags.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs"
                        >
                          {t}
                          <button
                            type="button"
                            onClick={() => removeTag(t)}
                            className="text-muted-foreground hover:text-destructive"
                            aria-label={`Remove ${t}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      value={tagDraft}
                      onChange={(e) => setTagDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      placeholder="Add a tag…"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={addTag}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {proof.sentiment_score !== null && proof.sentiment_score !== undefined && (
                  <div className="space-y-1.5">
                    <Label>Sentiment</Label>
                    <div className="text-sm capitalize">
                      {Number(proof.sentiment_score) >= 0.33
                        ? "Positive"
                        : Number(proof.sentiment_score) <= -0.33
                          ? "Negative"
                          : "Neutral"}
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({Number(proof.sentiment_score).toFixed(2)})
                      </span>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="transcript" className="space-y-2 pt-4">
                <Label>Transcript</Label>
                <Textarea
                  rows={10}
                  placeholder="Add a transcript of the video testimonial…"
                  value={proof.transcript ?? ""}
                  onChange={(e) => setProof({ ...proof, transcript: e.target.value })}
                />
              </TabsContent>

              <TabsContent value="timeline" className="pt-4">
                <ul className="space-y-3 text-sm">
                  <TimelineItem
                    label="Submitted"
                    detail={proof.proof_event_at ?? proof.created_at}
                  />
                  {proof.created_at && proof.created_at !== proof.proof_event_at && (
                    <TimelineItem label="Recorded in NotiProof" detail={proof.created_at} />
                  )}
                  {proof.published_at && (
                    <TimelineItem label="Approved" detail={proof.published_at} />
                  )}
                  {proof.updated_at && proof.updated_at !== proof.created_at && (
                    <TimelineItem label="Last updated" detail={proof.updated_at} />
                  )}
                </ul>
              </TabsContent>
            </Tabs>

            <div className="flex items-center justify-between pt-4 border-t">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this proof?</AlertDialogTitle>
                    <AlertDialogDescription>This action can't be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={remove}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button onClick={saveEdits} disabled={saving} size="sm">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save changes
              </Button>
            </div>
          </div>
        )}

        <AssignToWidgetDialog
          open={assignOpen}
          onOpenChange={setAssignOpen}
          proofIds={proof ? [proof.id] : []}
        />

        <RequestTestimonialModal open={followupOpen} onOpenChange={setFollowupOpen} />
      </SheetContent>
    </Sheet>
  );
}

function TimelineItem({ label, detail }: { label: string; detail: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-1.5 inline-block h-2 w-2 rounded-full bg-accent" />
      <div className="flex-1">
        <div className="font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">
          {new Date(detail).toLocaleString()} · {timeAgo(detail)}
        </div>
      </div>
    </li>
  );
}
