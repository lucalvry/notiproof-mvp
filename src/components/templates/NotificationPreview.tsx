import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle2 } from "lucide-react";
import { shouldShowVerificationBadge, VERIFICATION_BADGE_TEXT } from "@/lib/verificationBadgeUtils";

interface NotificationPreviewProps {
  template: {
    name: string;
    template_config: any;
    style_config: any;
  };
  provider?: string;
  visitorsPulseMode?: 'real' | 'simulated';
}

export function NotificationPreview({ template, provider, visitorsPulseMode }: NotificationPreviewProps) {
  const templateConfig = typeof template.template_config === 'string' 
    ? JSON.parse(template.template_config) 
    : template.template_config;
  
  const styleConfig = typeof template.style_config === 'string'
    ? JSON.parse(template.style_config)
    : template.style_config;

  const previewData = templateConfig?.previewData || {};
  const position = templateConfig?.position || "bottom-left";
  const animation = templateConfig?.animation || "slide";
  const accentColor = styleConfig?.accentColor || "#3B82F6";
  const backgroundColor = styleConfig?.backgroundColor || "#ffffff";
  const textColor = styleConfig?.textColor || "#1a1a1a";
  const borderRadius = styleConfig?.borderRadius || 12;

  const positionClasses = {
    "bottom-left": "bottom-6 left-6",
    "bottom-right": "bottom-6 right-6",
    "bottom-center": "bottom-6 left-1/2 -translate-x-1/2",
    "top-left": "top-6 left-6",
    "top-right": "top-6 right-6",
    "top-center": "top-6 left-1/2 -translate-x-1/2",
  };

  const animationClasses = {
    slide: "animate-in slide-in-from-bottom-5",
    fade: "animate-in fade-in",
    bounce: "animate-in slide-in-from-bottom-5 duration-500",
    pulse: "animate-pulse",
  };

  return (
    <div className="relative h-full w-full bg-gradient-to-br from-background/50 to-muted/50 rounded-lg overflow-hidden">
      {/* Simulated website content */}
      <div className="absolute inset-0 p-8 opacity-30">
        <div className="h-8 w-48 bg-muted rounded mb-6" />
        <div className="h-4 w-full bg-muted rounded mb-3" />
        <div className="h-4 w-3/4 bg-muted rounded mb-3" />
        <div className="h-4 w-5/6 bg-muted rounded" />
      </div>

      {/* Notification preview */}
      <div className={`absolute ${positionClasses[position as keyof typeof positionClasses] || positionClasses["bottom-left"]} ${animationClasses[animation as keyof typeof animationClasses] || animationClasses.slide}`}>
        <div 
          className="shadow-lg max-w-sm border-2"
          style={{ 
            backgroundColor: backgroundColor,
            color: textColor,
            borderRadius: `${borderRadius}px`,
            borderColor: `${accentColor}40`,
          }}
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              {(previewData.userName || previewData.productImage || styleConfig.notificationIcon) && (
                <div className="shrink-0">
                  {previewData.productImage && styleConfig.showProductImage !== false ? (
                    <img 
                      src={previewData.productImage} 
                      alt="Product" 
                      className="h-10 w-10 rounded-lg object-cover"
                      onError={(e) => {
                        // Fallback to icon or avatar on image load error
                        if (styleConfig.fallbackImageUrl) {
                          e.currentTarget.src = styleConfig.fallbackImageUrl;
                        } else {
                          e.currentTarget.style.display = 'none';
                        }
                      }}
                    />
                  ) : previewData.userAvatar && styleConfig.showAvatar !== false ? (
                    <img 
                      src={previewData.userAvatar} 
                      alt={previewData.userName} 
                      className="h-10 w-10 rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : styleConfig.notificationIcon ? (
                    <div className="h-10 w-10 flex items-center justify-center text-2xl">
                      {styleConfig.notificationIcon}
                    </div>
                  ) : previewData.userName ? (
                    <Avatar className="h-10 w-10">
                      <AvatarFallback style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
                        {previewData.userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  ) : null}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {previewData.userName && (
                    <p className="text-sm font-semibold" style={{ color: textColor }}>{previewData.userName}</p>
                  )}
                  {previewData.location && (
                    <Badge 
                      variant="secondary" 
                      className="text-xs border-0"
                      style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                    >
                      {previewData.location}
                    </Badge>
                  )}
                  {previewData.rating && (
                    <Badge 
                      variant="secondary" 
                      className="text-xs border-0"
                      style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                    >
                      ⭐ {previewData.rating}
                    </Badge>
                  )}
                </div>
                <p className="text-sm" style={{ color: `${textColor}dd` }}>
                  {previewData.message ? (
                    previewData.message
                  ) : (
                    <>
                      {previewData.action && `${previewData.action} `}
                      {previewData.product && <strong>{previewData.product}</strong>}
                      {previewData.course && <strong>{previewData.course}</strong>}
                      {previewData.service && <strong>{previewData.service}</strong>}
                      {previewData.article && <strong>{previewData.article}</strong>}
                      {previewData.review && `"${previewData.review}"`}
                    </>
                  )}
                </p>
                {(previewData.time || previewData.cta || previewData.icon || previewData.emoji || provider) && (
                  <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: `${textColor}99` }}>
                    {(previewData.icon || previewData.emoji) && <span>{previewData.icon || previewData.emoji}</span>}
                    {previewData.time && <span>{previewData.time}</span>}
                    {!previewData.time && <span>Just now</span>}
                    
                    {/* NotiProof Verified Badge */}
                    {provider && shouldShowVerificationBadge(provider, { visitorsPulseMode }) && (
                      <span className="font-medium" style={{ color: accentColor }}>
                        {VERIFICATION_BADGE_TEXT}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
