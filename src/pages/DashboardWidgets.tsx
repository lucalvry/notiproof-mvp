import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWebsites } from '@/hooks/useWebsites';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import { Edit, Trash2, ToggleLeft, ToggleRight, Plus, Eye, MousePointer, BarChart3 } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { QuickStartWizard } from '@/components/QuickStartWizard';
interface Widget {
  id: string;
  name: string;
  template_name: string;
  status: string;
  created_at: string;
  style_config?: any;
  totalViews: number;
  totalClicks: number;
  ctr: number;
}

const DashboardWidgets = () => {
  const { profile } = useAuth();
  const { selectedWebsite } = useWebsites();
  const { toast } = useToast();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'created' | 'views' | 'clicks' | 'ctr'>('created');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterTemplate, setFilterTemplate] = useState<'all' | string>('all');
  const [showWizard, setShowWizard] = useState(false);

  const templateOptions = Array.from(new Set(widgets.map(w => w.template_name).filter(name => name && name.trim() !== '')));

  const displayedWidgets = widgets
    .filter(w => (filterStatus === 'all' ? true : w.status === filterStatus))
    .filter(w => (filterTemplate === 'all' ? true : w.template_name === filterTemplate))
    .slice()
    .sort((a, b) => {
      const mult = sortOrder === 'asc' ? 1 : -1;
      switch (sortBy) {
        case 'views':
          return mult * ((a.totalViews || 0) - (b.totalViews || 0));
        case 'clicks':
          return mult * ((a.totalClicks || 0) - (b.totalClicks || 0));
        case 'ctr':
          return mult * ((a.ctr || 0) - (b.ctr || 0));
        default:
          return mult * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }
    });
  useEffect(() => {
    if (profile?.id) {
      fetchWidgets();
      
      // Set up real-time subscription for events
      const channel = supabase
        .channel('widget-events')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'events'
          },
          () => {
            fetchWidgets(); // Refresh widgets when events change
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile, selectedWebsite]);

  const fetchWidgets = async () => {
    if (!profile?.id) return;

    try {
      // Fetch widgets filtered by selected website
      let widgetsQuery = supabase
        .from('widgets')
        .select('*')
        .eq('user_id', profile.id);
        
      if (selectedWebsite) {
        widgetsQuery = widgetsQuery.eq('website_id', selectedWebsite.id);
      }
      
      const { data: widgetsData, error } = await widgetsQuery
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch stats for all widgets in a single query, then aggregate client-side
      const ids = (widgetsData || []).map(w => w.id);
      let statsById: Record<string, { views: number; clicks: number }> = {};
      if (ids.length > 0) {
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('widget_id, event_type')
          .in('widget_id', ids);
        if (eventsError) throw eventsError;

        statsById = (eventsData || []).reduce((acc, ev: any) => {
          const key = ev.widget_id;
          if (!acc[key]) acc[key] = { views: 0, clicks: 0 };
          if (ev.event_type === 'view') acc[key].views += 1;
          if (ev.event_type === 'click') acc[key].clicks += 1;
          return acc;
        }, {} as Record<string, { views: number; clicks: number }>);
      }

      const widgetsWithStats = (widgetsData || []).map((widget: any) => {
        const totals = statsById[widget.id] || { views: 0, clicks: 0 };
        const totalViews = totals.views;
        const totalClicks = totals.clicks;
        const ctr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;
        return { ...widget, totalViews, totalClicks, ctr };
      });

      setWidgets(widgetsWithStats);
    } catch (error: any) {
      toast({
        title: "Error fetching widgets",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleWidgetStatus = async (widgetId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    const { error } = await supabase
      .from('widgets')
      .update({ status: newStatus })
      .eq('id', widgetId);

    if (error) {
      toast({
        title: "Error updating widget",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setWidgets(widgets.map(widget => 
        widget.id === widgetId 
          ? { ...widget, status: newStatus }
          : widget
      ));
      toast({
        title: "Widget updated",
        description: `Widget ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully.`,
      });
    }
  };

  const deleteWidget = async (widgetId: string) => {
    if (!confirm('Are you sure you want to delete this widget?')) return;

    const { error } = await supabase
      .from('widgets')
      .delete()
      .eq('id', widgetId);

    if (error) {
      toast({
        title: "Error deleting widget",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setWidgets(widgets.filter(widget => widget.id !== widgetId));
      toast({
        title: "Widget deleted",
        description: "Widget deleted successfully.",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">My Widgets</h1>
            <p className="text-muted-foreground">Manage your social proof widgets</p>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20" />
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
        <div>
          <h1 className="text-3xl font-bold">My Widgets</h1>
          <p className="text-muted-foreground">Manage your social proof widgets</p>
        </div>
        <Button onClick={() => setShowWizard(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create New Widget
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Sort by" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="created">Newest</SelectItem>
            <SelectItem value="views">Views</SelectItem>
            <SelectItem value="clicks">Clicks</SelectItem>
            <SelectItem value="ctr">CTR</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as any)}>
          <SelectTrigger className="w-28"><SelectValue placeholder="Order" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Desc</SelectItem>
            <SelectItem value="asc">Asc</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTemplate} onValueChange={(v) => setFilterTemplate(v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Template" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All templates</SelectItem>
            {templateOptions.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {widgets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📦</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">No widgets yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first widget to start showing social proof notifications on your website.
            </p>
            <Button onClick={() => setShowWizard(true)}>
              Create Your First Widget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {displayedWidgets.map((widget) => (
            <Card key={widget.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{widget.name}</CardTitle>
                  <Badge variant={widget.status === 'active' ? 'default' : 'secondary'}>
                    {widget.status}
                  </Badge>
                </div>
                <CardDescription>
                  Template: {widget.template_name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="space-y-4">
                   {/* Stats Grid - Simplified for better mobile layout */}
                   <div className="space-y-2">
                     <div className="flex items-center justify-between text-sm">
                       <div className="flex items-center gap-1">
                         <Eye className="h-4 w-4 text-primary" />
                         <span className="text-muted-foreground">Views</span>
                       </div>
                       <span className="font-medium">{widget.totalViews}</span>
                     </div>
                     <div className="flex items-center justify-between text-sm">
                       <div className="flex items-center gap-1">
                         <MousePointer className="h-4 w-4 text-primary" />
                         <span className="text-muted-foreground">Clicks</span>
                       </div>
                       <span className="font-medium">{widget.totalClicks}</span>
                     </div>
                     <div className="flex items-center justify-between text-sm">
                       <span className="text-muted-foreground">CTR</span>
                       <span className="font-medium">{widget.ctr.toFixed(1)}%</span>
                     </div>
                   </div>
                   
                   <div className="text-xs text-muted-foreground border-t pt-3">
                     Created: {new Date(widget.created_at).toLocaleDateString()}
                   </div>
                   
                   <div className="flex flex-col gap-2">
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => toggleWidgetStatus(widget.id, widget.status)}
                       className="gap-2 w-full"
                     >
                       {widget.status === 'active' ? (
                         <>
                           <ToggleRight className="h-4 w-4" />
                           Deactivate
                         </>
                       ) : (
                         <>
                           <ToggleLeft className="h-4 w-4" />
                           Activate
                         </>
                       )}
                     </Button>
                     
                      <Button variant="default" size="sm" className="gap-2 w-full" asChild>
                        <Link to={`/dashboard/widgets/${widget.id}/analytics`}>
                          <BarChart3 className="h-4 w-4" />
                          Analytics
                        </Link>
                      </Button>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="gap-2 flex-1" asChild>
                          <Link to={`/dashboard/widgets/${widget.id}/edit`}>
                            <Edit className="h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteWidget(widget.id)}
                          className="gap-2 flex-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                   </div>
                 </div>
              </CardContent>
            </Card>
          ))}
         </div>
       )}

       <Dialog open={showWizard} onOpenChange={setShowWizard}>
         <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
           <DialogHeader>
             <DialogTitle>Create New Widget</DialogTitle>
           </DialogHeader>
           <QuickStartWizard 
             onComplete={(widgetId) => {
               setShowWizard(false);
               fetchWidgets(); // Refresh the widgets list
               toast({
                 title: "Widget created!",
                 description: "Your new widget has been created successfully.",
               });
             }}
             onSkip={() => setShowWizard(false)}
           />
         </DialogContent>
       </Dialog>
     </div>
   );
 };
 
 export default DashboardWidgets;