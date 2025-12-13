import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Monitor, Smartphone, Tablet, Eye, RefreshCw, ExternalLink, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { renderTemplate } from "@/lib/templateEngine";
import type { CanonicalEvent } from "@/lib/integrations/types";

interface WidgetPreviewFrameProps {
  settings: any;
  campaignType?: string;
  messageTemplate?: string;
  websiteDomain?: string;
  position?: string;
  animation?: string;
  selectedTemplate?: any;
}

type DeviceType = 'desktop' | 'tablet' | 'mobile';

export function WidgetPreviewFrame({ 
  settings, 
  campaignType,
  messageTemplate,
  websiteDomain,
  position,
  animation,
  selectedTemplate
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

  // Update preview immediately whenever settings change
  useEffect(() => {
    console.log('🎨 WidgetPreviewFrame received:', {
      settings,
      messageTemplate,
      campaignType,
      position,
      animation,
      hasSettings: !!settings,
      settingsKeys: settings ? Object.keys(settings) : []
    });

    if (iframeRef.current) {
      updatePreview();
    }
  }, [settings, messageTemplate, device, refreshKey]);

  const updatePreview = () => {
    if (!iframeRef.current) {
      console.warn('⚠️ Iframe not ready');
      return;
    }

    // Check if this is a testimonial campaign with template
    const testimonialData = settings.testimonialData;
    const isTestimonialWithTemplate = !!(testimonialData && selectedTemplate);

    // Get integration settings for announcements
    const integrationSettings = settings.integration_settings || {};
    
    // Get message from various sources - prioritize announcement title for headline
    const displayMessage = integrationSettings.title || // Announcement headline
      messageTemplate || 
      settings.headline || 
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
            ${isTestimonialWithTemplate ? `
              /* Template handles its own styling */
              background: transparent;
              border-radius: 0;
              box-shadow: none;
              padding: 0;
              max-width: 600px;
              display: block;
            ` : `
              /* Standard notification styling */
              background: ${settings.backgroundColor || '#ffffff'};
              border-radius: ${settings.borderRadius || 12}px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.15);
              padding: 16px;
              max-width: 350px;
              display: flex;
              align-items: center;
              gap: 12px;
            `}
            animation: ${getAnimation(animation || settings.animation || 'slide')} 0.3s ease-out;
            z-index: 999999;
            cursor: pointer;
            transition: transform 0.2s ease;
          }
          #notiproof-notification:hover {
            transform: scale(1.02);
          }
          
          /* Modal Styles */
          .notiproof-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 9999999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .notiproof-modal-overlay {
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(4px);
            opacity: 0;
            transition: opacity 0.3s ease;
          }
          .notiproof-modal-content {
            position: relative;
            background: white;
            border-radius: 16px;
            max-width: 600px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            opacity: 0;
            transform: scale(0.95);
            transition: opacity 0.3s ease, transform 0.3s ease;
          }
          .notiproof-modal-close {
            position: absolute;
            top: 16px;
            right: 16px;
            background: rgba(0, 0, 0, 0.1);
            border: none;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            z-index: 1;
            transition: all 0.2s ease;
          }
          .notiproof-modal-close:hover {
            background: rgba(0, 0, 0, 0.2);
            color: #000;
            transform: rotate(90deg);
          }
          .notiproof-modal-body {
            padding: 24px;
          }
          .notiproof-testimonial-modal-card {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }
          .notiproof-modal-media {
            width: 100%;
            border-radius: 12px;
            overflow: hidden;
            background: #f5f5f5;
          }
          .notiproof-modal-video,
          .notiproof-modal-image {
            width: 100%;
            max-height: 400px;
            object-fit: cover;
            display: block;
          }
          .notiproof-modal-rating {
            color: #f59e0b;
            font-size: 24px;
            letter-spacing: 2px;
          }
          .notiproof-modal-message {
            font-size: 18px;
            line-height: 1.6;
            color: #1a1a1a;
            font-style: italic;
          }
          .notiproof-modal-author {
            display: flex;
            align-items: center;
            gap: 12px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
          }
          .notiproof-modal-avatar {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            object-fit: cover;
            flex-shrink: 0;
          }
          .notiproof-modal-author-info {
            flex: 1;
          }
          .notiproof-modal-name {
            font-weight: 600;
            font-size: 16px;
            color: #1a1a1a;
            margin: 0 0 4px 0;
          }
          .notiproof-modal-position {
            font-size: 14px;
            color: #6b7280;
            margin: 0;
          }
          .notiproof-modal-verified {
            display: inline-flex;
            align-items: center;
            font-size: 13px;
            color: #2563EB;
            font-weight: 500;
            margin-top: 4px;
          }
          .notiproof-modal-time {
            font-size: 13px;
            color: #9ca3af;
            text-align: center;
            margin: 0;
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
        <div id="notiproof-notification">
          ${(() => {
            const testimonialData = settings.testimonialData;
            
            // If testimonial campaign with selected template, render using template engine
            if (selectedTemplate) {
              // Build canonical event - use actual data or template preview data
              const eventData = testimonialData || selectedTemplate.preview_json || {};
              const canonicalEvent = {
                event_id: 'preview',
                provider: 'testimonials',
                provider_event_type: 'testimonial_submitted',
                timestamp: new Date().toISOString(),
                payload: eventData,
                normalized: testimonialData ? {
                  'template.author_name': testimonialData.author_name,
                  'template.author_avatar': testimonialData.author_avatar,
                  'template.author_position': testimonialData.author_position || '',
                  'template.author_company': testimonialData.author_company || '',
                  'template.rating': testimonialData.rating,
                  'template.rating_stars': testimonialData.rating_stars,
                  'template.message': testimonialData.message,
                  'template.video_url': testimonialData.video_url || '',
                  'template.image_url': testimonialData.image_url || '',
                  'template.verified': testimonialData.verified || false,
                  'template.time_ago': 'Just now',
                } : selectedTemplate.preview_json || {}
              };
              
              try {
                // Use template engine to render
                const rendered = renderTemplate(selectedTemplate, canonicalEvent);
                return rendered;
              } catch (error) {
                console.error('[Preview] Template render error:', error);
                return '<div class="notification-content"><div class="notification-headline">Error rendering template</div></div>';
              }
            }
            
            // Fallback: If testimonial campaign without template
            if (testimonialData) {
              const videoHtml = testimonialData.video_url 
                ? '<video src="' + escapeHtml(testimonialData.video_url) + '" class="notification-avatar-img" style="max-width:80px;" controls></video>'
                : testimonialData.image_url
                  ? '<img src="' + escapeHtml(testimonialData.image_url) + '" class="notification-avatar-img" alt="Testimonial" />'
                  : testimonialData.author_avatar
                    ? '<img src="' + escapeHtml(testimonialData.author_avatar) + '" class="notification-avatar-img avatar" alt="' + escapeHtml(testimonialData.author_name) + '" />'
                    : '<div class="notification-avatar">⭐</div>';
              
              return videoHtml + 
                '<div class="notification-content">' +
                  '<div class="notification-headline">' +
                    escapeHtml(testimonialData.author_name) + ' ' +
                    (testimonialData.verified ? '✓' : '') +
                  '</div>' +
                  '<div style="color: #FFD700; font-size: 14px; margin: 4px 0;">' +
                    testimonialData.rating_stars +
                  '</div>' +
                  '<div class="notification-subtext" style="margin-top: 4px;">' +
                    '"' + escapeHtml(testimonialData.message.substring(0, 80)) + '..."' +
                  '</div>' +
                  '<div class="notification-subtext" style="margin-top: 4px; font-size: 11px;">' +
                    'Just now' +
                  '</div>' +
                '</div>';
            }
            
            // Otherwise, check announcement-specific config
            const integrationSettings = settings.integration_settings || {};
            
            // Check if this is a form capture campaign
            const isFormCapture = !!(integrationSettings.message_template && integrationSettings.form_type);
            if (isFormCapture) {
              const avatar = integrationSettings.avatar || '✅';
              // Render avatar - emoji or image URL
              if (avatar.startsWith('http')) {
                return `<img src="${avatar}" class="notification-avatar-img avatar" alt="Avatar" onerror="this.style.display='none'" />`;
              }
              return `<div class="notification-avatar">${avatar}</div>`;
            }
            
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
          ${(() => {
            // Only render notification content wrapper if NOT using testimonial template
            if (selectedTemplate) {
              return ''; // Template already rendered completely above
            }
            
            const integrationSettings = settings.integration_settings || {};
            
            // Check if this is a form capture campaign
            const isFormCapture = !!(integrationSettings.message_template && integrationSettings.form_type);
            if (isFormCapture) {
              // Replace template variables with sample data
              const sampleData = { name: 'Sarah', email: 'sarah@example.com', company: 'Acme Inc', location: 'New York', phone: '+1 555-0123' };
              let previewMessage = integrationSettings.message_template || '{{name}} signed up';
              Object.entries(sampleData).forEach(([key, value]) => {
                previewMessage = previewMessage.replace(new RegExp('\\\\{\\\\{' + key + '\\\\}\\\\}', 'g'), value);
              });
              
              return `
                <div class="notification-content">
                  <div class="notification-headline">${previewMessage}</div>
                  <div class="notification-subtext">Just now</div>
                </div>
              `;
            }
            
            // Render standard notification content for all other campaign types
            return `
              <div class="notification-content">
                ${integrationSettings.title 
                  ? `<div class="notification-headline">${escapeHtml(integrationSettings.title)}</div>` 
                  : `<div class="notification-headline">${escapeHtml(settings.headline || displayMessage)}</div>`}
                ${integrationSettings.message 
                  ? `<div class="notification-subtext" style="margin-bottom: ${integrationSettings.cta_text ? '8px' : '0'};">${escapeHtml(integrationSettings.message)}</div>` 
                  : (settings.subtext ? `<div class="notification-subtext">${escapeHtml(settings.subtext)}</div>` : '')}
                ${integrationSettings.cta_text && integrationSettings.cta_url 
                  ? `<button style="margin-top: 8px; padding: 6px 12px; background: ${settings.primaryColor || '#2563EB'}; color: white; border: none; border-radius: 4px; font-size: 12px; font-weight: 500; cursor: pointer;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">${escapeHtml(integrationSettings.cta_text)}</button>` 
                  : (!integrationSettings.cta_text && settings.showTimestamp !== false ? '<div class="notification-subtext">Just now</div>' : '')}
              </div>
              ${campaignType === 'limited-stock' ? '<div class="notification-badge">Low Stock</div>' : ''}
            `;
          })()}
        </div>
        <script>
          // Handle testimonial clicks to show modal
          (function() {
            const notification = document.getElementById('notiproof-notification');
            if (!notification) return;
            
            // Check if this is a testimonial notification
            const isTestimonial = ${selectedTemplate ? 'true' : 'false'};
            if (!isTestimonial) return;
            
            const testimonialData = ${JSON.stringify(settings.testimonialData || selectedTemplate?.preview_json || {})};
            
            notification.style.cursor = 'pointer';
            notification.addEventListener('click', function() {
              showTestimonialModal(testimonialData);
            });
            
            function showTestimonialModal(data) {
              const modal = document.createElement('div');
              modal.className = 'notiproof-modal';
              modal.innerHTML = \`
                <div class="notiproof-modal-overlay"></div>
                <div class="notiproof-modal-content">
                  <button class="notiproof-modal-close" aria-label="Close">&times;</button>
                  <div class="notiproof-modal-body">
                    \${renderFullTestimonial(data)}
                  </div>
                </div>
              \`;
              
              document.body.appendChild(modal);
              document.body.style.overflow = 'hidden';
              
              requestAnimationFrame(() => {
                const overlay = modal.querySelector('.notiproof-modal-overlay');
                const content = modal.querySelector('.notiproof-modal-content');
                if (overlay) overlay.style.opacity = '1';
                if (content) {
                  content.style.opacity = '1';
                  content.style.transform = 'scale(1)';
                }
              });
              
              const closeModal = () => {
                const overlay = modal.querySelector('.notiproof-modal-overlay');
                const content = modal.querySelector('.notiproof-modal-content');
                if (overlay) overlay.style.opacity = '0';
                if (content) {
                  content.style.opacity = '0';
                  content.style.transform = 'scale(0.95)';
                }
                setTimeout(() => {
                  modal.remove();
                  document.body.style.overflow = '';
                }, 300);
              };
              
              const closeBtn = modal.querySelector('.notiproof-modal-close');
              const overlay = modal.querySelector('.notiproof-modal-overlay');
              if (closeBtn) closeBtn.addEventListener('click', closeModal);
              if (overlay) overlay.addEventListener('click', closeModal);
              
              document.addEventListener('keydown', function handleEsc(e) {
                if (e.key === 'Escape') {
                  closeModal();
                  document.removeEventListener('keydown', handleEsc);
                }
              });
            }
            
            function renderFullTestimonial(data) {
              const name = data.author_name || data['template.author_name'] || 'Anonymous Customer';
              const avatar = data.author_avatar || data['template.author_avatar'] || \`https://ui-avatars.com/api/?name=\${encodeURIComponent(name)}&background=2563EB&color=fff\`;
              const position = data.author_position || data['template.author_position'] || 'Customer';
              const company = data.author_company || data['template.author_company'] || '';
              const rating = data.rating_stars || data['template.rating_stars'] || '★★★★★';
              const message = data.message || data['template.message'] || 'Great experience!';
              const timeAgo = 'Just now';
              const verified = data.verified || data['template.verified'] || false;
              const imageUrl = data.image_url || data['template.image_url'];
              const videoUrl = data.video_url || data['template.video_url'];
              
              return \`
                <div class="notiproof-testimonial-modal-card">
                  \${videoUrl ? \`
                    <div class="notiproof-modal-media">
                      <video src="\${videoUrl}" controls class="notiproof-modal-video" autoplay muted></video>
                    </div>
                  \` : imageUrl ? \`
                    <div class="notiproof-modal-media">
                      <img src="\${imageUrl}" alt="Testimonial" class="notiproof-modal-image" />
                    </div>
                  \` : ''}
                  
                  <div class="notiproof-modal-rating">\${rating}</div>
                  <p class="notiproof-modal-message">"\${message}"</p>
                  
                  <div class="notiproof-modal-author">
                    <img src="\${avatar}" alt="\${name}" class="notiproof-modal-avatar" onerror="this.src='https://ui-avatars.com/api/?name=\${encodeURIComponent(name)}&background=2563EB&color=fff'" />
                    <div class="notiproof-modal-author-info">
                      <p class="notiproof-modal-name">\${name}</p>
                      \${position ? \`<p class="notiproof-modal-position">\${position}\${company ? \` at \${company}\` : ''}</p>\` : ''}
                      \${verified ? '<p class="notiproof-modal-verified">✓ Verified Customer</p>' : ''}
                    </div>
                  </div>
                  
                  <p class="notiproof-modal-time">\${timeAgo}</p>
                </div>
              \`;
            }
          })();
        </script>
      </body>
      </html>
    `;

    // Use srcdoc for instant, reliable updates
    iframeRef.current.srcdoc = previewHtml;
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
              sandbox="allow-scripts allow-same-origin"
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
