import { useMemo } from "react";
import { IntegrationDesignConfig } from "@/lib/integrationDesignConfig";
import { Star, X, Play } from "lucide-react";
import Mustache from "mustache";
import { shouldShowVerificationBadge, VERIFICATION_BADGE_TEXT } from "@/lib/verificationBadgeUtils";

interface IntegrationTemplatePreviewProps {
  config: IntegrationDesignConfig;
  design: any;
  template?: any;
  visitorsPulseMode?: 'real' | 'simulated';
}

export function IntegrationTemplatePreview({ 
  config, 
  design,
  template,
  visitorsPulseMode
}: IntegrationTemplatePreviewProps) {
  // Generate preview HTML based on the integration type and design settings
  const previewContent = useMemo(() => {
    const previewData = config.previewData;
    
    // Render headline with placeholder data
    let headline = design.headline || config.defaultHeadline;
    let subtext = design.subtext || config.defaultSubtext;
    
    try {
      headline = Mustache.render(headline, previewData);
      subtext = Mustache.render(subtext, previewData);
    } catch (e) {
      // If Mustache fails, use the raw template
    }
    
    return { headline, subtext };
  }, [config, design]);

  // Build shadow style
  const getShadowStyle = () => {
    const shadows: Record<string, string> = {
      'none': 'none',
      'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    };
    return shadows[design.shadow] || shadows['md'];
  };

  // Render stars for testimonials
  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star}
            className={`h-3 w-3 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  // Get position classes for preview container
  const getPositionClasses = () => {
    const positions: Record<string, string> = {
      'bottom-left': 'bottom-4 left-4',
      'bottom-right': 'bottom-4 right-4',
      'top-left': 'top-4 left-4',
      'top-right': 'top-4 right-4',
    };
    return positions[design.position] || positions['bottom-left'];
  };

  return (
    <div className="relative bg-gradient-to-br from-muted/50 to-muted min-h-[300px] rounded-lg overflow-hidden">
      {/* Mock website background */}
      <div className="absolute inset-0 p-4">
        <div className="h-3 w-24 bg-muted-foreground/20 rounded mb-3" />
        <div className="h-2 w-full bg-muted-foreground/10 rounded mb-2" />
        <div className="h-2 w-3/4 bg-muted-foreground/10 rounded mb-2" />
        <div className="h-2 w-5/6 bg-muted-foreground/10 rounded mb-4" />
        <div className="h-20 w-full bg-muted-foreground/10 rounded" />
      </div>

      {/* Notification Preview */}
      <div className={`absolute ${getPositionClasses()}`}>
        <div 
          className="relative max-w-[340px] transition-all duration-300"
          style={{
            backgroundColor: design.backgroundColor,
            color: design.textColor,
            borderRadius: `${design.borderRadius}px`,
            boxShadow: getShadowStyle(),
            fontFamily: design.fontFamily,
            fontSize: `${design.fontSize}px`,
            padding: `${design.notificationPadding || 16}px`,
            border: design.borderWidth !== '0' ? `${design.borderWidth}px solid ${design.borderColor}` : 'none',
          }}
        >
          {/* Close button */}
          <button 
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/5 transition-colors"
            style={{ color: design.textColor }}
          >
            <X className="h-3 w-3 opacity-50" />
          </button>

          <div className="flex gap-3">
            {/* Avatar/Image Section */}
            {config.sections.avatar && design.showAvatar && (
              <div 
                className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                style={{ backgroundColor: design.primaryColor }}
              >
                {config.previewData.author_name?.[0] || config.previewData.user_name?.[0] || 'U'}
              </div>
            )}

            {/* Product Image for e-commerce */}
            {config.sections.productImages && design.showProductImages && !config.sections.avatar && (
              <div 
                className="shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-muted"
              >
                📦
              </div>
            )}

            {/* Media preview for testimonials with video */}
            {config.sections.media && config.previewData.video_url && (
              <div className="shrink-0 w-12 h-12 rounded-lg bg-muted relative flex items-center justify-center">
                <div 
                  className="absolute inset-0 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: design.primaryColor }}
                >
                  <Play className="h-4 w-4 text-white" />
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0 pr-4">
              {/* Rating for testimonials */}
              {config.sections.ratings && design.showRating && config.previewData.rating && (
                <div className="mb-1">
                  {renderStars(config.previewData.rating)}
                </div>
              )}

              {/* Headline */}
              <p className="font-medium text-sm leading-tight mb-1 line-clamp-2">
                {previewContent.headline}
              </p>

              {/* Subtext */}
              {previewContent.subtext && (
                <p 
                  className="text-xs opacity-70 line-clamp-2 mb-1"
                  style={{ color: design.textColor }}
                >
                  {previewContent.subtext}
                </p>
              )}

              {/* Footer: Timestamp + Verification Badge */}
              <div className="flex items-center gap-2 mt-1">
                {config.sections.timestamp && design.showTimestamp && (
                  <p className="text-xs opacity-50">
                    2 minutes ago
                  </p>
                )}
                
                {/* NotiProof Verified Badge */}
                {shouldShowVerificationBadge(config.provider, { visitorsPulseMode }) && (
                  <span className="text-xs font-medium text-primary">
                    {VERIFICATION_BADGE_TEXT}
                  </span>
                )}
              </div>

              {/* CTA Button */}
              {config.sections.cta && design.ctaEnabled && design.ctaLabel && (
                <button
                  className="mt-2 px-3 py-1 rounded text-xs font-medium text-white"
                  style={{ backgroundColor: design.primaryColor }}
                >
                  {design.ctaLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Position indicator */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
        <span className="text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
          {design.position?.replace('-', ' ')}
        </span>
      </div>
    </div>
  );
}
