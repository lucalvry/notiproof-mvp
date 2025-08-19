import React from 'react';
import { ExternalLink, Play, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RichTooltipProps {
  children: React.ReactNode;
  title: string;
  description: string;
  examples?: string[];
  links?: Array<{
    text: string;
    url: string;
    external?: boolean;
  }>;
  videoUrl?: string;
  className?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function RichTooltip({
  children,
  title,
  description,
  examples = [],
  links = [],
  videoUrl,
  className,
  side = 'top',
}: RichTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side={side} 
          className={`max-w-xs p-4 ${className || ''}`}
          sideOffset={8}
        >
          <div className="space-y-3">
            {/* Header */}
            <div>
              <h4 className="font-medium text-sm mb-1">{title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>

            {/* Examples */}
            {examples.length > 0 && (
              <div>
                <h5 className="text-xs font-medium mb-1">Examples:</h5>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {examples.map((example, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-1">•</span>
                      <span>{example}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Video */}
            {videoUrl && (
              <div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs h-7"
                  onClick={() => window.open(videoUrl, '_blank')}
                >
                  <Play className="h-3 w-3 mr-1" />
                  Watch Tutorial
                </Button>
              </div>
            )}

            {/* Links */}
            {links.length > 0 && (
              <div className="space-y-1">
                {links.map((link, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant="ghost"
                    className="w-full justify-start text-xs h-6 px-2"
                    onClick={() => {
                      if (link.external) {
                        window.open(link.url, '_blank');
                      } else {
                        window.location.href = link.url;
                      }
                    }}
                  >
                    {link.external ? (
                      <ExternalLink className="h-3 w-3 mr-1" />
                    ) : (
                      <FileText className="h-3 w-3 mr-1" />
                    )}
                    {link.text}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Quick helper for common tooltip types
export function FeatureTooltip({
  children,
  feature,
  description,
  ...props
}: Omit<RichTooltipProps, 'title'> & { feature: string }) {
  return (
    <RichTooltip
      title={`${feature} Feature`}
      description={description}
      {...props}
    >
      {children}
    </RichTooltip>
  );
}

export function HelpTooltip({
  children,
  topic,
  description,
  ...props
}: Omit<RichTooltipProps, 'title'> & { topic: string }) {
  return (
    <RichTooltip
      title={`Help: ${topic}`}
      description={description}
      {...props}
    >
      {children}
    </RichTooltip>
  );
}