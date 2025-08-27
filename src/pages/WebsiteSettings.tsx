import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Globe, Shield, AlertTriangle, Settings, Users, Activity } from 'lucide-react';
import { useWebsites } from '@/hooks/useWebsites';
import { WebsiteList } from '@/components/WebsiteList';
import { WebsiteVerificationMethods } from '@/components/WebsiteVerificationMethods';
import { BulkVerificationManager } from '@/components/BulkVerificationManager';
import { WebsiteAnalyticsFilter } from '@/components/WebsiteAnalyticsFilter';

export const WebsiteSettings = () => {
  const { websites, selectedWebsite, loading } = useWebsites();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedVerificationWebsite, setSelectedVerificationWebsite] = useState<any>(null);

  const getWebsiteStats = () => {
    const total = websites.length;
    const verified = websites.filter(w => w.is_verified).length;
    const unverified = total - verified;
    const verificationRate = total > 0 ? ((verified / total) * 100).toFixed(1) : '0';
    
    return { total, verified, unverified, verificationRate };
  };

  const stats = getWebsiteStats();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-64 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-8 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Website Settings</h1>
          <p className="text-muted-foreground">
            Manage your websites, verification status, and security settings
          </p>
        </div>
        <Badge 
          variant={stats.verificationRate === '100' ? "default" : "secondary"}
          className="text-sm"
        >
          {stats.verificationRate}% Verified
        </Badge>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Websites</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Globe className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Verified</p>
                <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
              </div>
              <Shield className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unverified</p>
                <p className="text-2xl font-bold text-amber-600">{stats.unverified}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Verification Rate</p>
                <p className="text-2xl font-bold">{stats.verificationRate}%</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert for Unverified Websites */}
      {stats.unverified > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have {stats.unverified} unverified website{stats.unverified !== 1 ? 's' : ''}. 
            Verify your websites to ensure enhanced security and performance for your widgets.
            <Button 
              variant="link" 
              className="p-0 ml-2 h-auto"
              onClick={() => setActiveTab('verification')}
            >
              Verify now →
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="verification" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Verification
          </TabsTrigger>
          <TabsTrigger value="management" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Management
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Website Overview</CardTitle>
              <CardDescription>
                Quick overview of all your registered websites and their verification status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WebsiteList />
            </CardContent>
          </Card>

          {selectedWebsite && !selectedWebsite.is_verified && (
            <Card>
              <CardHeader>
                <CardTitle>Quick Verification</CardTitle>
                <CardDescription>
                  Verify your selected website: {selectedWebsite.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => {
                    setSelectedVerificationWebsite(selectedWebsite);
                    setActiveTab('verification');
                  }}
                  className="w-full"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Verify {selectedWebsite.name}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="verification" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Verification</CardTitle>
              <CardDescription>
                Verify multiple websites at once using automated verification methods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BulkVerificationManager />
            </CardContent>
          </Card>

          <Separator />

          {/* Individual Website Verification */}
          <Card>
            <CardHeader>
              <CardTitle>Individual Website Verification</CardTitle>
              <CardDescription>
                Choose a specific website to verify using detailed verification methods
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Website Selector */}
              <div className="grid gap-3">
                {websites.filter(w => !w.is_verified).map((website) => (
                  <div 
                    key={website.id} 
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedVerificationWebsite?.id === website.id 
                        ? 'ring-2 ring-primary border-primary bg-primary/5' 
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedVerificationWebsite(website)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{website.name}</div>
                        <div className="text-sm text-muted-foreground">{website.domain}</div>
                      </div>
                      <Badge variant="secondary">Unverified</Badge>
                    </div>
                  </div>
                ))}
                
                {websites.filter(w => !w.is_verified).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    All your websites are verified! 🎉
                  </div>
                )}
              </div>

              {/* Verification Methods */}
              {selectedVerificationWebsite && (
                <div className="mt-6">
                  <Separator />
                  <div className="mt-6">
                    <WebsiteVerificationMethods 
                      website={selectedVerificationWebsite}
                      onVerificationSuccess={() => {
                        setSelectedVerificationWebsite(null);
                        // Refresh will happen automatically via hook
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="management" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Website Management</CardTitle>
              <CardDescription>
                Add, edit, and manage all your websites in one place
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WebsiteList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Website Analytics Filter</CardTitle>
              <CardDescription>
                Use this filter component in your analytics dashboards to filter data by website
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WebsiteAnalyticsFilter
                selectedWebsiteId={null}
                onWebsiteChange={(websiteId) => {
                  console.log('Selected website for analytics:', websiteId);
                }}
                showVerificationStatus={true}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Analytics Integration</CardTitle>
              <CardDescription>
                How website verification enhances your analytics data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-green-900">Verified Websites</div>
                    <div className="text-sm text-green-700">
                      Provide filtered, high-quality analytics data with enhanced security and performance tracking.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-amber-900">Unverified Websites</div>
                    <div className="text-sm text-amber-700">
                      May include unfiltered data from unauthorized sources, potentially affecting analytics accuracy.
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-medium mb-2">Benefits of Website Verification:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Enhanced data accuracy and reliability</li>
                  <li>• Improved security and spam protection</li>
                  <li>• Better performance monitoring capabilities</li>
                  <li>• Domain-specific analytics filtering</li>
                  <li>• Reduced false positives in event tracking</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};