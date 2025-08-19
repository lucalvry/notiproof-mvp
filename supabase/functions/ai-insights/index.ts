import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, widget_id } = await req.json();

    if (!user_id) {
      throw new Error('User ID is required');
    }

    console.log(`Generating AI insights for user: ${user_id}, widget: ${widget_id || 'all'}`);

    // Fetch analytics data
    let query = supabase
      .from('events')
      .select(`
        id,
        widget_id,
        event_type,
        event_data,
        views,
        clicks,
        created_at,
        widgets:widget_id (
          id,
          name,
          template_name,
          style_config,
          display_rules
        )
      `)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

    if (widget_id) {
      query = query.eq('widget_id', widget_id);
    } else {
      // Get events for all user's widgets
      const { data: userWidgets } = await supabase
        .from('widgets')
        .select('id')
        .eq('user_id', user_id);
      
      if (userWidgets && userWidgets.length > 0) {
        const widgetIds = userWidgets.map(w => w.id);
        query = query.in('widget_id', widgetIds);
      }
    }

    const { data: events, error: eventsError } = await query.order('created_at', { ascending: false });

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      throw eventsError;
    }

    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ 
        insights: [],
        message: 'No data available for analysis' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare analytics summary for AI
    const totalViews = events.reduce((sum, e) => sum + (e.views || 0), 0);
    const totalClicks = events.reduce((sum, e) => sum + (e.clicks || 0), 0);
    const ctr = totalViews > 0 ? (totalClicks / totalViews * 100).toFixed(2) : 0;
    
    const eventsByType = events.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const eventsByWidget = events.reduce((acc, event) => {
      const widgetName = event.widgets?.name || 'Unknown Widget';
      acc[widgetName] = (acc[widgetName] || { views: 0, clicks: 0 });
      acc[widgetName].views += event.views || 0;
      acc[widgetName].clicks += event.clicks || 0;
      return acc;
    }, {} as Record<string, { views: number; clicks: number }>);

    const analyticsData = {
      totalViews,
      totalClicks,
      clickThroughRate: ctr,
      eventsByType,
      eventsByWidget,
      timeRange: '30 days',
      totalEvents: events.length
    };

    console.log('Analytics data prepared for AI:', analyticsData);

    // Generate insights using OpenAI
    const aiPrompt = `
    Analyze the following NotiProof widget analytics data and provide 3-4 actionable insights:

    Analytics Summary:
    - Total Views: ${totalViews}
    - Total Clicks: ${totalClicks}
    - Click-Through Rate: ${ctr}%
    - Total Events: ${events.length}
    - Time Range: 30 days

    Event Types Distribution:
    ${Object.entries(eventsByType).map(([type, count]) => `- ${type}: ${count} events`).join('\n')}

    Widget Performance:
    ${Object.entries(eventsByWidget).map(([widget, stats]) => 
      `- ${widget}: ${stats.views} views, ${stats.clicks} clicks, ${stats.views > 0 ? (stats.clicks / stats.views * 100).toFixed(1) : 0}% CTR`
    ).join('\n')}

    Please provide insights in this JSON format:
    {
      "insights": [
        {
          "title": "Short descriptive title",
          "description": "Detailed insight with specific recommendations",
          "priority": "high|medium|low",
          "category": "performance|optimization|conversion|engagement",
          "action_items": ["actionable step 1", "actionable step 2"]
        }
      ]
    }

    Focus on practical recommendations to improve performance, increase conversions, and optimize user engagement.
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert analytics consultant specializing in social proof and conversion optimization. Provide clear, actionable insights based on widget performance data.' 
          },
          { role: 'user', content: aiPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices[0].message.content;
    
    console.log('AI response received:', aiContent);

    let insights;
    try {
      insights = JSON.parse(aiContent);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Fallback insights if AI response isn't valid JSON
      insights = {
        insights: [
          {
            title: "Widget Performance Analysis",
            description: `Your widgets generated ${totalViews} views and ${totalClicks} clicks with a ${ctr}% CTR over the last 30 days.`,
            priority: "medium",
            category: "performance",
            action_items: ["Review top-performing event types", "Optimize display timing"]
          }
        ]
      };
    }

    // Store insights in database
    const insightsToStore = insights.insights.map((insight: any) => ({
      user_id,
      widget_id: widget_id || null,
      insight_type: insight.category || 'general',
      title: insight.title,
      description: insight.description,
      priority: insight.priority || 'medium',
      action_items: insight.action_items || [],
      confidence_score: 0.8,
      data_points: analyticsData,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    }));

    const { error: insertError } = await supabase
      .from('analytics_insights')
      .insert(insightsToStore);

    if (insertError) {
      console.error('Error storing insights:', insertError);
    }

    console.log(`Generated ${insights.insights.length} insights successfully`);

    return new Response(JSON.stringify({ 
      insights: insights.insights,
      analytics_summary: analyticsData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-insights function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});