import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, BarChart3, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWebsites } from '@/hooks/useWebsites';
import { useToast } from '@/hooks/use-toast';
import { WebsiteVerificationStatus } from './WebsiteVerificationStatus';
import { AddWebsiteDialog } from './AddWebsiteDialog';
import { supabase } from '@/integrations/supabase/client';

interface WebsiteStats {
  widgetCount: number;
  eventCount: number;
}

export const WebsiteList = () => {
  const { profile } = useAuth();
  const { websites, loading, refetch } = useWebsites();
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [websiteStats, setWebsiteStats] = useState<Record<string, WebsiteStats>>({});

  useEffect(() => {
    fetchWebsiteStats();
  }, [websites]);

  const fetchWebsiteStats = async () => {
    if (!websites.length) return;

    const stats: Record<string, WebsiteStats> = {};
    
    for (const website of websites) {
      // Get widget count for this website
      const { count: widgetCount } = await supabase
        .from('widgets')
        .select('*', { count: 'exact', head: true })
        .eq('website_id', website.id);

      // Get event count for widgets of this website
      const { count: eventCount } = await supabase
        .from('events')
        .select('widget_id', { count: 'exact', head: true })
        .in('widget_id', 
          (await supabase
            .from('widgets')
            .select('id')
            .eq('website_id', website.id)
          ).data?.map(w => w.id) || []
        );

      stats[website.id] = {
        widgetCount: widgetCount || 0,
        eventCount: eventCount || 0
      };
    }

    setWebsiteStats(stats);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">My Websites</h1>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Websites</h1>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Website
        </Button>
      </div>

      {websites.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">No websites yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first website to start creating widgets and collecting social proof.
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Website
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {websites.map((website) => {
            const stats = websiteStats[website.id] || { widgetCount: 0, eventCount: 0 };
            
            return (
              <Card key={website.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <CardTitle className="flex items-center gap-3">
                        {website.name}
                        <WebsiteVerificationStatus 
                          website={website} 
                          onVerificationChange={refetch}
                        />
                      </CardTitle>
                      <CardDescription className="space-y-1">
                        <div className="flex items-center gap-2">
                          <LinkIcon className="h-3 w-3" />
                          <span>{website.domain}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span>{stats.widgetCount} widget{stats.widgetCount !== 1 ? 's' : ''}</span>
                          <span>{stats.eventCount} event{stats.eventCount !== 1 ? 's' : ''}</span>
                          <Badge variant="outline" className="text-xs">
                            {website.business_type}
                          </Badge>
                        </div>
                      </CardDescription>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link to={`/dashboard/widgets?website=${website.id}`}>
                          <Settings className="h-4 w-4 mr-1" />
                          Widgets
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link to={`/dashboard/analytics?website=${website.id}`}>
                          <BarChart3 className="h-4 w-4 mr-1" />
                          Analytics
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}

      <AddWebsiteDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
    </div>
  );
};