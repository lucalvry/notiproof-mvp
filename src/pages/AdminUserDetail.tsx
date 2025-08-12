import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const AdminUserDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [widgets, setWidgets] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
      setProfile(p);
      const { data: w } = await supabase.from('widgets').select('*').eq('user_id', id).order('created_at', { ascending: false });
      setWidgets(w || []);
      const { data: e } = await supabase.from('events').select('id, event_type, created_at').in('widget_id', (w || []).map((x:any) => x.id)).order('created_at', { ascending: false }).limit(50);
      setEvents(e || []);
    })();
  }, [id]);

  const ctr = useMemo(() => {
    // naive estimate based on counts
    const clicks = events.filter((e) => e.event_type === 'click').length;
    const views = events.filter((e) => e.event_type === 'view').length || 1;
    return ((clicks / views) * 100).toFixed(1);
  }, [events]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Detail</h1>
          <p className="text-muted-foreground">Overview, widgets and events</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Account info</CardDescription>
          </CardHeader>
          <CardContent>
            {profile ? (
              <div className="space-y-2">
                <div><span className="text-sm text-muted-foreground">Name</span><div className="font-medium">{profile.name}</div></div>
                <div><span className="text-sm text-muted-foreground">Role</span><div className="font-medium">{profile.role}</div></div>
                <div><span className="text-sm text-muted-foreground">Status</span><div className="font-medium">{profile.status}</div></div>
                <div><span className="text-sm text-muted-foreground">Joined</span><div className="font-medium">{new Date(profile.created_at).toLocaleString()}</div></div>
              </div>
            ) : (
              <div className="text-muted-foreground">Loading...</div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Widgets</CardTitle>
            <CardDescription>Owned by this user</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {widgets.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell><Link className="text-primary underline" to={`/admin/widgets/${w.id}`}>{w.name}</Link></TableCell>
                    <TableCell>{w.template_name}</TableCell>
                    <TableCell>{w.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
          <CardDescription>Last 50 events</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{new Date(e.created_at).toLocaleString()}</TableCell>
                  <TableCell>{e.event_type}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUserDetail;
