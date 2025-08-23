import { Badge } from '@/components/ui/badge';
import { Zap, Leaf, TestTube } from 'lucide-react';

interface EventSourceIndicatorProps {
  source: 'natural' | 'quick_win' | 'demo' | string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export const EventSourceIndicator = ({ 
  source, 
  size = 'sm', 
  showIcon = true 
}: EventSourceIndicatorProps) => {
  const getSourceConfig = (source: string) => {
    switch (source) {
      case 'natural':
        return {
          label: 'Natural',
          variant: 'secondary' as const,
          icon: Leaf,
          description: 'Organic customer interaction'
        };
      case 'quick_win':
        return {
          label: 'Quick-Win',
          variant: 'outline' as const,
          icon: Zap,
          description: 'Business promotion'
        };
      case 'demo':
        return {
          label: 'Demo',
          variant: 'secondary' as const,
          icon: TestTube,
          description: 'Sample data'
        };
      default:
        return {
          label: source,
          variant: 'secondary' as const,
          icon: TestTube,
          description: 'Unknown source'
        };
    }
  };

  const config = getSourceConfig(source);
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant}
      className={`
        inline-flex items-center gap-1
        ${size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1'}
      `}
      title={config.description}
    >
      {showIcon && <Icon size={size === 'sm' ? 12 : 14} />}
      {config.label}
    </Badge>
  );
};