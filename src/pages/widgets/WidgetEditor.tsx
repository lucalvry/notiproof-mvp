import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Loader2, Code, Lock } from "lucide-react";
import { PreviewRender, type WidgetConfig as SharedWidgetConfig } from "@/components/widgets/PreviewRender";
import type { Database } from "@/integrations/supabase/types";

type Widget = Database["public"]["Tables"]["widgets"]["Row"];
type WidgetType = Database["public"]["Enums"]["widget_type"];
type Proof = Database["public"]["Tables"]["proof_objects"]["Row"];
type Json = Database["public"]["Tables"]["widgets"]["Row"]["config"];

interface WidgetConfig extends SharedWidgetConfig {
  // Display rules
  url_filter_mode?: "all" | "include" | "exclude";
  url_patterns?: string;
  visitor_type?: "all" | "new" | "returning";
  load_delay?: number; // seconds
  frequency_cap?: number; // per visitor per day
  // Proof source
  source_filter?: "all" | "selected";
  selected_proof_ids?: string[];
  rotation?: "newest" | "random" | "rating";
  // A/B
  ab_enabled?: boolean;
  ab_variant_label?: string;
}

const variantToType: Record<"floating" | "inline" | "badge", WidgetType> = {
  floating: "popup",
  inline: "inline",
  badge: "banner",
};

