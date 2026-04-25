import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { BarChart3, ArrowUpDown, TrendingUp } from "lucide-react";

interface Bucket {
  bucket: string;
  date: string;
  impressions: number;
  interactions: number;
  conversions: number;
  ctr: number;
}

interface ProofTypeSlice {
  type: string;
  count: number;
}

interface TopProofRow {
  proof_id: string;
  author_name: string | null;
  type: string;
  impressions: number;
  interactions: number;
  conversions: number;
}

type SortKey = "impressions" | "interactions" | "conversions";

const TYPE_COLORS = ["hsl(var(--accent))", "hsl(var(--teal))", "hsl(var(--gold))", "hsl(var(--primary))", "hsl(var(--muted-foreground))"];
const MIN_IMPRESSIONS_THRESHOLD = 50;

export default function Analytics() {
  const { currentBusinessId } = useAuth();
  const [range, setRange] = useState("30");
  const [data, setData] = useState<Bucket[] | null>(null);
  const [proofByType, setProofByType] = useState<ProofTypeSlice[] | null>(null);
  const [topProof, setTopProof] = useState<TopProofRow[] | null>(null);
  const [responseRate, setResponseRate] = useState<{ sent: number; responded: number } | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("impressions");

  useEffect(() => {
    if (!currentBusinessId) {
      setData(null);
      setProofByType(null);
      setTopProof(null);
      setResponseRate(null);
      return;
    }
    setData(null);
    setProofByType(null);
    setTopProof(null);
    setResponseRate(null);

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - Number(range));
    const startIso = start.toISOString();
    const endIso = end.toISOString();

    Promise.all([
      supabase
        .from("widget_events")
        .select("event_type, fired_at, proof_object_id")
        .eq("business_id", currentBusinessId)
        .gte("fired_at", startIso)
        .lte("fired_at", endIso)
        .order("fired_at", { ascending: true })
        .limit(10000),
      supabase
        .from("proof_objects")
        .select("type, created_at")
        .eq("business_id", currentBusinessId)
        .gte("created_at", startIso)
        .lte("created_at", endIso)
        .limit(5000),
      supabase
        .from("testimonial_requests")
        .select("status, sent_at, responded_at, completed_at")
        .eq("business_id", currentBusinessId)
        .gte("created_at", startIso)
        .lte("created_at", endIso)
        .limit(5000),
    ]).then(async ([eventsRes, proofRes, requestsRes]) => {
      const events = eventsRes.data ?? [];

      // Daily buckets
      const buckets = new Map<string, Bucket>();
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        buckets.set(key, {
          bucket: key,
          date: new Date(key).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          impressions: 0,
          interactions: 0,
          conversions: 0,
          ctr: 0,
        });
      }
      events.forEach((e) => {
        const key = (e.fired_at as string).slice(0, 10);
        const b = buckets.get(key);
        if (!b) return;
        if (e.event_type === "impression") b.impressions++;
        else if (e.event_type === "interaction" || e.event_type === "click") b.interactions++;
        else if (e.event_type === "conversion") b.conversions++;
      });
      const arr = Array.from(buckets.values()).map((b) => ({
        ...b,
        ctr: b.impressions > 0 ? Number(((b.interactions / b.impressions) * 100).toFixed(2)) : 0,
      }));
      setData(arr);

      // Proof by type
      const typeCounts = new Map<string, number>();
      (proofRes.data ?? []).forEach((p) => {
        typeCounts.set(p.type as string, (typeCounts.get(p.type as string) ?? 0) + 1);
      });
      setProofByType(
        Array.from(typeCounts.entries())
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count),
      );

      // Testimonial response rate
      const reqs = requestsRes.data ?? [];
      const sent = reqs.filter((r) => r.sent_at).length;
      const responded = reqs.filter(
        (r) =>
          r.responded_at ||
          r.completed_at ||
          r.status === "responded" ||
          r.status === "completed",
      ).length;
      setResponseRate({ sent, responded });

      // Top proof — aggregate event counts per proof_object_id, then resolve
      const perProof = new Map<string, { impressions: number; interactions: number; conversions: number }>();
      events.forEach((e) => {
        const id = e.proof_object_id as string | null;
        if (!id) return;
        const cur = perProof.get(id) ?? { impressions: 0, interactions: 0, conversions: 0 };
        if (e.event_type === "impression") cur.impressions++;
        else if (e.event_type === "interaction" || e.event_type === "click") cur.interactions++;
        else if (e.event_type === "conversion") cur.conversions++;
        perProof.set(id, cur);
      });
      const proofIds = Array.from(perProof.keys()).slice(0, 50);
      let resolved: TopProofRow[] = [];
      if (proofIds.length > 0) {
        const { data: rows } = await supabase
          .from("proof_objects")
          .select("id, author_name, type")
          .in("id", proofIds);
        resolved = (rows ?? []).map((r) => {
          const m = perProof.get(r.id as string)!;
          return {
            proof_id: r.id as string,
            author_name: (r.author_name as string | null) ?? null,
            type: r.type as string,
            impressions: m.impressions,
            interactions: m.interactions,
            conversions: m.conversions,
          };
        });
      }
      setTopProof(resolved);
    });
  }, [currentBusinessId, range]);

  const totals = useMemo(
    () =>
      (data ?? []).reduce(
        (acc, d) => ({
          impressions: acc.impressions + d.impressions,
          interactions: acc.interactions + d.interactions,
          conversions: acc.conversions + d.conversions,
        }),
        { impressions: 0, interactions: 0, conversions: 0 },
      ),
    [data],
  );

  const ctr = totals.impressions ? ((totals.interactions / totals.impressions) * 100).toFixed(1) : "0.0";
  const responseRatePct =
    responseRate && responseRate.sent > 0
      ? ((responseRate.responded / responseRate.sent) * 100).toFixed(1)
      : null;

  const sortedTop = useMemo(() => {
    if (!topProof) return [];
    return [...topProof].sort((a, b) => b[sortKey] - a[sortKey]).slice(0, 10);
  }, [topProof, sortKey]);

  const isLoading = data === null || proofByType === null || topProof === null;
  const belowThreshold =
    !isLoading && totals.impressions < MIN_IMPRESSIONS_THRESHOLD;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">ANA-01</div>
          <h1 className="text-3xl font-bold mt-1">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Impressions, interactions, conversions, and proof performance.
          </p>
        </div>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Widget impressions" value={isLoading ? null : totals.impressions.toLocaleString()} />
        <StatCard label="Widget interactions" value={isLoading ? null : totals.interactions.toLocaleString()} />
        <StatCard label="Assisted conversions" value={isLoading ? null : totals.conversions.toLocaleString()} />
        <StatCard
          label="Request response rate"
          value={responseRate === null ? null : responseRatePct === null ? "—" : `${responseRatePct}%`}
          sub={
            responseRate
              ? `${responseRate.responded} of ${responseRate.sent} requests`
              : undefined
          }
        />
      </div>

      {belowThreshold && (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent mb-2">
              <TrendingUp className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium">Charts unlock at 50 impressions</p>
            <p className="text-xs text-muted-foreground mt-1">
              You have {totals.impressions} so far in the selected range. Once visitors see your widgets more often, daily trends and per-proof performance will appear here.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Two charts side by side */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Impressions over time</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : belowThreshold ? (
              <EmptyChart />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="impressions" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="interactions" stroke="hsl(var(--teal))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="conversions" stroke="hsl(var(--gold))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversion rate trend</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : belowThreshold ? (
              <EmptyChart label={`Current CTR: ${ctr}%`} />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      formatter={(v: number) => `${v}%`}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="ctr"
                      name="CTR"
                      stroke="hsl(var(--accent))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="text-center text-xs text-muted-foreground mt-2">
                  Average CTR: <span className="font-semibold text-foreground">{ctr}%</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Proof by type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Proof collected by type</CardTitle>
          </CardHeader>
          <CardContent>
            {proofByType === null ? (
              <Skeleton className="h-64 w-full" />
            ) : proofByType.length === 0 ? (
              <EmptyChart label="No proof collected in this range." />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={proofByType}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) => `${entry.type} (${entry.count})`}
                    >
                      {proofByType.map((_, i) => (
                        <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top performing proof */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Top performing proof</CardTitle>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="impressions">Sort by impressions</SelectItem>
                <SelectItem value="interactions">Sort by interactions</SelectItem>
                <SelectItem value="conversions">Sort by conversions</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {topProof === null ? (
              <Skeleton className="h-48 w-full" />
            ) : sortedTop.length === 0 ? (
              <EmptyChart label="No proof has fired widget events yet." />
            ) : (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-2 py-2 font-medium">Author</th>
                      <th className="px-2 py-2 font-medium">Type</th>
                      <th className="px-2 py-2 font-medium text-right">
                        <SortHeader
                          label="Impressions"
                          active={sortKey === "impressions"}
                          onClick={() => setSortKey("impressions")}
                        />
                      </th>
                      <th className="px-2 py-2 font-medium text-right">
                        <SortHeader
                          label="Interactions"
                          active={sortKey === "interactions"}
                          onClick={() => setSortKey("interactions")}
                        />
                      </th>
                      <th className="px-2 py-2 font-medium text-right">
                        <SortHeader
                          label="Conversions"
                          active={sortKey === "conversions"}
                          onClick={() => setSortKey("conversions")}
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sortedTop.map((row) => (
                      <tr key={row.proof_id} className="hover:bg-muted/30">
                        <td className="px-2 py-2 truncate max-w-[200px]">
                          {row.author_name ?? "Anonymous"}
                        </td>
                        <td className="px-2 py-2">
                          <Badge variant="outline" className="capitalize text-[10px]">
                            {row.type}
                          </Badge>
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {row.impressions.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {row.interactions.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {row.conversions.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | null; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold mt-1">
          {value === null ? <Skeleton className="h-7 w-20" /> : value}
        </div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function EmptyChart({ label = "No activity yet" }: { label?: string }) {
  return (
    <div className="py-16 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent mb-3">
        <BarChart3 className="h-6 w-6" />
      </div>
      <h3 className="font-semibold">{label}</h3>
      <p className="text-sm text-muted-foreground mt-1">
        Once visitors see your widgets, data will appear here.
      </p>
    </div>
  );
}

function SortHeader({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${
        active ? "text-foreground" : ""
      }`}
    >
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );
}
