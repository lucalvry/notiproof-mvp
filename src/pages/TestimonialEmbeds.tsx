import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebsiteContext } from '@/contexts/WebsiteContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Eye, Code } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function TestimonialEmbeds() {
  const navigate = useNavigate();
  const { currentWebsite } = useWebsiteContext();
  const { toast } = useToast();
  const [embeds, setEmbeds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (currentWebsite) {
      loadEmbeds();
    }
  }, [currentWebsite]);

  const loadEmbeds = async () => {
    if (!currentWebsite) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('testimonial_embeds')
      .select('*')
      .eq('website_id', currentWebsite.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error loading embeds', variant: 'destructive' });
    } else {
      setEmbeds(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('testimonial_embeds')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error deleting embed', variant: 'destructive' });
    } else {
      toast({ title: 'Embed deleted successfully' });
      loadEmbeds();
    }
    setDeleteId(null);
  };

  const getEmbedTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      grid: 'Grid Layout',
      carousel: 'Carousel',
      slider: 'Auto Slider',
      wall: 'Testimonial Wall',
      single: 'Single Featured',
      rating_summary: 'Rating Summary'
    };
    return labels[type] || type;
  };

  if (!currentWebsite) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center text-muted-foreground">
          Please select a website to manage embeds
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Testimonial Embeds</h1>
          <p className="text-muted-foreground">Create embeddable widgets for your website</p>
        </div>
        <Button onClick={() => navigate(`/testimonials/embeds/new?websiteId=${currentWebsite.id}`)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Embed
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading embeds...</div>
      ) : embeds.length === 0 ? (
        <Card className="p-12 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Code className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">No embeds yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first embeddable testimonial widget
            </p>
            <Button onClick={() => navigate(`/testimonials/embeds/new?websiteId=${currentWebsite.id}`)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Embed
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {embeds.map((embed) => (
            <Card key={embed.id} className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{embed.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {getEmbedTypeLabel(embed.embed_type)}
                  </p>
                </div>
                <Badge variant={embed.is_active ? 'default' : 'secondary'}>
                  {embed.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Max: {embed.filters?.limit || 12} testimonials</span>
                {embed.filters?.minRating && (
                  <>
                    <span>•</span>
                    <span>{embed.filters.minRating}+ stars</span>
                  </>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate(`/testimonials/embeds/${embed.id}`)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`/embed/${embed.id}`, '_blank')}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeleteId(embed.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Embed?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this embed. Any websites using this embed code will stop displaying testimonials.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
