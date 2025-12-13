import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  PlayCircle,
  ListOrdered,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

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

interface PlaylistManagerProps {
  playlists: Playlist[];
  loading: boolean;
  onEdit: (playlist: Playlist) => void;
  onDelete: (playlistId: string) => void;
  onToggleActive: (playlistId: string, isActive: boolean) => void;
  websiteId: string;
}

export function PlaylistManager({
  playlists,
  loading,
  onEdit,
  onDelete,
  onToggleActive,
  websiteId,
}: PlaylistManagerProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState<string | null>(null);

  const handleDeleteClick = (playlistId: string) => {
    setPlaylistToDelete(playlistId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (playlistToDelete) {
      onDelete(playlistToDelete);
      setDeleteDialogOpen(false);
      setPlaylistToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (playlists.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <ListOrdered className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No playlists yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first playlist to orchestrate multiple notifications
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {playlists.map((playlist) => {
          const campaignCount = playlist.campaign_order?.length || 0;
          const rules = playlist.rules || {};
          
          return (
            <Card key={playlist.id} className="group hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{playlist.name}</CardTitle>
                      <Badge variant={playlist.is_active ? "default" : "secondary"}>
                        {playlist.is_active ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          "Inactive"
                        )}
                      </Badge>
                    </div>
                    <CardDescription className="text-sm">
                      {campaignCount} {campaignCount === 1 ? "campaign" : "campaigns"}
                    </CardDescription>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(playlist)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Playlist
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteClick(playlist.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Playlist Rules */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Sequence Mode:</span>
                    <Badge variant="outline">
                      {rules.sequence_mode || "priority"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Max per Session:</span>
                    <span className="font-medium">{rules.max_per_session || 10}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Cooldown:</span>
                    <span className="font-medium">
                      {Math.floor((rules.cooldown_seconds || 300) / 60)}m
                    </span>
                  </div>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <PlayCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Active</span>
                  </div>
                  <Switch
                    checked={playlist.is_active}
                    onCheckedChange={(checked) => onToggleActive(playlist.id, checked)}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Playlist?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this playlist. Campaigns will not be deleted,
              but will no longer be part of this orchestration sequence.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
