import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Trash2, RefreshCw, AlertCircle } from 'lucide-react';

interface SocialConnector {
  id: string;
  type: string;
  name: string;
  config: any;
  status: string;
  last_sync: string | null;
  created_at: string;
}

interface Widget {
  id: string;
  name: string;
  status: string;
}

const SocialConnectorDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [connector, setConnector] = useState<SocialConnector | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    config: {}
  });

  useEffect(() => {
    if (profile?.id && id) {
      loadConnector();
      loadWidgets();
    }
  }, [profile, id]);

  const loadWidgets = async () => {
    try {
      const { data, error } = await supabase
        .from('widgets')
        .select('id, name, status')
        .eq('user_id', profile?.id)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setWidgets(data || []);
    } catch (error) {
      console.error('Error loading widgets:', error);
    }
  };

  const loadConnector = async () => {
    try {
      const { data, error } = await supabase
        .from('social_connectors')
        .select('*')
        .eq('id', id)
        .eq('user_id', profile?.id)
        .single();

      if (error) throw error;
      
      setConnector(data);
      setFormData({
        name: data.name,
        config: data.config || {}
      });
    } catch (error) {
      console.error('Error loading connector:', error);
      toast({
        title: "Error",
        description: "Failed to load social connector",
        variant: "destructive",
      });
      navigate('/dashboard/social-connectors');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!connector) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('social_connectors')
        .update({
          name: formData.name,
          config: formData.config
        })
        .eq('id', connector.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Connector updated successfully",
      });

      loadConnector();
    } catch (error) {
      console.error('Error updating connector:', error);
      toast({
        title: "Error",
        description: "Failed to update connector",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!connector) return;
    
    if (!confirm('Are you sure you want to delete this connector? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('social_connectors')
        .delete()
        .eq('id', connector.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Connector deleted successfully",
      });

      navigate('/dashboard/social-connectors');
    } catch (error) {
      console.error('Error deleting connector:', error);
      toast({
        title: "Error",
        description: "Failed to delete connector",
        variant: "destructive",
      });
    }
  };

  const syncConnector = async () => {
    if (!connector) return;
    
    // Check if widget_id is required and configured
    if (connector.type === 'google_reviews' && !connector.config?.widget_id) {
      toast({
        title: "Configuration Required",
        description: "Please configure a target widget before syncing",
        variant: "destructive",
      });
      return;
    }
    
    try {
      let functionName = 'social-sync';
      
      // Use specific function for Google Reviews
      if (connector.type === 'google_reviews') {
        functionName = 'google-reviews-sync';
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { 
          connector_id: connector.id,
          widget_id: connector.config?.widget_id 
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to sync connector');
      }

      toast({
        title: "Success",
        description: data?.reviews_synced ? 
          `Synced ${data.reviews_synced} reviews successfully` : 
          "Sync completed successfully",
      });

      loadConnector();
    } catch (error) {
      console.error('Error syncing connector:', error);
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to start sync",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'error': return 'destructive';
      case 'disabled': return 'secondary';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <Card>
          <CardHeader className="space-y-3">
            <div className="h-6 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="h-10 bg-muted rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!connector) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/social-connectors')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{connector.name}</h1>
            <p className="text-muted-foreground">
              {connector.type === 'google_reviews' ? 'Google Reviews' : 
               connector.type === 'twitter' ? 'Twitter' : 
               connector.type === 'instagram' ? 'Instagram' : connector.type} Connector
            </p>
          </div>
        </div>
        <Badge variant={getStatusColor(connector.status)}>
          {connector.status}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Update your connector settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Connector Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Main Store Reviews"
              />
            </div>

            {connector.type === 'google_reviews' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="place_id">Place ID</Label>
                  <Input
                    id="place_id"
                    value={(formData.config as any).place_id || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      config: { ...prev.config, place_id: e.target.value }
                    }))}
                    placeholder="Your Google My Business Place ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="widget_id">Target Widget</Label>
                  {!connector.config?.widget_id && (
                    <div className="flex items-center space-x-2 text-amber-600 mb-2">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Widget configuration required for syncing</span>
                    </div>
                  )}
                  <Select
                    value={(formData.config as any).widget_id || ''}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      config: { ...prev.config, widget_id: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select target widget" />
                    </SelectTrigger>
                    <SelectContent>
                      {widgets.map((widget) => (
                        <SelectItem key={widget.id} value={widget.id}>
                          {widget.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {connector.type === 'twitter' && (
              <div className="space-y-2">
                <Label htmlFor="search_term">Search Term</Label>
                <Input
                  id="search_term"
                  value={(formData.config as any).search_term || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    config: { ...prev.config, search_term: e.target.value }
                  }))}
                  placeholder="e.g., @yourbrand or #yourhashtag"
                />
              </div>
            )}

            {connector.type === 'instagram' && (
              <div className="space-y-2">
                <Label htmlFor="hashtag">Hashtag</Label>
                <Input
                  id="hashtag"
                  value={(formData.config as any).hashtag || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    config: { ...prev.config, hashtag: e.target.value }
                  }))}
                  placeholder="e.g., yourbrand"
                />
              </div>
            )}

            <div className="flex space-x-2 pt-4">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button 
                variant="outline" 
                onClick={syncConnector}
                disabled={connector.type === 'google_reviews' && !connector.config?.widget_id}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Now
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sync Information</CardTitle>
            <CardDescription>
              View sync history and status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Last Sync</Label>
              <p className="text-sm text-muted-foreground">
                {connector.last_sync 
                  ? new Date(connector.last_sync).toLocaleString()
                  : 'Never synced'
                }
              </p>
            </div>

            <div className="space-y-2">
              <Label>Created</Label>
              <p className="text-sm text-muted-foreground">
                {new Date(connector.created_at).toLocaleString()}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Badge variant={getStatusColor(connector.status)}>
                {connector.status}
              </Badge>
            </div>

            <div className="pt-4 border-t">
              <Button variant="destructive" onClick={handleDelete} className="w-full">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Connector
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SocialConnectorDetail;