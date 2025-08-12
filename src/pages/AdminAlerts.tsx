import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw } from "lucide-react";

interface AlertRow {
  id: string;
  user_id: string | null;
  widget_id: string | null;
  type: string;
  message: string | null;
  context: any;
  created_at: string;
}

const AdminAlerts = () => {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    document.title = "System Alerts – NotiProof";
    const meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (meta) meta.content = "Admin system alerts and notifications for NotiProof.";
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("alerts")
      .select("id, user_id, widget_id, type, message, context, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    setAlerts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          a.type.toLowerCase().includes(q) ||
          (a.message || "").toLowerCase().includes(q) ||
          (a.widget_id || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [alerts, typeFilter, query]);

  const uniqueTypes = useMemo(() => Array.from(new Set(alerts.map((a) => a.type))), [alerts]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Alerts</h1>
        <p className="text-muted-foreground">API and platform notifications</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Refine the alert list</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-3 items-center">
          <Input placeholder="Search type, message, widget" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All types</option>
            {uniqueTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <Button variant="outline" onClick={loadAlerts}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
          <CardDescription>Last 200 alerts</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Widget</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{new Date(a.created_at).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="secondary">{a.type}</Badge></TableCell>
                    <TableCell className="max-w-[420px] truncate">{a.message || '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{a.widget_id ? a.widget_id.slice(0,8) : '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{a.user_id ? a.user_id.slice(0,8) : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAlerts;
