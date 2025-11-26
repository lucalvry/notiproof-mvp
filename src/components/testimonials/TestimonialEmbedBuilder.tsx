import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Copy, Code, Eye, Save, ArrowLeft, Info, AlertTriangle } from 'lucide-react';
import { TestimonialEmbedPreview } from './TestimonialEmbedPreview';

interface EmbedConfig {
  id?: string;
  name: string;
  embed_type: 'grid' | 'carousel' | 'slider' | 'wall' | 'single' | 'rating_summary' | 
    'marquee_horizontal' | 'marquee_vertical' | 'masonry' | 'video_wall' | 
    'rating_badge_inline' | 'rating_badge_floating' | 'bubble_stack' | 'timeline' | 
    'featured_hero' | 'compact_list' | 'card_flip' | '3d_carousel' | 'widget_popup' | 
    'social_feed' | 'ticker_bar';
  filters: {
    minRating?: number;
    formIds?: string[];
    tags?: string[];
    status: 'approved';
    limit?: number;
  };
  style_config: {
    primaryColor: string;
    backgroundColor: string;
    textColor: string;
    borderRadius: string;
    spacing: string;
    columns?: number;
    autoplay?: boolean;
    showAvatar: boolean;
    showRating: boolean;
    showDate: boolean;
    // Marquee-specific
    speed?: 'slow' | 'medium' | 'fast';
    direction?: 'left' | 'right' | 'up' | 'down';
    pauseOnHover?: boolean;
    // Video wall-specific
    playMode?: 'click' | 'hover' | 'auto';
    showPlayButton?: boolean;
    thumbnailQuality?: 'low' | 'high';
    // Badge-specific
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    size?: 'sm' | 'md' | 'lg';
    // Senja-style presets
    layoutPreset?: 'candy_carousel' | 'mayen_carousel' | 'loppa_carousel' | 
      'single_video' | 'social_star' | 'bold_highlights' | 'testimonial_masonry';
  };
  is_active: boolean;
}

interface TestimonialEmbedBuilderProps {
  websiteId: string;
  embedId?: string;
}

