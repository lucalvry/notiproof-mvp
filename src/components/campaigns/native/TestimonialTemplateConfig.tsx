import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface TestimonialTemplateConfigProps {
  websiteId: string;
  config: any;
  onChange: (config: any) => void;
}

interface TestimonialForm {
  id: string;
  name: string;
  slug: string;
}

export function TestimonialTemplateConfig({ 
  websiteId, 
  config, 
  onChange 
}: TestimonialTemplateConfigProps) {
  const [forms, setForms] = useState<TestimonialForm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadForms();
  }, [websiteId]);

  async function loadForms() {
    try {
      const { data, error } = await supabase
        .from('testimonial_forms')
        .select('id, name, slug')
        .eq('website_id', websiteId)
        .eq('is_active', true);

      if (error) throw error;
      setForms(data || []);
    } catch (error) {
      console.error('Error loading forms:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleFormChange = (formId: string) => {
    onChange({
      ...config,
      formId,
    });
  };

  const handleMinRatingChange = (value: number[]) => {
    onChange({
      ...config,
      minRating: value[0],
    });
  };

  const handleOnlyApprovedChange = (checked: boolean) => {
    onChange({
      ...config,
      onlyApproved: checked,
    });
  };

  const handleLimitChange = (value: number[]) => {
    onChange({
      ...config,
      limit: value[0],
    });
  };

  const handleMediaTypeChange = (mediaType: string) => {
    onChange({
      ...config,
      mediaType,
    });
  };

  const handleVerifiedOnlyChange = (checked: boolean) => {
    onChange({
      ...config,
      onlyVerified: checked,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Testimonial Source</CardTitle>
          <CardDescription>
            Choose which testimonial form to display notifications from
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="form">Testimonial Form</Label>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading forms...</div>
            ) : forms.length === 0 ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No testimonial forms found. Create a form first in the Testimonials section.
                </AlertDescription>
              </Alert>
            ) : (
              <Select value={config.formId || ''} onValueChange={handleFormChange}>
                <SelectTrigger id="form">
                  <SelectValue placeholder="Select a form" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Forms</SelectItem>
                  {forms.map(form => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="min-rating">
              Minimum Rating: {config.minRating || 3}
            </Label>
            <Slider
              id="min-rating"
              min={1}
              max={5}
              step={1}
              value={[config.minRating || 3]}
              onValueChange={handleMinRatingChange}
            />
            <p className="text-xs text-muted-foreground">
              Only show testimonials with this rating or higher
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="limit">
              Maximum Testimonials: {config.limit || 50}
            </Label>
            <Slider
              id="limit"
              min={10}
              max={100}
              step={10}
              value={[config.limit || 50]}
              onValueChange={handleLimitChange}
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of testimonials to load
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="media-type">Media Type Filter</Label>
            <Select value={config.mediaType || 'all'} onValueChange={handleMediaTypeChange}>
              <SelectTrigger id="media-type">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="text">Text Only</SelectItem>
                <SelectItem value="image">With Image</SelectItem>
                <SelectItem value="video">With Video</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Filter testimonials by media type
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="approved-only">Only Approved Testimonials</Label>
              <p className="text-xs text-muted-foreground">
                Show only approved testimonials
              </p>
            </div>
            <Switch
              id="approved-only"
              checked={config.onlyApproved !== false}
              onCheckedChange={handleOnlyApprovedChange}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="verified-only">Verified Purchases Only</Label>
              <p className="text-xs text-muted-foreground">
                Show only testimonials from verified purchases
              </p>
            </div>
            <Switch
              id="verified-only"
              checked={config.onlyVerified === true}
              onCheckedChange={handleVerifiedOnlyChange}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
