import { Card, CardContent } from '@/components/ui/card';
import { renderTemplatePreview, TemplateConfig } from '@/lib/templateEngine';
import { useEffect, useRef } from 'react';

interface TemplatePreviewProps {
  template: TemplateConfig;
  className?: string;
}

/**
 * Preview component that renders a template with sample data
 */
export function TemplatePreview({ template, className = '' }: TemplatePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Render the template with preview data
    const html = renderTemplatePreview(template);
    containerRef.current.innerHTML = html;
  }, [template]);

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div 
          ref={containerRef}
          className="template-preview"
          data-template-id={template.id}
        />
      </CardContent>
    </Card>
  );
}
