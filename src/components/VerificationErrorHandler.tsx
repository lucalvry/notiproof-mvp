import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink, 
  ChevronDown, 
  ChevronRight,
  Clock,
  Wifi,
  Shield,
  Globe
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VerificationError {
  type: 'dns' | 'meta_tag' | 'widget_ping' | 'network' | 'timeout';
  message: string;
  domain: string;
  details?: string;
  solution?: string;
  retryable: boolean;
  timestamp: Date;
}

interface VerificationErrorHandlerProps {
  errors: VerificationError[];
  onRetry?: (errorType: string) => void;
  onClearErrors?: () => void;
}

export const VerificationErrorHandler = ({ 
  errors, 
  onRetry, 
  onClearErrors 
}: VerificationErrorHandlerProps) => {
  const { toast } = useToast();
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set());

  const toggleErrorExpansion = (index: number) => {
    const newExpanded = new Set(expandedErrors);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedErrors(newExpanded);
  };

  const getErrorIcon = (type: VerificationError['type']) => {
    switch (type) {
      case 'dns':
        return <Globe className="h-4 w-4 text-purple-600" />;
      case 'meta_tag':
        return <Shield className="h-4 w-4 text-blue-600" />;
      case 'widget_ping':
        return <RefreshCw className="h-4 w-4 text-green-600" />;
      case 'network':
        return <Wifi className="h-4 w-4 text-red-600" />;
      case 'timeout':
        return <Clock className="h-4 w-4 text-amber-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
  };

  const getErrorSeverity = (type: VerificationError['type']) => {
    switch (type) {
      case 'network':
      case 'timeout':
        return 'warning';
      case 'dns':
      case 'meta_tag':
      case 'widget_ping':
        return 'error';
      default:
        return 'error';
    }
  };

  const getErrorBadgeVariant = (type: VerificationError['type']) => {
    const severity = getErrorSeverity(type);
    return severity === 'warning' ? 'secondary' : 'destructive';
  };

  const getCommonSolutions = (type: VerificationError['type']) => {
    switch (type) {
      case 'dns':
        return {
          title: 'DNS Record Issues',
          solutions: [
            'Ensure the DNS TXT record is correctly added to your domain',
            'Check that the record name is "_notiproof" without quotes',
            'Wait up to 24 hours for DNS propagation',
            'Verify with your DNS provider that the record is active',
            'Use online DNS lookup tools to confirm the record exists'
          ]
        };
      case 'meta_tag':
        return {
          title: 'Meta Tag Issues',
          solutions: [
            'Add the meta tag to the <head> section of your homepage',
            'Ensure the tag is exactly as provided, including quotes',
            'Clear your website cache and CDN if applicable',
            'Verify the tag appears in the page source (View Source)',
            'Make sure your CMS or platform allows custom meta tags'
          ]
        };
      case 'widget_ping':
        return {
          title: 'Widget Installation Issues',
          solutions: [
            'Ensure the widget script is properly installed on your website',
            'Check that the widget ID matches your actual widget',
            'Verify the script loads without JavaScript errors',
            'Test the widget on a live, publicly accessible page',
            'Make sure your website allows external scripts'
          ]
        };
      case 'network':
        return {
          title: 'Network Connectivity Issues',
          solutions: [
            'Check your internet connection and try again',
            'Verify your website is accessible from external networks',
            'Ensure your website is not behind a firewall blocking verification',
            'Try verification again in a few minutes',
            'Contact support if the issue persists'
          ]
        };
      case 'timeout':
        return {
          title: 'Timeout Issues',
          solutions: [
            'Your website may be responding slowly - try again',
            'Check if your hosting provider is experiencing issues',
            'Verify your website loads quickly in a browser',
            'Try verification during off-peak hours',
            'Consider optimizing your website performance'
          ]
        };
      default:
        return {
          title: 'General Troubleshooting',
          solutions: [
            'Try refreshing the page and attempting verification again',
            'Check that all verification requirements are met',
            'Contact support if the issue continues',
            'Review the verification documentation'
          ]
        };
    }
  };

  const handleRetry = (error: VerificationError, index: number) => {
    if (onRetry) {
      onRetry(error.type);
      toast({
        title: "Retrying verification",
        description: `Attempting to verify ${error.domain} again...`,
      });
    }
  };

  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Verification Errors ({errors.length})
              </CardTitle>
              <CardDescription>
                Some verification attempts failed. Review the errors below and follow the suggested solutions.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onClearErrors}>
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {errors.map((error, index) => (
            <Card key={index} className="border-red-200 bg-red-50/50">
              <CardContent className="p-4">
                <Collapsible>
                  <CollapsibleTrigger 
                    className="w-full"
                    onClick={() => toggleErrorExpansion(index)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getErrorIcon(error.type)}
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{error.domain}</span>
                            <Badge variant={getErrorBadgeVariant(error.type)} className="text-xs">
                              {error.type.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">{error.message}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {error.retryable && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRetry(error, index);
                            }}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Retry
                          </Button>
                        )}
                        {expandedErrors.has(index) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="mt-4">
                    <div className="space-y-4">
                      {error.details && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Error Details:</strong> {error.details}
                          </AlertDescription>
                        </Alert>
                      )}

                      {error.solution && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="font-medium text-blue-900 mb-1">Suggested Solution:</div>
                          <div className="text-sm text-blue-700">{error.solution}</div>
                        </div>
                      )}

                      {/* Common Solutions */}
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="font-medium mb-2">
                          {getCommonSolutions(error.type).title}
                        </div>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                          {getCommonSolutions(error.type).solutions.map((solution, solutionIndex) => (
                            <li key={solutionIndex}>{solution}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Error occurred: {error.timestamp.toLocaleString()}</span>
                        {error.type === 'dns' && (
                          <Button variant="link" size="sm" className="p-0 h-auto">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Check DNS Records Online
                          </Button>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Summary Alert */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Quick Fix:</strong> Most verification issues can be resolved by ensuring your verification method 
          is properly implemented and waiting a few minutes for changes to take effect. 
          DNS changes can take up to 24 hours to propagate globally.
        </AlertDescription>
      </Alert>
    </div>
  );
};