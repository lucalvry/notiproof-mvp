import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Sparkles, X, TrendingUp } from 'lucide-react';
import { useSmartDemoManager } from '@/hooks/useSmartDemoManager';

interface SmartDemoPromptProps {
  onDismiss?: () => void;
}

export const SmartDemoPrompt = ({ onDismiss }: SmartDemoPromptProps) => {
  const { 
    eventStats, 
    shouldShowClearPrompt, 
    handleSmartClear, 
    dismissClearPrompt,
    loading,
    threshold 
  } = useSmartDemoManager();

  if (!shouldShowClearPrompt) return null;

  const handleDismiss = () => {
    dismissClearPrompt();
    onDismiss?.();
  };

  return (
    <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <strong className="text-green-800 dark:text-green-200">
              Great! You now have {eventStats.realEvents} real events
            </strong>
            <Badge variant="outline" className="text-xs border-green-300 text-green-700">
              Threshold: {threshold}+
            </Badge>
          </div>
          <p className="text-sm text-green-700 dark:text-green-300">
            You can now clear your {eventStats.demoEvents} demo events to show only authentic user activity in your analytics.
          </p>
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          <Button
            size="sm"
            onClick={handleSmartClear}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {loading ? 'Clearing...' : 'Clear Demo Data'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="text-green-600 hover:text-green-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};