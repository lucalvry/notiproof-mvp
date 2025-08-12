import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

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

const Widgets = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWidgets = async () => {
      if (!profile) return;

      try {
        const { data, error } = await supabase
          .from('widgets')
          .select(`
            id,
            name,
            template_name,
            status,
            created_at
          `)
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setWidgets(data || []);
      } catch (error) {
        console.error('Error fetching widgets:', error);
        toast({
          title: "Error",
          description: "Failed to load widgets",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchWidgets();
  }, [profile, toast]);

  const toggleWidgetStatus = async (widgetId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      const { error } = await supabase
        .from('widgets')
        .update({ status: newStatus })
        .eq('id', widgetId);

      if (error) throw error;

      setWidgets(prev => 
        prev.map(widget => 
          widget.id === widgetId 
            ? { ...widget, status: newStatus }
            : widget
        )
      );

      toast({
        title: "Widget updated",
        description: `Widget ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      console.error('Error updating widget:', error);
      toast({
        title: "Error",
        description: "Failed to update widget status",
        variant: "destructive",
      });
    }
  };

  const deleteWidget = async (widgetId: string) => {
    if (!confirm('Are you sure you want to delete this widget?')) return;

    try {
      const { error } = await supabase
        .from('widgets')
        .delete()
        .eq('id', widgetId);

      if (error) throw error;

      setWidgets(prev => prev.filter(widget => widget.id !== widgetId));
      
      toast({
        title: "Widget deleted",
        description: "Widget deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting widget:', error);
      toast({
        title: "Error",
        description: "Failed to delete widget",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">My Widgets</h1>
          <Button disabled>
            <Plus className="h-4 w-4 mr-2" />
            Create Widget
          </Button>
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
        <h1 className="text-3xl font-bold">My Widgets</h1>
        <Button asChild>
          <Link to="/widgets/create">
            <Plus className="h-4 w-4 mr-2" />
            Create Widget
          </Link>
        </Button>
      </div>

      {widgets.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">No widgets yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first widget to start displaying social proof notifications on your website.
            </p>
            <Button asChild>
              <Link to="/widgets/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Widget
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {widgets.map((widget) => (
            <Card key={widget.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {widget.name}
                      <Badge variant={widget.status === 'active' ? 'default' : 'secondary'}>
                        {widget.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Template: {widget.template_name} • Created {new Date(widget.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleWidgetStatus(widget.id, widget.status)}
                    >
                      {widget.status === 'active' ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link to={`/widgets/${widget.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteWidget(widget.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Widgets;