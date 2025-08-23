import { useState } from 'react';
import { useUserQuickWins } from '@/hooks/useUserQuickWins';
import { EnhancedQuickWinTemplateSelector } from './EnhancedQuickWinTemplateSelector';
import { EventSourceIndicator } from './EventSourceIndicator';
import { QuickWinService } from '@/services/quickWinService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus, Trash2, Calendar, TrendingUp, Target, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface QuickWinManagerProps {
  widgetId: string;
  businessType: string;
}

export const QuickWinManager = ({ widgetId, businessType }: QuickWinManagerProps) => {
  const { quickWins, loading, addQuickWin, toggleQuickWin, removeQuickWin } = useUserQuickWins(widgetId);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [graduationStatus, setGraduationStatus] = useState<any>(null);
  const [checkingGraduation, setCheckingGraduation] = useState(false);
  const { toast } = useToast();

  const handleAddQuickWin = async (formData: any) => {
    try {
      await addQuickWin(formData.templateId, formData.fieldValues, formData.expiresAt);
      
      // Generate events for the new quick-win
      await QuickWinService.createQuickWinEventsForWidget(widgetId);
      
      toast({
        title: 'Quick-Win Added',
        description: 'Your enhanced quick-win is now active and generating events.',
      });
    } catch (error) {
      console.error('Error adding quick-win:', error);
    }
  };

  const checkGraduation = async () => {
    setCheckingGraduation(true);
    try {
      const status = await QuickWinService.checkGraduationReadiness(widgetId);
      setGraduationStatus(status);
    } catch (error) {
      console.error('Error checking graduation:', error);
      toast({
        title: 'Error',
        description: 'Failed to check graduation status',
        variant: 'destructive',
      });
    } finally {
      setCheckingGraduation(false);
    }
  };

  const formatExpiryDate = (dateString?: string) => {
    if (!dateString) return 'No expiry';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (isEnabled: boolean, expiresAt?: string) => {
    if (!isEnabled) return 'secondary';
    if (expiresAt && new Date(expiresAt) < new Date()) return 'destructive';
    return 'default';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading quick-wins...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Quick-Win Events
          </h3>
          <p className="text-sm text-muted-foreground">
            Engage visitors while building natural proof events
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={checkGraduation}
            disabled={checkingGraduation}
          >
            <TrendingUp className="w-4 h-4 mr-1" />
            {checkingGraduation ? 'Checking...' : 'Check Progress'}
          </Button>
          <Button
            size="sm"
            onClick={() => setShowTemplateSelector(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Quick-Win
          </Button>
        </div>
      </div>

      {/* Graduation Status */}
      {graduationStatus && (
        <Alert>
          <Target className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Progress to Natural Events:</p>
              <div className="flex gap-4 text-sm">
                <span>Natural: <strong>{graduationStatus.naturalEvents}</strong></span>
                <span>Quick-Win: <strong>{graduationStatus.quickWinEvents}</strong></span>
              </div>
              <p>{graduationStatus.recommendation}</p>
              {graduationStatus.ready && (
                <Badge variant="secondary" className="mt-2">
                  Ready to reduce quick-wins! 🎉
                </Badge>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Quick-Win List */}
      <div className="space-y-4">
        {quickWins.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Zap className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No Quick-Win Events</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                Add quick-win events to engage visitors while your integrations generate natural proof events.
              </p>
              <Button onClick={() => setShowTemplateSelector(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add Your First Quick-Win
              </Button>
            </CardContent>
          </Card>
        ) : (
          quickWins.map((quickWin) => (
            <Card key={quickWin.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {quickWin.template?.name || 'Unknown Template'}
                    <EventSourceIndicator source="quick_win" />
                  </CardTitle>
                  <CardDescription>
                    Category: {quickWin.template?.category || 'Unknown'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={quickWin.is_enabled}
                    onCheckedChange={(enabled) => toggleQuickWin(quickWin.id, enabled)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuickWin(quickWin.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="font-mono text-sm bg-muted p-3 rounded">
                    {QuickWinService.processTemplate(
                      quickWin.template?.template_message || '', 
                      quickWin.custom_metadata
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 items-center text-sm">
                    <Badge variant="outline">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatExpiryDate(quickWin.expires_at)}
                    </Badge>
                    <Badge variant={getStatusColor(quickWin.is_enabled, quickWin.expires_at)}>
                      {!quickWin.is_enabled 
                        ? 'Disabled' 
                        : quickWin.expires_at && new Date(quickWin.expires_at) < new Date()
                          ? 'Expired'
                          : 'Active'
                      }
                    </Badge>
                  </div>

                  {Object.keys(quickWin.custom_metadata).length > 0 && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">
                        Custom Configuration
                      </summary>
                      <div className="mt-2 bg-muted p-2 rounded font-mono">
                        {JSON.stringify(quickWin.custom_metadata, null, 2)}
                      </div>
                    </details>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Quick-Win Strategy:</strong> These events help build trust and encourage 
          visitor interaction while you set up integrations for natural proof events. 
          As natural events increase, you can gradually reduce quick-wins.
        </AlertDescription>
      </Alert>

      {/* Enhanced Template Selector Dialog */}
      <EnhancedQuickWinTemplateSelector
        businessType={businessType}
        onSelectTemplate={handleAddQuickWin}
        open={showTemplateSelector}
        onOpenChange={setShowTemplateSelector}
      />
    </div>
  );
};