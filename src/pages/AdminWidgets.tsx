import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Blocks, Activity, ToggleLeft, ToggleRight, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Widget {
  id: string;
  name: string;
  template_name: string;
  status: string;
  created_at: string;
  user_id: string;
}

const AdminWidgets = () => {
  const { toast } = useToast();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWidgets();
  }, []);

  const fetchWidgets = async () => {
  const { data, error } = await supabase
      .from('widgets')
      .select('*')
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

  const updateWidgetStatus = async (widgetId: string, newStatus: string) => {
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
        widget.id === widgetId ? { ...widget, status: newStatus } : widget
      ));
      toast({
        title: "Widget updated",
        description: `Widget ${newStatus === 'active' ? 'activated' : 'deactivated'}.`,
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
        <div>
          <h1 className="text-3xl font-bold">Widget Management</h1>
          <p className="text-muted-foreground">Manage all widgets across the platform</p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-8 w-1/2" />
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeWidgets = widgets.filter(widget => widget.status === 'active').length;
  const totalWidgets = widgets.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Widget Management</h1>
        <p className="text-muted-foreground">Manage all widgets across the platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Widgets</CardTitle>
            <Blocks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWidgets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Widgets</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeWidgets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Widgets</CardTitle>
            <ToggleLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWidgets - activeWidgets}</div>
          </CardContent>
        </Card>
      </div>

      {/* Widgets Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Widgets</CardTitle>
          <CardDescription>
            A list of all widgets in the platform with their details and actions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {widgets.map((widget) => (
                <TableRow key={widget.id}>
                  <TableCell className="font-medium">{widget.name}</TableCell>
                  <TableCell>User {widget.user_id.slice(0, 8)}</TableCell>
                  <TableCell>{widget.template_name}</TableCell>
                  <TableCell>
                    <Badge variant={widget.status === 'active' ? 'default' : 'secondary'}>
                      {widget.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(widget.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => updateWidgetStatus(
                            widget.id, 
                            widget.status === 'active' ? 'inactive' : 'active'
                          )}
                        >
                          {widget.status === 'active' ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteWidget(widget.id)}
                          className="text-destructive"
                        >
                          Delete Widget
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWidgets;