import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { shouldShowVerificationBadge, VERIFICATION_BADGE_TEXT, VerificationBadgeOptions } from '@/lib/verificationBadgeUtils';

export interface NotiProofNotificationTheme {
  backgroundColor?: string;
  textColor?: string;
  primaryColor?: string;
  borderRadius?: number;
  fontSize?: number;
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  fontFamily?: string;
}

export interface NotiProofNotificationProps {
  // Media section
  mediaType: 'icon' | 'emoji' | 'avatar' | 'image' | 'video-thumbnail';
  mediaContent: string; // URL, emoji character, or icon name
  mediaFallback?: string; // Fallback content if media fails to load
  
  // Content section
  headline: string;
  subtext?: string;
  timestamp?: string;
  
  // Verification
  provider: string;
  verificationOptions?: VerificationBadgeOptions;
  
  // Theme
  theme?: NotiProofNotificationTheme;
  
  // Optional overrides
  className?: string;
  children?: ReactNode;
}

const defaultTheme: NotiProofNotificationTheme = {
  backgroundColor: '#ffffff',
  textColor: '#1a1a1a',
  primaryColor: '#2563EB',
  borderRadius: 12,
  fontSize: 14,
  shadow: 'lg',
  fontFamily: 'inherit',
};

const shadowStyles = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
};

/**
 * NotiProof Standard Notification Component
 * 
 * Layout:
 * ┌─────────────────────────────────────────────┐
 * │  ┌──────┐  Headline Text                    │
 * │  │ MEDIA│  Subtext/Description              │
 * │  │      │  ─────────────────────────────    │
 * │  └──────┘  2 mins ago  ✓ NotiProof Verified │
 * └─────────────────────────────────────────────┘
 */
export function NotiProofNotification({
  mediaType,
  mediaContent,
  mediaFallback,
  headline,
  subtext,
  timestamp,
  provider,
  verificationOptions,
  theme = {},
  className,
  children,
}: NotiProofNotificationProps) {
  const mergedTheme = { ...defaultTheme, ...theme };
  const showVerificationBadge = shouldShowVerificationBadge(provider, verificationOptions);

  const renderMedia = () => {
    const baseClasses = "notiproof-media flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden";
    
    switch (mediaType) {
      case 'emoji':
      case 'icon':
        return (
          <div 
            className={baseClasses}
            style={{ 
              background: `linear-gradient(135deg, ${mergedTheme.primaryColor}, ${adjustColor(mergedTheme.primaryColor || '#2563EB', 20)})` 
            }}
          >
            <span className="text-2xl">{mediaContent}</span>
          </div>
        );
      
      case 'avatar':
        return (
          <div className={cn(baseClasses, "rounded-full")}>
            <img 
              src={mediaContent} 
              alt="Avatar"
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                if (mediaFallback) {
                  e.currentTarget.src = mediaFallback;
                } else {
                  e.currentTarget.style.display = 'none';
                }
              }}
            />
          </div>
        );
      
      case 'image':
        return (
          <div className={baseClasses}>
            <img 
              src={mediaContent} 
              alt="Notification"
              className="w-full h-full object-cover"
              onError={(e) => {
                if (mediaFallback) {
                  e.currentTarget.src = mediaFallback;
                } else {
                  e.currentTarget.style.display = 'none';
                }
              }}
            />
          </div>
        );
      
      case 'video-thumbnail':
        return (
          <div 
            className={cn(baseClasses, "relative")}
            style={{ backgroundColor: mergedTheme.primaryColor }}
          >
            {mediaContent && (
              <img 
                src={mediaContent} 
                alt="Video thumbnail"
                className="w-full h-full object-cover absolute inset-0"
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center">
                <div className="w-0 h-0 border-l-[8px] border-l-[#1a1a1a] border-y-[5px] border-y-transparent ml-0.5" />
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div 
            className={baseClasses}
            style={{ backgroundColor: `${mergedTheme.primaryColor}20` }}
          >
            <span className="text-2xl">📣</span>
          </div>
        );
    }
  };

  return (
    <div 
      className={cn("notiproof-notification", className)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: mergedTheme.backgroundColor,
        color: mergedTheme.textColor,
        borderRadius: `${mergedTheme.borderRadius}px`,
        boxShadow: shadowStyles[mergedTheme.shadow || 'lg'],
        fontFamily: mergedTheme.fontFamily,
        fontSize: `${mergedTheme.fontSize}px`,
        maxWidth: '350px',
      }}
    >
      {/* Media Section */}
      {renderMedia()}
      
      {/* Content Section */}
      <div className="notiproof-content flex-1 min-w-0">
        {/* Headline */}
        <div 
          className="notiproof-headline font-semibold leading-tight mb-1"
          style={{ color: mergedTheme.textColor }}
        >
          {headline}
        </div>
        
        {/* Subtext */}
        {subtext && (
          <div 
            className="notiproof-subtext text-sm opacity-80 line-clamp-2 mb-1"
            style={{ color: mergedTheme.textColor }}
          >
            {subtext}
          </div>
        )}
        
        {/* Footer: Timestamp + Verification Badge */}
        <div className="notiproof-footer flex items-center gap-2 mt-1.5">
          {timestamp && (
            <span 
              className="notiproof-time text-xs opacity-60"
              style={{ color: mergedTheme.textColor }}
            >
              {timestamp}
            </span>
          )}
          
          {showVerificationBadge && (
            <span 
              className="notiproof-verified text-xs font-medium"
              style={{ color: '#2563EB' }}
            >
              {VERIFICATION_BADGE_TEXT}
            </span>
          )}
        </div>
        
        {children}
      </div>
    </div>
  );
}

// Helper function to adjust color brightness
function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xFF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xFF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export default NotiProofNotification;
