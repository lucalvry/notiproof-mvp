import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHelp } from '@/contexts/HelpContext';

interface HelpButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function HelpButton({ variant = 'ghost', size = 'sm', className }: HelpButtonProps) {
  const { toggleHelpSidebar } = useHelp();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleHelpSidebar}
      className={className}
      title="Open Help Center"
    >
      <HelpCircle className="h-4 w-4" />
      {size !== 'sm' && <span className="ml-2">Help</span>}
    </Button>
  );
}