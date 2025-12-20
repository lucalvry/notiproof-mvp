import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Code, RefreshCw, CheckCircle } from 'lucide-react';
import { renderTemplatePreview } from '@/lib/templateEngine';
import { shouldShowVerificationBadge, VERIFICATION_BADGE_TEXT } from '@/lib/verificationBadgeUtils';
import type { TemplateConfig } from '@/lib/templateEngine';

interface TemplatePreviewProps {
  template: TemplateConfig;
  showCode?: boolean;
  onSelect?: (template: TemplateConfig) => void;
  selected?: boolean;
  scale?: number;
  visitorsPulseMode?: 'real' | 'simulated';
}

export function TemplatePreview({ 
  template, 
  showCode = false,
  onSelect,
  selected = false,
  scale = 0.8,
  visitorsPulseMode,
}: TemplatePreviewProps) {
  const [renderedHtml, setRenderedHtml] = useState('');
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [key, setKey] = useState(0);

  // Determine if verification badge should be shown
  const showVerificationBadge = shouldShowVerificationBadge(template.provider, {
    visitorsPulseMode: visitorsPulseMode,
  });

  useEffect(() => {
    const html = renderTemplatePreview(template, { includeVerificationBadge: showVerificationBadge });
    setRenderedHtml(html);
  }, [template, key, showVerificationBadge]);

  const handleRefresh = () => {
    setKey(k => k + 1);
  };

  return (
    <Card className={`p-4 ${selected ? 'ring-2 ring-primary' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-sm">{template.name}</h4>
          {template.description && (
            <p className="text-xs text-muted-foreground mt-1">
              {template.description}
            </p>
          )}
          <div className="flex gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              {template.style_variant}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {template.provider}
            </Badge>
            {showVerificationBadge && (
              <Badge variant="outline" className="text-xs text-primary border-primary/30">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          {showCode && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode(v => v === 'preview' ? 'code' : 'preview')}
            >
              {viewMode === 'preview' ? <Code className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {viewMode === 'preview' ? (
        <div 
          className="bg-muted/30 rounded-lg p-4 min-h-[120px] max-h-[300px] overflow-hidden"
          style={{
            position: 'relative',
            isolation: 'isolate',
            contain: 'layout style paint',
          }}
        >
          <div 
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: `${100 / scale}%`,
              minHeight: '160px',
            }}
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        </div>
      ) : (
        <pre className="bg-muted/30 rounded-lg p-4 text-xs overflow-auto max-h-[300px]">
          <code>{template.html_template}</code>
        </pre>
      )}

      {onSelect && (
        <Button
          className="w-full mt-3"
          variant={selected ? "default" : "outline"}
          onClick={() => onSelect(template)}
        >
          {selected ? 'Selected' : 'Use This Template'}
        </Button>
      )}

      {template.required_fields.length > 0 && (
        <div className="mt-3 text-xs text-muted-foreground">
          <strong>Required fields:</strong> {template.required_fields.join(', ')}
        </div>
      )}
    </Card>
  );
}
