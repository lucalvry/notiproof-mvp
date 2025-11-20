import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { CampaignDragList } from "./CampaignDragList";
import { usePlaylist } from "@/hooks/usePlaylist";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Playlist {
  id: string;
  name: string;
  website_id: string;
  is_active: boolean;
  campaign_order: string[] | null;
  rules: any;
}

interface PlaylistEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playlist?: Playlist;
  websiteId: string;
  onSave: () => void;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  priority: number | null;
}

export function PlaylistEditor({
  open,
  onOpenChange,
  playlist,
  websiteId,
  onSave,
}: PlaylistEditorProps) {
  const [name, setName] = useState("");
  const [sequenceMode, setSequenceMode] = useState<'priority' | 'sequential' | 'random'>("priority");
  const [maxPerSession, setMaxPerSession] = useState(10);
  const [cooldownSeconds, setCooldownSeconds] = useState(300);
  const [conflictResolution, setConflictResolution] = useState<'priority' | 'newest' | 'oldest'>("priority");
  const [campaignOrder, setCampaignOrder] = useState<string[]>([]);
  const [availableCampaigns, setAvailableCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  const { createPlaylist, updatePlaylist, loading } = usePlaylist();

  // Load available campaigns
  useEffect(() => {
    if (open && websiteId) {
      loadCampaigns();
    }
  }, [open, websiteId]);

  // Load playlist data
  useEffect(() => {
    if (playlist) {
      setName(playlist.name);
      const rules = playlist.rules || {};
      setSequenceMode(rules.sequence_mode || "priority");
      setMaxPerSession(rules.max_per_session || 10);
      setCooldownSeconds(rules.cooldown_seconds || 300);
      setConflictResolution(rules.conflict_resolution || "priority");
      setCampaignOrder(playlist.campaign_order || []);
    } else {
      // Reset for new playlist
      setName("");
      setSequenceMode("priority");
      setMaxPerSession(10);
      setCooldownSeconds(300);
      setConflictResolution("priority");
      setCampaignOrder([]);
    }
  }, [playlist]);

  const loadCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, status, priority")
        .eq("website_id", websiteId)
        .eq("status", "active")
        .order("priority", { ascending: false });

      if (error) throw error;
      setAvailableCampaigns(data || []);
    } catch (error) {
      console.error("Error loading campaigns:", error);
      toast.error("Failed to load campaigns");
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a playlist name");
      return;
    }

    const rules = {
      sequence_mode: sequenceMode,
      max_per_session: maxPerSession,
      cooldown_seconds: cooldownSeconds,
      conflict_resolution: conflictResolution,
    };

    if (playlist) {
      // Update existing
      const { error } = await updatePlaylist(playlist.id, {
        name: name.trim(),
        campaign_order: campaignOrder,
        rules,
      });

      if (!error) {
        onSave();
      }
    } else {
      // Create new
      const { error } = await createPlaylist({
        name: name.trim(),
        website_id: websiteId,
        campaign_order: campaignOrder,
        rules,
      });

      if (!error) {
        onSave();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{playlist ? "Edit" : "Create"} Playlist</DialogTitle>
          <DialogDescription>
            Configure how multiple campaigns are orchestrated on your website
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Playlist Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Playlist Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Homepage Campaign Sequence"
            />
          </div>

          <Separator />

          {/* Campaign Selection & Ordering */}
          <div className="space-y-3">
            <div>
              <Label>Campaign Sequence</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Drag to reorder campaigns in the sequence
              </p>
            </div>
            
            {loadingCampaigns ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <CampaignDragList
                campaigns={availableCampaigns}
                selectedIds={campaignOrder}
                onReorder={setCampaignOrder}
              />
            )}
          </div>

          <Separator />

          {/* Orchestration Rules */}
          <div className="space-y-4">
            <Label>Orchestration Rules</Label>

            {/* Sequence Mode */}
            <div className="space-y-2">
              <Label htmlFor="sequence-mode" className="text-sm">Sequence Mode</Label>
              <Select value={sequenceMode} onValueChange={(v: any) => setSequenceMode(v)}>
                <SelectTrigger id="sequence-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">Priority (highest first)</SelectItem>
                  <SelectItem value="sequential">Sequential (one after another)</SelectItem>
                  <SelectItem value="random">Random</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How campaigns are selected for display
              </p>
            </div>

            {/* Max per Session */}
            <div className="space-y-3">
              <Label htmlFor="max-session">Max Notifications per Session: {maxPerSession}</Label>
              <Slider
                id="max-session"
                value={[maxPerSession]}
                onValueChange={(v) => setMaxPerSession(v[0])}
                min={1}
                max={50}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Maximum notifications to show in one browsing session
              </p>
            </div>

            {/* Cooldown */}
            <div className="space-y-3">
              <Label htmlFor="cooldown">
                Cooldown Period: {Math.floor(cooldownSeconds / 60)}m {cooldownSeconds % 60}s
              </Label>
              <Slider
                id="cooldown"
                value={[cooldownSeconds]}
                onValueChange={(v) => setCooldownSeconds(v[0])}
                min={60}
                max={3600}
                step={30}
              />
              <p className="text-xs text-muted-foreground">
                Minimum time between showing notifications from this playlist
              </p>
            </div>

            {/* Conflict Resolution */}
            <div className="space-y-2">
              <Label htmlFor="conflict" className="text-sm">Conflict Resolution</Label>
              <Select value={conflictResolution} onValueChange={(v: any) => setConflictResolution(v)}>
                <SelectTrigger id="conflict">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">Highest Priority</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How to choose when multiple campaigns are eligible
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {playlist ? "Update" : "Create"} Playlist
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
