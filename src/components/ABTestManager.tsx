import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, FlaskConical, TrendingUp } from 'lucide-react';

interface Variant {
  id: string;
  name: string;
  split_percentage: number;
  is_control: boolean;
  style_config: any;
  content_config: any;
  active: boolean;
  created_at: string;
  stats?: {
    views: number;
    clicks: number;
    conversions: number;
    ctr: number;
    conversionRate: number;
  };
}

interface ABTestManagerProps {
  widgetId: string;
}

const ABTestManager = ({ widgetId }: ABTestManagerProps) => {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    split_percentage: 50,
    style_config: '{}',
    content_config: '{}',
  });

  useEffect(() => {
    loadVariants();
  }, [widgetId]);

  const loadVariants = async () => {
    try {
      // For now, use raw query until types are updated
      const { data, error } = await supabase
        .from('widget_variants' as any)
        .select('*')
        .eq('widget_id', widgetId)
        .order('created_at');

      if (error) throw error;

      // Load performance stats for each variant
      const variantsWithStats = await Promise.all(
        (data || []).map(async (variant: any) => {
          const eventsQuery = await supabase
            .from('events')
            .select('views, clicks, event_type');
          const events = eventsQuery.data as any;

          const stats = (events || []).reduce(
            (acc, event) => ({
              views: acc.views + (event.views || 0),
              clicks: acc.clicks + (event.clicks || 0),
              conversions: acc.conversions + (event.event_type === 'conversion' ? 1 : 0),
              ctr: 0, // calculated below
              conversionRate: 0, // calculated below
            }),
            { views: 0, clicks: 0, conversions: 0, ctr: 0, conversionRate: 0 }
          );

          stats.ctr = stats.views > 0 ? (stats.clicks / stats.views) * 100 : 0;
          stats.conversionRate = stats.views > 0 ? (stats.conversions / stats.views) * 100 : 0;

          return { ...variant, stats };
        })
      );

      setVariants(variantsWithStats);
    } catch (error) {
      console.error('Error loading variants:', error);
      toast({
        title: "Error",
        description: "Failed to load A/B test variants",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let styleConfig = {};
      let contentConfig = {};

      try {
        styleConfig = JSON.parse(formData.style_config);
        contentConfig = JSON.parse(formData.content_config);
      } catch {
        toast({
          title: "Invalid JSON",
          description: "Please check your configuration JSON format",
          variant: "destructive",
        });
        return;
      }

      const variantData = {
        widget_id: widgetId,
        name: formData.name,
        split_percentage: formData.split_percentage,
        is_control: variants.length === 0, // First variant is control
        style_config: styleConfig,
        content_config: contentConfig,
        active: true,
      };

      if (editingVariant) {
        const { error } = await supabase
          .from('widget_variants' as any)
          .update(variantData)
          .eq('id', editingVariant.id);

        if (error) throw error;
        toast({ title: "Variant updated successfully" });
      } else {
        const { error } = await supabase
          .from('widget_variants' as any)
          .insert(variantData);

        if (error) throw error;
        toast({ title: "Variant created successfully" });
      }

      setDialogOpen(false);
      setEditingVariant(null);
      setFormData({ name: '', split_percentage: 50, style_config: '{}', content_config: '{}' });
      loadVariants();
    } catch (error) {
      console.error('Error saving variant:', error);
      toast({
        title: "Error",
        description: "Failed to save variant",
        variant: "destructive",
      });
    }
  };

  const deleteVariant = async (variantId: string) => {
    if (!confirm('Are you sure you want to delete this variant?')) return;

    try {
      const { error } = await supabase
        .from('widget_variants' as any)
        .delete()
        .eq('id', variantId);

      if (error) throw error;

      toast({ title: "Variant deleted successfully" });
      loadVariants();
    } catch (error) {
      console.error('Error deleting variant:', error);
      toast({
        title: "Error",
        description: "Failed to delete variant",
        variant: "destructive",
      });
    }
  };

  const toggleVariantActive = async (variantId: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('widget_variants' as any)
        .update({ active })
        .eq('id', variantId);

      if (error) throw error;

      toast({ 
        title: `Variant ${active ? 'activated' : 'deactivated'} successfully` 
      });
      loadVariants();
    } catch (error) {
      console.error('Error updating variant:', error);
      toast({
        title: "Error",
        description: "Failed to update variant",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (variant: Variant) => {
    setEditingVariant(variant);
    setFormData({
      name: variant.name,
      split_percentage: variant.split_percentage,
      style_config: JSON.stringify(variant.style_config, null, 2),
      content_config: JSON.stringify(variant.content_config, null, 2),
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingVariant(null);
    setFormData({ name: '', split_percentage: 50, style_config: '{}', content_config: '{}' });
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>A/B Testing</CardTitle>
          <CardDescription>Loading variants...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted animate-pulse rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              A/B Testing
            </CardTitle>
            <CardDescription>
              Test different versions of your widget to optimize performance
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Variant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingVariant ? 'Edit Variant' : 'Create New Variant'}
                </DialogTitle>
                <DialogDescription>
                  Configure a new version of your widget for A/B testing
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Variant Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Blue Button"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="split">Traffic Split (%)</Label>
                    <Input
                      id="split"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.split_percentage}
                      onChange={(e) => setFormData(prev => ({ ...prev, split_percentage: Number(e.target.value) }))}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="style_config">Style Configuration (JSON)</Label>
                  <Textarea
                    id="style_config"
                    value={formData.style_config}
                    onChange={(e) => setFormData(prev => ({ ...prev, style_config: e.target.value }))}
                    placeholder='{"color": "#ff0000", "position": "top-right"}'
                    className="font-mono text-sm"
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="content_config">Content Configuration (JSON)</Label>
                  <Textarea
                    id="content_config"
                    value={formData.content_config}
                    onChange={(e) => setFormData(prev => ({ ...prev, content_config: e.target.value }))}
                    placeholder='{"title": "Special Offer!", "message": "Limited time deal"}'
                    className="font-mono text-sm"
                    rows={4}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit">
                    {editingVariant ? 'Update Variant' : 'Create Variant'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {variants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FlaskConical className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No A/B test variants created yet.</p>
            <p className="text-sm">Create variants to test different versions of your widget.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Variant</TableHead>
                <TableHead>Split %</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>CTR</TableHead>
                <TableHead>Conversions</TableHead>
                <TableHead>Conv. Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((variant) => (
                <TableRow key={variant.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {variant.name}
                      {variant.is_control && (
                        <Badge variant="outline">Control</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{variant.split_percentage}%</TableCell>
                  <TableCell>{variant.stats?.views || 0}</TableCell>
                  <TableCell>{variant.stats?.clicks || 0}</TableCell>
                  <TableCell>{(variant.stats?.ctr || 0).toFixed(2)}%</TableCell>
                  <TableCell>{variant.stats?.conversions || 0}</TableCell>
                  <TableCell>{(variant.stats?.conversionRate || 0).toFixed(2)}%</TableCell>
                  <TableCell>
                    <Switch
                      checked={variant.active}
                      onCheckedChange={(checked) => toggleVariantActive(variant.id, checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(variant)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteVariant(variant.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Performance summary */}
        {variants.length > 1 && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Performance Summary
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {variants
                .filter(v => v.active)
                .sort((a, b) => (b.stats?.ctr || 0) - (a.stats?.ctr || 0))
                .map((variant, index) => (
                  <div key={variant.id} className="text-center">
                    <div className="font-medium">{variant.name}</div>
                    <div className="text-muted-foreground">
                      {(variant.stats?.ctr || 0).toFixed(2)}% CTR
                    </div>
                    {index === 0 && variants.filter(v => v.active).length > 1 && (
                      <Badge variant="default" className="mt-1">Best CTR</Badge>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ABTestManager;