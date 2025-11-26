import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Star, User, AlertCircle, Info } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TestimonialEmbedPreviewProps {
  config: any;
  websiteId: string;
}

export function TestimonialEmbedPreview({ config, websiteId }: TestimonialEmbedPreviewProps) {
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTestimonials();
  }, [config.filters, websiteId]);

  const loadTestimonials = async () => {
    setLoading(true);
    
    try {
      let query = supabase
        .from('testimonials')
        .select('*')
        .eq('website_id', websiteId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (config.filters.minRating) {
        query = query.gte('rating', config.filters.minRating);
      }

      if (config.filters.limit) {
        query = query.limit(config.filters.limit);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      setTestimonials(data || []);
    } catch (error) {
      console.error('Error loading testimonials:', error);
      setTestimonials([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-muted-foreground">Loading preview...</span>
      </div>
    );
  }

  if (testimonials.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>No testimonials found.</strong>
          <br />
          <span className="text-xs">Approve some testimonials in the Moderation section to see them here.</span>
        </AlertDescription>
      </Alert>
    );
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className="h-4 w-4"
            fill={star <= rating ? config.style_config.primaryColor : 'none'}
            stroke={star <= rating ? config.style_config.primaryColor : 'currentColor'}
          />
        ))}
      </div>
    );
  };

  const renderTestimonialCard = (testimonial: any) => (
    <Card
      key={testimonial.id}
      className="p-3 md:p-4 space-y-2 md:space-y-3 transition-all hover:shadow-lg"
      style={{
        backgroundColor: config.style_config.backgroundColor,
        color: config.style_config.textColor,
        borderRadius: config.style_config.borderRadius
      }}
    >
      {config.style_config.showRating && testimonial.rating && (
        <div className="flex items-center justify-between">
          {renderStars(testimonial.rating)}
          {config.style_config.showDate && (
            <span className="text-xs opacity-60">
              {new Date(testimonial.created_at).toLocaleDateString()}
            </span>
          )}
        </div>
      )}

      {testimonial.message && (
        <p className="text-sm leading-relaxed">{testimonial.message}</p>
      )}

      {config.style_config.showAvatar && (
        <div className="flex items-center gap-3 pt-2">
          <Avatar className="h-10 w-10">
            <AvatarImage src={testimonial.avatar_url} />
            <AvatarFallback>
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold text-sm">{testimonial.name}</div>
            {testimonial.company && (
              <div className="text-xs opacity-60">{testimonial.company}</div>
            )}
          </div>
        </div>
      )}

      {testimonial.video_url && (
        <video
          src={testimonial.video_url}
          controls
          className="w-full rounded-lg"
          style={{ borderRadius: config.style_config.borderRadius }}
        />
      )}
    </Card>
  );

  // Senja-style preset renderers
  const renderCandyCarouselCard = (testimonial: any) => (
    <div key={testimonial.id} className="relative p-6 rounded-2xl shadow-lg" style={{ background: `linear-gradient(135deg, ${config.style_config.primaryColor}, ${config.style_config.primaryColor}dd)` }}>
      <Card className="p-4 space-y-3" style={{ backgroundColor: config.style_config.backgroundColor, borderRadius: config.style_config.borderRadius }}>
        {testimonial.rating && <div className="flex justify-center mb-2">{renderStars(testimonial.rating)}</div>}
        <p className="text-sm text-center" style={{ color: config.style_config.textColor }}>{testimonial.message}</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Avatar className="h-10 w-10">
            <AvatarImage src={testimonial.avatar_url} />
            <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
          </Avatar>
          <div className="text-center">
            <div className="font-semibold text-sm" style={{ color: config.style_config.textColor }}>{testimonial.name}</div>
            {testimonial.company && <div className="text-xs opacity-60" style={{ color: config.style_config.textColor }}>{testimonial.company}</div>}
          </div>
        </div>
      </Card>
    </div>
  );

  const renderMayenCarouselCard = (testimonial: any) => (
    <Card key={testimonial.id} className="p-6 space-y-4" style={{ backgroundColor: config.style_config.backgroundColor, borderRadius: config.style_config.borderRadius }}>
      {testimonial.rating && <div className="flex mb-2">{renderStars(testimonial.rating)}</div>}
      <p className="text-lg font-semibold leading-relaxed" style={{ color: config.style_config.textColor }}>
        {testimonial.message?.split(' ').map((word: string, idx: number) => 
          idx % 5 === 0 && idx > 0 ? (
            <span key={idx} className="px-1 py-0.5 rounded" style={{ backgroundColor: `${config.style_config.primaryColor}33` }}>{word} </span>
          ) : (
            word + ' '
          )
        )}
      </p>
      <div className="flex items-center gap-2 pt-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={testimonial.avatar_url} />
          <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
        </Avatar>
        <div className="text-xs" style={{ color: config.style_config.textColor }}>
          <div className="font-semibold">{testimonial.name}</div>
          {testimonial.company && <div className="opacity-60">{testimonial.company}</div>}
        </div>
      </div>
    </Card>
  );

  const renderLoppaCarouselCard = (testimonial: any) => (
    <Card key={testimonial.id} className="overflow-hidden" style={{ borderRadius: config.style_config.borderRadius }}>
      <div className="relative h-64 bg-gradient-to-br from-muted to-muted/50">
        {testimonial.video_url ? (
          <video src={testimonial.video_url} className="w-full h-full object-cover" />
        ) : testimonial.image_url ? (
          <img src={testimonial.image_url} className="w-full h-full object-cover" alt="" />
        ) : testimonial.avatar_url ? (
          <img src={testimonial.avatar_url} className="w-full h-full object-cover" alt="" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className="h-16 w-16 opacity-20" />
          </div>
        )}
        {testimonial.rating && (
          <div className="absolute bottom-2 left-2 bg-background/90 px-2 py-1 rounded">
            {renderStars(testimonial.rating)}
          </div>
        )}
      </div>
      <div className="p-4 space-y-2" style={{ backgroundColor: config.style_config.backgroundColor }}>
        <div className="font-semibold" style={{ color: config.style_config.textColor }}>{testimonial.name}</div>
        {testimonial.company && <div className="text-xs opacity-60" style={{ color: config.style_config.textColor }}>{testimonial.company}</div>}
        <p className="text-sm line-clamp-2" style={{ color: config.style_config.textColor }}>{testimonial.message}</p>
      </div>
    </Card>
  );

  const renderSocialStarCard = (testimonial: any) => (
    <Card key={testimonial.id} className="p-4 flex items-center gap-4" style={{ backgroundColor: config.style_config.backgroundColor, borderRadius: '999px' }}>
      <Avatar className="h-12 w-12 shrink-0">
        <AvatarImage src={testimonial.avatar_url} />
        <AvatarFallback><User className="h-6 w-6" /></AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <p className="text-sm font-medium mb-1" style={{ color: config.style_config.textColor }}>"{testimonial.message?.substring(0, 80)}..."</p>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs" style={{ color: config.style_config.textColor }}>{testimonial.name}</span>
          {testimonial.rating && renderStars(testimonial.rating)}
        </div>
      </div>
    </Card>
  );

  const renderBoldHighlightCard = (testimonial: any) => (
    <div key={testimonial.id} className="text-center space-y-4 p-6">
      {testimonial.rating && <div className="flex justify-center mb-3">{renderStars(testimonial.rating)}</div>}
      <p className="text-2xl font-bold leading-tight" style={{ color: config.style_config.textColor }}>
        "{testimonial.message}"
      </p>
      <div className="flex items-center justify-center gap-3 pt-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={testimonial.avatar_url} />
          <AvatarFallback><User className="h-6 w-6" /></AvatarFallback>
        </Avatar>
        <div className="text-left">
          <div className="font-semibold" style={{ color: config.style_config.textColor }}>{testimonial.name}</div>
          {testimonial.company && <div className="text-sm opacity-60" style={{ color: config.style_config.textColor }}>{testimonial.company}</div>}
        </div>
      </div>
    </div>
  );

  // Grid Layout
  if (config.embed_type === 'grid') {
    const preset = config.style_config.layoutPreset;
    const columns = config.style_config.columns || 3;

    // Social Star Preset
    if (preset === 'social_star') {
      return (
        <div className="space-y-4">
          {testimonials.map(renderSocialStarCard)}
        </div>
      );
    }

    // Bold Highlights Preset
    if (preset === 'bold_highlights') {
      return (
        <div className="grid gap-8" style={{ gridTemplateColumns: `repeat(${Math.min(columns, 2)}, 1fr)` }}>
          {testimonials.map(renderBoldHighlightCard)}
        </div>
      );
    }

    // Default Grid
    return (
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: config.style_config.spacing
        }}
      >
        {testimonials.map(renderTestimonialCard)}
      </div>
    );
  }

  // Carousel Layout
  if (config.embed_type === 'carousel') {
    const preset = config.style_config.layoutPreset;

    // Candy Carousel Preset
    if (preset === 'candy_carousel') {
      return (
        <div className="relative overflow-hidden">
          <div className="flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide p-4">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="snap-center shrink-0 w-96">
                {renderCandyCarouselCard(testimonial)}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Mayen Carousel Preset
    if (preset === 'mayen_carousel') {
      return (
        <div className="relative overflow-hidden">
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="snap-center shrink-0 w-96">
                {renderMayenCarouselCard(testimonial)}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Loppa Carousel Preset
    if (preset === 'loppa_carousel') {
      return (
        <div className="relative overflow-hidden">
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="snap-center shrink-0 w-80">
                {renderLoppaCarouselCard(testimonial)}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Default Carousel
    return (
      <div className="relative overflow-hidden">
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="snap-center shrink-0 w-80">
              {renderTestimonialCard(testimonial)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Wall Layout (Masonry-style)
  if (config.embed_type === 'wall') {
    return (
      <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
        {testimonials.map(renderTestimonialCard)}
      </div>
    );
  }

  // Masonry Grid
  if (config.embed_type === 'masonry') {
    const preset = config.style_config.layoutPreset;

    // Testimonial Masonry Preset
    if (preset === 'testimonial_masonry') {
      return (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="break-inside-avoid mb-4">
              <Card className="p-4 space-y-3" style={{ backgroundColor: config.style_config.backgroundColor, borderRadius: config.style_config.borderRadius }}>
                {testimonial.image_url && (
                  <img src={testimonial.image_url} className="w-full rounded-lg" style={{ borderRadius: config.style_config.borderRadius }} alt="" />
                )}
                {testimonial.rating && <div className="flex">{renderStars(testimonial.rating)}</div>}
                <p className="text-sm" style={{ color: config.style_config.textColor }}>{testimonial.message}</p>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={testimonial.avatar_url} />
                    <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                  </Avatar>
                  <div className="text-xs">
                    <div className="font-semibold" style={{ color: config.style_config.textColor }}>{testimonial.name}</div>
                    {testimonial.company && <div className="opacity-60" style={{ color: config.style_config.textColor }}>{testimonial.company}</div>}
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      );
    }

    // Default Masonry
    return (
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
        {testimonials.map((testimonial) => (
          <div key={testimonial.id} className="break-inside-avoid mb-4">
            {renderTestimonialCard(testimonial)}
          </div>
        ))}
      </div>
    );
  }

  // Marquee Horizontal
  if (config.embed_type === 'marquee_horizontal') {
    const speed = config.style_config.speed === 'slow' ? '60s' : config.style_config.speed === 'fast' ? '20s' : '40s';
    const pauseClass = config.style_config.pauseOnHover ? 'hover:[animation-play-state:paused]' : '';
    
    return (
      <div className="relative overflow-hidden">
        <div 
          className={`flex gap-4 ${pauseClass}`}
          style={{
            animation: `scroll-left ${speed} linear infinite`,
            width: 'max-content'
          }}
        >
          {[...testimonials, ...testimonials].map((testimonial, idx) => (
            <div key={`${testimonial.id}-${idx}`} className="shrink-0 w-80">
              {renderTestimonialCard(testimonial)}
            </div>
          ))}
        </div>
        <style>{`
          @keyframes scroll-left {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
        `}</style>
      </div>
    );
  }

  // Marquee Vertical
  if (config.embed_type === 'marquee_vertical') {
    const speed = config.style_config.speed === 'slow' ? '60s' : config.style_config.speed === 'fast' ? '20s' : '40s';
    const pauseClass = config.style_config.pauseOnHover ? 'hover:[animation-play-state:paused]' : '';
    
    return (
      <div className="relative overflow-hidden h-[600px]">
        <div 
          className={`flex flex-col gap-4 ${pauseClass}`}
          style={{
            animation: `scroll-up ${speed} linear infinite`,
            height: 'max-content'
          }}
        >
          {[...testimonials, ...testimonials].map((testimonial, idx) => (
            <div key={`${testimonial.id}-${idx}`}>
              {renderTestimonialCard(testimonial)}
            </div>
          ))}
        </div>
        <style>{`
          @keyframes scroll-up {
            from { transform: translateY(0); }
            to { transform: translateY(-50%); }
          }
        `}</style>
      </div>
    );
  }

  // Video Wall
  if (config.embed_type === 'video_wall') {
    const videoTestimonials = testimonials.filter(t => t.video_url);
    if (videoTestimonials.length === 0) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>No video testimonials available.</strong>
            <br />
            <span className="text-xs">Video Wall requires testimonials with video content. Please collect or upload video testimonials first.</span>
          </AlertDescription>
        </Alert>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {videoTestimonials.map((testimonial) => (
          <div key={testimonial.id} className="relative group">
            <video
              src={testimonial.video_url}
              className="w-full rounded-lg"
              style={{ borderRadius: config.style_config.borderRadius }}
              controls={config.style_config.playMode === 'click'}
              autoPlay={config.style_config.playMode === 'auto'}
              muted
              loop
            />
            {config.style_config.showPlayButton && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-primary/80 rounded-full p-4">
                  <svg className="w-8 h-8 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Rating Badge Inline
  if (config.embed_type === 'rating_badge_inline') {
    const avgRating = testimonials.reduce((acc, t) => acc + (t.rating || 0), 0) / testimonials.length;
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: config.style_config.backgroundColor }}>
        <div className="flex">{renderStars(Math.round(avgRating))}</div>
        <span className="font-semibold" style={{ color: config.style_config.textColor }}>
          {avgRating.toFixed(1)}/5
        </span>
        <span className="text-sm opacity-60" style={{ color: config.style_config.textColor }}>
          from {testimonials.length} reviews
        </span>
      </div>
    );
  }

  // Rating Badge Floating
  if (config.embed_type === 'rating_badge_floating') {
    const avgRating = testimonials.reduce((acc, t) => acc + (t.rating || 0), 0) / testimonials.length;
    const position = config.style_config.position || 'bottom-right';
    const size = config.style_config.size || 'md';
    const sizeClasses = size === 'sm' ? 'px-3 py-2 text-sm' : size === 'lg' ? 'px-6 py-4 text-lg' : 'px-4 py-3';
    
    const positionClasses = {
      'top-left': 'top-4 left-4',
      'top-right': 'top-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'bottom-right': 'bottom-4 right-4'
    }[position];
    
    return (
      <div className={`fixed ${positionClasses} ${sizeClasses} rounded-full shadow-lg z-50`} style={{ backgroundColor: config.style_config.backgroundColor }}>
        <div className="flex items-center gap-2">
          <div className="flex">{renderStars(Math.round(avgRating))}</div>
          <span className="font-bold" style={{ color: config.style_config.textColor }}>
            {avgRating.toFixed(1)}
          </span>
        </div>
      </div>
    );
  }

  // Bubble Stack
  if (config.embed_type === 'bubble_stack') {
    return (
      <div className="flex flex-col gap-3 max-w-2xl">
        {testimonials.map((testimonial, idx) => (
          <div
            key={testimonial.id}
            className={`p-4 rounded-2xl max-w-md ${idx % 2 === 0 ? 'self-start' : 'self-end'}`}
            style={{
              backgroundColor: config.style_config.backgroundColor,
              color: config.style_config.textColor,
              borderRadius: idx % 2 === 0 ? '20px 20px 20px 4px' : '20px 20px 4px 20px'
            }}
          >
            <p className="text-sm mb-2">{testimonial.message}</p>
            <div className="flex items-center gap-2 text-xs opacity-60">
              <span>{testimonial.name}</span>
              {testimonial.rating && renderStars(testimonial.rating)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Timeline
  if (config.embed_type === 'timeline') {
    return (
      <div className="relative">
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-border" />
        {testimonials.map((testimonial, idx) => (
          <div key={testimonial.id} className={`flex gap-4 mb-8 ${idx % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
            <div className={`w-1/2 ${idx % 2 === 0 ? 'text-right pr-8' : 'text-left pl-8'}`}>
              {renderTestimonialCard(testimonial)}
            </div>
            <div className="w-4 h-4 rounded-full bg-primary relative z-10 shrink-0 mt-4" style={{ backgroundColor: config.style_config.primaryColor }} />
            <div className="w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  // Featured Hero
  if (config.embed_type === 'featured_hero') {
    const featured = testimonials[0];
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="p-8" style={{ backgroundColor: config.style_config.backgroundColor, color: config.style_config.textColor }}>
          {featured.rating && (
            <div className="flex justify-center mb-4">
              {renderStars(featured.rating)}
            </div>
          )}
          <p className="text-2xl font-semibold text-center mb-6 leading-relaxed">"{featured.message}"</p>
          <div className="flex items-center justify-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={featured.avatar_url} />
              <AvatarFallback><User className="h-8 w-8" /></AvatarFallback>
            </Avatar>
            <div className="text-center">
              <div className="font-bold text-lg">{featured.name}</div>
              {featured.company && <div className="text-sm opacity-60">{featured.company}</div>}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Compact List
  if (config.embed_type === 'compact_list') {
    return (
      <div className="space-y-2">
        {testimonials.map((testimonial) => (
          <div
            key={testimonial.id}
            className="flex items-center gap-3 p-3 rounded-lg"
            style={{ backgroundColor: config.style_config.backgroundColor }}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={testimonial.avatar_url} />
              <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm" style={{ color: config.style_config.textColor }}>
                  {testimonial.name}
                </span>
                {testimonial.rating && (
                  <div className="flex">{renderStars(testimonial.rating)}</div>
                )}
              </div>
              <p className="text-xs truncate opacity-60" style={{ color: config.style_config.textColor }}>
                {testimonial.message}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Card Flip
  if (config.embed_type === 'card_flip') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {testimonials.map((testimonial) => (
          <div key={testimonial.id} className="perspective-1000 h-64">
            <div className="relative w-full h-full transition-transform duration-500 transform-style-3d hover:rotate-y-180">
              <div className="absolute w-full h-full backface-hidden">
                <Card className="h-full p-4 flex flex-col justify-center items-center" style={{ backgroundColor: config.style_config.backgroundColor }}>
                  <div className="flex mb-2">{testimonial.rating && renderStars(testimonial.rating)}</div>
                  <p className="text-center text-sm" style={{ color: config.style_config.textColor }}>
                    "{testimonial.message?.substring(0, 100)}..."
                  </p>
                </Card>
              </div>
              <div className="absolute w-full h-full backface-hidden rotate-y-180">
                <Card className="h-full p-4 flex flex-col justify-center items-center" style={{ backgroundColor: config.style_config.primaryColor }}>
                  <Avatar className="h-16 w-16 mb-3">
                    <AvatarImage src={testimonial.avatar_url} />
                    <AvatarFallback><User /></AvatarFallback>
                  </Avatar>
                  <div className="text-center text-primary-foreground">
                    <div className="font-bold">{testimonial.name}</div>
                    {testimonial.company && <div className="text-sm opacity-80">{testimonial.company}</div>}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Social Feed
  if (config.embed_type === 'social_feed') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {testimonials.map((testimonial) => (
          <Card
            key={testimonial.id}
            className="aspect-square p-3 flex flex-col justify-between overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            style={{ backgroundColor: config.style_config.backgroundColor }}
          >
            {testimonial.video_url ? (
              <video src={testimonial.video_url} className="w-full h-24 object-cover rounded mb-2" />
            ) : testimonial.image_url ? (
              <img src={testimonial.image_url} className="w-full h-24 object-cover rounded mb-2" alt="" />
            ) : (
              <div className="w-full h-24 bg-muted rounded mb-2 flex items-center justify-center">
                <User className="h-8 w-8 opacity-30" />
              </div>
            )}
            <div>
              <p className="text-xs line-clamp-2 mb-1" style={{ color: config.style_config.textColor }}>
                {testimonial.message}
              </p>
              <div className="flex items-center gap-1">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={testimonial.avatar_url} />
                  <AvatarFallback><User className="h-2 w-2" /></AvatarFallback>
                </Avatar>
                <span className="text-xs font-semibold truncate" style={{ color: config.style_config.textColor }}>
                  {testimonial.name}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // Ticker Bar
  if (config.embed_type === 'ticker_bar') {
    return (
      <div className="fixed bottom-0 left-0 right-0 py-2 shadow-lg z-50 overflow-hidden" style={{ backgroundColor: config.style_config.backgroundColor }}>
        <div className="flex gap-8 animate-[scroll-left_30s_linear_infinite]">
          {[...testimonials, ...testimonials].map((testimonial, idx) => (
            <div key={`${testimonial.id}-${idx}`} className="flex items-center gap-2 shrink-0">
              {testimonial.rating && renderStars(testimonial.rating)}
              <span className="text-sm" style={{ color: config.style_config.textColor }}>
                "{testimonial.message?.substring(0, 60)}..." - <strong>{testimonial.name}</strong>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3D Carousel & Widget Popup (Placeholder)
  if (config.embed_type === '3d_carousel' || config.embed_type === 'widget_popup') {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Coming Soon</strong>
          <br />
          <span className="text-xs">This advanced layout is currently in development. Stay tuned for updates!</span>
        </AlertDescription>
      </Alert>
    );
  }

  // Single Featured
  if (config.embed_type === 'single') {
    const featured = testimonials[0];
    const preset = config.style_config.layoutPreset;

    // Single Video Hero Preset
    if (preset === 'single_video') {
      return (
        <div className="max-w-4xl mx-auto">
          <Card className="overflow-hidden" style={{ borderRadius: config.style_config.borderRadius }}>
            {featured.video_url ? (
              <div className="relative">
                <video src={featured.video_url} controls className="w-full aspect-video" />
              </div>
            ) : featured.image_url ? (
              <img src={featured.image_url} className="w-full aspect-video object-cover" alt="" />
            ) : (
              <div className="w-full aspect-video bg-muted flex items-center justify-center">
                <User className="h-16 w-16 opacity-20" />
              </div>
            )}
            <div className="p-6 space-y-4" style={{ backgroundColor: config.style_config.backgroundColor }}>
              {featured.rating && <div className="flex">{renderStars(featured.rating)}</div>}
              <p className="text-lg" style={{ color: config.style_config.textColor }}>{featured.message}</p>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={featured.avatar_url} />
                  <AvatarFallback><User className="h-6 w-6" /></AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold" style={{ color: config.style_config.textColor }}>{featured.name}</div>
                  {featured.company && <div className="text-sm opacity-60" style={{ color: config.style_config.textColor }}>{featured.company}</div>}
                </div>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    // Default Single
    return (
      <div className="max-w-2xl mx-auto">
        {renderTestimonialCard(featured)}
      </div>
    );
  }

  // Rating Summary
  if (config.embed_type === 'rating_summary') {
    const avgRating = testimonials.reduce((acc, t) => acc + (t.rating || 0), 0) / testimonials.length;
    const ratingCounts = [5, 4, 3, 2, 1].map(rating => ({
      rating,
      count: testimonials.filter(t => t.rating === rating).length
    }));

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl font-bold" style={{ color: config.style_config.primaryColor }}>
            {avgRating.toFixed(1)}
          </div>
          <div className="flex justify-center">{renderStars(Math.round(avgRating))}</div>
          <p className="text-sm opacity-60">Based on {testimonials.length} reviews</p>
        </div>

        <div className="space-y-2">
          {ratingCounts.map(({ rating, count }) => (
            <div key={rating} className="flex items-center gap-3">
              <span className="text-sm w-8">{rating} ★</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    backgroundColor: config.style_config.primaryColor,
                    width: `${(count / testimonials.length) * 100}%`
                  }}
                />
              </div>
              <span className="text-sm w-8 text-right">{count}</span>
            </div>
          ))}
        </div>

        <div className="grid gap-4 mt-6">
          {testimonials.slice(0, 3).map(renderTestimonialCard)}
        </div>
      </div>
    );
  }

  return <div>Layout not implemented</div>;
}
