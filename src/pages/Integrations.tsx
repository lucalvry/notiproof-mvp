import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Plug } from "lucide-react";

interface HookRow {
  id: string;
  user_id: string;
  type: string;
  url: string;
  created_at: string;
}

const Integrations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [hooks, setHooks] = useState<HookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<string>("webhook");
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    document.title = "Integrations – NotiProof";
    const meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (meta) meta.content = "Manage webhooks and integrations for your NotiProof widgets.";
  }, []);

  const loadHooks = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("integration_hooks")
      .select("id, user_id, type, url, created_at")
      .order("created_at", { ascending: false });
    if (!error) setHooks(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadHooks();
  }, []);

  const addHook = async () => {
    if (!user) return;
    if (!url || !type) {
      toast({ title: "Missing info", description: "Please provide type and URL.", variant: "destructive" });
      return;
    }
    const { error } = await (supabase as any).from("integration_hooks").insert({ user_id: user.id, type, url });
    if (error) {
      toast({ title: "Could not add integration", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Integration added", description: "Your integration hook is active." });
      setUrl("");
      loadHooks();
    }
  };

  const deleteHook = async (id: string) => {
    if (!confirm("Delete this integration hook?")) return;
    const { error } = await (supabase as any).from("integration_hooks").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      setHooks((prev) => prev.filter((h) => h.id !== id));
      toast({ title: "Deleted", description: "Integration hook removed." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground">Connect NotiProof to your stack</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Integration</CardTitle>
          <CardDescription>Create a webhook or connector</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-5 gap-3">
          <Select value={type} onValueChange={(v) => setType(v)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="webhook">Webhook</SelectItem>
              <SelectItem value="zapier">Zapier</SelectItem>
              <SelectItem value="pabbly">Pabbly</SelectItem>
            </SelectContent>
          </Select>
          <div className="md:col-span-3">
            <Input placeholder="https://example.com/webhook" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <Button onClick={addHook}><Plus className="h-4 w-4 mr-2" />Add</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Integrations</CardTitle>
          <CardDescription>Your configured hooks</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : hooks.length === 0 ? (
            <div className="text-muted-foreground">No integrations yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hooks.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{h.type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs truncate max-w-[420px]">{h.url}</TableCell>
                    <TableCell>{new Date(h.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => deleteHook(h.id)}>
                        <Trash2 className="h-4 w-4" />
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
};

export default Integrations;
