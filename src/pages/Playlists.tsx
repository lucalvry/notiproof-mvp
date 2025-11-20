import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PlaylistManager } from "@/components/campaigns/playlist/PlaylistManager";
import { PlaylistEditor } from "@/components/campaigns/playlist/PlaylistEditor";
import { useWebsiteContext } from "@/contexts/WebsiteContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Playlist {
  id: string;
  name: string;
  website_id: string;
  is_active: boolean;
  campaign_order: string[] | null;
  rules: any;
  created_at: string;
  updated_at: string;
}

export default function Playlists() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | undefined>();
  const [userId, setUserId] = useState<string>();
  const { websites, currentWebsite, setCurrentWebsite } = useWebsiteContext();
  
  const selectedWebsite = currentWebsite?.id;
  const setSelectedWebsite = (websiteId: string) => {
    const website = websites.find(w => w.id === websiteId);
    if (website) setCurrentWebsite(website);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
    });
  }, []);

  const fetchPlaylists = async () => {
    if (!selectedWebsite) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("campaign_playlists")
        .select("*")
        .eq("website_id", selectedWebsite)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPlaylists(data || []);
    } catch (error) {
      console.error("Error fetching playlists:", error);
      toast.error("Failed to load playlists");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedWebsite) {
      fetchPlaylists();
    }
  }, [selectedWebsite]);

  const handleCreate = () => {
    setEditingPlaylist(undefined);
    setEditorOpen(true);
  };

  const handleEdit = (playlist: Playlist) => {
    setEditingPlaylist(playlist);
    setEditorOpen(true);
  };

  const handleDelete = async (playlistId: string) => {
    try {
      const { error } = await supabase
        .from("campaign_playlists")
        .delete()
        .eq("id", playlistId);

      if (error) throw error;
      
      toast.success("Playlist deleted");
      fetchPlaylists();
    } catch (error) {
      console.error("Error deleting playlist:", error);
      toast.error("Failed to delete playlist");
    }
  };

  const handleToggleActive = async (playlistId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("campaign_playlists")
        .update({ is_active: isActive })
        .eq("id", playlistId);

      if (error) throw error;
      
      toast.success(isActive ? "Playlist activated" : "Playlist deactivated");
      fetchPlaylists();
    } catch (error) {
      console.error("Error updating playlist:", error);
      toast.error("Failed to update playlist");
    }
  };

  const handleSave = async () => {
    await fetchPlaylists();
    setEditorOpen(false);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Campaign Playlists</h1>
            <p className="text-muted-foreground mt-1">
              Orchestrate how multiple campaigns display on your website
            </p>
          </div>
          <div className="flex items-center gap-3">
            {websites.length > 1 && (
              <Select value={selectedWebsite || ""} onValueChange={setSelectedWebsite}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select website" />
                </SelectTrigger>
                <SelectContent>
                  {websites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Playlist
            </Button>
          </div>
        </div>

        {/* Website selection prompt */}
        {!selectedWebsite && websites.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-6 text-center">
            <p className="text-muted-foreground">
              Please select a website to view and manage playlists
            </p>
          </div>
        )}

        {/* Playlists */}
        {selectedWebsite && (
          <PlaylistManager
            playlists={playlists}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
            websiteId={selectedWebsite}
          />
        )}
      </div>

      {/* Editor Dialog */}
      <PlaylistEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        playlist={editingPlaylist}
        websiteId={selectedWebsite || ""}
        onSave={handleSave}
      />
    </div>
  );
}
