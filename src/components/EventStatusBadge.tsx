import { Badge } from '@/components/ui/badge';

interface EventStatusBadgeProps {
  status: string | null;
  source: string | null;
}

export const EventStatusBadge = ({ status, source }: EventStatusBadgeProps) => {
  const getStatusVariant = (status: string | null) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getSourceIcon = (source: string | null) => {
    switch (source) {
      case 'demo':
        return '🎭';
      case 'manual':
        return '✏️';
      case 'api':
        return '🔗';
      case 'webhook':
        return '⚡';
      default:
        return '❓';
    }
  };

  return (
    <div className="flex gap-1">
      <Badge variant={getStatusVariant(status)}>
        {status || 'unknown'}
      </Badge>
      <Badge variant="outline">
        {getSourceIcon(source)} {source || 'unknown'}
      </Badge>
    </div>
  );
};