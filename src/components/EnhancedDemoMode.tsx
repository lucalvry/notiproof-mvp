import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Eye, RotateCcw, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDemoEvents } from '@/hooks/useDemoEvents';
import { useToast } from '@/hooks/use-toast';
import { useSmartDemoManager } from '@/hooks/useSmartDemoManager';
import { SmartDemoPrompt } from './SmartDemoPrompt';

interface DemoModeProps {
  widgetId?: string;
  showFullDemo?: boolean;
}

export const EnhancedDemoMode = ({ widgetId, showFullDemo = false }: DemoModeProps) => {
  const { profile } = useAuth();
  const { generateDemoEvents, loading } = useDemoEvents();
  const { toast } = useToast();
  const { eventStats, refreshStats } = useSmartDemoManager();
  const [demoStats, setDemoStats] = useState({
    totalEvents: 0,
    realEvents: 0,
    demoEvents: 0,
    lastGenerated: null as string | null
  });

  useEffect(() => {
    // Sync with smart demo manager stats
    setDemoStats({
      totalEvents: eventStats.totalEvents,
      realEvents: eventStats.realEvents,
      demoEvents: eventStats.demoEvents,
      lastGenerated: null
    });
  }, [eventStats]);

  const handleGenerateDemoEvents = async () => {
    if (!profile) return;

    const success = await generateDemoEvents(profile.id, profile.business_type || 'saas');
    if (success) {
      // Refresh stats
      setTimeout(() => {
        refreshStats();
      }, 1000);
    }
  };

  const getDemoRecommendation = () => {
    if (demoStats.realEvents > 10) {
      return {
        type: 'success',
        message: "Great! You have real data flowing. Demo events help fill gaps when real activity is low.",
        action: 'Refresh Demo Events'
      };
    } else if (demoStats.realEvents > 0) {
      return {
        type: 'warning',
        message: "You have some real data, but demo events can help maintain consistent social proof.",
        action: 'Add More Demo Events'
      };
    } else {
      return {
        type: 'info',
        message: "Demo events will show immediately while you set up integrations and gather real data.",
        action: 'Generate Demo Events'
      };
    }
  };

  const recommendation = getDemoRecommendation();

  if (!showFullDemo && demoStats.totalEvents === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-primary" />
            <div>
              <h4 className="font-medium">Demo Mode Available</h4>
              <p className="text-sm text-muted-foreground">
                Generate realistic demo events to see your widget in action
              </p>
            </div>
          </div>
          <Button onClick={handleGenerateDemoEvents} disabled={loading}>
            {loading ? 'Generating...' : 'Try Demo'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Demo Mode
          {eventStats.reachedThreshold && (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <TrendingUp className="h-3 w-3 mr-1" />
              Production Ready
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Smart Demo Prompt */}
        <SmartDemoPrompt />

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{demoStats.totalEvents}</div>
            <div className="text-xs text-muted-foreground">Total Events</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{demoStats.realEvents}</div>
            <div className="text-xs text-muted-foreground">Real Data</div>
            {eventStats.reachedThreshold && (
              <div className="text-xs text-green-600 font-medium mt-1">✓ Ready</div>
            )}
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{demoStats.demoEvents}</div>
            <div className="text-xs text-muted-foreground">Demo Events</div>
            {demoStats.demoEvents > 0 && eventStats.reachedThreshold && (
              <div className="text-xs text-orange-600 font-medium mt-1">Can clear</div>
            )}
          </div>
        </div>

        {/* Data Indicator */}
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-muted rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-l-full"
              style={{ width: `${(demoStats.realEvents / demoStats.totalEvents) * 100}%` }}
            />
            <div 
              className="bg-blue-600 h-2 rounded-r-full"
              style={{ 
                width: `${(demoStats.demoEvents / demoStats.totalEvents) * 100}%`,
                marginTop: '-8px'
              }}
            />
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              <div className="w-2 h-2 bg-green-600 rounded-full mr-1" />
              Real
            </Badge>
            <Badge variant="outline" className="text-xs">
              <div className="w-2 h-2 bg-blue-600 rounded-full mr-1" />
              Demo
            </Badge>
          </div>
        </div>

        {/* Recommendation */}
        <div className={`p-3 rounded-lg text-sm ${
          recommendation.type === 'success' ? 'bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-200' :
          recommendation.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-200' :
          'bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-200'
        }`}>
          {recommendation.message}
        </div>

        {/* Last Generated */}
        {demoStats.lastGenerated && (
          <div className="text-xs text-muted-foreground">
            Last demo events: {new Date(demoStats.lastGenerated).toLocaleDateString()}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            onClick={handleGenerateDemoEvents} 
            disabled={loading}
            size="sm"
            className="flex-1"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {loading ? 'Generating...' : recommendation.action}
          </Button>
          
          {widgetId && (
            <Button variant="outline" size="sm" asChild>
              <a 
                href={`/test-widget.html?widget=${widgetId}`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </a>
            </Button>
          )}
        </div>

        {/* Demo Event Types */}
        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1">Demo events include:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Recent signups from various locations</li>
            <li>Purchase notifications with realistic products</li>
            <li>Newsletter subscriptions and downloads</li>
            <li>Customer reviews and testimonials</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};