export function TestimonialEmbedBuilder({ websiteId, embedId }: TestimonialEmbedBuilderProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [forms, setForms] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  
  const [config, setConfig] = useState<EmbedConfig>({
    name: 'New Testimonial Embed',
    embed_type: 'grid',
    filters: {
      status: 'approved',
      limit: 12
    },
    style_config: {
      primaryColor: '#8B5CF6',
      backgroundColor: '#FFFFFF',
      textColor: '#1F2937',
      borderRadius: '12px',
      spacing: '16px',
      columns: 3,
      autoplay: true,
      showAvatar: true,
      showRating: true,
      showDate: true
    },
    is_active: true
  });

  useEffect(() => {
    loadForms();
    loadTestimonials();
    if (embedId) {
      loadEmbed();
    }
  }, [embedId]);

  const loadTestimonials = async () => {
    const { data } = await supabase
      .from('testimonials')
      .select('*')
      .eq('website_id', websiteId)
      .eq('status', 'approved')
      .limit(10);
    
    if (data) setTestimonials(data);
  };

  const loadForms = async () => {
    const { data } = await supabase
      .from('testimonial_forms')
      .select('id, name')
      .eq('website_id', websiteId)
      .eq('is_active', true);
    
    if (data) setForms(data);
  };

  const loadEmbed = async () => {
    if (!embedId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('testimonial_embeds')
      .select('*')
      .eq('id', embedId)
      .single();

    if (error) {
      toast({ title: 'Error loading embed', variant: 'destructive' });
    } else if (data) {
      setConfig({
        id: data.id,
        name: data.name,
        embed_type: data.embed_type as EmbedConfig['embed_type'],
        filters: data.filters as EmbedConfig['filters'],
        style_config: data.style_config as EmbedConfig['style_config'],
        is_active: data.is_active
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const embedData = {
      ...config,
      user_id: user.id,
      website_id: websiteId
    };

    let result;
    if (embedId) {
      result = await supabase
        .from('testimonial_embeds')
        .update(embedData)
        .eq('id', embedId);
    } else {
      result = await supabase
        .from('testimonial_embeds')
        .insert([embedData])
        .select()
        .single();
    }

    setSaving(false);

    if (result.error) {
      toast({ title: 'Error saving embed', variant: 'destructive' });
    } else {
      toast({ title: 'Embed saved successfully!' });
      if (!embedId && result.data) {
        navigate(`/testimonials/embeds/${result.data.id}`);
      }
    }
  };

  const generateEmbedCode = () => {
    const embedUrl = `${window.location.origin}/embed/${embedId || 'EMBED_ID'}`;
    return {
      script: `<script src="${embedUrl}.js" async></script>\n<div id="notiproof-testimonials"></div>`,
      iframe: `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0"></iframe>`,
      react: `import { TestimonialEmbed } from '@notiproof/react';\n\n<TestimonialEmbed embedId="${embedId || 'EMBED_ID'}" />`
    };
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard!' });
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading embed configuration...</div>;
  }

  const embedCodes = generateEmbedCode();

  // Get embed type metadata
  const embedTypeInfo: Record<string, { description: string; bestFor: string; requiresMedia?: string }> = {
    grid: { description: 'Classic grid layout', bestFor: 'Landing pages, testimonial sections' },
    carousel: { description: 'Horizontal scrolling cards', bestFor: 'Product pages, hero sections' },
    slider: { description: 'Auto-rotating slider', bestFor: 'Homepage banners, feature highlights' },
    wall: { description: 'Masonry wall layout', bestFor: 'Showcase pages, portfolios' },
    single: { description: 'Single featured testimonial', bestFor: 'Above-the-fold sections, CTAs' },
    rating_summary: { description: 'Rating overview with testimonials', bestFor: 'Product pages, trust badges' },
    marquee_horizontal: { description: 'Infinite horizontal scroll', bestFor: 'Header/footer, continuous display' },
    marquee_vertical: { description: 'Infinite vertical scroll', bestFor: 'Sidebar widgets, social proof bars' },
    masonry: { description: 'Pinterest-style grid', bestFor: 'Gallery pages, content hubs' },
    video_wall: { description: 'Grid of video testimonials', bestFor: 'Video showcase, case studies', requiresMedia: 'video' },
    rating_badge_inline: { description: 'Compact rating badge', bestFor: 'Navigation bars, footers' },
    rating_badge_floating: { description: 'Fixed position badge', bestFor: 'Persistent social proof, trust indicators' },
    bubble_stack: { description: 'Chat-style speech bubbles', bestFor: 'Conversational layouts, mobile apps' },
    timeline: { description: 'Chronological timeline', bestFor: 'Customer journey, case studies' },
    featured_hero: { description: 'Large hero testimonial', bestFor: 'Landing pages, above-the-fold sections' },
    compact_list: { description: 'Minimal list view', bestFor: 'Sidebars, quick reviews' },
    card_flip: { description: 'Interactive flip cards', bestFor: 'Interactive pages, engagement' },
    '3d_carousel': { description: '3D rotating carousel', bestFor: 'Modern landing pages (coming soon)' },
    widget_popup: { description: 'Click-to-expand widget', bestFor: 'Non-intrusive social proof (coming soon)' },
    social_feed: { description: 'Instagram-style feed', bestFor: 'Social proof walls, UGC displays' },
    ticker_bar: { description: 'Scrolling ticker bar', bestFor: 'Bottom/top bars, notifications' }
  };

  const currentInfo = embedTypeInfo[config.embed_type] || { description: '', bestFor: '' };

  // Check for warnings
  const warnings = [];
  if (config.embed_type === 'video_wall') {
    const videoCount = testimonials.filter(t => t.video_url).length;
    if (videoCount === 0) {
      warnings.push('Video Wall requires testimonials with video. No video testimonials found.');
    } else if (videoCount < 3) {
      warnings.push(`Video Wall works best with at least 3 video testimonials. Currently: ${videoCount}`);
    }
  }
  
  if (config.embed_type === 'rating_summary' || config.embed_type === 'rating_badge_inline' || config.embed_type === 'rating_badge_floating') {
    const ratedCount = testimonials.filter(t => t.rating).length;
    if (ratedCount === 0) {
      warnings.push('Rating displays require testimonials with ratings. No rated testimonials found.');
    }
  }

  // Video preset warnings
  if (config.style_config.layoutPreset === 'single_video' || config.style_config.layoutPreset === 'loppa_carousel') {
    const videoCount = testimonials.filter(t => t.video_url).length;
    if (videoCount === 0) {
      warnings.push(`${config.style_config.layoutPreset === 'single_video' ? 'Single Video Hero' : 'Loppa Carousel'} works best with video testimonials. No video testimonials found.`);
    }
  }

  if (testimonials.length === 0) {
    warnings.push('No approved testimonials found. Approve some testimonials to see them in the preview.');
  }

  return (
    <TooltipProvider>
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/testimonials')} className="shrink-0">
            <ArrowLeft className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Back</span>
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold truncate">Testimonial Embed Builder</h1>
            <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">Create embeddable testimonial widgets for your website</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Embed'}
        </Button>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {warnings.map((warning, idx) => (
                <li key={idx} className="text-sm">{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Configuration Panel */}
        <Card className="p-4 md:p-6 space-y-4 md:space-y-6">
          <div className="space-y-4">
            <div>
              <Label>Embed Name</Label>
              <Input
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                placeholder="e.g., Homepage Testimonials"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label>Display Style</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">{currentInfo.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">Best for: {currentInfo.bestFor}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select
                value={config.embed_type}
                onValueChange={(value: any) => setConfig({ ...config, embed_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[9999] bg-popover max-h-[400px] overflow-y-auto">
                  <SelectItem value="grid">📊 Grid Layout</SelectItem>
                  <SelectItem value="carousel">🎠 Carousel</SelectItem>
                  <SelectItem value="slider">⏩ Auto Slider</SelectItem>
                  <SelectItem value="wall">🧱 Testimonial Wall</SelectItem>
                  <SelectItem value="single">⭐ Single Featured</SelectItem>
                  <SelectItem value="rating_summary">📈 Rating Summary</SelectItem>
                  
                  <Separator className="my-2" />
                  
                  <SelectItem value="marquee_horizontal">➡️ Marquee (Horizontal)</SelectItem>
                  <SelectItem value="marquee_vertical">⬆️ Marquee (Vertical)</SelectItem>
                  
                  <Separator className="my-2" />
                  
                  <SelectItem value="masonry">🧱 Masonry Grid</SelectItem>
                  <SelectItem value="video_wall">🎥 Video Wall</SelectItem>
                  
                  <Separator className="my-2" />
                  
                  <SelectItem value="rating_badge_inline">⭐ Rating Badge (Inline)</SelectItem>
                  <SelectItem value="rating_badge_floating">📌 Rating Badge (Floating)</SelectItem>
                  
                  <Separator className="my-2" />
                  
                  <SelectItem value="bubble_stack">💬 Bubble Stack</SelectItem>
                  <SelectItem value="card_flip">🔄 Flip Cards</SelectItem>
                  <SelectItem value="3d_carousel">🌐 3D Carousel</SelectItem>
                  <SelectItem value="widget_popup">🔲 Popup Widget</SelectItem>
                  
                  <Separator className="my-2" />
                  
                  <SelectItem value="timeline">📅 Timeline</SelectItem>
                  <SelectItem value="social_feed">📸 Social Feed</SelectItem>
                  <SelectItem value="ticker_bar">📰 Ticker Bar</SelectItem>
                  
                  <Separator className="my-2" />
                  
                  <SelectItem value="featured_hero">🌟 Featured Hero</SelectItem>
                  <SelectItem value="compact_list">📝 Compact List</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Preset Selector - conditional based on embed_type */}
            {['carousel', 'single', 'grid', 'masonry'].includes(config.embed_type) && (
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <Label>Style Preset</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">Choose a pre-designed layout inspired by popular testimonial widgets</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Select
                  value={config.style_config.layoutPreset || 'default'}
                  onValueChange={(value: any) =>
                    setConfig({
                      ...config,
                      style_config: { 
                        ...config.style_config, 
                        layoutPreset: value === 'default' ? undefined : value 
                      },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999] bg-popover">
                    <SelectItem value="default">Default</SelectItem>
                    {config.embed_type === 'carousel' && (
                      <>
                        <SelectItem value="candy_carousel">🍬 Candy Carousel</SelectItem>
                        <SelectItem value="mayen_carousel">✨ Mayen Carousel</SelectItem>
                        <SelectItem value="loppa_carousel">📸 Loppa Carousel</SelectItem>
                      </>
                    )}
                    {config.embed_type === 'single' && (
                      <SelectItem value="single_video">🎥 Single Video Hero</SelectItem>
                    )}
                    {config.embed_type === 'grid' && (
                      <>
                        <SelectItem value="social_star">⭐ Social Star</SelectItem>
                        <SelectItem value="bold_highlights">💬 Bold Highlights</SelectItem>
                      </>
                    )}
                    {config.embed_type === 'masonry' && (
                      <SelectItem value="testimonial_masonry">🧱 Testimonial Masonry</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Pre-designed looks for modern testimonial displays
                </p>
              </div>
            )}

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Filters</h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Control which testimonials appear in your embed</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              <div>
                <Label>Minimum Rating</Label>
                <Select
                  value={config.filters.minRating?.toString() || 'all'}
                  onValueChange={(value) => setConfig({
                    ...config,
                    filters: { ...config.filters, minRating: value === 'all' ? undefined : parseInt(value) }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[9999] bg-popover">
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="5">5 Stars Only</SelectItem>
                    <SelectItem value="4">4+ Stars</SelectItem>
                    <SelectItem value="3">3+ Stars</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Maximum Testimonials</Label>
                <Input
                  type="number"
                  value={config.filters.limit || 12}
                  onChange={(e) => setConfig({
                    ...config,
                    filters: { ...config.filters, limit: parseInt(e.target.value) }
                  })}
                  min={1}
                  max={100}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Styling</h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Customize colors and appearance to match your brand</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={config.style_config.primaryColor}
                      onChange={(e) => setConfig({
                        ...config,
                        style_config: { ...config.style_config, primaryColor: e.target.value }
                      })}
                      className="w-16 h-10"
                    />
                    <Input
                      value={config.style_config.primaryColor}
                      onChange={(e) => setConfig({
                        ...config,
                        style_config: { ...config.style_config, primaryColor: e.target.value }
                      })}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Background Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={config.style_config.backgroundColor}
                      onChange={(e) => setConfig({
                        ...config,
                        style_config: { ...config.style_config, backgroundColor: e.target.value }
                      })}
                      className="w-16 h-10"
                    />
                    <Input
                      value={config.style_config.backgroundColor}
                      onChange={(e) => setConfig({
                        ...config,
                        style_config: { ...config.style_config, backgroundColor: e.target.value }
                      })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {config.embed_type === 'grid' && (
                <div>
                  <Label>Columns</Label>
                  <Select
                    value={config.style_config.columns?.toString() || '3'}
                    onValueChange={(value) => setConfig({
                      ...config,
                      style_config: { ...config.style_config, columns: parseInt(value) }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[9999] bg-popover">
                      <SelectItem value="1">1 Column</SelectItem>
                      <SelectItem value="2">2 Columns</SelectItem>
                      <SelectItem value="3">3 Columns</SelectItem>
                      <SelectItem value="4">4 Columns</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Marquee Controls */}
              {(config.embed_type === 'marquee_horizontal' || config.embed_type === 'marquee_vertical') && (
                <>
                  <Alert className="mb-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Marquee displays scroll continuously. Adjust speed and pause behavior for best user experience.
                    </AlertDescription>
                  </Alert>
                  <div>
                    <Label>Speed</Label>
                    <Select
                      value={config.style_config.speed || 'medium'}
                      onValueChange={(value: any) => setConfig({
                        ...config,
                        style_config: { ...config.style_config, speed: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[9999] bg-popover">
                        <SelectItem value="slow">Slow</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="fast">Fast</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Pause on Hover</Label>
                    <input
                      type="checkbox"
                      checked={config.style_config.pauseOnHover ?? true}
                      onChange={(e) => setConfig({
                        ...config,
                        style_config: { ...config.style_config, pauseOnHover: e.target.checked }
                      })}
                      className="h-4 w-4"
                    />
                  </div>
                </>
              )}

              {/* Video Wall Controls */}
              {config.embed_type === 'video_wall' && (
                <>
                  <Alert className="mb-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Video Wall only displays testimonials with video content. Ensure you have video testimonials approved.
                    </AlertDescription>
                  </Alert>
                  <div>
                    <Label>Play Mode</Label>
                    <Select
                      value={config.style_config.playMode || 'click'}
                      onValueChange={(value: any) => setConfig({
                        ...config,
                        style_config: { ...config.style_config, playMode: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[9999] bg-popover">
                        <SelectItem value="click">Click to Play</SelectItem>
                        <SelectItem value="hover">Hover to Play</SelectItem>
                        <SelectItem value="auto">Auto Play</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Show Play Button</Label>
                    <input
                      type="checkbox"
                      checked={config.style_config.showPlayButton ?? true}
                      onChange={(e) => setConfig({
                        ...config,
                        style_config: { ...config.style_config, showPlayButton: e.target.checked }
                      })}
                      className="h-4 w-4"
                    />
                  </div>
                </>
              )}

              {/* Badge Position */}
              {config.embed_type === 'rating_badge_floating' && (
                <>
                  <div>
                    <Label>Position</Label>
                    <Select
                      value={config.style_config.position || 'bottom-right'}
                      onValueChange={(value: any) => setConfig({
                        ...config,
                        style_config: { ...config.style_config, position: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[9999] bg-popover">
                        <SelectItem value="top-left">Top Left</SelectItem>
                        <SelectItem value="top-right">Top Right</SelectItem>
                        <SelectItem value="bottom-left">Bottom Left</SelectItem>
                        <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Size</Label>
                    <Select
                      value={config.style_config.size || 'md'}
                      onValueChange={(value: any) => setConfig({
                        ...config,
                        style_config: { ...config.style_config, size: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[9999] bg-popover">
                        <SelectItem value="sm">Small</SelectItem>
                        <SelectItem value="md">Medium</SelectItem>
                        <SelectItem value="lg">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Preview Panel */}
        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <h3 className="font-semibold">Live Preview</h3>
            </div>
            <Badge variant={config.is_active ? 'default' : 'secondary'}>
              {config.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="border rounded-lg p-2 md:p-4 bg-muted/30 min-h-[300px] md:min-h-[400px] overflow-auto">
            <TestimonialEmbedPreview config={config} websiteId={websiteId} />
          </div>
          
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>💡 Tip:</strong> This preview shows how your embed will look. Save your changes to get the embed code.
            </AlertDescription>
          </Alert>
        </Card>
      </div>

      {/* Embed Codes */}
      {embedId && (
        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Code className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Embed Codes</h3>
          </div>
          
          <Tabs defaultValue="script" className="w-full">
            <TabsList>
              <TabsTrigger value="script">Script Tag</TabsTrigger>
              <TabsTrigger value="iframe">iFrame</TabsTrigger>
              <TabsTrigger value="react">React Component</TabsTrigger>
            </TabsList>

            <TabsContent value="script" className="space-y-2">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{embedCodes.script}</code>
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(embedCodes.script)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Paste this code anywhere in your HTML where you want the testimonials to appear.
              </p>
            </TabsContent>

            <TabsContent value="iframe" className="space-y-2">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{embedCodes.iframe}</code>
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(embedCodes.iframe)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use an iframe for maximum isolation and compatibility.
              </p>
            </TabsContent>

            <TabsContent value="react" className="space-y-2">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{embedCodes.react}</code>
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(embedCodes.react)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                For React apps, install <code className="bg-muted px-1 rounded">@notiproof/react</code> first.
              </p>
            </TabsContent>
          </Tabs>
        </Card>
      )}
      </div>
    </TooltipProvider>
  );
}
