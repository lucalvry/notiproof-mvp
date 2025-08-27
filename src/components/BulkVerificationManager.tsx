import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, RefreshCw, Globe, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useWebsites } from '@/hooks/useWebsites';

interface VerificationResult {
  websiteId: string;
  domain: string;
  success: boolean;
  method: string;
  error?: string;
}

export const BulkVerificationManager = () => {
  const { websites, refetch } = useWebsites();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [verificationResults, setVerificationResults] = useState<VerificationResult[]>([]);

  const unverifiedWebsites = websites.filter(w => !w.is_verified);

  const verifyWebsite = async (website: any): Promise<VerificationResult> => {
    try {
      // Try widget-based verification first
      const { data: widgetData, error: widgetError } = await supabase
        .from('widgets')
        .select('id')
        .eq('website_id', website.id)
        .eq('status', 'active')
        .limit(1);

      if (!widgetError && widgetData && widgetData.length > 0) {
        // Simulate widget ping verification
        const { data, error } = await supabase.functions.invoke('widget-api', {
          body: {
            action: 'verify_widget_ping',
            website_id: website.id,
            widget_id: widgetData[0].id,
            domain: website.domain
          }
        });

        if (!error && data?.verified) {
          return {
            websiteId: website.id,
            domain: website.domain,
            success: true,
            method: 'Widget Ping'
          };
        }
      }

      // Try meta tag verification
      const { data: metaData, error: metaError } = await supabase.functions.invoke('widget-api', {
        body: {
          action: 'verify_meta_tag',
          website_id: website.id,
          domain: website.domain
        }
      });

      if (!metaError && metaData?.verified) {
        return {
          websiteId: website.id,
          domain: website.domain,
          success: true,
          method: 'Meta Tag'
        };
      }

      // Try DNS verification
      const { data: dnsData, error: dnsError } = await supabase.functions.invoke('widget-api', {
        body: {
          action: 'verify_dns',
          website_id: website.id,
          domain: website.domain
        }
      });

      if (!dnsError && dnsData?.verified) {
        return {
          websiteId: website.id,
          domain: website.domain,
          success: true,
          method: 'DNS Record'
        };
      }

      return {
        websiteId: website.id,
        domain: website.domain,
        success: false,
        method: 'All Methods Failed',
        error: 'No verification method succeeded'
      };

    } catch (error) {
      return {
        websiteId: website.id,
        domain: website.domain,
        success: false,
        method: 'Error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const runBulkVerification = async () => {
    if (unverifiedWebsites.length === 0) {
      toast({
        title: "No websites to verify",
        description: "All your websites are already verified.",
      });
      return;
    }

    setIsVerifying(true);
    setVerificationProgress(0);
    setVerificationResults([]);

    const results: VerificationResult[] = [];
    
    for (let i = 0; i < unverifiedWebsites.length; i++) {
      const website = unverifiedWebsites[i];
      
      try {
        const result = await verifyWebsite(website);
        results.push(result);
        
        // Update progress
        const progress = ((i + 1) / unverifiedWebsites.length) * 100;
        setVerificationProgress(progress);
        setVerificationResults([...results]);

        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`Error verifying ${website.domain}:`, error);
        results.push({
          websiteId: website.id,
          domain: website.domain,
          success: false,
          method: 'Error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    setVerificationResults(results);
    setIsVerifying(false);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    toast({
      title: "Bulk verification completed",
      description: `${successCount} websites verified successfully, ${failCount} failed.`,
      variant: successCount > 0 ? "default" : "destructive",
    });

    // Refresh website data
    await refetch();
  };

  const getResultIcon = (result: VerificationResult) => {
    if (result.success) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getResultBadge = (result: VerificationResult) => {
    if (result.success) {
      return (
        <Badge variant="default" className="text-green-600">
          ✓ Verified
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive">
          ✗ Failed
        </Badge>
      );
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Bulk Website Verification
          </CardTitle>
          <CardDescription>
            Verify multiple websites at once using available verification methods
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <div className="font-medium">Websites Status</div>
              <div className="text-sm text-muted-foreground">
                {websites.length - unverifiedWebsites.length} verified, {unverifiedWebsites.length} pending
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                {websites.length - unverifiedWebsites.length} Verified
              </Badge>
              {unverifiedWebsites.length > 0 && (
                <Badge variant="outline" className="text-amber-600">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {unverifiedWebsites.length} Pending
                </Badge>
              )}
            </div>
          </div>

          {unverifiedWebsites.length > 0 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Unverified Websites</h4>
                <div className="text-sm text-muted-foreground mb-2">
                  The following websites will be checked using widget ping, meta tag, and DNS verification methods:
                </div>
                <div className="grid gap-2">
                  {unverifiedWebsites.map((website) => (
                    <div key={website.id} className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 rounded">
                      <div>
                        <div className="font-medium text-sm">{website.name}</div>
                        <div className="text-xs text-muted-foreground">{website.domain}</div>
                      </div>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                onClick={runBulkVerification} 
                disabled={isVerifying}
                className="w-full"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Verifying... ({Math.round(verificationProgress)}%)
                  </>
                ) : (
                  `Verify ${unverifiedWebsites.length} Website${unverifiedWebsites.length !== 1 ? 's' : ''}`
                )}
              </Button>

              {isVerifying && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progress</span>
                    <span>{Math.round(verificationProgress)}%</span>
                  </div>
                  <Progress value={verificationProgress} className="w-full" />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Results */}
      {verificationResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Verification Results</CardTitle>
            <CardDescription>
              Results from the latest bulk verification run
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Website</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {verificationResults.map((result) => (
                  <TableRow key={result.websiteId}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getResultIcon(result)}
                        <span>{websites.find(w => w.id === result.websiteId)?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{result.domain}</TableCell>
                    <TableCell>{getResultBadge(result)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {result.method}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {result.error && (
                        <span className="text-xs text-red-600">{result.error}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};