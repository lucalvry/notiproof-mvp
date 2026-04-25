import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, MonitorSmartphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proofIds: string[];
  onAssigned?: () => void;
}

interface WidgetRow {
  id: string;
  name: string;
  type: string;
  status: string;
  config: Record<string, unknown> | null;
}

export function AssignToWidgetDialog({ open, onOpenChange, proofIds, onAssigned }: Props) {
  const { currentBusinessId } = useAuth();
  const { toast } = useToast();
  const [widgets, setWidgets] = useState<WidgetRow[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !currentBusinessId) return;
    setWidgets(null);
    setSelectedId(null);
    supabase
      .from("widgets")
      .select("id, name, type, status, config")
      .eq("business_id", currentBusinessId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setWidgets((data ?? []) as WidgetRow[]));
  }, [open, currentBusinessId]);

  const assign = async () => {
    if (!selectedId) return;
    const widget = widgets?.find((w) => w.id === selectedId);
    if (!widget) return;
    setSaving(true);
    const config = (widget.config ?? {}) as Record<string, unknown>;
    const existing = Array.isArray(config.pinned_proof_ids) ? (config.pinned_proof_ids as string[]) : [];
    const merged = Array.from(new Set([...existing, ...proofIds]));
    const { error } = await supabase
      .from("widgets")
      .update({ config: { ...config, pinned_proof_ids: merged } })
      .eq("id", widget.id);
    setSaving(false);
    if (error) {
      toast({ title: "Could not assign", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Assigned",
      description: `${proofIds.length} proof${proofIds.length === 1 ? "" : "s"} added to ${widget.name}.`,
    });
    onAssigned?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign to widget</DialogTitle>
          <DialogDescription>
            Pin {proofIds.length} selected proof{proofIds.length === 1 ? "" : "s"} to a widget. They'll appear in
            its rotation.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {widgets === null ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" /> Loading widgets…
            </div>
          ) : widgets.length === 0 ? (
            <div className="py-8 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
                <MonitorSmartphone className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium">No widgets yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create a widget first to assign proof to it.</p>
            </div>
          ) : (
            <ul className="space-y-1.5 max-h-72 overflow-y-auto">
              {widgets.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(w.id)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-md border p-3 text-left transition-colors",
                      selectedId === w.id
                        ? "border-accent bg-accent/5 ring-2 ring-accent/20"
                        : "hover:border-accent/50",
                    )}
                  >
                    <MonitorSmartphone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{w.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {w.type} · {w.status}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={assign} disabled={!selectedId || saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
