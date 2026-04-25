import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Star,
  Search,
  Send,
  MessageSquareQuote,
  ShieldCheck,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Mail,
  Clock,
  MonitorSmartphone,
  Filter,
  XCircle,
} from "lucide-react";
import { ProofDetailSheet } from "@/components/proof/ProofDetailSheet";
import { RequestTestimonialModal } from "@/components/proof/RequestTestimonialModal";
import { AssignToWidgetDialog } from "@/components/proof/AssignToWidgetDialog";
import type { Database } from "@/integrations/supabase/types";

type ProofRow = Database["public"]["Tables"]["proof_objects"]["Row"];
type ProofStatus = Database["public"]["Enums"]["proof_status"];
type ProofType = Database["public"]["Enums"]["proof_type"];
type RequestRow = Database["public"]["Tables"]["testimonial_requests"]["Row"];

const PAGE_SIZE = 24;
type TabKey = "all" | "approved" | "pending_review" | "rejected" | "requests";

const TYPE_OPTIONS: { value: ProofType; label: string }[] = [
  { value: "testimonial", label: "Testimonial" },
  { value: "review", label: "Review" },
  { value: "purchase", label: "Purchase" },
  { value: "signup", label: "Signup" },
  { value: "visitor_count", label: "Visitor count" },
  { value: "custom", label: "Custom" },
];

const TIER_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "verified", label: "Verified" },
  { value: "platform", label: "Platform" },
];

const SENTIMENT_OPTIONS = [
  { value: "positive", label: "Positive" },
  { value: "neutral", label: "Neutral" },
  { value: "negative", label: "Negative" },
];

const DATE_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

