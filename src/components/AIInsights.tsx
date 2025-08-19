import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle, X, Eye, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsInsight {
  id: string;
  insight_type: 'suggestion' | 'trend' | 'opportunity' | 'analysis';
  title: string;
  description: string;
  confidence_score: number;
  data_points: any;
  action_items: string[];
  priority: 'low' | 'medium' | 'high';
  status: 'new' | 'viewed' | 'applied' | 'dismissed';
  created_at: string;
  expires_at?: string;
}

interface AIInsightsProps {
  widgetId: string;
}

export const AIInsights = ({ widgetId }: AIInsightsProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [insights, setInsights] = useState<AnalyticsInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadInsights();
  }, [widgetId]);

  const loadInsights = async () => {
    if (!profile) return;

    try {
      // Temporarily use mock data until Supabase types are updated
      const mockInsights = [
        {
          id: '1',
          insight_type: 'suggestion' as const,
          title: 'Optimize Notification Timing',
          description: 'Your notifications perform 23% better when shown after 3 seconds on page.',
          confidence_score: 0.85,
          data_points: { averageTimeOnPage: 45, conversionRate: 2.3 },
          action_items: ['Increase delay to 3 seconds', 'Test with different timing'],
          priority: 'high' as const,
          status: 'new' as const,
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          insight_type: 'opportunity' as const,
          title: 'Low Mobile Conversion Rate',
          description: 'Mobile visitors have 40% lower conversion rate. Consider mobile-optimized notifications.',
          confidence_score: 0.78,
          data_points: { mobileConversion: 1.2, desktopConversion: 2.1 },
          action_items: ['Create mobile-specific templates', 'Adjust positioning for mobile'],
          priority: 'medium' as const,
          status: 'new' as const,
          created_at: new Date().toISOString(),
        }
      ];
      
      setInsights(mockInsights);
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateNewInsights = async () => {
    if (!profile) return;

    setGenerating(true);
    try {
      // Get widget metrics
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('widget_id', widgetId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (eventsError) throw eventsError;

      // Calculate metrics
      const totalViews = events?.reduce((sum, event) => sum + (event.views || 0), 0) || 0;
      const totalClicks = events?.reduce((sum, event) => sum + (event.clicks || 0), 0) || 0;
      const conversionRate = totalViews > 0 ? (totalClicks / totalViews * 100) : 0;

      const metrics = {
        totalViews,
        totalClicks,
        conversionRate,
        eventCount: events?.length || 0,
        uniqueEventTypes: [...new Set(events?.map(e => e.event_type) || [])].length
      };

      // Call AI insights function
      const { data, error } = await supabase.functions.invoke('ai-insights', {
        body: {
          user_id: profile.id,
          widget_id: widgetId
        }
      });

      if (error) throw error;

      toast({
        title: "AI Analysis Complete",
        description: "New insights have been generated for your widget.",
      });

      loadInsights(); // Refresh insights
    } catch (error) {
      console.error('Error generating insights:', error);
      toast({
        title: "Error",
        description: "Failed to generate insights. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const updateInsightStatus = async (insightId: string, status: string) => {
    try {
      // Temporarily use local state updates until Supabase types are updated
      setInsights(prev => prev.map(insight => 
        insight.id === insightId ? { ...insight, status } as AnalyticsInsight : insight
      ));
      
      toast({
        title: "Status updated",
        description: `Insight marked as ${status}`,
      });
    } catch (error) {
      console.error('Error updating insight status:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'suggestion': return <Lightbulb className="h-5 w-5" />;
      case 'trend': return <TrendingUp className="h-5 w-5" />;
      case 'opportunity': return <AlertTriangle className="h-5 w-5" />;
      case 'analysis': return <Eye className="h-5 w-5" />;
      default: return <Lightbulb className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              AI Insights
            </CardTitle>
            <CardDescription>
              AI-powered recommendations to optimize your widget performance
            </CardDescription>
          </div>
          <Button
            onClick={generateNewInsights}
            disabled={generating}
            size="sm"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <TrendingUp className="h-4 w-4 mr-2" />
            )}
            {generating ? 'Analyzing...' : 'Generate Insights'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {insights.length === 0 ? (
          <div className="text-center py-8">
            <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No insights yet</h3>
            <p className="text-muted-foreground mb-4">
              Generate AI-powered insights to optimize your widget performance
            </p>
            <Button onClick={generateNewInsights} disabled={generating}>
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <TrendingUp className="h-4 w-4 mr-2" />
              )}
              Generate First Insights
            </Button>
          </div>
        ) : (
          insights.map((insight) => (
            <Card key={insight.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="text-primary mt-1">
                      {getInsightIcon(insight.insight_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{insight.title}</h4>
                        <Badge variant={getPriorityColor(insight.priority) as any} className="text-xs">
                          {insight.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {insight.description}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateInsightStatus(insight.id, 'dismissed')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Confidence Score */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>Confidence</span>
                    <span>{Math.round(insight.confidence_score * 100)}%</span>
                  </div>
                  <Progress value={insight.confidence_score * 100} className="h-2" />
                </div>

                {/* Action Items */}
                {insight.action_items.length > 0 && (
                  <div>
                    <h5 className="font-medium text-sm mb-2">Recommended Actions:</h5>
                    <ul className="space-y-1">
                      {insight.action_items.map((item, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateInsightStatus(insight.id, 'viewed')}
                  >
                    Mark as Read
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => updateInsightStatus(insight.id, 'applied')}
                  >
                    Applied
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
};