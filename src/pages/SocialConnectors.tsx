import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, RefreshCw, Star, MessageSquare, Camera, AlertCircle, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

const connectorTypes = {
  google_reviews: {
    name: 'Google Reviews',
    icon: Star,
    description: 'Sync reviews from Google My Business',
    configFields: [
      { key: 'place_id', label: 'Place ID', type: 'text', required: true },
      { key: 'widget_id', label: 'Target Widget', type: 'select', required: true }
    ]
  },
  twitter: {
    name: 'Twitter',
    icon: MessageSquare,
    description: 'Sync tweets mentioning your brand',
    configFields: [
      { key: 'search_term', label: 'Search Term', type: 'text', required: true }
    ]
  },
  instagram: {
    name: 'Instagram',
    icon: Camera,
    description: 'Sync posts with specific hashtags',
    configFields: [
      { key: 'hashtag', label: 'Hashtag', type: 'text', required: true }
    ]
  }
};

const SocialConnectors: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [connectors, setConnectors] = useState<SocialConnector[]>([]);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: '',
    name: '',
    config: {}
  });
  const [updatingConnector, setUpdatingConnector] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.id) {
      loadConnectors();
      loadWidgets();
    }
  }, [profile]);

  const loadConnectors = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('social_connectors')
        .select('*')
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConnectors(data || []);
    } catch (error) {
      console.error('Error loading connectors:', error);
      toast({
        title: "Error",
        description: "Failed to load social connectors",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await (supabase as any)
        .from('social_connectors')
        .insert({
          type: formData.type,
          name: formData.name,
          config: formData.config,
          user_id: profile?.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Social connector created successfully",
      });

      setIsDialogOpen(false);
      setFormData({ type: '', name: '', config: {} });
      loadConnectors();
    } catch (error) {
      console.error('Error creating connector:', error);
      toast({
        title: "Error",
        description: "Failed to create social connector",
        variant: "destructive",
      });
    }
  };

  const syncConnector = async (connectorId: string, connectorType: string) => {
    const connector = connectors.find(c => c.id === connectorId);
    
    // Check if connector has widget_id configured for Google Reviews
    if (connectorType === 'google_reviews' && !connector?.config?.widget_id) {
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
      if (connectorType === 'google_reviews') {
        functionName = 'google-reviews-sync';
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { 
          connector_id: connectorId,
          widget_id: connector?.config?.widget_id 
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

      loadConnectors();
    } catch (error) {
      console.error('Error syncing connector:', error);
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to start sync",
        variant: "destructive",
      });
    }
  };

  const updateConnectorWidget = async (connectorId: string, widgetId: string) => {
    setUpdatingConnector(connectorId);
    try {
      const { error } = await (supabase as any)
        .from('social_connectors')
        .update({
          config: { 
            ...connectors.find(c => c.id === connectorId)?.config,
            widget_id: widgetId 
          }
        })
        .eq('id', connectorId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Widget configuration updated",
      });

      loadConnectors();
    } catch (error) {
      console.error('Error updating connector:', error);
      toast({
        title: "Error",
        description: "Failed to update widget configuration",
        variant: "destructive",
      });
    } finally {
      setUpdatingConnector(null);
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="space-y-3">
                <div className="h-6 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-10 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Social Connectors</h1>
          <p className="text-muted-foreground">
            Connect social platforms to automatically import social proof
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Connector
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Social Connector</DialogTitle>
              <DialogDescription>
                Connect a social platform to automatically sync social proof content.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Platform</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, type: value, config: {} }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(connectorTypes).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Connector Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Main Store Reviews"
                  required
                />
              </div>

              {formData.type && connectorTypes[formData.type as keyof typeof connectorTypes] && (
                <div className="space-y-4">
                  <h4 className="font-medium">Configuration</h4>
                  {connectorTypes[formData.type as keyof typeof connectorTypes].configFields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={field.key}>{field.label}</Label>
                      {field.type === 'select' && field.key === 'widget_id' ? (
                        <Select
                          value={formData.config[field.key] || ''}
                          onValueChange={(value) => setFormData(prev => ({
                            ...prev,
                            config: { ...prev.config, [field.key]: value }
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
                      ) : (
                        <Input
                          id={field.key}
                          value={formData.config[field.key] || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            config: { ...prev.config, [field.key]: e.target.value }
                          }))}
                          required={field.required}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!formData.type || !formData.name}>
                  Create Connector
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {connectors.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle>No Social Connectors Yet</CardTitle>
            <CardDescription>
              Connect your social platforms to automatically import reviews, mentions, and posts as social proof.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Connector
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {connectors.map((connector) => {
            const connectorConfig = connectorTypes[connector.type as keyof typeof connectorTypes];
            const Icon = connectorConfig?.icon || Settings;
            
            return (
              <Card key={connector.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-lg">{connector.name}</CardTitle>
                        <CardDescription>{connectorConfig?.name}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={getStatusColor(connector.status)}>
                      {connector.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {connector.last_sync && (
                      <p className="text-sm text-muted-foreground">
                        Last sync: {new Date(connector.last_sync).toLocaleDateString()}
                      </p>
                    )}
                    
                    {/* Show widget configuration warning for Google Reviews */}
                    {connector.type === 'google_reviews' && !connector.config?.widget_id && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-amber-600">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm">Widget not configured</span>
                        </div>
                        <Select
                          value=""
                          onValueChange={(value) => updateConnectorWidget(connector.id, value)}
                          disabled={updatingConnector === connector.id}
                        >
                          <SelectTrigger className="h-8">
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
                    )}

                    {/* Show configured widget */}
                    {connector.type === 'google_reviews' && connector.config?.widget_id && (
                      <p className="text-sm text-muted-foreground">
                        Target: {widgets.find(w => w.id === connector.config.widget_id)?.name || 'Unknown Widget'}
                      </p>
                    )}
                    
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => syncConnector(connector.id, connector.type)}
                        className="flex-1"
                        disabled={connector.type === 'google_reviews' && !connector.config?.widget_id}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sync Now
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link to={`/dashboard/social-connectors/${connector.id}`}>
                          <Settings className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SocialConnectors;