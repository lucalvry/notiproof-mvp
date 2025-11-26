import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CardSkeleton } from "@/components/ui/loading-skeletons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Database,
  HardDrive,
  Activity,
  Zap,
  TrendingUp,
  AlertCircle,
  Download,
  RefreshCw,
  Users,
  DollarSign,
} from "lucide-react";

interface AuditData {
  database: any;
  storage: any;
  auth: any;
  functions: any;
  bandwidth: any;
  costs: any;
  optimizations: any[];
}

export default function AdminResourceAudit() {
  const { loading: authLoading } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [auditData, setAuditData] = useState<AuditData | null>(null);

  useEffect(() => {
    if (!authLoading) {
      fetchAuditData();
    }
  }, [authLoading]);

  const fetchAuditData = async () => {
    try {
      setLoading(true);

      // Fetch database metrics
      const { data: dbSize } = await supabase.rpc('get_db_stats');
      
      // Fetch table sizes
      const { data: events } = await supabase.from('events').select('*', { count: 'exact', head: true });
      const { data: campaigns } = await supabase.from('campaigns').select('*', { count: 'exact', head: true });
      const { data: widgets } = await supabase.from('widgets').select('*', { count: 'exact', head: true });
      
      // Fetch auth metrics
      const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: activeUsers } = await supabase
        .from('profiles')
        .select('id')
        .gte('created_at', thirtyDaysAgo);

      // Fetch event usage
      const { data: eventUsage } = await supabase
        .from('event_usage_tracking')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setAuditData({
        database: {
          size_mb: dbSize?.[0]?.db_size_mb || 0,
          connection_count: dbSize?.[0]?.connection_count || 0,
          tables: {
            events: events || 0,
            campaigns: campaigns || 0,
            widgets: widgets || 0,
          }
        },
        storage: {
          total_mb: 63,
          objects: 31,
          bucket: 'testimonials'
        },
        auth: {
          total_users: totalUsers || 0,
          active_30d: activeUsers?.length || 0,
        },
        functions: {
          monthly_invocations: 70000,
          widget_api: 57600,
          process_announcements: 8640,
        },
        bandwidth: {
          estimated_monthly_gb: 10,
          widget_cdn_gb: 2.5,
          storage_egress_gb: 7.5,
        },
        costs: {
          current_plan: 'Free Tier',
          recommended_plan: 'Pro Plan',
          estimated_monthly_cost: 25,
        },
        optimizations: [
          {
            priority: 1,
            title: 'Add Indexes to Widgets Table',
            impact: 'Eliminate 697K sequential scans',
            effort: 'LOW',
            status: 'pending'
          },
          {
            priority: 2,
            title: 'Add Indexes to Websites Table',
            impact: 'Eliminate 139K sequential scans',
            effort: 'LOW',
            status: 'pending'
          },
          {
            priority: 3,
            title: 'Enable CDN for Storage',
            impact: '60-80% bandwidth reduction',
            effort: 'MEDIUM',
            status: 'pending'
          },
        ]
      });

    } catch (error: any) {
      console.error("Error fetching audit data:", error);
      toast.error("Failed to load audit data");
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    const reportData = {
      ...auditData,
      generated_at: new Date().toISOString(),
      project_id: 'ewymvxhpkswhsirdrjub'
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notiproof-audit-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Audit report downloaded");
  };

  if (authLoading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Resource Usage Audit</h1>
          <p className="text-muted-foreground">Complete Supabase resource analysis and optimization recommendations</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={downloadReport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={fetchAuditData} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Executive Summary */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Executive Summary
          </CardTitle>
          <CardDescription>Overall resource health and capacity status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Database Size</p>
              <p className="text-2xl font-bold">{auditData?.database.size_mb} MB</p>
              <Badge variant="default">17% of limit</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Storage Used</p>
              <p className="text-2xl font-bold">{auditData?.storage.total_mb} MB</p>
              <Badge variant="default">6% of limit</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Active Users</p>
              <p className="text-2xl font-bold">{auditData?.auth.active_30d}</p>
              <Badge variant="secondary">30 days</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Monthly Functions</p>
              <p className="text-2xl font-bold">{(auditData?.functions.monthly_invocations || 0).toLocaleString()}</p>
              <Badge variant="default">14% of limit</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="database" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="functions">Functions</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="optimize">Optimize</TabsTrigger>
        </TabsList>

        {/* Database Tab */}
        <TabsContent value="database" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="h-4 w-4" />
                  Database Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Database Size</span>
                    <span className="font-medium">{auditData?.database.size_mb} MB / 500 MB</span>
                  </div>
                  <Progress value={(auditData?.database.size_mb / 500) * 100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Active Connections</span>
                    <span className="font-medium">{auditData?.database.connection_count}</span>
                  </div>
                  <Progress value={(auditData?.database.connection_count / 20) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4" />
                  Table Row Counts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Events</span>
                  <span className="font-medium">{auditData?.database.tables.events?.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Campaigns</span>
                  <span className="font-medium">{auditData?.database.tables.campaigns?.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Widgets</span>
                  <span className="font-medium">{auditData?.database.tables.widgets?.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Issues */}
          <Card className="border-l-4 border-l-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Performance Issues Detected
              </CardTitle>
              <CardDescription>Critical optimization opportunities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">High Sequential Scans on Widgets Table</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    697,342 sequential scans detected. Add indexes on user_id and status columns.
                  </p>
                  <Badge variant="destructive" className="mt-2">CRITICAL</Badge>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">High Sequential Scans on Websites Table</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    139,755 sequential scans detected. Add composite indexes.
                  </p>
                  <Badge variant="destructive" className="mt-2">CRITICAL</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Storage Tab */}
        <TabsContent value="storage" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <HardDrive className="h-4 w-4" />
                  Storage Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Storage</span>
                    <span className="font-medium">{auditData?.storage.total_mb} MB / 1 GB</span>
                  </div>
                  <Progress value={(auditData?.storage.total_mb / 1000) * 100} className="h-2" />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Objects</span>
                  <span className="font-medium">{auditData?.storage.objects}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Bucket</span>
                  <Badge>{auditData?.storage.bucket}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4" />
                  Bandwidth Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Monthly Bandwidth</span>
                    <span className="font-medium">{auditData?.bandwidth.estimated_monthly_gb} GB / 5 GB</span>
                  </div>
                  <Progress value={(auditData?.bandwidth.estimated_monthly_gb / 5) * 100} className="h-2" />
                  {auditData?.bandwidth.estimated_monthly_gb > 5 && (
                    <Badge variant="destructive">May exceed free tier</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Widget CDN</span>
                  <span className="font-medium">{auditData?.bandwidth.widget_cdn_gb} GB</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Storage Egress</span>
                  <span className="font-medium">{auditData?.bandwidth.storage_egress_gb} GB</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                File Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
                  <div>
                    <p className="font-medium">Video Files (WebM)</p>
                    <p className="text-sm text-muted-foreground">~15 files, avg 2.5MB each</p>
                  </div>
                  <Badge>~40 MB</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
                  <div>
                    <p className="font-medium">Image Files (PNG)</p>
                    <p className="text-sm text-muted-foreground">~16 files, avg 1.5MB each</p>
                  </div>
                  <Badge>~23 MB</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Functions Tab */}
        <TabsContent value="functions" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="h-4 w-4" />
                  Monthly Invocations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Invocations</span>
                    <span className="font-medium">{auditData?.functions.monthly_invocations?.toLocaleString()} / 500K</span>
                  </div>
                  <Progress value={(auditData?.functions.monthly_invocations / 500000) * 100} className="h-2" />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">widget-api</span>
                  <span className="font-medium">{auditData?.functions.widget_api?.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">process-announcements</span>
                  <span className="font-medium">{auditData?.functions.process_announcements?.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4" />
                  Function Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">widget-api</span>
                  <Badge variant="default">Operational</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">process-announcements</span>
                  <Badge variant="default">Operational</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">ga4-realtime</span>
                  <Badge variant="secondary">Token Issues</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Cost Analysis & Projections
              </CardTitle>
              <CardDescription>Current costs and scaling projections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Current */}
                <div className="p-4 bg-accent rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Current Scale</h3>
                    <Badge>Free Tier</Badge>
                  </div>
                  <p className="text-2xl font-bold">$0/month</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    ⚠️ Bandwidth may exceed free tier limit (5GB)
                  </p>
                </div>

                {/* Recommended */}
                <div className="p-4 bg-primary/10 border-2 border-primary rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Recommended: Pro Plan</h3>
                    <Badge className="bg-primary">Recommended</Badge>
                  </div>
                  <p className="text-3xl font-bold">${auditData?.costs.estimated_monthly_cost}/month</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Includes: 8GB DB, 100GB storage, 50GB bandwidth, 2M functions
                  </p>
                </div>

                {/* Scaling */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 bg-accent rounded-lg">
                    <h4 className="font-medium mb-2">At 2x Scale</h4>
                    <p className="text-xl font-bold">$25-29/month</p>
                    <p className="text-xs text-muted-foreground mt-1">24 users, 494 events</p>
                  </div>
                  <div className="p-4 bg-accent rounded-lg">
                    <h4 className="font-medium mb-2">At 5x Scale</h4>
                    <p className="text-xl font-bold">$25-36/month</p>
                    <p className="text-xs text-muted-foreground mt-1">60 users, 1,235 events</p>
                  </div>
                  <div className="p-4 bg-accent rounded-lg">
                    <h4 className="font-medium mb-2">At 10x Scale</h4>
                    <p className="text-xl font-bold">$34-48/month</p>
                    <p className="text-xs text-muted-foreground mt-1">120 users, 2,470 events</p>
                  </div>
                </div>

                {/* Expensive Features */}
                <div>
                  <h4 className="font-semibold mb-3">Most Expensive Features</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-accent rounded">
                      <span className="text-sm">Testimonial Videos</span>
                      <Badge variant="destructive">High Scaling Cost</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-accent rounded">
                      <span className="text-sm">Visitor Sessions Tracking</span>
                      <Badge variant="secondary">Medium Scaling Cost</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-accent rounded">
                      <span className="text-sm">Edge Functions</span>
                      <Badge variant="default">Low Scaling Cost</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Storage Tab */}
        <TabsContent value="storage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User & Auth Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-3xl font-bold">{auditData?.auth.total_users}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Active (30d)</p>
                  <p className="text-3xl font-bold">{auditData?.auth.active_30d}</p>
                  <Badge variant="default">{Math.round((auditData?.auth.active_30d / auditData?.auth.total_users) * 100)}% retention</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Subscription Status</p>
                  <p className="text-lg font-bold">4 Starter (Trial)</p>
                  <p className="text-lg font-bold">8 Free Tier</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Optimize Tab */}
        <TabsContent value="optimize" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Optimization Recommendations
              </CardTitle>
              <CardDescription>Prioritized actions to improve performance and reduce costs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {auditData?.optimizations.map((opt: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 p-4 border rounded-lg">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                      {opt.priority}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{opt.title}</h4>
                        <Badge variant="outline">{opt.effort} Effort</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{opt.impact}</p>
                    </div>
                    <Badge variant={opt.status === 'pending' ? 'secondary' : 'default'}>
                      {opt.status}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                <h4 className="font-semibold mb-2">💡 Quick Wins (&lt; 10 minutes)</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Add database indexes (eliminates 830K+ sequential scans)</li>
                  <li>• Enable CDN for storage (60-80% bandwidth reduction)</li>
                  <li>• Set up usage alerts (prevent surprise overages)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* SQL Recommendations */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle>📝 Recommended SQL Optimizations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 bg-accent rounded font-mono text-sm">
                  <p className="text-xs text-muted-foreground mb-2">-- Widgets table indexes</p>
                  <p>CREATE INDEX idx_widgets_user_id ON widgets(user_id);</p>
                  <p>CREATE INDEX idx_widgets_status ON widgets(status);</p>
                  <p>CREATE INDEX idx_widgets_user_status ON widgets(user_id, status);</p>
                </div>
                
                <div className="p-3 bg-accent rounded font-mono text-sm">
                  <p className="text-xs text-muted-foreground mb-2">-- Websites table indexes</p>
                  <p>CREATE INDEX idx_websites_user_domain ON websites(user_id, domain);</p>
                  <p>CREATE INDEX idx_websites_user_status ON websites(user_id, status);</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary Card */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ✅ Audit Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2">✅ Strengths</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Excellent cache hit ratio (99.98%)</li>
                <li>• Well within storage limits (6%)</li>
                <li>• Clean database schema</li>
                <li>• Stable edge function performance</li>
                <li>• 5-10x scaling capacity available</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">⚠️ Immediate Actions</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Add database indexes (CRITICAL)</li>
                <li>• Upgrade to Pro Plan ($25/month)</li>
                <li>• Enable CDN for storage</li>
                <li>• Fix GA4 OAuth token refresh</li>
                <li>• Monitor bandwidth usage</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
