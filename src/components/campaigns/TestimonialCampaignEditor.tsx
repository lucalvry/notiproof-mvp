import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, Image, Video, Filter, CheckCircle, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TestimonialCampaignEditorProps {
  campaignId: string;
  websiteId: string;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  integrationSettings?: any;
}

export function TestimonialCampaignEditor({
  campaignId,
  websiteId,
  open,
  onClose,
  onSave,
  integrationSettings = {},
}: TestimonialCampaignEditorProps) {
  const [saving, setSaving] = useState(false);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filter settings
  const [minRating, setMinRating] = useState(integrationSettings?.filters?.minRating || 4);
  const [mediaFilter, setMediaFilter] = useState(integrationSettings?.filters?.mediaFilter || 'all');
  const [onlyVerified, setOnlyVerified] = useState(integrationSettings?.filters?.onlyVerified || false);
  
  // Display mode
  const [displayMode, setDisplayMode] = useState<'filtered' | 'selected'>(
    integrationSettings?.selectedTestimonialIds?.length > 0 ? 'selected' : 'filtered'
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(
    integrationSettings?.selectedTestimonialIds || []
  );

  // Load testimonials
  useEffect(() => {
    if (open && websiteId) {
      loadTestimonials();
    }
  }, [open, websiteId]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open && integrationSettings) {
      setMinRating(integrationSettings.filters?.minRating || 4);
      setMediaFilter(integrationSettings.filters?.mediaFilter || 'all');
      setOnlyVerified(integrationSettings.filters?.onlyVerified || false);
      setDisplayMode(integrationSettings.selectedTestimonialIds?.length > 0 ? 'selected' : 'filtered');
      setSelectedIds(integrationSettings.selectedTestimonialIds || []);
    }
  }, [open, integrationSettings]);

  const loadTestimonials = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .eq("website_id", websiteId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTestimonials(data || []);
    } catch (error) {
      console.error("Error loading testimonials:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTestimonial = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(t => t !== id)
        : [...prev, id]
    );
  };

  // Filter testimonials for preview
  const filteredTestimonials = testimonials.filter(t => {
    if (minRating && (t.rating || 0) < minRating) return false;
    if (mediaFilter === 'with_media' && !t.video_url && !t.image_url) return false;
    if (mediaFilter === 'video_only' && !t.video_url) return false;
    return true;
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedSettings = {
        ...integrationSettings,
        filters: {
          minRating,
          mediaFilter,
          onlyVerified,
        },
        selectedTestimonialIds: displayMode === 'selected' ? selectedIds : [],
        displayMode,
      };

      const { error } = await supabase
        .from("campaigns")
        .update({
          integration_settings: updatedSettings,
          native_config: updatedSettings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      if (error) throw error;

      // Update widget style_config with content_alignment
      const { data: widget } = await supabase
        .from("widgets")
        .select("id, style_config")
        .eq("campaign_id", campaignId)
        .single();

      if (widget) {
        const existingConfig = (widget.style_config as any) || {};
        await supabase
          .from("widgets")
          .update({
            style_config: {
              ...existingConfig,
              contentAlignment: updatedSettings.content_alignment || 'top',
            },
          })
          .eq("id", widget.id);
      }

      toast.success("Testimonial campaign updated successfully");
      onSave();
      onClose();
    } catch (error) {
      console.error("Error updating testimonial campaign:", error);
      toast.error("Failed to update campaign");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Testimonial Campaign</DialogTitle>
          <CardDescription>
            Configure which testimonials appear as notifications
          </CardDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
          {/* Filters Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-4 w-4" />
                Display Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Display Mode */}
              <div className="space-y-3">
                <Label>Display Mode</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={displayMode === 'filtered' ? 'default' : 'outline'}
                    className="justify-start"
                    onClick={() => setDisplayMode('filtered')}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Use Filters
                  </Button>
                  <Button
                    variant={displayMode === 'selected' ? 'default' : 'outline'}
                    className="justify-start"
                    onClick={() => setDisplayMode('selected')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Select Specific
                  </Button>
                </div>
              </div>

              {displayMode === 'filtered' && (
                <>
                  {/* Minimum Rating */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Minimum Rating</Label>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < minRating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <Slider
                      min={1}
                      max={5}
                      step={1}
                      value={[minRating]}
                      onValueChange={(v) => setMinRating(v[0])}
                    />
                    <p className="text-xs text-muted-foreground">
                      Only show testimonials with {minRating}+ stars
                    </p>
                  </div>

                  {/* Media Filter */}
                  <div className="space-y-3">
                    <Label>Media Filter</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={mediaFilter === 'all' ? 'default' : 'outline'}
                        onClick={() => setMediaFilter('all')}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        All
                      </Button>
                      <Button
                        size="sm"
                        variant={mediaFilter === 'with_media' ? 'default' : 'outline'}
                        onClick={() => setMediaFilter('with_media')}
                      >
                        <Image className="h-3 w-3 mr-1" />
                        With Media
                      </Button>
                      <Button
                        size="sm"
                        variant={mediaFilter === 'video_only' ? 'default' : 'outline'}
                        onClick={() => setMediaFilter('video_only')}
                      >
                        <Video className="h-3 w-3 mr-1" />
                        Video Only
                      </Button>
                    </div>
                  </div>

                  {/* Verified Only */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Only Verified</Label>
                      <p className="text-xs text-muted-foreground">
                        Show only verified testimonials
                      </p>
                    </div>
                    <Switch
                      checked={onlyVerified}
                      onCheckedChange={setOnlyVerified}
                    />
                  </div>
                </>
              )}

              {/* Summary */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium">
                  {displayMode === 'filtered' 
                    ? `${filteredTestimonials.length} testimonials match filters`
                    : `${selectedIds.length} testimonials selected`
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Testimonials List (for selection mode) */}
          {displayMode === 'selected' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Select Testimonials</CardTitle>
                <CardDescription>
                  Choose specific testimonials to display
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  {loading ? (
                    <p className="text-center text-muted-foreground py-8">Loading...</p>
                  ) : testimonials.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No approved testimonials found
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {testimonials.map((t) => (
                        <div
                          key={t.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedIds.includes(t.id)
                              ? 'border-primary bg-primary/5'
                              : 'hover:border-primary/50'
                          }`}
                          onClick={() => toggleTestimonial(t.id)}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedIds.includes(t.id)}
                              onCheckedChange={() => toggleTestimonial(t.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm truncate">
                                  {t.author_name}
                                </span>
                                {t.rating && (
                                  <div className="flex items-center gap-0.5">
                                    {Array.from({ length: t.rating }).map((_, i) => (
                                      <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    ))}
                                  </div>
                                )}
                                {t.video_url && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Video className="h-2.5 w-2.5 mr-1" />
                                    Video
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {t.message}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Preview for filtered mode */}
          {displayMode === 'filtered' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Matching Testimonials</CardTitle>
                <CardDescription>
                  Preview of testimonials that match your filters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  {loading ? (
                    <p className="text-center text-muted-foreground py-8">Loading...</p>
                  ) : filteredTestimonials.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No testimonials match the current filters
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {filteredTestimonials.slice(0, 10).map((t) => (
                        <div key={t.id} className="p-3 border rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{t.author_name}</span>
                            {t.rating && (
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: t.rating }).map((_, i) => (
                                  <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                ))}
                              </div>
                            )}
                            {t.video_url && (
                              <Badge variant="secondary" className="text-xs">
                                <Video className="h-2.5 w-2.5 mr-1" />
                                Video
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {t.message}
                          </p>
                        </div>
                      ))}
                      {filteredTestimonials.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          +{filteredTestimonials.length - 10} more testimonials
                        </p>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
