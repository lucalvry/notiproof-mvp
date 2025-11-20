import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, AlertTriangle, CheckCircle2, PlayCircle, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function DataMigration() {
  const [loading, setLoading] = useState(false);
  const [campaignResult, setCampaignResult] = useState<any>(null);
  const [eventResult, setEventResult] = useState<any>(null);
  const [eventProgress, setEventProgress] = useState(0);

  async function runCampaignMigration(dryRun: boolean) {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/migrate-campaigns`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ dryRun }),
        }
      );

      const result = await response.json();
      setCampaignResult(result);

      if (result.success) {
        toast.success(dryRun ? 'Dry run complete' : 'Campaigns migrated successfully');
      }
    } catch (error) {
      console.error('Migration error:', error);
      toast.error('Migration failed');
    } finally {
      setLoading(false);
    }
  }

  async function runEventMigration(dryRun: boolean) {
    setLoading(true);
    setEventProgress(0);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Get total count
      const { count } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .or('canonical_event.is.null,canonical_event.eq.{}');

      const totalEvents = count || 0;
      const batchSize = 100;
      let offset = 0;
      let allResults: any = {
        success: true,
        migrated: 0,
        skipped: 0,
        errors: [],
      };

      while (offset < totalEvents) {
        const response = await fetch(
          `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/migrate-events-canonical`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session?.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ dryRun, batchSize, offset }),
          }
        );

        const result = await response.json();
        
        allResults.migrated += result.migrated;
        allResults.skipped += result.skipped;
        allResults.errors.push(...result.errors);

        offset += batchSize;
        setEventProgress((offset / totalEvents) * 100);

        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setEventResult(allResults);
      setEventProgress(100);

      if (allResults.success) {
        toast.success(dryRun ? 'Dry run complete' : `Migrated ${allResults.migrated} events`);
      }
    } catch (error) {
      console.error('Migration error:', error);
      toast.error('Migration failed');
    } finally {
      setLoading(false);
    }
  }

  function downloadReport(data: any, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Data Migration</h1>
        <p className="text-muted-foreground">
          Phase 11: Migrate legacy data to canonical schema
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Always run a <strong>dry run</strong> first to review what changes will be made. 
          Download the report to manually review ambiguous data before applying changes.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">Campaign Migration</TabsTrigger>
          <TabsTrigger value="events">Event Migration</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Campaign Data Sources Migration
              </CardTitle>
              <CardDescription>
                Migrate campaigns from legacy schema to unified data_sources array (already completed in database)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  onClick={() => runCampaignMigration(true)}
                  disabled={loading}
                  variant="outline"
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Dry Run
                </Button>
                <Button
                  onClick={() => runCampaignMigration(false)}
                  disabled={loading || !campaignResult?.dryRun}
                  variant="default"
                >
                  Apply Changes
                </Button>
              </div>

              {campaignResult && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">
                          {campaignResult.migrated}
                        </div>
                        <div className="text-sm text-muted-foreground">Migrated</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-yellow-600">
                          {campaignResult.ambiguous?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Needs Review</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-red-600">
                          {campaignResult.errors?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Errors</div>
                      </CardContent>
                    </Card>
                  </div>

                  {campaignResult.ambiguous?.length > 0 && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="font-semibold mb-2">Manual Review Required</div>
                        {campaignResult.ambiguous.map((item: any, idx: number) => (
                          <div key={idx} className="text-sm mb-2">
                            Campaign {item.campaign_id}: {item.reason}
                          </div>
                        ))}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => downloadReport(campaignResult, 'campaign-migration-report.json')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Event Canonical Format Migration
              </CardTitle>
              <CardDescription>
                Add `canonical_event` field to all events for unified template rendering
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  onClick={() => runEventMigration(true)}
                  disabled={loading}
                  variant="outline"
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Dry Run
                </Button>
                <Button
                  onClick={() => runEventMigration(false)}
                  disabled={loading || !eventResult?.dryRun}
                  variant="default"
                >
                  Apply Changes
                </Button>
              </div>

              {loading && eventProgress > 0 && (
                <div className="space-y-2">
                  <Progress value={eventProgress} />
                  <div className="text-sm text-muted-foreground text-center">
                    {Math.round(eventProgress)}% complete
                  </div>
                </div>
              )}

              {eventResult && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">
                          {eventResult.migrated}
                        </div>
                        <div className="text-sm text-muted-foreground">Migrated</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-gray-600">
                          {eventResult.skipped}
                        </div>
                        <div className="text-sm text-muted-foreground">Skipped</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-red-600">
                          {eventResult.errors?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Errors</div>
                      </CardContent>
                    </Card>
                  </div>

                  {eventResult.errors?.length > 0 && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="font-semibold mb-2">Errors Occurred</div>
                        <div className="text-sm">
                          {eventResult.errors.slice(0, 5).map((err: any, idx: number) => (
                            <div key={idx}>Event {err.event_id}: {err.error}</div>
                          ))}
                          {eventResult.errors.length > 5 && (
                            <div className="mt-2">...and {eventResult.errors.length - 5} more</div>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => downloadReport(eventResult, 'event-migration-report.json')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Migration Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span>Run campaign migration dry run</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span>Download and review ambiguous campaigns</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span>Apply campaign migration</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span>Run event migration dry run</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span>Apply event migration in batches</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span>Verify migrated data in production</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
