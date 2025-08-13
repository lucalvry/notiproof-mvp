import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (action) {
      case 'generate-insights':
        return await generateInsights(supabase, data);
      case 'get-recommendations':
        return await getRecommendations(supabase, data);
      case 'analyze-performance':
        return await analyzePerformance(supabase, data);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Error in ai-analytics function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateInsights(supabase: any, data: any) {
  const { userId, widgetId, timeRange = '7d' } = data;
  
  // Fetch analytics data
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .eq('widget_id', widgetId)
    .gte('created_at', getTimeRangeDate(timeRange))
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Analyze data patterns
  const insights = await analyzeDataWithAI(events, userId, widgetId);
  
  // Store insights in database
  const { data: savedInsights, error: saveError } = await supabase
    .from('analytics_insights')
    .insert(insights)
    .select();

  if (saveError) throw saveError;

  return new Response(
    JSON.stringify({ insights: savedInsights }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getRecommendations(supabase: any, data: any) {
  const { userId, widgetId } = data;
  
  // Get existing insights
  const { data: insights, error } = await supabase
    .from('analytics_insights')
    .select('*')
    .eq('user_id', userId)
    .eq('widget_id', widgetId)
    .eq('status', 'new')
    .order('confidence_score', { ascending: false })
    .limit(10);

  if (error) throw error;

  return new Response(
    JSON.stringify({ recommendations: insights }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function analyzePerformance(supabase: any, data: any) {
  const { userId, widgetId, metrics } = data;
  
  const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
  if (!perplexityApiKey) {
    throw new Error('Perplexity API key not configured');
  }

  const prompt = `Analyze these social proof widget metrics and provide actionable insights:
  
  Widget ID: ${widgetId}
  Metrics: ${JSON.stringify(metrics, null, 2)}
  
  Provide specific recommendations for:
  1. Improving conversion rates
  2. Optimizing notification timing
  3. Enhancing user engagement
  4. A/B testing opportunities
  
  Format as JSON with: title, description, priority (high/medium/low), actionItems array, confidence_score (0-1)`;

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${perplexityApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [
        {
          role: 'system',
          content: 'You are an expert in conversion optimization and social proof analytics. Provide precise, actionable insights based on data.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 1000,
      return_images: false,
      return_related_questions: false
    }),
  });

  const aiResult = await response.json();
  const analysis = aiResult.choices[0].message.content;

  try {
    const parsedAnalysis = JSON.parse(analysis);
    
    // Store the analysis as an insight
    const insight = {
      user_id: userId,
      widget_id: widgetId,
      insight_type: 'analysis',
      title: parsedAnalysis.title || 'Performance Analysis',
      description: parsedAnalysis.description || analysis,
      confidence_score: parsedAnalysis.confidence_score || 0.8,
      data_points: metrics,
      action_items: parsedAnalysis.actionItems || [],
      priority: parsedAnalysis.priority || 'medium'
    };

    const { data: savedInsight, error: saveError } = await supabase
      .from('analytics_insights')
      .insert(insight)
      .select()
      .single();

    if (saveError) throw saveError;

    return new Response(
      JSON.stringify({ analysis: savedInsight }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (parseError) {
    // If parsing fails, store as raw text
    const insight = {
      user_id: userId,
      widget_id: widgetId,
      insight_type: 'analysis',
      title: 'AI Performance Analysis',
      description: analysis,
      confidence_score: 0.7,
      data_points: metrics,
      action_items: [],
      priority: 'medium'
    };

    const { data: savedInsight, error: saveError } = await supabase
      .from('analytics_insights')
      .insert(insight)
      .select()
      .single();

    if (saveError) throw saveError;

    return new Response(
      JSON.stringify({ analysis: savedInsight }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function analyzeDataWithAI(events: any[], userId: string, widgetId: string) {
  const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
  if (!perplexityApiKey) {
    return generateBasicInsights(events, userId, widgetId);
  }

  // Aggregate data for AI analysis
  const eventCounts = events.reduce((acc, event) => {
    acc[event.event_type] = (acc[event.event_type] || 0) + 1;
    return acc;
  }, {});

  const totalViews = events.reduce((sum, event) => sum + (event.views || 0), 0);
  const totalClicks = events.reduce((sum, event) => sum + (event.clicks || 0), 0);
  const conversionRate = totalViews > 0 ? (totalClicks / totalViews * 100).toFixed(2) : 0;

  const prompt = `Analyze this social proof widget data and generate insights:
  
  Event Counts: ${JSON.stringify(eventCounts)}
  Total Views: ${totalViews}
  Total Clicks: ${totalClicks}
  Conversion Rate: ${conversionRate}%
  Time Period: Last 7 days
  
  Generate 3-5 specific insights with:
  1. Pattern identification
  2. Optimization opportunities
  3. Performance benchmarks
  4. Next steps
  
  Return as JSON array with: insight_type, title, description, priority, action_items, confidence_score`;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a conversion optimization expert. Generate actionable insights from widget analytics data.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 800
      }),
    });

    const aiResult = await response.json();
    const insights = JSON.parse(aiResult.choices[0].message.content);
    
    return insights.map((insight: any) => ({
      user_id: userId,
      widget_id: widgetId,
      insight_type: insight.insight_type || 'suggestion',
      title: insight.title,
      description: insight.description,
      confidence_score: insight.confidence_score || 0.8,
      data_points: { eventCounts, totalViews, totalClicks, conversionRate },
      action_items: insight.action_items || [],
      priority: insight.priority || 'medium'
    }));
  } catch (error) {
    console.error('AI analysis failed, using basic insights:', error);
    return generateBasicInsights(events, userId, widgetId);
  }
}

function generateBasicInsights(events: any[], userId: string, widgetId: string) {
  const totalViews = events.reduce((sum, event) => sum + (event.views || 0), 0);
  const totalClicks = events.reduce((sum, event) => sum + (event.clicks || 0), 0);
  const conversionRate = totalViews > 0 ? (totalClicks / totalViews * 100) : 0;

  const insights = [];

  // Conversion rate insight
  if (conversionRate < 2) {
    insights.push({
      user_id: userId,
      widget_id: widgetId,
      insight_type: 'opportunity',
      title: 'Low Conversion Rate Detected',
      description: `Your widget has a ${conversionRate.toFixed(2)}% conversion rate. Industry average is 2-4%.`,
      confidence_score: 0.9,
      data_points: { conversionRate, totalViews, totalClicks },
      action_items: ['Try different notification timing', 'Test urgency-focused messages', 'Optimize placement'],
      priority: 'high'
    });
  }

  // Low engagement insight
  if (totalViews < 50) {
    insights.push({
      user_id: userId,
      widget_id: widgetId,
      insight_type: 'suggestion',
      title: 'Increase Widget Visibility',
      description: 'Your widget is receiving low visibility. Consider optimizing placement and timing.',
      confidence_score: 0.8,
      data_points: { totalViews },
      action_items: ['Check widget placement', 'Reduce display delay', 'Increase frequency'],
      priority: 'medium'
    });
  }

  return insights;
}

function getTimeRangeDate(timeRange: string): string {
  const now = new Date();
  switch (timeRange) {
    case '1d':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  }
}