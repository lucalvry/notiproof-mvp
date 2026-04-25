import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, MonitorSmartphone, Settings as SettingsIcon } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { ReadOnlyBanner } from "@/components/layouts/ReadOnlyBanner";

type Widget = Database["public"]["Tables"]["widgets"]["Row"];

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  active: "default", draft: "outline", paused: "secondary",
};

export default function WidgetsList() {
  const { currentBusinessId, currentBusinessRole } = useAuth();
  const canEdit = currentBusinessRole === "owner" || currentBusinessRole === "editor";
  const { toast } = useToast();
  const [items, setItems] = useState<Widget[]>([]);
  const [impressions, setImpressions] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentBusinessId) return;
    (async () => {
      const { data, error } = await supabase.from("widgets").select("*").eq("business_id", currentBusinessId).order("created_at", { ascending: false });
      if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
      const widgets = data ?? [];
      setItems(widgets);
      // Fetch impression counts per widget (best-effort; cap at 5000 events)
      if (widgets.length) {
        const { data: ev } = await supabase
          .from("widget_events")
          .select("widget_id")
          .eq("business_id", currentBusinessId)
          .eq("event_type", "impression")
          .limit(5000);
        const counts: Record<string, number> = {};
        (ev ?? []).forEach((e) => { counts[e.widget_id] = (counts[e.widget_id] ?? 0) + 1; });
        setImpressions(counts);
      }
      setLoading(false);
    })();
  }, [currentBusinessId, toast]);

  return (
    <div className="space-y-6 animate-fade-in">
      <ReadOnlyBanner />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">WID-01</div>
          <h1 className="text-3xl font-bold mt-1">Widgets</h1>
          <p className="text-muted-foreground mt-1">Build and manage widgets that display your social proof.</p>
        </div>
        {canEdit && <Button asChild><Link to="/widgets/new"><Plus className="h-4 w-4 mr-2" /> New widget</Link></Button>}
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent mb-4"><MonitorSmartphone className="h-6 w-6" /></div>
              <h3 className="font-semibold">No widgets yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">Create your first widget to start showing social proof on your site.</p>
              {canEdit && <Button asChild className="mt-4"><Link to="/widgets/new"><Plus className="h-4 w-4 mr-2" /> Create widget</Link></Button>}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Impressions</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {items.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium">{w.name}</TableCell>
                      <TableCell><span className="capitalize text-sm">{w.type}</span></TableCell>
                      <TableCell><Badge variant={statusVariant[w.status]} className="capitalize">{w.status}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{(impressions[w.id] ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline"><Link to={`/widgets/${w.id}/edit`}><SettingsIcon className="h-3.5 w-3.5 mr-1" /> {canEdit ? "Edit" : "View"}</Link></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
