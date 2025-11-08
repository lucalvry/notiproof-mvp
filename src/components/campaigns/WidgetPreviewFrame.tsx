import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Smartphone, Monitor, Tablet, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WidgetPreviewFrameProps {
  settings: any;
  campaignType?: string;
  position?: string;
  animation?: string;
}

export function WidgetPreviewFrame({ 
  settings, 
  campaignType,
  position = "bottom-left",
  animation = "slide" 
}: WidgetPreviewFrameProps) {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [refreshKey, setRefreshKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const deviceDimensions = {
    desktop: { width: '100%', height: '600px', icon: Monitor },
    tablet: { width: '768px', height: '500px', icon: Tablet },
    mobile: { width: '375px', height: '667px', icon: Smartphone },
  };

  const currentDevice = deviceDimensions[device];
  const DeviceIcon = currentDevice.icon;

  // Inject widget preview into iframe
  useEffect(() => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    
    if (!doc) return;

    // Generate preview HTML with widget
    const previewHTML = generatePreviewHTML(settings, position, animation);
    
    doc.open();
    doc.write(previewHTML);
    doc.close();
  }, [settings, position, animation, refreshKey]);

  const generatePreviewHTML = (settings: any, position: string, animation: string) => {
    // Use ACTUAL campaign data from settings
    const headline = settings.headline || 'John Smith from New York just purchased';
    const subtext = settings.subtext || '';
    
    // Replace placeholders with realistic preview data
    const previewHeadline = headline
      .replace(/\{\{user_name\}\}/g, 'Sarah Johnson')
      .replace(/\{\{location\}\}/g, 'San Francisco, CA')
      .replace(/\{\{product_name\}\}/g, 'Premium Plan')
      .replace(/\{\{count\}\}/g, '47')
      .replace(/\{\{page_name\}\}/g, 'Pricing Page')
      .replace(/\{\{price\}\}/g, '$99.99')
      .replace(/\{\{plan_name\}\}/g, 'Pro Subscription')
      .replace(/\{\{action\}\}/g, 'signed up')
      .replace(/\{\{event_type\}\}/g, 'Purchase')
      .replace(/\{\{time\}\}/g, '2 minutes ago')
      .replace(/\{\{name\}\}/g, 'Sarah');
    
    const previewSubtext = subtext
      .replace(/\{\{name\}\}/g, 'Sarah')
      .replace(/\{\{count\}\}/g, '3,421')
      .replace(/\{\{location\}\}/g, 'San Francisco')
      .replace(/\{\{product_name\}\}/g, 'Premium Plan')
      .replace(/\{\{time\}\}/g, '2 minutes ago');
    
    const positionMap: Record<string, string> = {
      'bottom-left': 'bottom: 20px; left: 20px;',
      'bottom-right': 'bottom: 20px; right: 20px;',
      'bottom-center': 'bottom: 20px; left: 50%; transform: translateX(-50%);',
      'top-left': 'top: 20px; left: 20px;',
      'top-right': 'top: 20px; right: 20px;',
      'top-center': 'top: 20px; left: 50%; transform: translateX(-50%);',
      'center-left': 'top: 50%; left: 20px; transform: translateY(-50%);',
      'center-right': 'top: 50%; right: 20px; transform: translateY(-50%);',
      'center': 'top: 50%; left: 50%; transform: translate(-50%, -50%);',
    };

    const animationMap: Record<string, string> = {
      'slide': 'transform: translateY(0); transition: transform 0.3s ease-out;',
      'fade': 'opacity: 1; transition: opacity 0.3s ease-out;',
      'bounce': 'animation: bounce 0.5s ease-out;',
      'none': '',
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              padding: 20px;
              overflow: hidden;
            }
            .mock-content {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              border-radius: 12px;
              padding: 40px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }
            .mock-heading {
              font-size: 32px;
              font-weight: 700;
              color: #1a1a1a;
              margin-bottom: 16px;
            }
            .mock-text {
              font-size: 16px;
              color: #6b7280;
              line-height: 1.6;
              margin-bottom: 12px;
            }
            @keyframes bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
            }
            .notification-widget {
              position: fixed;
              ${positionMap[position] || positionMap['bottom-left']}
              z-index: 9999;
              ${animationMap[animation] || ''}
              background: ${settings.backgroundColor || '#ffffff'};
              color: ${settings.textColor || '#1a1a1a'};
              padding: 16px;
              border-radius: ${settings.borderRadius || 12}px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              max-width: 380px;
              width: calc(100% - 40px);
              border: 2px solid ${settings.primaryColor || '#2563EB'}40;
            }
            .widget-content {
              display: flex;
              align-items: start;
              gap: 12px;
            }
            .widget-avatar {
              width: 40px;
              height: 40px;
              border-radius: 50%;
              background: ${settings.primaryColor || '#2563EB'}20;
              color: ${settings.primaryColor || '#2563EB'};
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 600;
              font-size: 14px;
              flex-shrink: 0;
            }
            .widget-text {
              flex: 1;
              min-width: 0;
            }
            .widget-headline {
              font-size: ${settings.fontSize || 14}px;
              font-weight: 600;
              margin-bottom: 4px;
              line-height: 1.4;
            }
            .widget-subtext {
              font-size: ${(parseInt(settings.fontSize || 14) - 2)}px;
              opacity: 0.7;
              line-height: 1.4;
            }
            .widget-badge {
              display: inline-block;
              background: ${settings.primaryColor || '#2563EB'}20;
              color: ${settings.primaryColor || '#2563EB'};
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 500;
              margin-left: 6px;
            }
            .widget-timestamp {
              font-size: 11px;
              opacity: 0.5;
              margin-top: 6px;
            }
          </style>
        </head>
        <body>
          <div class="mock-content">
            <h1 class="mock-heading">Your Amazing Product</h1>
            <p class="mock-text">
              Welcome to our website! We're showing you how your social proof notification will appear to your visitors.
            </p>
            <p class="mock-text">
              This preview updates in real-time as you customize the design, so you can see exactly how it will look.
            </p>
            <p class="mock-text">
              The notification will appear in the position you selected with your chosen colors, fonts, and animation.
            </p>
          </div>

          <div class="notification-widget">
            <div class="widget-content">
              ${settings.showAvatar !== false ? '<div class="widget-avatar">SJ</div>' : ''}
              <div class="widget-text">
                <div class="widget-headline">
                  ${previewHeadline}
                  ${settings.showLocation !== false ? '<span class="widget-badge">🌎 SF</span>' : ''}
                </div>
                ${previewSubtext ? `<div class="widget-subtext">${previewSubtext}</div>` : ''}
                ${settings.showTimestamp !== false ? '<div class="widget-timestamp">✓ Just now</div>' : ''}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              Live Preview
              <Badge variant="secondary" className="text-xs">Updates in real-time</Badge>
            </CardTitle>
            <CardDescription className="text-xs">See how your widget will appear</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-8 gap-2"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Device Selector */}
        <div className="flex items-center gap-2">
          {(['desktop', 'tablet', 'mobile'] as const).map((d) => {
            const Icon = deviceDimensions[d].icon;
            return (
              <Button
                key={d}
                variant={device === d ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDevice(d)}
                className="h-8 gap-2 flex-1"
              >
                <Icon className="h-3 w-3" />
                <span className="capitalize text-xs">{d}</span>
              </Button>
            );
          })}
        </div>

        {/* Preview Frame */}
        <div 
          className="border rounded-lg bg-muted/30 flex items-center justify-center p-4 overflow-auto"
          style={{ minHeight: '400px' }}
        >
          <div style={{ width: currentDevice.width, maxWidth: '100%' }}>
            <iframe
              ref={iframeRef}
              style={{
                width: '100%',
                height: currentDevice.height,
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                backgroundColor: 'white',
              }}
              title="Widget Preview"
            />
          </div>
        </div>

        <Alert>
          <AlertDescription className="text-xs">
            <strong>Tip:</strong> Changes to design, position, and animation appear instantly in the preview above.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
