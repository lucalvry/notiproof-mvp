import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Upload, X } from 'lucide-react';

interface Testimonial {
  id: string;
  author_name: string;
  author_email: string | null;
  author_company?: string | null;
  author_position?: string | null;
  author_avatar_url: string | null;
  rating: number;
  message: string;
  avatar_url: string | null;
  video_url: string | null;
  cta_enabled?: boolean | null;
  cta_text?: string | null;
  cta_url?: string | null;
  metadata: any;
}

interface EditTestimonialDialogProps {
  testimonial: Testimonial | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditTestimonialDialog({
  testimonial,
  open,
  onOpenChange,
  onSuccess,
}: EditTestimonialDialogProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    author_name: '',
    author_email: '',
    author_company: '',
    author_position: '',
    rating: 5,
    message: '',
    avatar_url: '',
    video_url: '',
    cta_enabled: false,
    cta_text: '',
    cta_url: '',
  });

  useEffect(() => {
    if (testimonial) {
      setFormData({
        author_name: testimonial.author_name || '',
        author_email: testimonial.author_email || '',
        author_company: testimonial.author_company || '',
        author_position: testimonial.author_position || '',
        rating: testimonial.rating || 5,
        message: testimonial.message || '',
        avatar_url: testimonial.avatar_url || '',
        video_url: testimonial.video_url || '',
        cta_enabled: !!testimonial.cta_enabled,
        cta_text: testimonial.cta_text || '',
        cta_url: testimonial.cta_url || '',
      });
    }
  }, [testimonial]);

  const handleSave = async () => {
    if (!testimonial) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('testimonials')
        .update({
          author_name: formData.author_name,
          author_email: formData.author_email || null,
          author_company: formData.author_company || null,
          author_position: formData.author_position || null,
          rating: formData.rating,
          message: formData.message,
          author_avatar_url: formData.avatar_url || null,
          image_url: formData.avatar_url || null,
          video_url: formData.video_url || null,
          cta_enabled: formData.cta_enabled,
          cta_text: formData.cta_enabled ? (formData.cta_text || null) : null,
          cta_url: formData.cta_enabled ? (formData.cta_url || null) : null,
        })
        .eq('id', testimonial.id);

      if (error) throw error;

      toast.success('Testimonial updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating testimonial:', error);
      toast.error('Failed to update testimonial');
    } finally {
      setSaving(false);
    }
  };

  if (!testimonial) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Testimonial</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Author Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Author Name *</Label>
            <Input
              id="name"
              value={formData.author_name}
              onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
              placeholder="John Doe"
            />
          </div>

          {/* Author Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Author Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.author_email}
              onChange={(e) => setFormData({ ...formData, author_email: e.target.value })}
              placeholder="john@example.com"
            />
          </div>

          {/* Company & Position */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.author_company}
                onChange={(e) => setFormData({ ...formData, author_company: e.target.value })}
                placeholder="Acme Inc"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={formData.author_position}
                onChange={(e) => setFormData({ ...formData, author_position: e.target.value })}
                placeholder="CEO"
              />
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <Label htmlFor="rating">Rating *</Label>
            <Select
              value={formData.rating.toString()}
              onValueChange={(value) => setFormData({ ...formData, rating: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 Stars ⭐⭐⭐⭐⭐</SelectItem>
                <SelectItem value="4">4 Stars ⭐⭐⭐⭐</SelectItem>
                <SelectItem value="3">3 Stars ⭐⭐⭐</SelectItem>
                <SelectItem value="2">2 Stars ⭐⭐</SelectItem>
                <SelectItem value="1">1 Star ⭐</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Testimonial Message *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Share your experience..."
              rows={5}
            />
          </div>

          {/* Media URLs */}
          <div className="space-y-2">
            <Label htmlFor="avatar">Avatar URL</Label>
            <Input
              id="avatar"
              value={formData.avatar_url}
              onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="video">Video URL</Label>
            <Input
              id="video"
              value={formData.video_url}
              onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>

          <Separator />

          {/* Conversion-driving CTA */}
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <Label htmlFor="cta-enabled" className="text-sm font-semibold">
                  Conversion CTA
                </Label>
                <p className="text-xs text-muted-foreground">
                  Add a clickable button under the testimonial to drive viewers to a specific page.
                  Clicks are attributed to your Impact Goals.
                </p>
              </div>
              <Switch
                id="cta-enabled"
                checked={formData.cta_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, cta_enabled: checked })}
              />
            </div>

            {formData.cta_enabled && (
              <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cta-text">Button Text</Label>
                  <Input
                    id="cta-text"
                    value={formData.cta_text}
                    onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                    placeholder="Shop the Look"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cta-url">Destination URL</Label>
                  <Input
                    id="cta-url"
                    type="url"
                    value={formData.cta_url}
                    onChange={(e) => setFormData({ ...formData, cta_url: e.target.value })}
                    placeholder="https://yoursite.com/products/123"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
