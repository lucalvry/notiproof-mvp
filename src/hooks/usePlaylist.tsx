import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PlaylistRules {
  sequence_mode: 'priority' | 'sequential' | 'random';
  max_per_session: number;
  cooldown_seconds: number;
  conflict_resolution: 'priority' | 'newest' | 'oldest';
}

interface CreatePlaylistData {
  name: string;
  website_id: string;
  campaign_order?: string[];
  rules?: Partial<PlaylistRules>;
  is_active?: boolean;
}

interface UpdatePlaylistData {
  name?: string;
  campaign_order?: string[];
  rules?: Partial<PlaylistRules>;
  is_active?: boolean;
}

export function usePlaylist() {
  const [loading, setLoading] = useState(false);

  const createPlaylist = useCallback(async (data: CreatePlaylistData) => {
    setLoading(true);
    try {
      const defaultRules: PlaylistRules = {
        sequence_mode: 'priority',
        max_per_session: 10,
        cooldown_seconds: 300,
        conflict_resolution: 'priority',
      };

      const { data: playlist, error } = await supabase
        .from("campaign_playlists")
        .insert({
          name: data.name,
          website_id: data.website_id,
          campaign_order: data.campaign_order || [],
          rules: { ...defaultRules, ...data.rules },
          is_active: data.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success("Playlist created successfully");
      return { data: playlist, error: null };
    } catch (error: any) {
      console.error("Error creating playlist:", error);
      toast.error(error.message || "Failed to create playlist");
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePlaylist = useCallback(async (playlistId: string, data: UpdatePlaylistData) => {
    setLoading(true);
    try {
      const { data: playlist, error } = await supabase
        .from("campaign_playlists")
        .update(data)
        .eq("id", playlistId)
        .select()
        .single();

      if (error) throw error;
      
      toast.success("Playlist updated successfully");
      return { data: playlist, error: null };
    } catch (error: any) {
      console.error("Error updating playlist:", error);
      toast.error(error.message || "Failed to update playlist");
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  }, []);

  const deletePlaylist = useCallback(async (playlistId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("campaign_playlists")
        .delete()
        .eq("id", playlistId);

      if (error) throw error;
      
      toast.success("Playlist deleted successfully");
      return { error: null };
    } catch (error: any) {
      console.error("Error deleting playlist:", error);
      toast.error(error.message || "Failed to delete playlist");
      return { error };
    } finally {
      setLoading(false);
    }
  }, []);

  const reorderCampaigns = useCallback(async (
    playlistId: string,
    campaignOrder: string[]
  ) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("campaign_playlists")
        .update({ campaign_order: campaignOrder })
        .eq("id", playlistId);

      if (error) throw error;
      
      return { error: null };
    } catch (error: any) {
      console.error("Error reordering campaigns:", error);
      toast.error(error.message || "Failed to reorder campaigns");
      return { error };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    reorderCampaigns,
  };
}
