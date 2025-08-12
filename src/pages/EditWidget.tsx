import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const templates = [
  {
    id: 'notification-popup',
    name: 'Notification Popup',
    description: 'Clean popup notification in the bottom corner',
    preview: '🔔 Someone from New York just signed up!'
  },
  {
    id: 'live-activity',
    name: 'Live Activity Bar',
    description: 'Horizontal bar showing recent activity',
    preview: '⚡ 12 people are viewing this page right now'
  },
  {
    id: 'social-proof',
    name: 'Social Proof Badge',
    description: 'Compact badge showing social proof',
    preview: '✅ Trusted by 1,000+ customers'
  },
  {
    id: 'urgency-timer',
    name: 'Urgency Timer',
    description: 'Creates urgency with countdown elements',
    preview: '⏰ Limited offer - 2 hours left!'
  },
  {
    id: 'testimonial-popup',
    name: 'Testimonial Popup',
    description: 'Shows customer testimonials and reviews',
    preview: '⭐ "Amazing product!" - Sarah M.'
  }
];

const EditWidget = () => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    template_name: '',
    position: 'bottom-left',
    delay: '3000',
    color: '#3B82F6',
    status: 'active'
  });

  useEffect(() => {
    if (id && profile) {
      fetchWidget();
    }
  }, [id, profile]);

  const fetchWidget = async () => {
    if (!id || !profile) return;

    try {
      const { data: widget, error } = await supabase
        .from('widgets')
        .select('*')
        .eq('id', id)
        .eq('user_id', profile.id)
        .single();

      if (error) throw error;

      if (widget) {
        const styleConfig = widget.style_config as any || {};
        setFormData({
          name: widget.name,
          template_name: widget.template_name,
          position: styleConfig.position || 'bottom-left',
          delay: String(styleConfig.delay || 3000),
          color: styleConfig.color || '#3B82F6',
          status: widget.status
        });
      }
    } catch (error) {
      console.error('Error fetching widget:', error);
      toast({
        title: "Error",
        description: "Failed to load widget",
        variant: "destructive",
      });
      navigate('/dashboard/widgets');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('widgets')
        .update({
          name: formData.name,
          template_name: formData.template_name,
          status: formData.status,
          style_config: {
            position: formData.position,
            delay: parseInt(formData.delay),
            color: formData.color
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', profile.id);

      if (error) throw error;

      toast({
        title: "Widget updated",
        description: "Your widget has been updated successfully!",
      });

      navigate('/dashboard/widgets');
    } catch (error) {
      console.error('Error updating widget:', error);
      toast({
        title: "Error",
        description: "Failed to update widget",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="grid lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-80 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/dashboard/widgets">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Edit Widget</h1>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Widget Configuration</CardTitle>
              <CardDescription>
                Update your social proof widget settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Widget Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Homepage Social Proof"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Template</Label>
                  <div className="grid gap-3 mt-2">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          formData.template_name === template.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setFormData(prev => ({ ...prev, template_name: template.id }))}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{template.name}</h4>
                          {formData.template_name === template.id && (
                            <Badge>Selected</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {template.description}
                        </p>
                        <div className="text-sm bg-muted p-2 rounded">
                          {template.preview}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="position">Position</Label>
                    <Select 
                      value={formData.position} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, position: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom-left">Bottom Left</SelectItem>
                        <SelectItem value="bottom-right">Bottom Right</SelectItem>
                        <SelectItem value="top-left">Top Left</SelectItem>
                        <SelectItem value="top-right">Top Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="delay">Delay (ms)</Label>
                    <Input
                      id="delay"
                      type="number"
                      value={formData.delay}
                      onChange={(e) => setFormData(prev => ({ ...prev, delay: e.target.value }))}
                      min="0"
                      step="500"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="color">Primary Color</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="color"
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      className="w-16 h-10"
                    />
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      placeholder="#3B82F6"
                      className="flex-1"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading || !formData.template_name}>
                  {loading ? 'Updating...' : 'Update Widget'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                See how your updated widget will look
              </CardDescription>
            </CardHeader>
            <CardContent>
              {formData.template_name ? (
                <div className="relative bg-muted rounded-lg p-8 min-h-[300px]">
                  <div 
                    className={`absolute p-4 bg-background border rounded-lg shadow-lg max-w-xs ${
                      formData.position.includes('bottom') ? 'bottom-4' : 'top-4'
                    } ${
                      formData.position.includes('right') ? 'right-4' : 'left-4'
                    } ${
                      formData.status === 'inactive' ? 'opacity-50' : ''
                    }`}
                    style={{ borderLeftColor: formData.color, borderLeftWidth: '4px' }}
                  >
                    <div className="text-sm">
                      {templates.find(t => t.id === formData.template_name)?.preview}
                    </div>
                    {formData.status === 'inactive' && (
                      <div className="text-xs text-muted-foreground mt-1">
                        (Widget is inactive)
                      </div>
                    )}
                  </div>
                  <div className="text-center text-muted-foreground">
                    Website Preview
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Select a template to see preview
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EditWidget;