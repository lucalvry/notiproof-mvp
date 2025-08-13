import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface HeatmapClick {
  id: string;
  page_url: string;
  click_x: number;
  click_y: number;
  viewport_width: number;
  viewport_height: number;
  element_selector: string;
  element_text: string;
  created_at: string;
}

interface HeatmapViewerProps {
  widgetId: string;
}

const HeatmapViewer = ({ widgetId }: HeatmapViewerProps) => {
  const [clicks, setClicks] = useState<HeatmapClick[]>([]);
  const [selectedPage, setSelectedPage] = useState<string>('all');
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHeatmapData = async () => {
      try {
        const { data, error } = await supabase
          .from('heatmap_clicks' as any)
          .select('*')
          .eq('widget_id', widgetId)
          .order('created_at', { ascending: false })
          .limit(1000);

        if (error) throw error;

        setClicks((data as any) || []);
        
        // Extract unique pages
        const uniquePages = [...new Set(((data as any) || []).map((click: any) => click.page_url))] as string[];
        setPages(uniquePages);
      } catch (error) {
        console.error('Error loading heatmap data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHeatmapData();
  }, [widgetId]);

  const filteredClicks = selectedPage === 'all' 
    ? clicks 
    : clicks.filter(click => click.page_url === selectedPage);

  // Group clicks by position for intensity calculation
  const getClickIntensity = (x: number, y: number) => {
    const tolerance = 20; // pixels
    const nearbyClicks = filteredClicks.filter(click => 
      Math.abs(click.click_x - x) <= tolerance && 
      Math.abs(click.click_y - y) <= tolerance
    );
    return nearbyClicks.length;
  };

  const maxIntensity = Math.max(...filteredClicks.map(click => 
    getClickIntensity(click.click_x, click.click_y)
  ), 1);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Click Heatmap</CardTitle>
          <CardDescription>Loading heatmap data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted animate-pulse rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (clicks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Click Heatmap</CardTitle>
          <CardDescription>No click data available yet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Start collecting widget interactions to see heatmap data here.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Click Heatmap</CardTitle>
            <CardDescription>
              Showing {filteredClicks.length} clicks
              {selectedPage !== 'all' && ` on ${selectedPage}`}
            </CardDescription>
          </div>
          <Select value={selectedPage} onValueChange={setSelectedPage}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All pages ({clicks.length} clicks)</SelectItem>
              {pages.map(page => {
                const pageClicks = clicks.filter(c => c.page_url === page);
                return (
                  <SelectItem key={page} value={page}>
                    {page} ({pageClicks.length} clicks)
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative bg-muted/20 rounded-lg overflow-hidden" style={{ minHeight: '400px' }}>
          {/* Heatmap visualization */}
          <div className="relative w-full h-96">
            {filteredClicks.map((click, index) => {
              const intensity = getClickIntensity(click.click_x, click.click_y);
              const opacity = intensity / maxIntensity;
              const size = Math.max(8, Math.min(24, intensity * 3));
              
              return (
                <div
                  key={`${click.id}-${index}`}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${(click.click_x / (click.viewport_width || 1200)) * 100}%`,
                    top: `${(click.click_y / (click.viewport_height || 800)) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div
                    className="rounded-full bg-red-500"
                    style={{
                      width: `${size}px`,
                      height: `${size}px`,
                      opacity: Math.max(0.3, opacity * 0.8),
                      boxShadow: `0 0 ${size}px rgba(239, 68, 68, ${opacity * 0.3})`,
                    }}
                    title={`Clicks: ${intensity} | Element: ${click.element_selector}`}
                  />
                </div>
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-background/90 rounded-lg p-3 border">
            <h4 className="font-medium mb-2">Click Intensity</h4>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500/30"></div>
                <span className="text-xs">Low</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-red-500/60"></div>
                <span className="text-xs">Medium</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-5 h-5 rounded-full bg-red-500/90"></div>
                <span className="text-xs">High</span>
              </div>
            </div>
          </div>
        </div>

        {/* Most clicked elements */}
        <div className="mt-6">
          <h4 className="font-medium mb-3">Most Clicked Elements</h4>
          <div className="space-y-2">
            {Object.entries(
              filteredClicks.reduce((acc, click) => {
                const key = click.element_selector || 'Unknown';
                acc[key] = (acc[key] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            )
              .sort(([, a], [, b]) => b - a)
              .slice(0, 10)
              .map(([selector, count]) => (
                <div key={selector} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <code className="text-sm font-mono">{selector}</code>
                  <Badge variant="secondary">{count} clicks</Badge>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HeatmapViewer;