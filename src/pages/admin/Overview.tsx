import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Building2,
  MessageSquareQuote,
  CircleDollarSign,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Activity,
} from "lucide-react";

const db = supabase as any;

interface OverviewStats {
  businesses_total: number;
  businesses_active: number;
  businesses_new_30d: number;
  paying_businesses: number;
  proof_total: number;
  proof_last_24h: number;
  moderation_queue: number;
  integration_backlog: number;
  integration_errors: number;
  mrr_usd: number;
}

interface SeriesRow {
  day: string;
  new_businesses: number;
  new_proofs: number;
}

export default function AdminOverview() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [series, setSeries] = useState<SeriesRow[] | null>(null);

  const load = async () => {
    const [statsRes, seriesRes] = await Promise.all([
      db.rpc("admin_overview_stats"),
      db.rpc("admin_daily_series", { _days: 30 }),
    ]);
    setStats((statsRes.data ?? null) as OverviewStats | null);
    setSeries(
      ((seriesRes.data ?? []) as SeriesRow[]).map((r) => ({
        ...r,
        day: new Date(r.day).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      })),
    );
  };

  useEffect(() => {
    load();
  }, []);

  const alerts: { tone: "warn" | "danger"; label: string; href?: string }[] = [];
  if (stats) {
    if (stats.integration_errors > 0) {
      alerts.push({
        tone: "danger",
        label: `${stats.integration_errors} integration${stats.integration_errors === 1 ? "" : "s"} reporting errors`,
        href: "/admin/health",
      });
    }
    if (stats.integration_backlog > 100) {
      alerts.push({
        tone: "danger",
        label: `Integration backlog over 100 (${stats.integration_backlog})`,
        href: "/admin/health",
      });
    } else if (stats.integration_backlog > 0) {
      alerts.push({
        tone: "warn",
        label: `${stats.integration_backlog} unprocessed integration events`,
        href: "/admin/health",
      });
    }
    if (stats.moderation_queue > 20) {
      alerts.push({
        tone: "danger",
        label: `Moderation queue over 20 (${stats.moderation_queue})`,
        href: "/admin/moderation",
      });
    } else if (stats.moderation_queue > 0) {
      alerts.push({
        tone: "warn",
        label: `${stats.moderation_queue} proof items awaiting review`,
        href: "/admin/moderation",
      });
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">ADM-01</div>
        <h1 className="text-3xl font-bold mt-1">Admin overview</h1>
        <p className="text-muted-foreground mt-1">Platform-wide health, growth, and revenue.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active businesses"
          value={stats ? stats.businesses_active : null}
          icon={Building2}
          accent="text-accent"
          sub={stats ? `${stats.businesses_new_30d} new in 30 days` : undefined}
        />
        <StatCard
          label="Paying businesses"
          value={stats ? stats.paying_businesses : null}
          icon={ShieldCheck}
          accent="text-teal"
          sub={stats ? `of ${stats.businesses_total} total` : undefined}
        />
        <StatCard
          label="MRR (estimated)"
          value={stats ? `$${stats.mrr_usd.toLocaleString()}` : null}
          icon={CircleDollarSign}
          accent="text-success"
          sub="Plan-tier estimate"
        />
        <StatCard
          label="Proof last 24h"
          value={stats ? stats.proof_last_24h.toLocaleString() : null}
          icon={MessageSquareQuote}
          accent="text-purple"
          sub={stats ? `${stats.proof_total.toLocaleString()} total` : undefined}
        />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-destructive/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              Active alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((a, i) => (
              <div
                key={i}
                className={`flex items-center justify-between gap-3 rounded-md border p-3 text-sm ${
                  a.tone === "danger" ? "border-destructive/40 bg-destructive/5" : "border-gold/40 bg-gold/5"
                }`}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    className={`h-4 w-4 ${a.tone === "danger" ? "text-destructive" : "text-gold"}`}
                  />
                  <span>{a.label}</span>
                </div>
                {a.href && (
                  <Button asChild size="sm" variant="outline">
                    <Link to={a.href}>Investigate</Link>
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Trend chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Last 30 days
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!series ? (
            <Skeleton className="h-72 w-full" />
          ) : series.every((s) => s.new_businesses === 0 && s.new_proofs === 0) ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No activity yet in the last 30 days.
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="new_businesses"
                    name="New businesses"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="new_proofs"
                    name="New proofs"
                    stroke="hsl(var(--teal))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  sub,
}: {
  label: string;
  value: string | number | null;
  icon: typeof Building2;
  accent: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={`h-5 w-5 ${accent}`} />
      </CardHeader>
      <CardContent>
        {value === null ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</div>
        )}
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}
