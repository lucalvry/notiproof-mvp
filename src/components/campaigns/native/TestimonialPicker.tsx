import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Star, Check, AlertCircle, Image, Video } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface TestimonialPickerProps {
  websiteId: string;
  displayMode: 'specific' | 'filtered';
  selectedTestimonialIds: string[];
  onDisplayModeChange: (mode: 'specific' | 'filtered') => void;
  onTestimonialIdsChange: (ids: string[]) => void;
  testimonialFilters: { minRating: number; mediaFilter: string; onlyVerified: boolean };
  onFiltersChange: (filters: any) => void;
}

export function TestimonialPicker({
  websiteId,
  displayMode,
  selectedTestimonialIds,
  onDisplayModeChange,
  onTestimonialIdsChange,
  testimonialFilters,
  onFiltersChange,
}: TestimonialPickerProps) {
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [estimatedCount, setEstimatedCount] = useState(0);

  useEffect(() => {
    loadTestimonials();
  }, [websiteId, testimonialFilters]);

  async function loadTestimonials() {
    setLoading(true);
    try {
      let query = supabase
        .from('testimonials')
        .select('*')
        .eq('website_id', websiteId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(50);

      // Apply filters for estimate
      if (testimonialFilters.minRating > 1) {
        query = query.gte('rating', testimonialFilters.minRating);
      }

      if (testimonialFilters.onlyVerified) {
        query = query.eq('metadata->>verified_purchase', 'true');
      }

      if (testimonialFilters.mediaFilter === 'text_only') {
        query = query.is('image_url', null).is('video_url', null);
      } else if (testimonialFilters.mediaFilter === 'with_image') {
        query = query.not('image_url', 'is', null);
      } else if (testimonialFilters.mediaFilter === 'with_video') {
        query = query.not('video_url', 'is', null);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setTestimonials(data || []);
      setEstimatedCount(count || data?.length || 0);
    } catch (error) {
      console.error('Error loading testimonials:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleToggleTestimonial = (id: string) => {
    if (selectedTestimonialIds.includes(id)) {
      onTestimonialIdsChange(selectedTestimonialIds.filter(t => t !== id));
    } else {
      onTestimonialIdsChange([...selectedTestimonialIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedTestimonialIds.length === testimonials.length) {
      onTestimonialIdsChange([]);
    } else {
      onTestimonialIdsChange(testimonials.map(t => t.id));
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Select Testimonials
        </CardTitle>
        <CardDescription>
          Choose which testimonials to display in your notification
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={displayMode} onValueChange={(v) => onDisplayModeChange(v as 'specific' | 'filtered')}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="specific" id="specific" />
            <Label htmlFor="specific" className="cursor-pointer font-normal">
              Show specific testimonials (handpicked)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="filtered" id="filtered" />
            <Label htmlFor="filtered" className="cursor-pointer font-normal">
              Show filtered testimonials (auto-rotate)
            </Label>
          </div>
        </RadioGroup>

        {displayMode === 'specific' ? (
          <div className="space-y-4">
            {selectedTestimonialIds.length === 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please select at least one testimonial to display in your notification.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedTestimonialIds.length} of {testimonials.length} testimonials selected
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedTestimonialIds.length === testimonials.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : testimonials.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No approved testimonials found. Please collect some testimonials first.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {testimonials.map(testimonial => (
                  <div
                    key={testimonial.id}
                    className={`flex gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedTestimonialIds.includes(testimonial.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleToggleTestimonial(testimonial.id)}
                  >
                    <div className="flex-shrink-0 pt-1">
                      <Checkbox
                        checked={selectedTestimonialIds.includes(testimonial.id)}
                        onCheckedChange={() => handleToggleTestimonial(testimonial.id)}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{testimonial.author_name}</span>
                          {testimonial.metadata?.verified_purchase && (
                            <Badge variant="secondary" className="text-xs">
                              <Check className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        {renderStars(testimonial.rating)}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {testimonial.message}
                      </p>
                      <div className="flex gap-2 mt-2">
                        {testimonial.image_url && (
                          <Badge variant="outline" className="text-xs">
                            <Image className="h-3 w-3 mr-1" />
                            Image
                          </Badge>
                        )}
                        {testimonial.video_url && (
                          <Badge variant="outline" className="text-xs">
                            <Video className="h-3 w-3 mr-1" />
                            Video
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Testimonials will automatically rotate based on your filter criteria. Approximately {estimatedCount} testimonial(s) match your filters.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Minimum Rating</Label>
              <Select
                value={String(testimonialFilters.minRating)}
                onValueChange={(v) => onFiltersChange({ ...testimonialFilters, minRating: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(rating => (
                    <SelectItem key={rating} value={String(rating)}>
                      {rating} Star{rating > 1 ? 's' : ''} & Above ⭐
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Media Type</Label>
              <Select
                value={testimonialFilters.mediaFilter}
                onValueChange={(v) => onFiltersChange({ ...testimonialFilters, mediaFilter: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Testimonials</SelectItem>
                  <SelectItem value="text_only">Text Only</SelectItem>
                  <SelectItem value="with_image">With Image</SelectItem>
                  <SelectItem value="with_video">With Video</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="verified-filtered"
                checked={testimonialFilters.onlyVerified}
                onCheckedChange={(checked) =>
                  onFiltersChange({ ...testimonialFilters, onlyVerified: checked === true })
                }
              />
              <Label htmlFor="verified-filtered" className="text-sm font-normal cursor-pointer">
                Show only verified purchases
              </Label>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
