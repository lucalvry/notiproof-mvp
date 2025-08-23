import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Target, 
  CheckCircle, 
  Clock, 
  Lightbulb,
  BarChart3,
  Zap,
  Leaf
} from 'lucide-react';
import { EventBlendingService } from '@/services/eventBlendingService';
import { EventLifecycleService } from '@/services/eventLifecycleService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GraduationProgressProps {
  widgetId: string;
  businessType?: string;
}

interface GraduationData {
  ready: boolean;
  naturalCount: number;
  quickWinCount: number;
  recommendation: string;
  nextSteps: string[];
  analytics: {
    natural: {
      count: number;
      views: number;
      clicks: number;
      ctr: number;
    };
    quickWin: {
      count: number;
      views: number;
      clicks: number;
      ctr: number;
    };
    graduationProgress: number;
  } | null;
  health: {
    score: number;
    factors: {
      naturalEventGrowth: number;
      quickWinBalance: number;
      flaggedEventRatio: number;
      graduationProgress: number;
    };
    recommendations: string[];
  } | null;
}

export const GraduationProgress = ({ widgetId, businessType = 'saas' }: GraduationProgressProps) => {
  const [data, setData] = useState<GraduationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [graduating, setGraduating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadGraduationData();
  }, [widgetId]);

  const loadGraduationData = async () => {
    try {
      setLoading(true);
      
      const rules = EventLifecycleService.getDefaultLifecycleRules(businessType);
      const [graduationStatus, analytics, health] = await Promise.all([
        EventLifecycleService.checkGraduationStatus(widgetId, rules),
        EventBlendingService.getBlendingAnalytics(widgetId),
        EventLifecycleService.getLifecycleHealth(widgetId)
      ]);

      setData({
        ...graduationStatus,
        analytics,
        health
      });
    } catch (error) {
      console.error('Error loading graduation data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load graduation progress',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGraduation = async () => {
    try {
      setGraduating(true);
      const success = await EventLifecycleService.autoGraduateWidget(widgetId);
      
      if (success) {
        toast({
          title: 'Widget Graduated!',
          description: 'Your widget now prioritizes natural events (80/20 ratio)',
        });
        await loadGraduationData();
      } else {
        throw new Error('Graduation failed');
      }
    } catch (error) {
      console.error('Error graduating widget:', error);
      toast({
        title: 'Graduation Failed',
        description: 'Unable to graduate widget. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setGraduating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const progressPercentage = data.analytics?.graduationProgress || 0;
  const isReady = data.ready;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Graduation Progress
            </CardTitle>
            <CardDescription>
              Track your progress from quick-wins to natural events
            </CardDescription>
          </div>
          <Badge variant={isReady ? 'default' : 'secondary'}>
            {isReady ? 'Ready to Graduate' : 'Building Natural Events'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Progress Overview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>Natural Events Progress</span>
            <span className="font-medium">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>0 events</span>
            <span>Graduation threshold</span>
          </div>
        </div>

        {/* Current Status Alert */}
        <Alert>
          <Lightbulb className="h-4 w-4" />
          <AlertDescription>
            {data.recommendation}
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="health">Health</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Event Counts */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Leaf className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Natural Events</span>
                </div>
                <div className="text-2xl font-bold">{data.naturalCount}</div>
                <div className="text-xs text-muted-foreground">Last 7 days</div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Quick-Wins</span>
                </div>
                <div className="text-2xl font-bold">{data.quickWinCount}</div>
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Next Steps
              </h4>
              <ul className="space-y-2">
                {data.nextSteps.map((step, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                    {step}
                  </li>
                ))}
              </ul>
            </div>

            {/* Graduation Button */}
            {isReady && (
              <Button 
                onClick={handleGraduation} 
                disabled={graduating}
                className="w-full gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {graduating ? 'Graduating...' : 'Graduate Widget'}
              </Button>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {data.analytics && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Leaf className="h-4 w-4 text-green-600" />
                        Natural Events
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Views:</span>
                        <span className="font-medium">{data.analytics.natural.views}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Clicks:</span>
                        <span className="font-medium">{data.analytics.natural.clicks}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>CTR:</span>
                        <span className="font-medium">{data.analytics.natural.ctr.toFixed(1)}%</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Zap className="h-4 w-4 text-blue-600" />
                        Quick-Win Events
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Views:</span>
                        <span className="font-medium">{data.analytics.quickWin.views}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Clicks:</span>
                        <span className="font-medium">{data.analytics.quickWin.clicks}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>CTR:</span>
                        <span className="font-medium">{data.analytics.quickWin.ctr.toFixed(1)}%</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Alert>
                  <BarChart3 className="h-4 w-4" />
                  <AlertDescription>
                    {data.analytics.natural.ctr > data.analytics.quickWin.ctr ? 
                      'Natural events are performing better! Ready for graduation.' :
                      'Quick-wins are still outperforming. Keep building natural events.'
                    }
                  </AlertDescription>
                </Alert>
              </>
            )}
          </TabsContent>

          <TabsContent value="health" className="space-y-4">
            {data.health && (
              <>
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold">{data.health.score}/100</div>
                  <div className="text-sm text-muted-foreground">Widget Health Score</div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Natural Event Growth</span>
                      <span>{data.health.factors.naturalEventGrowth}%</span>
                    </div>
                    <Progress value={data.health.factors.naturalEventGrowth} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Quick-Win Balance</span>
                      <span>{data.health.factors.quickWinBalance}%</span>
                    </div>
                    <Progress value={data.health.factors.quickWinBalance} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Event Quality</span>
                      <span>{data.health.factors.flaggedEventRatio}%</span>
                    </div>
                    <Progress value={data.health.factors.flaggedEventRatio} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Graduation Progress</span>
                      <span>{data.health.factors.graduationProgress}%</span>
                    </div>
                    <Progress value={data.health.factors.graduationProgress} className="h-2" />
                  </div>
                </div>

                {data.health.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Recommendations</h4>
                    <ul className="text-sm space-y-1">
                      {data.health.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <TrendingUp className="h-3 w-3 mt-0.5 text-muted-foreground" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};