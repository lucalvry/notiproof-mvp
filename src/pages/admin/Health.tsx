import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Activity,
  AlertTriangle,
  Database,
  HardDrive,
  Image as ImageIcon,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { generateVideoPoster } from "@/lib/bunny-upload";

const db = supabase as any;

interface IntegrationHealthRow {
  integration_id: string;
  business_id: string;
  business_name: string;
  provider: string;
  status: string;
  last_sync_at: string | null;
  events_24h: number;
  processed_24h: number;
  unprocessed_24h: number;
  success_rate: number | null;
}

interface FailureRow {
  id: string;
  event_type: string;
  received_at: string;
  integration_id: string;
  integrations: { provider: string } | null;
}

interface HealthInfo {
  db: boolean;
  auth: boolean;
  storage: boolean;
  recent_events: number;
  backlog: number;
  failed_24h: number;
  integrationHealth: IntegrationHealthRow[];
  failures: FailureRow[];
  failedEvents: FailureRow[];
}

export default function Health() {
  const { toast } = useToast();
  const [info, setInfo] = useState<HealthInfo | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [backfilling, setBackfilling] = useState(false);

  const backfillPosters = async () => {
    setBackfilling(true);
    try {
      const { data, error } = await db
        .from("proof_objects")
        .select("id, business_id, media_url, author_name")
        .is("poster_url", null)
        .not("media_url", "is", null)
        .or("type.eq.video,type.eq.testimonial")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const candidates = (data ?? []).filter((p: { media_url: string }) =>
        /\.(mp4|webm|mov|m4v)(\?|$)/i.test(p.media_url ?? "")
      );
      if (candidates.length === 0) {
        toast({ title: "No videos need posters", description: "Everything is already up to date." });
        return;
      }
      let ok = 0;
      for (const p of candidates) {
        const url = await generateVideoPoster({
          businessId: p.business_id,
          mediaUrl: p.media_url,
          proofId: p.id,
          authorName: p.author_name,
        });
        if (url) ok++;
      }
      toast({
        title: "Backfill complete",
        description: `${ok}/${candidates.length} posters generated.`,
      });
    } catch (e) {
      toast({ title: "Backfill failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBackfilling(false);
    }
  };

  const load = async () => {
    setInfo(null);
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [dbRes, authRes, eventsRes, backlogRes, failuresRes, bucketsRes, healthRes, failedCountRes, failedListRes] =
      await Promise.all([
        supabase.from("businesses").select("id", { head: true, count: "exact" }),
        supabase.auth.getSession(),
        supabase
          .from("widget_events")
          .select("id", { count: "exact", head: true })
          .gte("fired_at", new Date(Date.now() - 60 * 60 * 1000).toISOString()),
        supabase
          .from("integration_events")
          .select("id", { count: "exact", head: true })
          .is("processed_at", null),
        db
          .from("integration_events")
          .select("id, event_type, received_at, integration_id, integrations(provider)")
          .is("processed_at", null)
          .order("received_at", { ascending: false })
          .limit(20),
        supabase.storage.listBuckets(),
        db.rpc("admin_integration_health"),
        db
          .from("integration_events")
          .select("id", { count: "exact", head: true })
          .eq("status", "failed")
          .gte("received_at", since24h),
        db
          .from("integration_events")
          .select("id, event_type, received_at, integration_id, integrations(provider)")
          .eq("status", "failed")
          .gte("received_at", since24h)
          .order("received_at", { ascending: false })
          .limit(20),
      ]);

    setInfo({
      db: !dbRes.error,
      auth: !authRes.error,
      storage: !bucketsRes.error,
      recent_events: eventsRes.count ?? 0,
      backlog: backlogRes.count ?? 0,
      failed_24h: failedCountRes.count ?? 0,
      failures: (failuresRes.data ?? []) as FailureRow[],
      failedEvents: (failedListRes.data ?? []) as FailureRow[],
      integrationHealth: (healthRes.data ?? []) as IntegrationHealthRow[],
    });
  };

  useEffect(() => {
    load();
  }, []);

  const retryEvent = async (id: string) => {
    setRetrying(id);
    const { error } = await db.rpc("admin_replay_integration_event", { _event_id: id });
    setRetrying(null);
    if (error) {
      return toast({ title: "Retry failed", description: error.message, variant: "destructive" });
    }
    toast({ title: "Event re-queued", description: "It will be re-processed on the next webhook hit." });
    load();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">ADM-05</div>
          <h1 className="text-3xl font-bold mt-1">System health</h1>
          <p className="text-muted-foreground mt-1">
            Service status, integration delivery rates, and replay tools.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={backfillPosters} disabled={backfilling}>
            <ImageIcon className="h-4 w-4 mr-1" /> {backfilling ? "Backfilling…" : "Backfill video posters"}
          </Button>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <HealthCard
          title="Database"
          icon={Database}
          loading={!info}
          ok={info?.db}
          value={info?.db ? "Healthy" : "Error"}
        />
        <HealthCard
          title="Auth"
          icon={ShieldCheck}
          loading={!info}
          ok={info?.auth}
          value={info?.auth ? "Healthy" : "Error"}
        />
        <HealthCard
          title="Storage"
          icon={HardDrive}
          loading={!info}
          ok={info?.storage}
          value={info?.storage ? "Reachable" : "Error"}
        />
        <MetricCard title="Events (last hour)" icon={Activity} value={info?.recent_events} />
        <MetricCard
          title="Integration backlog"
          icon={AlertTriangle}
          value={info?.backlog}
          attention={(info?.backlog ?? 0) > 0}
        />
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <MetricCard
          title="Failed events (24h)"
          icon={AlertTriangle}
          value={info?.failed_24h}
          attention={(info?.failed_24h ?? 0) > 0}
        />
      </div>

      {/* Failed events with replay */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Failed integration events (last 24h)</CardTitle>
        </CardHeader>
        <CardContent>
          {!info ? (
            <Skeleton className="h-32 w-full" />
          ) : info.failedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No failures in the last 24 hours.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead className="text-right">Replay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {info.failedEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="capitalize">{event.integrations?.provider ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{event.event_type}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(event.received_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => retryEvent(event.id)}
                        disabled={retrying === event.id}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        {retrying === event.id ? "…" : "Replay"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Per-integration 24h success rate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integration delivery (last 24h)</CardTitle>
        </CardHeader>
        <CardContent>
          {!info ? (
            <Skeleton className="h-32 w-full" />
          ) : info.integrationHealth.length === 0 ? (
            <p className="text-sm text-muted-foreground">No integrations connected yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Events</TableHead>
                  <TableHead className="text-right">Processed</TableHead>
                  <TableHead className="text-right">Success</TableHead>
                  <TableHead>Last sync</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {info.integrationHealth.map((row) => {
                  const rate = row.success_rate;
                  const tone =
                    rate === null
                      ? "secondary"
                      : rate >= 95
                        ? "default"
                        : rate >= 75
                          ? "outline"
                          : "destructive";
                  return (
                    <TableRow key={row.integration_id}>
                      <TableCell className="text-sm">
                        <Link
                          to={`/admin/businesses/${row.business_id}`}
                          className="hover:text-accent underline-offset-2 hover:underline"
                        >
                          {row.business_name}
                        </Link>
                      </TableCell>
                      <TableCell className="capitalize">{row.provider.replace("_", " ")}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{row.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.events_24h}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.processed_24h}</TableCell>
                      <TableCell className="text-right">
                        {rate === null ? (
                          <span className="text-xs text-muted-foreground">No traffic</span>
                        ) : (
                          <Badge variant={tone as any}>{rate}%</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.last_sync_at
                          ? new Date(row.last_sync_at).toLocaleString()
                          : "Never"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Unprocessed events with retry */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Unprocessed integration events</CardTitle>
        </CardHeader>
        <CardContent>
          {!info ? (
            <Skeleton className="h-32 w-full" />
          ) : info.failures.length === 0 ? (
            <p className="text-sm text-muted-foreground">No backlog detected.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead className="text-right">Retry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {info.failures.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="capitalize">
                      {event.integrations?.provider ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{event.event_type}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(event.received_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => retryEvent(event.id)}
                        disabled={retrying === event.id}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        {retrying === event.id ? "…" : "Retry"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function HealthCard({
  title,
  icon: Icon,
  loading,
  ok,
  value,
}: {
  title: string;
  icon: typeof Database;
  loading: boolean;
  ok?: boolean;
  value?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <Badge variant={ok ? "default" : "destructive"}>{value}</Badge>
        )}
      </CardContent>
    </Card>
  );
}

function MetricCard({
  title,
  icon: Icon,
  value,
  attention = false,
}: {
  title: string;
  icon: typeof Activity;
  value?: number;
  attention?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {value === undefined ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <div className={attention ? "text-2xl font-bold text-destructive" : "text-2xl font-bold"}>
            {value.toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
