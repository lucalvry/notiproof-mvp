import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Monitor, Smartphone, Tablet, Eye, RefreshCw, ExternalLink, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface WidgetPreviewFrameProps {
  settings: any;
  campaignType?: string;
  messageTemplate?: string;
  websiteDomain?: string;
  position?: string;
  animation?: string;
}

type DeviceType = 'desktop' | 'tablet' | 'mobile';

export function WidgetPreviewFrame({ 
  settings, 
  campaignType,
  messageTemplate,
  websiteDomain,
  position,
  animation
}: WidgetPreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [refreshKey, setRefreshKey] = useState(0);
  const [iframeReady, setIframeReady] = useState(false);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Device dimensions
  const dimensions = {
    desktop: { width: '100%', height: '500px', icon: Monitor },
    tablet: { width: '768px', height: '500px', icon: Tablet },
    mobile: { width: '375px', height: '500px', icon: Smartphone },
  };

  // Wait for iframe to be ready
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    
    const handleIframeLoad = () => {
      console.log('✅ Iframe loaded and ready');
      setIframeReady(true);
    };
    
    iframe.addEventListener('load', handleIframeLoad);
    return () => iframe.removeEventListener('load', handleIframeLoad);
  }, []);

  // Debounced update preview with 300ms delay (only when iframe is ready)
  useEffect(() => {
    if (!iframeReady) {
      console.log('⏳ Waiting for iframe to be ready...');
      return;
    }

    console.log('🎨 WidgetPreviewFrame received:', {
      settings,
      messageTemplate,
      campaignType,
      position,
      animation,
      hasSettings: !!settings,
      settingsKeys: settings ? Object.keys(settings) : []
    });

    // Clear existing timer
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }

    // Set new timer with 300ms delay
    updateTimerRef.current = setTimeout(() => {
      updatePreview();
    }, 300);

    // Cleanup on unmount
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, [settings, messageTemplate, device, refreshKey, iframeReady]);

  const updatePreview = () => {
    if (!iframeRef.current?.contentWindow) {
      console.warn('⚠️ Iframe not ready');
      return;
    }

    const iframeDoc = iframeRef.current.contentDocument;
    if (!iframeDoc) {
      console.warn('⚠️ Iframe document not ready');
      return;
    }

    // Wait for iframe to be fully ready
    if (iframeDoc.readyState !== 'complete') {
      console.log('⏳ Waiting for iframe to load...');
      setTimeout(updatePreview, 100);
      return;
    }

    // Get message from various sources (Phase 1: Add fallbacks for native campaigns)
    const displayMessage = messageTemplate || 
      settings.headline || 
      settings.message || // Native campaign message
      settings.title ||   // Announcement title
      'Preview your notification here';

    // Build preview HTML with widget
    const previewHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Widget Preview</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .preview-content {
            background: #ffffff;
            border-radius: 12px;
            padding: 40px;
            max-width: 600px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          }
          .preview-content h1 {
            font-size: 24px;
            margin-bottom: 12px;
            color: #1a1a1a;
          }
          .preview-content p {
            color: #666;
            line-height: 1.6;
            font-size: 14px;
          }
          
          /* Widget Notification Styles */
          #notiproof-notification {
            position: fixed;
            ${getPositionStyles(position || settings.position || 'bottom-left')}
            background: ${settings.backgroundColor || '#ffffff'};
            border-radius: ${settings.borderRadius || 12}px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
            padding: 16px;
            max-width: 350px;
            display: flex;
            align-items: center;
            gap: 12px;
            animation: ${getAnimation(animation || settings.animation || 'slide')} 0.3s ease-out;
            z-index: 999999;
            cursor: pointer;
            transition: transform 0.2s ease;
          }
          #notiproof-notification:hover {
            transform: scale(1.02);
          }
          .notification-avatar {
            flex-shrink: 0;
            width: 48px;
            height: 48px;
            border-radius: 8px;
            background: linear-gradient(135deg, ${settings.primaryColor || '#2563EB'}, ${adjustColor(settings.primaryColor || '#2563EB', 20)});
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
          }
          .notification-avatar-img {
            flex-shrink: 0;
            width: 48px;
            height: 48px;
            border-radius: 8px;
            object-fit: cover;
          }
          .notification-avatar-img.avatar {
            border-radius: 50%;
          }
          .notification-content {
            flex: 1;
            min-width: 0;
          }
          .notification-headline {
            font-size: ${settings.fontSize || 14}px;
            font-weight: 600;
            color: ${settings.textColor || '#1a1a1a'};
            margin-bottom: 4px;
            line-height: 1.4;
          }
          .notification-subtext {
            font-size: 12px;
            color: ${adjustColor(settings.textColor || '#1a1a1a', -50)};
            opacity: 0.7;
          }
          .notification-badge {
            position: absolute;
            top: -8px;
            right: -8px;
            background: ${settings.primaryColor || '#2563EB'};
            color: white;
            font-size: 10px;
            padding: 2px 8px;
            border-radius: 12px;
            font-weight: 600;
          }
          
          @keyframes slideIn {
            from { transform: translateX(${(position || settings.position || 'bottom-left').includes('left') ? '-' : ''}100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes bounceIn {
            0% { transform: scale(0.3); opacity: 0; }
            50% { transform: scale(1.05); }
            70% { transform: scale(0.9); }
            100% { transform: scale(1); opacity: 1; }
          }
        </style>
      </head>
      <body>
        <div class="preview-content">
          <h1>Your Website Preview</h1>
          <p>This is how your notification widget will appear to visitors on your actual website.</p>
        </div>
        
        <div id="notiproof-notification">
          ${(() => {
            const integrationSettings = settings.integration_settings || {};
            
            // Check announcement-specific image config first
            if (integrationSettings.image_type === 'emoji' && integrationSettings.emoji) {
              return `<div class="notification-avatar">${integrationSettings.emoji}</div>`;
            } else if (integrationSettings.image_type === 'url' && integrationSettings.image_url) {
              return `<img src="${integrationSettings.image_url}" class="notification-avatar-img" alt="Notification" onerror="this.style.display='none'" />`;
            } else if (integrationSettings.image_type === 'icon' && integrationSettings.icon) {
              return `<div class="notification-avatar">${integrationSettings.icon}</div>`;
            }
            
            // Fallback to existing logic for other campaign types
            if (settings.showProductImage !== false && settings.productImageUrl) {
              return `<img src="${settings.productImageUrl}" class="notification-avatar-img" alt="Product" onerror="this.style.display='none'" />`;
            } else if (settings.showAvatar !== false && settings.userAvatarUrl) {
              return `<img src="${settings.userAvatarUrl}" class="notification-avatar-img avatar" alt="User" onerror="this.style.display='none'" />`;
            } else if (settings.notificationIcon) {
              return `<div class="notification-avatar">${settings.notificationIcon}</div>`;
            } else if (settings.fallbackImageUrl) {
              return `<img src="${settings.fallbackImageUrl}" class="notification-avatar-img" alt="Notification" onerror="this.style.display='none'" />`;
            } else {
              return '<div class="notification-avatar">🛍️</div>';
            }
          })()}
          <div class="notification-content">
            <div class="notification-headline">${escapeHtml(displayMessage)}</div>
            ${settings.subtext ? `<div class="notification-subtext">${escapeHtml(settings.subtext)}</div>` : ''}
            ${settings.showTimestamp !== false ? '<div class="notification-subtext">Just now</div>' : ''}
          </div>
          ${campaignType === 'limited-stock' ? '<div class="notification-badge">Low Stock</div>' : ''}
        </div>
      </body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(previewHtml);
    iframeDoc.close();
  };

  const getPositionStyles = (position: string) => {
    const positions: Record<string, string> = {
      'bottom-left': 'bottom: 20px; left: 20px;',
      'bottom-right': 'bottom: 20px; right: 20px;',
      'bottom-center': 'bottom: 20px; left: 50%; transform: translateX(-50%);',
      'top-left': 'top: 20px; left: 20px;',
      'top-right': 'top: 20px; right: 20px;',
      'top-center': 'top: 20px; left: 50%; transform: translateX(-50%);',
    };
    return positions[position] || positions['bottom-left'];
  };

  const getAnimation = (animation: string) => {
    const animations: Record<string, string> = {
      'slide': 'slideIn',
      'fade': 'fadeIn',
      'bounce': 'bounceIn',
      'none': 'fadeIn',
    };
    return animations[animation] || 'slideIn';
  };

  const adjustColor = (color: string, amount: number) => {
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0xFF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0xFF) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  };

  const escapeHtml = (text: string) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    toast.success("Preview refreshed");
  };

  const handlePreviewOnSite = () => {
    if (!websiteDomain) {
      toast.error("Website domain not configured");
      return;
    }
    window.open(`https://${websiteDomain}?notiproof_preview=true`, '_blank');
  };

  const DeviceIcon = dimensions[device].icon;

  return (
    <Card className="border-2 sticky top-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Live Preview
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Updates as you design
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-7 px-2"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Device Selector */}
        <div className="flex gap-1 p-2 bg-muted/30 border-t border-b">
          {(['desktop', 'tablet', 'mobile'] as const).map((d) => {
            const Icon = dimensions[d].icon;
            return (
              <Button
                key={d}
                variant={device === d ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setDevice(d)}
                className="h-7 px-2 flex-1"
              >
                <Icon className="h-3 w-3" />
              </Button>
            );
          })}
        </div>

        {/* Preview Frame */}
        <div className="bg-muted/30 flex items-center justify-center overflow-hidden" style={{ height: dimensions[device].height }}>
          <div className="transition-all duration-300" style={{ width: dimensions[device].width, height: dimensions[device].height }}>
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0"
              title="Widget Preview"
              sandbox="allow-scripts"
            />
          </div>
        </div>

        {websiteDomain && (
          <div className="p-2 bg-muted/50 border-t flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              {websiteDomain}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviewOnSite}
              className="h-6 text-xs px-2"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Test
            </Button>
          </div>
        )}
        
        <Alert className="m-2 mb-3">
          <AlertCircle className="h-3 w-3" />
          <AlertDescription className="text-xs">
            Changes appear instantly - try editing colors, position, or message
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
