import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { Edit, Trash2, ToggleLeft, ToggleRight, Plus } from 'lucide-react';

interface Widget {
  id: string;
  name: string;
  template_name: string;
  status: string;
  created_at: string;
  _count?: {
    events: number;
  };
}

const DashboardWidgets = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchWidgets();
    }
  }, [profile]);

  const fetchWidgets = async () => {
    if (!profile?.id) return;

    const { data, error } = await supabase
      .from('widgets')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error fetching widgets",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setWidgets(data || []);
    }
    setLoading(false);
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
        <Button asChild className="gap-2">
          <Link to="/dashboard/widgets/create">
            <Plus className="h-4 w-4" />
            Create New Widget
          </Link>
        </Button>
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
            <Button asChild>
              <Link to="/dashboard/widgets/create">Create Your First Widget</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {widgets.map((widget) => (
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
                  <div className="text-sm text-muted-foreground">
                    Created: {new Date(widget.created_at).toLocaleDateString()}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleWidgetStatus(widget.id, widget.status)}
                      className="gap-2"
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
                    
                    <Button variant="outline" size="sm" className="gap-2" asChild>
                      <Link to={`/dashboard/widgets/${widget.id}/edit`}>
                        <Edit className="h-4 w-4" />
                        Edit
                      </Link>
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteWidget(widget.id)}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardWidgets;