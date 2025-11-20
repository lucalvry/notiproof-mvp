import { useEffect, useRef } from 'react';
import { renderTemplate, TemplateConfig } from '@/lib/templateEngine';
import { CanonicalEvent } from '@/lib/integrations/types';

interface TemplateRendererProps {
  template: TemplateConfig;
  event: CanonicalEvent;
  className?: string;
}

/**
 * Component that renders a template with event data
 */
export function TemplateRenderer({ template, event, className = '' }: TemplateRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Render the template with event data
    const html = renderTemplate(template, event);
    containerRef.current.innerHTML = html;
  }, [template, event]);

  return (
    <div 
      ref={containerRef} 
      className={className}
      data-template-id={template.id}
      data-provider={template.provider}
    />
  );
}
