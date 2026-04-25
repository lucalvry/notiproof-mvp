import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquareQuote, MonitorSmartphone, Plug, TrendingUp, Star, ShieldCheck } from "lucide-react";
import { ProofDetailSheet } from "@/components/proof/ProofDetailSheet";
import type { Database } from "@/integrations/supabase/types";

type ProofRow = Database["public"]["Tables"]["proof_objects"]["Row"];

interface Stats {
  proof: number;
  widgets: number;
  integrations: number;
  conversions: number;
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Dashboard() {
  const { profile, businesses, currentBusinessId } = useAuth();
  const currentBusiness = businesses.find((b) => b.id === currentBusinessId);
  const [stats, setStats] = useState<Stats | null>(null);
  const [feed, setFeed] = useState<ProofRow[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const loadFeed = (bizId: string) =>
    supabase
      .from("proof_objects")
      .select("*")
      .eq("business_id", bizId)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setFeed(data ?? []));

  useEffect(() => {
    if (!currentBusinessId) return;
    const since = new Date();
    since.setDate(since.getDate() - 30);
    Promise.all([
      supabase.from("proof_objects").select("id", { count: "exact", head: true }).eq("business_id", currentBusinessId),
      supabase.from("widgets").select("id", { count: "exact", head: true }).eq("business_id", currentBusinessId).eq("status", "active"),
      supabase.from("integrations").select("id", { count: "exact", head: true }).eq("business_id", currentBusinessId).eq("status", "connected"),
      supabase.from("widget_events").select("id", { count: "exact", head: true }).eq("business_id", currentBusinessId).eq("event_type", "conversion").gte("fired_at", since.toISOString()),
    ]).then(([p, w, i, c]) => {
      setStats({ proof: p.count ?? 0, widgets: w.count ?? 0, integrations: i.count ?? 0, conversions: c.count ?? 0 });
    });

    loadFeed(currentBusinessId);

    const channel = supabase
      .channel(`dashboard-feed-${currentBusinessId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "proof_objects", filter: `business_id=eq.${currentBusinessId}` },
        () => loadFeed(currentBusinessId),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentBusinessId]);

  const cards = [
    { label: "Total proof", value: stats?.proof, icon: MessageSquareQuote, color: "text-accent", to: "/proof" },
    { label: "Active widgets", value: stats?.widgets, icon: MonitorSmartphone, color: "text-teal", to: "/widgets" },
    { label: "Integrations", value: stats?.integrations, icon: Plug, color: "text-purple", to: "/integrations" },
    { label: "Conversions (30d)", value: stats?.conversions, icon: TrendingUp, color: "text-gold", to: "/analytics" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">DASH-01</div>
          <h1 className="text-3xl font-bold mt-1">Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}</h1>
          {currentBusiness && (
            <p className="text-muted-foreground mt-1">{currentBusiness.name} · <span className="capitalize">{currentBusiness.role}</span></p>
          )}
        </div>
        <Button asChild><Link to="/widgets/new">Create widget</Link></Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color, to }) => (
          <Link to={to} key={label}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                <Icon className={`h-5 w-5 ${color}`} />
              </CardHeader>
              <CardContent>
                {value === undefined ? <Skeleton className="h-9 w-16" /> : <div className="text-3xl font-bold">{value}</div>}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Recent activity</CardTitle>
          <Button variant="ghost" size="sm" asChild><Link to="/proof">View all</Link></Button>
        </CardHeader>
        <CardContent>
          {feed === null ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : feed.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No activity yet — once proof comes in, it'll appear here in real time.
            </div>
          ) : (
            <ul className="divide-y">
              {feed.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(p.id)}
                    className="w-full flex items-center gap-3 py-3 text-left hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {(p.author_name ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium truncate">{p.author_name ?? "Anonymous"}</span>
                        <Badge variant="outline" className="text-[10px] capitalize">{p.source ?? p.type}</Badge>
                        {p.verified && <ShieldCheck className="h-3.5 w-3.5 text-teal" />}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{p.content ?? "—"}</div>
                    </div>
                    {p.rating && (
                      <span className="inline-flex items-center gap-0.5 text-xs">
                        <Star className="h-3 w-3 fill-gold text-gold" /> {p.rating}
                      </span>
                    )}
                    <Badge variant={p.status === "approved" ? "default" : "secondary"} className="capitalize text-[10px]">{p.status}</Badge>
                    <span className="text-xs text-muted-foreground w-16 text-right">{timeAgo(p.created_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Get started</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3">
          <Button variant="outline" asChild className="h-auto py-4 flex-col items-start"><Link to="/integrations"><Plug className="h-5 w-5 mb-2 text-purple" /><div className="text-sm font-semibold">Connect a source</div><div className="text-xs text-muted-foreground mt-0.5">Stripe, Shopify, Google…</div></Link></Button>
          <Button variant="outline" asChild className="h-auto py-4 flex-col items-start"><Link to="/proof/request"><MessageSquareQuote className="h-5 w-5 mb-2 text-accent" /><div className="text-sm font-semibold">Request a testimonial</div><div className="text-xs text-muted-foreground mt-0.5">Send a customer link</div></Link></Button>
          <Button variant="outline" asChild className="h-auto py-4 flex-col items-start"><Link to="/widgets/new"><MonitorSmartphone className="h-5 w-5 mb-2 text-teal" /><div className="text-sm font-semibold">Build a widget</div><div className="text-xs text-muted-foreground mt-0.5">Floating, inline or badge</div></Link></Button>
        </CardContent>
      </Card>

      <ProofDetailSheet
        proofId={openId}
        businessId={currentBusinessId}
        open={openId !== null}
        onOpenChange={(o) => !o && setOpenId(null)}
        onChanged={() => currentBusinessId && loadFeed(currentBusinessId)}
      />
    </div>
  );
}
