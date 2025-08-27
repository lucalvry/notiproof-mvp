import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { WebsiteVerificationMethods } from './WebsiteVerificationMethods';
import { VerificationErrorHandler } from './VerificationErrorHandler';
import { useUserWidgets } from '@/hooks/useUserWidgets';
import type { Website } from '@/hooks/useWebsites';

interface WebsiteVerificationStatusProps {
  website: Website;
  onVerificationChange?: () => void;
}

export const WebsiteVerificationStatus = ({ website, onVerificationChange }: WebsiteVerificationStatusProps) => {
  const { toast } = useToast();
  const { widgets } = useUserWidgets(website.id);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [verificationErrors, setVerificationErrors] = useState<any[]>([]);

  const getVerificationStatus = () => {
    if (website.is_verified) {
      return {
        status: 'verified' as const,
        icon: CheckCircle,
        variant: 'default' as const,
        color: 'text-green-600',
        label: 'Verified'
      };
    }
    
    return {
      status: 'unverified' as const,
      icon: XCircle,
      variant: 'secondary' as const,
      color: 'text-red-600',
      label: 'Unverified'
    };
  };

  const manualVerification = async () => {
    setIsVerifying(true);
    try {
      // For now, we'll just mark as verified since this is manual verification
      const { error } = await supabase
        .from('websites')
        .update({ 
          is_verified: true, 
          last_verification_at: new Date().toISOString(),
          verification_attempts: (website.verification_attempts || 0) + 1
        })
        .eq('id', website.id);

      if (error) throw error;

      toast({
        title: "Verification successful",
        description: "Your website has been manually verified.",
      });

      onVerificationChange?.();
    } catch (error) {
      console.error('Manual verification error:', error);
      
      const verificationError = {
        type: 'manual' as const,
        message: 'Manual verification failed',
        domain: website.domain,
        details: error instanceof Error ? error.message : 'Unknown error occurred',
        retryable: true,
        timestamp: new Date()
      };
      
      setVerificationErrors(prev => [...prev, verificationError]);
      
      toast({
        title: "Verification failed",
        description: "Failed to verify website. Check error details below.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };


  const verification = getVerificationStatus();
  const StatusIcon = verification.icon;

  return (
    <div className="flex items-center gap-2">
      <Badge variant={verification.variant} className="flex items-center gap-1">
        <StatusIcon className={`h-3 w-3 ${verification.color}`} />
        {verification.label}
      </Badge>
      
      {!website.is_verified && (
        <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Verify
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Verify Website: {website.name}</DialogTitle>
              <DialogDescription>
                Verify that you own this website by installing a widget or using manual verification.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Error Handler */}
              {verificationErrors.length > 0 && (
                <VerificationErrorHandler
                  errors={verificationErrors}
                  onRetry={(errorType) => {
                    if (errorType === 'manual') {
                      manualVerification();
                    }
                  }}
                  onClearErrors={() => setVerificationErrors([])}
                />
              )}

              {/* Enhanced Verification Methods */}
              <WebsiteVerificationMethods 
                website={website}
                userWidgets={widgets}
                onVerificationSuccess={() => {
                  setShowInstructions(false);
                  setVerificationErrors([]);
                  onVerificationChange?.();
                }}
              />

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-blue-600" />
                    Manual Verification
                  </CardTitle>
                  <CardDescription>
                    If you can't install the widget code right now, you can manually verify your website.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline" 
                    onClick={manualVerification}
                    disabled={isVerifying}
                    className="w-full"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify Manually'
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {website.is_verified && website.last_verification_at && (
        <span className="text-xs text-muted-foreground">
          Last verified: {new Date(website.last_verification_at).toLocaleDateString()}
        </span>
      )}
    </div>
  );
};