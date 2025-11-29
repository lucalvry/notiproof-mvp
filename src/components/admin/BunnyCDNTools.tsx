import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import {
  Cloud,
  Database,
  Upload,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileVideo,
  Image,
  Code,
} from "lucide-react";

interface MigrationResult {
  success: boolean;
  total_testimonials: number;
  migrated: number;
  failed: number;
  skipped: number;
  errors: Array<{ testimonial_id: string; field: string; error: string }>;
  details: Array<{ testimonial_id: string; field: string; old_url: string; new_url: string }>;
  dryRun?: boolean;
  message?: string;
  error?: string;
}

interface DeployResult {
  success: boolean;
  url?: string;
  error?: string;
  details?: {
    file_size: number;
    upload_time_ms: number;
    cdn_url: string;
  };
}

interface MediaStats {
  totalFiles: number;
  totalSize: number;
  byType: Record<string, { count: number; size: number }>;
}

export function BunnyCDNTools() {
  const [migrating, setMigrating] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null);
  const [mediaStats, setMediaStats] = useState<MediaStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const runMigration = async (dryRun: boolean = true) => {
    setMigrating(true);
    setMigrationResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('migrate-to-bunny', {
        body: JSON.stringify({ dryRun }),
      });

      if (error) throw error;

      setMigrationResult(data);
      
      if (data.success) {
        if (dryRun) {
          toast.info(`Dry run complete: ${data.total_testimonials} files found, ${data.migrated} would be migrated`);
        } else {
          toast.success(`Migration complete: ${data.migrated} files migrated`);
        }
      } else {
        toast.error(data.error || 'Migration failed');
      }
    } catch (error: any) {
      console.error('Migration error:', error);
      toast.error(error.message || 'Migration failed');
      setMigrationResult({ 
        success: false, 
        error: error.message,
        total_testimonials: 0,
        migrated: 0,
        failed: 0,
        skipped: 0,
        errors: [],
        details: [],
      });
    } finally {
      setMigrating(false);
    }
  };

  const deployWidget = async () => {
    setDeploying(true);
    setDeployResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('deploy-widget-to-bunny');

      if (error) throw error;

      setDeployResult(data);
      
      if (data.success) {
        toast.success(`Widget deployed to Bunny CDN: ${data.url}`);
      } else {
        toast.error(data.error || 'Widget deployment failed');
      }
    } catch (error: any) {
      console.error('Deploy error:', error);
      toast.error(error.message || 'Widget deployment failed');
      setDeployResult({ success: false, error: error.message });
    } finally {
      setDeploying(false);
    }
  };

  const fetchMediaStats = async () => {
    setLoadingStats(true);
    try {
      // Get media table stats
      const { data: mediaData, error: mediaError } = await supabase
        .from('media')
        .select('type, file_size');

      if (mediaError) throw mediaError;

      // Calculate stats
      const stats: MediaStats = {
        totalFiles: mediaData?.length || 0,
        totalSize: 0,
        byType: {},
      };

      mediaData?.forEach((item) => {
        stats.totalSize += item.file_size || 0;
        
        if (!stats.byType[item.type]) {
          stats.byType[item.type] = { count: 0, size: 0 };
        }
        stats.byType[item.type].count++;
        stats.byType[item.type].size += item.file_size || 0;
      });

      setMediaStats(stats);

      // Check for remaining Supabase URLs
      const { data: testimonials } = await supabase
        .from('testimonials')
        .select('id, author_avatar_url, video_url')
        .or('author_avatar_url.like.%supabase.co/storage%,video_url.like.%supabase.co/storage%');

      if (testimonials && testimonials.length > 0) {
        toast.warning(`${testimonials.length} testimonials still have Supabase Storage URLs`);
      } else {
        toast.success('All testimonials using Bunny CDN URLs');
      }
    } catch (error: any) {
      console.error('Stats error:', error);
      toast.error('Failed to fetch media stats');
    } finally {
      setLoadingStats(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Migration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Media Migration
          </CardTitle>
          <CardDescription>
            Migrate existing testimonial media from Supabase Storage to Bunny CDN
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={() => runMigration(true)}
              disabled={migrating}
              variant="outline"
            >
              {migrating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <AlertCircle className="h-4 w-4 mr-2" />
              )}
              Dry Run (Preview)
            </Button>
            <Button
              onClick={() => runMigration(false)}
              disabled={migrating}
              variant="default"
            >
              {migrating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Execute Migration
            </Button>
          </div>

          {migrationResult && (
            <div className="mt-4 p-4 rounded-lg border bg-muted/50">
              <div className="flex items-center gap-2 mb-3">
                {migrationResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <span className="font-medium">
                  {migrationResult.dryRun ? 'Dry Run Complete' : 'Migration Complete'}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Files</p>
                  <p className="text-lg font-semibold">{migrationResult.total_testimonials}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Migrated</p>
                  <p className="text-lg font-semibold text-green-600">{migrationResult.migrated}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Failed</p>
                  <p className="text-lg font-semibold text-destructive">{migrationResult.failed}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Skipped</p>
                  <p className="text-lg font-semibold text-muted-foreground">{migrationResult.skipped}</p>
                </div>
              </div>

              {migrationResult.details && migrationResult.details.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Migration Details:</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {migrationResult.details.map((d, i) => (
                      <div key={i} className="text-xs bg-background p-2 rounded flex items-center gap-2">
                        {d.field === 'video_url' ? (
                          <FileVideo className="h-3 w-3" />
                        ) : (
                          <Image className="h-3 w-3" />
                        )}
                        <span className="truncate flex-1">{d.new_url}</span>
                        <Badge variant="outline" className="text-xs">
                          {d.field}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {migrationResult.errors && migrationResult.errors.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-destructive mb-2">Errors:</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {migrationResult.errors.map((e, i) => (
                      <div key={i} className="text-xs bg-destructive/10 p-2 rounded">
                        {e.field}: {e.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Widget Deployment Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Widget Deployment
          </CardTitle>
          <CardDescription>
            Deploy widget.js to Bunny CDN for faster global delivery
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={deployWidget}
            disabled={deploying}
          >
            {deploying ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Cloud className="h-4 w-4 mr-2" />
            )}
            Deploy Widget to Bunny CDN
          </Button>

          {deployResult && (
            <div className="mt-4 p-4 rounded-lg border bg-muted/50">
              <div className="flex items-center gap-2 mb-3">
                {deployResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <span className="font-medium">
                  {deployResult.success ? 'Deployment Successful' : 'Deployment Failed'}
                </span>
              </div>

              {deployResult.success && deployResult.details && (
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">CDN URL:</span>{' '}
                    <code className="bg-background px-1 rounded text-xs">{deployResult.url}</code>
                  </p>
                  <p>
                    <span className="text-muted-foreground">File Size:</span>{' '}
                    {formatBytes(deployResult.details.file_size)}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Upload Time:</span>{' '}
                    {deployResult.details.upload_time_ms}ms
                  </p>
                </div>
              )}

              {!deployResult.success && deployResult.error && (
                <p className="text-sm text-destructive">{deployResult.error}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Media Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Media Statistics
          </CardTitle>
          <CardDescription>
            View uploaded media statistics and verify CDN migration status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={fetchMediaStats}
            disabled={loadingStats}
            variant="outline"
          >
            {loadingStats ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh Stats
          </Button>

          {mediaStats && (
            <div className="mt-4 p-4 rounded-lg border bg-muted/50">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Files</p>
                  <p className="text-2xl font-bold">{mediaStats.totalFiles}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Size</p>
                  <p className="text-2xl font-bold">{formatBytes(mediaStats.totalSize)}</p>
                </div>
              </div>

              {Object.keys(mediaStats.byType).length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">By Type:</p>
                  {Object.entries(mediaStats.byType).map(([type, stats]) => (
                    <div key={type} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {type === 'video' ? (
                          <FileVideo className="h-4 w-4" />
                        ) : (
                          <Image className="h-4 w-4" />
                        )}
                        <span className="capitalize">{type}</span>
                      </div>
                      <div className="text-muted-foreground">
                        {stats.count} files ({formatBytes(stats.size)})
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