export default function WidgetEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const { currentBusinessId, businesses } = useAuth();
  const business = businesses.find((b) => b.id === currentBusinessId);
  // Treat anything not on a paid plan as free for the powered-by lock.
  // We don't have plan in BusinessSummary, so use businesses table later if needed.
  const isFreePlan = true;
  void business;

  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [w, setW] = useState<Partial<Widget>>({
    name: "Untitled widget",
    type: "popup",
    status: "draft",
    config: {
      variant: "floating",
      position: "bottom-left",
      interval_seconds: 6,
      show_avatar: true,
      show_rating: true,
      url_filter_mode: "all",
      visitor_type: "all",
      load_delay: 0,
      frequency_cap: 0,
      source_filter: "all",
      rotation: "newest",
      ab_enabled: false,
      powered_by: true,
    } as unknown as Json,
  });
  const [sample, setSample] = useState<Proof | null>(null);
  const [approvedProofs, setApprovedProofs] = useState<Proof[]>([]);

  useEffect(() => {
    if (!id || !currentBusinessId) return;
    supabase.from("widgets").select("*").eq("id", id).eq("business_id", currentBusinessId).maybeSingle()
      .then(({ data, error }) => {
        if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
        if (data) setW(data);
        setLoading(false);
      });
  }, [id, currentBusinessId, toast]);

  useEffect(() => {
    if (!currentBusinessId) return;
    supabase.from("proof_objects").select("*").eq("business_id", currentBusinessId).eq("status", "approved").order("created_at", { ascending: false })
      .then(({ data }) => {
        setApprovedProofs(data ?? []);
        setSample(data?.[0] ?? null);
      });
  }, [currentBusinessId]);

  const cfg = (w.config ?? {}) as WidgetConfig;
  const updateConfig = (patch: Partial<WidgetConfig>) =>
    setW({ ...w, config: { ...cfg, ...patch } as unknown as Json });
  const variant = cfg.variant ?? "floating";

  const setVariant = (v: "floating" | "inline" | "badge") => {
    setW({ ...w, type: variantToType[v], config: { ...cfg, variant: v } as unknown as Json });
  };

  const toggleSelectedProof = (proofId: string) => {
    const cur = new Set(cfg.selected_proof_ids ?? []);
    if (cur.has(proofId)) cur.delete(proofId); else cur.add(proofId);
    updateConfig({ selected_proof_ids: Array.from(cur) });
  };

  const save = async () => {
    if (!currentBusinessId || !w.name) return;
    // Free plan forces powered_by on
    const finalConfig = isFreePlan ? { ...cfg, powered_by: true } : cfg;
    setSaving(true);
    if (isNew) {
      const { data, error } = await supabase.from("widgets").insert({
        business_id: currentBusinessId,
        name: w.name,
        type: w.type ?? "popup",
        status: w.status ?? "draft",
        config: finalConfig as unknown as Json,
      }).select("id").single();
      setSaving(false);
      if (error || !data) return toast({ title: "Save failed", description: error?.message, variant: "destructive" });
      toast({ title: "Widget created" });
      navigate(`/widgets/${data.id}/edit`, { replace: true });
    } else {
      const { error } = await supabase.from("widgets").update({
        name: w.name, type: w.type, status: w.status, config: finalConfig as unknown as Json,
      }).eq("id", id!);
      setSaving(false);
      if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
      toast({ title: "Saved" });
    }
  };

  if (loading) return <div className="space-y-4 max-w-5xl"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;

  const snippet = `<script async src="${window.location.origin}/widget.js" data-business="${currentBusinessId}" data-widget="${id ?? "WIDGET_ID"}"></script>`;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2"><Link to="/widgets"><ArrowLeft className="h-4 w-4 mr-1" /> Back to widgets</Link></Button>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">WID-02</div>
          <h1 className="text-3xl font-bold mt-1">{isNew ? "New widget" : "Edit widget"}</h1>
        </div>
        <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save</Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="general">
              <TabsList className="grid w-full grid-cols-5 h-auto">
                <TabsTrigger value="general" className="text-xs sm:text-sm">General</TabsTrigger>
                <TabsTrigger value="design" className="text-xs sm:text-sm">Design</TabsTrigger>
                <TabsTrigger value="rules" className="text-xs sm:text-sm">Rules</TabsTrigger>
                <TabsTrigger value="source" className="text-xs sm:text-sm">Source</TabsTrigger>
                <TabsTrigger value="install" className="text-xs sm:text-sm">Install</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                <div className="space-y-2"><Label>Name</Label><Input value={w.name ?? ""} onChange={(e) => setW({ ...w, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Widget type</Label>
                  <Select value={variant} onValueChange={(v) => setVariant(v as "floating" | "inline" | "badge")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="floating">Floating</SelectItem>
                      <SelectItem value="inline">Inline</SelectItem>
                      <SelectItem value="badge">Badge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Status</Label>
                  <Select value={w.status} onValueChange={(v) => setW({ ...w, status: v as Widget["status"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label>A/B test variant</Label>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Beta</span>
                    </div>
                    <Switch checked={!!cfg.ab_enabled} onCheckedChange={(c) => updateConfig({ ab_enabled: c })} />
                  </div>
                  {cfg.ab_enabled && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Variant label</Label>
                      <Input
                        value={cfg.ab_variant_label ?? ""}
                        onChange={(e) => updateConfig({ ab_variant_label: e.target.value })}
                        placeholder="e.g. variant-a"
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <Label>"Powered by NotiProof"</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">{isFreePlan ? "Required on the free plan" : "Show a small attribution"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isFreePlan && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                      <Switch checked={isFreePlan ? true : cfg.powered_by !== false} disabled={isFreePlan} onCheckedChange={(c) => updateConfig({ powered_by: c })} />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="design" className="space-y-4 mt-4">
                {variant === "floating" && (
                  <>
                    <div className="space-y-2"><Label>Position</Label>
                      <Select value={cfg.position ?? "bottom-left"} onValueChange={(v) => updateConfig({ position: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bottom-left">Bottom left</SelectItem>
                          <SelectItem value="bottom-right">Bottom right</SelectItem>
                          <SelectItem value="top-left">Top left</SelectItem>
                          <SelectItem value="top-right">Top right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Rotation interval (seconds)</Label>
                      <Input type="number" min={2} max={60} value={cfg.interval_seconds ?? 6} onChange={(e) => updateConfig({ interval_seconds: Number(e.target.value) })} />
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between"><Label>Show avatar</Label><Switch checked={cfg.show_avatar !== false} onCheckedChange={(c) => updateConfig({ show_avatar: c })} /></div>
                <div className="flex items-center justify-between"><Label>Show rating</Label><Switch checked={cfg.show_rating !== false} onCheckedChange={(c) => updateConfig({ show_rating: c })} /></div>
                <div className="space-y-2"><Label>Brand color</Label><Input type="color" value={cfg.brand_color ?? "#0EA5E9"} onChange={(e) => updateConfig({ brand_color: e.target.value })} className="h-10 w-20 p-1" /></div>
              </TabsContent>

              <TabsContent value="rules" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>URL filtering</Label>
                  <Select value={cfg.url_filter_mode ?? "all"} onValueChange={(v) => updateConfig({ url_filter_mode: v as WidgetConfig["url_filter_mode"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Show on all pages</SelectItem>
                      <SelectItem value="include">Only on pages matching…</SelectItem>
                      <SelectItem value="exclude">Hide on pages matching…</SelectItem>
                    </SelectContent>
                  </Select>
                  {cfg.url_filter_mode && cfg.url_filter_mode !== "all" && (
                    <Textarea
                      rows={3}
                      placeholder={"/checkout/*\n/pricing"}
                      value={cfg.url_patterns ?? ""}
                      onChange={(e) => updateConfig({ url_patterns: e.target.value })}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">One pattern per line. Use <code>*</code> as a wildcard.</p>
                </div>
                <div className="space-y-2">
                  <Label>Visitor type</Label>
                  <Select value={cfg.visitor_type ?? "all"} onValueChange={(v) => updateConfig({ visitor_type: v as WidgetConfig["visitor_type"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All visitors</SelectItem>
                      <SelectItem value="new">New visitors only</SelectItem>
                      <SelectItem value="returning">Returning visitors only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between"><Label>Load delay</Label><span className="text-xs text-muted-foreground">{cfg.load_delay ?? 0}s</span></div>
                  <Slider min={0} max={30} step={1} value={[cfg.load_delay ?? 0]} onValueChange={([v]) => updateConfig({ load_delay: v })} />
                </div>
                <div className="space-y-2">
                  <Label>Frequency cap (per visitor per day)</Label>
                  <Input type="number" min={0} value={cfg.frequency_cap ?? 0} onChange={(e) => updateConfig({ frequency_cap: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground">0 = no cap.</p>
                </div>
              </TabsContent>

              <TabsContent value="source" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Which proofs feed this widget?</Label>
                  <Select value={cfg.source_filter ?? "all"} onValueChange={(v) => updateConfig({ source_filter: v as WidgetConfig["source_filter"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All approved proofs</SelectItem>
                      <SelectItem value="selected">Only selected proofs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Rotation</Label>
                  <Select value={cfg.rotation ?? "newest"} onValueChange={(v) => updateConfig({ rotation: v as WidgetConfig["rotation"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest first</SelectItem>
                      <SelectItem value="random">Random</SelectItem>
                      <SelectItem value="rating">Highest rating first</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {cfg.source_filter === "selected" && (
                  <div className="space-y-2">
                    <Label>Select proofs ({(cfg.selected_proof_ids ?? []).length} chosen)</Label>
                    <div className="border rounded-md max-h-64 overflow-y-auto divide-y">
                      {approvedProofs.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-4 text-center">No approved proofs yet.</p>
                      ) : (
                        approvedProofs.map((p) => (
                          <label key={p.id} className="flex items-start gap-2 p-3 cursor-pointer hover:bg-muted/40">
                            <Checkbox
                              checked={(cfg.selected_proof_ids ?? []).includes(p.id)}
                              onCheckedChange={() => toggleSelectedProof(p.id)}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">{p.author_name ?? "Anonymous"}</div>
                              <div className="text-xs text-muted-foreground line-clamp-2">{p.content}</div>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="install" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">Paste this snippet before <code className="text-xs bg-muted px-1.5 py-0.5 rounded">&lt;/body&gt;</code> on every page where this widget should appear.</p>
                <pre className="bg-secondary text-foreground text-xs p-4 rounded-md overflow-x-auto font-mono whitespace-pre-wrap break-all">{snippet}</pre>
                <Button variant="outline" onClick={() => { navigator.clipboard.writeText(snippet); toast({ title: "Copied" }); }}><Code className="h-3.5 w-3.5 mr-1" /> Copy snippet</Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="bg-secondary/30 sticky top-20 self-start">
          <CardContent className="pt-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono mb-3">Live preview</div>
            <div className="bg-card rounded-lg border h-96 flex items-center justify-center relative overflow-hidden">
              <PreviewRender
                variant={variant}
                cfg={cfg}
                sample={sample}
                showPoweredBy={isFreePlan ? true : cfg.powered_by !== false}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