export default function ProofLibrary() {
  const { currentBusinessId } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState<ProofRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);

  // URL-state-backed filters
  const tab = (searchParams.get("tab") as TabKey) || "all";
  const search = searchParams.get("q") ?? "";
  const typeFilter = searchParams.get("type") ?? "";
  const sourceFilter = searchParams.get("source") ?? "";
  const tierFilter = searchParams.get("tier") ?? "";
  const sentimentFilter = searchParams.get("sentiment") ?? "";
  const dateFilter = searchParams.get("date") ?? "all";

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (!value) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    const next = new URLSearchParams();
    if (tab !== "all") next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  const activeFilterCount = [typeFilter, sourceFilter, tierFilter, sentimentFilter, dateFilter !== "all" ? dateFilter : ""]
    .filter(Boolean).length;

  const load = () => {
    if (!currentBusinessId) return;
    setLoading(true);
    Promise.all([
      supabase.from("proof_objects").select("*").eq("business_id", currentBusinessId).order("created_at", { ascending: false }),
      supabase.from("testimonial_requests").select("*").eq("business_id", currentBusinessId).order("created_at", { ascending: false }),
    ]).then(([p, r]) => {
      if (p.error) toast({ title: "Failed to load", description: p.error.message, variant: "destructive" });
      else {
        const rows = p.data ?? [];
        setItems(rows);
        const uniqSources = Array.from(new Set(rows.map((x) => x.source).filter(Boolean) as string[])).sort();
        setSources(uniqSources);
      }
      if (!r.error) setRequests(r.data ?? []);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusinessId]);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [tab, search, typeFilter, sourceFilter, tierFilter, sentimentFilter, dateFilter]);

  const pendingCount = useMemo(
    () => items.filter((i) => i.status === "pending_review" || i.status === "pending").length,
    [items],
  );

  const filteredAll = useMemo(() => {
    let list = items;
    if (tab !== "all" && tab !== "requests") list = list.filter((p) => p.status === tab);
    if (typeFilter) list = list.filter((p) => p.type === typeFilter);
    if (sourceFilter) list = list.filter((p) => p.source === sourceFilter);
    if (tierFilter) list = list.filter((p) => p.verification_tier === tierFilter);
    if (sentimentFilter) {
      list = list.filter((p) => {
        const s = p.sentiment_score;
        if (s === null || s === undefined) return false;
        if (sentimentFilter === "positive") return s >= 0.33;
        if (sentimentFilter === "negative") return s <= -0.33;
        return s > -0.33 && s < 0.33;
      });
    }
    if (dateFilter !== "all") {
      const days = parseInt(dateFilter, 10);
      const since = Date.now() - days * 86_400_000;
      list = list.filter((p) => new Date(p.created_at).getTime() >= since);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.author_name?.toLowerCase().includes(q) ||
          p.content?.toLowerCase().includes(q) ||
          p.raw_content?.toLowerCase().includes(q) ||
          p.outcome_claim?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [items, tab, search, typeFilter, sourceFilter, tierFilter, sentimentFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAll.length / PAGE_SIZE));
  const pageItems = filteredAll.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSel = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };
  const toggleAll = () => {
    setSelected((s) => (s.size === pageItems.length ? new Set() : new Set(pageItems.map((p) => p.id))));
  };

  const bulkUpdate = async (status: ProofStatus) => {
    if (selected.size === 0) return;
    setBulkBusy(true);
    const ids = Array.from(selected);
    const { error } = await supabase.from("proof_objects").update({ status }).in("id", ids);
    setBulkBusy(false);
    if (error) return toast({ title: "Bulk update failed", description: error.message, variant: "destructive" });
    toast({ title: `${ids.length} item${ids.length === 1 ? "" : "s"} ${status}` });
    setSelected(new Set());
    load();
  };

  const resend = async (req: RequestRow) => {
    setResendingId(req.id);
    const { data, error } = await supabase.functions.invoke("send-testimonial-request", {
      body: { request_id: req.id, app_origin: window.location.origin },
    });
    setResendingId(null);
    if (error || !data?.ok) {
      toast({
        title: "Resend failed",
        description: error?.message ?? data?.error ?? "Unknown error",
        variant: "destructive",
      });
    } else {
      toast({ title: "Email resent", description: `Sent to ${req.recipient_email}.` });
      load();
    }
  };

  const requestStatusVariant = (s: RequestRow["status"]) =>
    s === "responded" || s === "completed"
      ? "default"
      : s === "sent" || s === "opened"
        ? "secondary"
        : s === "expired"
          ? "destructive"
          : "outline";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">PROOF-01</div>
          <h1 className="text-3xl font-bold mt-1">Proof library</h1>
          <p className="text-muted-foreground mt-1">All testimonials, reviews and signals collected for your business.</p>
        </div>
        <Button onClick={() => setRequestModalOpen(true)}>
          <Send className="h-4 w-4 mr-2" /> Request testimonial
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Filters sidebar */}
        <aside className="space-y-4">
          <Card>
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Filter className="h-4 w-4" /> Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-5">
                      {activeFilterCount}
                    </Badge>
                  )}
                </div>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  >
                    <XCircle className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>

              <FilterGroup label="Type">
                <FilterChips
                  value={typeFilter}
                  options={TYPE_OPTIONS}
                  onChange={(v) => updateParam("type", v)}
                />
              </FilterGroup>

              {sources.length > 0 && (
                <FilterGroup label="Source">
                  <FilterChips
                    value={sourceFilter}
                    options={sources.map((s) => ({ value: s, label: s }))}
                    onChange={(v) => updateParam("source", v)}
                  />
                </FilterGroup>
              )}

              <FilterGroup label="Verification tier">
                <FilterChips
                  value={tierFilter}
                  options={TIER_OPTIONS}
                  onChange={(v) => updateParam("tier", v)}
                />
              </FilterGroup>

              <FilterGroup label="Sentiment">
                <FilterChips
                  value={sentimentFilter}
                  options={SENTIMENT_OPTIONS}
                  onChange={(v) => updateParam("sentiment", v)}
                />
              </FilterGroup>

              <FilterGroup label="Date">
                <FilterChips
                  value={dateFilter === "all" ? "" : dateFilter}
                  options={DATE_OPTIONS.filter((o) => o.value !== "all").map((o) => ({
                    value: o.value,
                    label: o.label,
                  }))}
                  onChange={(v) => updateParam("date", v || null)}
                />
              </FilterGroup>
            </CardContent>
          </Card>
        </aside>

        {/* Main */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Tabs value={tab} onValueChange={(v) => updateParam("tab", v === "all" ? null : v)}>
              <TabsList className="grid w-full grid-cols-5 max-w-2xl">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="pending_review" className="relative">
                  Pending
                  {pendingCount > 0 && (
                    <span
                      className="ml-1.5 inline-block h-2 w-2 rounded-full bg-gold"
                      aria-label={`${pendingCount} pending`}
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
                <TabsTrigger value="requests">Requests</TabsTrigger>
              </TabsList>
            </Tabs>

            {tab !== "requests" && (
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search content, outcome or author…"
                    value={search}
                    onChange={(e) => updateParam("q", e.target.value || null)}
                    className="pl-9"
                  />
                </div>
              </div>
            )}

            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : tab === "requests" ? (
              requests.length === 0 ? (
                <EmptyState
                  title="No requests yet"
                  description="Send your first collection request to start gathering testimonials."
                  action={
                    <Button onClick={() => setRequestModalOpen(true)}>
                      <Send className="h-4 w-4 mr-2" /> Request testimonial
                    </Button>
                  }
                />
              ) : (
                <ul className="divide-y rounded-md border">
                  {requests.map((r) => {
                    const isExpired = new Date(r.expires_at).getTime() < Date.now() || r.status === "expired";
                    const canResend = r.status !== "responded" && r.status !== "completed";
                    return (
                      <li key={r.id} className="flex items-center gap-3 p-3">
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {r.recipient_name ?? r.recipient_email}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{r.recipient_email}</div>
                        </div>
                        <Badge variant={requestStatusVariant(r.status)} className="capitalize text-xs">
                          {isExpired && r.status !== "responded" && r.status !== "completed" ? "expired" : r.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground hidden sm:inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {new Date(r.created_at).toLocaleDateString()}
                        </span>
                        {canResend && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={resendingId === r.id}
                            onClick={() => resend(r)}
                          >
                            <Send className="h-3.5 w-3.5 mr-1" />
                            {isExpired ? "Resend" : "Send again"}
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )
            ) : pageItems.length === 0 ? (
              <EmptyState
                title="No proof yet"
                description={
                  items.length === 0
                    ? "Send a collection request to start collecting testimonials."
                    : "No items match your filters."
                }
                action={
                  items.length === 0 ? (
                    <Button onClick={() => setRequestModalOpen(true)}>
                      <Send className="h-4 w-4 mr-2" /> Request testimonial
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  )
                }
              />
            ) : (
              <>
                {/* Bulk bar */}
                <div className="flex items-center justify-between gap-2 px-1 flex-wrap">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={selected.size === pageItems.length && pageItems.length > 0}
                      onCheckedChange={toggleAll}
                      aria-label="Select all on page"
                    />
                    <span>
                      {selected.size > 0
                        ? `${selected.size} selected`
                        : `${filteredAll.length} item${filteredAll.length === 1 ? "" : "s"}`}
                    </span>
                  </div>
                  {selected.size > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={bulkBusy}
                        onClick={() => bulkUpdate("approved")}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={bulkBusy}
                        onClick={() => bulkUpdate("rejected")}
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>
                        <MonitorSmartphone className="h-3.5 w-3.5 mr-1" /> Assign to widget
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {pageItems.map((p) => {
                    const isSel = selected.has(p.id);
                    return (
                      <Card
                        key={p.id}
                        className={`relative cursor-pointer transition-all hover:shadow-md ${isSel ? "ring-2 ring-accent" : ""}`}
                        onClick={() => setOpenId(p.id)}
                      >
                        <CardContent className="pt-5 pb-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={isSel}
                                  onCheckedChange={() => toggleSel(p.id)}
                                  aria-label="Select"
                                />
                              </div>
                              <div className="h-7 w-7 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                {(p.author_name ?? "?").charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate flex items-center gap-1">
                                  {p.author_name ?? "Anonymous"}
                                  {p.verified && <ShieldCheck className="h-3 w-3 text-teal flex-shrink-0" />}
                                </div>
                                <div className="text-[10px] text-muted-foreground capitalize">
                                  {p.source ?? p.type}
                                </div>
                              </div>
                            </div>
                            <Badge
                              variant={
                                p.status === "approved"
                                  ? "default"
                                  : p.status === "rejected"
                                    ? "destructive"
                                    : "secondary"
                              }
                              className="capitalize text-[10px]"
                            >
                              {p.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {p.outcome_claim ?? p.content ?? "—"}
                          </p>
                          {p.tags && p.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {p.tags.slice(0, 3).map((t) => (
                                <span
                                  key={t}
                                  className="text-[10px] rounded-full bg-muted px-2 py-0.5 text-muted-foreground"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            {p.rating ? (
                              <span className="inline-flex items-center gap-0.5">
                                <Star className="h-3 w-3 fill-gold text-gold" /> {p.rating}
                              </span>
                            ) : (
                              <span />
                            )}
                            <span>{new Date(p.created_at).toLocaleDateString()}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={page === totalPages}
                        onClick={() => setPage(page + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <ProofDetailSheet
        proofId={openId}
        businessId={currentBusinessId}
        open={openId !== null}
        onOpenChange={(o) => !o && setOpenId(null)}
        onChanged={load}
      />

      <RequestTestimonialModal
        open={requestModalOpen}
        onOpenChange={setRequestModalOpen}
        onCreated={load}
      />

      <AssignToWidgetDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        proofIds={Array.from(selected)}
        onAssigned={() => setSelected(new Set())}
      />
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function FilterChips({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (next: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(active ? null : o.value)}
            className={`text-xs rounded-full border px-2.5 py-1 transition-colors capitalize ${
              active
                ? "border-accent bg-accent/10 text-foreground"
                : "border-border text-muted-foreground hover:border-accent/50"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="py-16 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent mb-4">
        <MessageSquareQuote className="h-6 w-6" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
