import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Trash2,
  RefreshCw,
  AlertTriangle,
  HardDrive,
  FileVideo,
  Image,
  Clock,
  CheckCircle,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface OrphanedMedia {
  id: string;
  cdn_url: string;
  file_size: number;
  user_id: string;
  type: string;
  created_at: string;
}

interface PendingCleanup {
  id: string;
  cdn_url: string;
  file_size: number;
  user_id: string;
  website_id: string | null;
  deleted_at: string;
}

interface CleanupStats {
  orphaned: OrphanedMedia[];
  pendingCleanup: PendingCleanup[];
  totalOrphanedSize: number;
  totalPendingSize: number;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function MediaManagement() {
  const [stats, setStats] = useState<CleanupStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<any>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data: orphaned } = await supabase.rpc('get_orphaned_media');
      const { data: pending } = await supabase.rpc('get_media_pending_cleanup', { _days_threshold: 0 });

      setStats({
        orphaned: orphaned || [],
        pendingCleanup: pending || [],
        totalOrphanedSize: (orphaned || []).reduce((sum: number, m: OrphanedMedia) => sum + (m.file_size || 0), 0),
        totalPendingSize: (pending || []).reduce((sum: number, m: PendingCleanup) => sum + (m.file_size || 0), 0),
      });
      toast.success('Media stats refreshed');
    } catch (error) {
      toast.error('Failed to fetch media stats');
    } finally {
      setLoading(false);
    }
  };

  const runCleanup = async (dryRun: boolean = true) => {
    setCleaning(true);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-media', {
        body: { dry_run: dryRun, days_threshold: 30 },
      });
      if (error) throw error;
      setCleanupResult(data);
      if (dryRun) {
        toast.info(`Dry run: ${data.pending_count} files would be cleaned`);
      } else {
        toast.success(`Cleanup complete: ${data.deleted} files deleted`);
        fetchStats();
      }
    } catch (error: any) {
      toast.error(error.message || 'Cleanup failed');
    } finally {
      setCleaning(false);
    }
  };

  const deleteOrphanedMedia = async (mediaIds: string[]) => {
    setCleaning(true);
    try {
      const { data, error } = await supabase.functions.invoke('bunny-delete', {
        body: { media_ids: mediaIds },
      });
      if (error) throw error;
      toast.success(`Deleted ${data.deleted} files`);
      fetchStats();
    } catch (error: any) {
      toast.error(error.message || 'Delete failed');
    } finally {
      setCleaning(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Media Management</h1>
            <p className="text-muted-foreground">Manage orphaned media files on Bunny CDN</p>
          </div>
          <Button onClick={fetchStats} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />Orphaned Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.orphaned.length || 0}</div>
              <p className="text-xs text-muted-foreground">{formatBytes(stats?.totalOrphanedSize || 0)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />Pending Cleanup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingCleanup.length || 0}</div>
              <p className="text-xs text-muted-foreground">{formatBytes(stats?.totalPendingSize || 0)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-blue-500" />Total Reclaimable
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatBytes((stats?.totalOrphanedSize || 0) + (stats?.totalPendingSize || 0))}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={() => runCleanup(true)} disabled={cleaning} variant="outline" size="sm" className="w-full">Dry Run</Button>
              <Button onClick={() => runCleanup(false)} disabled={cleaning} variant="destructive" size="sm" className="w-full">
                <Trash2 className="h-4 w-4 mr-2" />Run Cleanup
              </Button>
            </CardContent>
          </Card>
        </div>

        {cleanupResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                {cleanupResult.dry_run ? 'Dry Run Result' : 'Cleanup Result'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>Files: {cleanupResult.pending_count || cleanupResult.deleted}, Size: {formatBytes(cleanupResult.pending_bytes || cleanupResult.bytes_freed)}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Orphaned Media</CardTitle>
              {stats?.orphaned && stats.orphaned.length > 0 && (
                <Button variant="destructive" size="sm" onClick={() => deleteOrphanedMedia(stats.orphaned.map(m => m.id))} disabled={cleaning}>
                  <Trash2 className="h-4 w-4 mr-2" />Delete All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!stats?.orphaned.length ? (
              <p className="text-muted-foreground text-center py-8">No orphaned media found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.orphaned.map((media) => (
                    <TableRow key={media.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {media.type === 'video' ? <FileVideo className="h-3 w-3 mr-1" /> : <Image className="h-3 w-3 mr-1" />}
                          {media.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{media.cdn_url.split('/').pop()}</TableCell>
                      <TableCell>{formatBytes(media.file_size)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => deleteOrphanedMedia([media.id])}>
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
}
