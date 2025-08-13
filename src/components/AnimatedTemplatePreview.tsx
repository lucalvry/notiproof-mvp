import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause } from 'lucide-react';

interface AnimatedTemplate {
  id: string;
  name: string;
  description: string;
  animations: string[];
  preview: {
    content: string;
    position: string;
    color: string;
    animationType: 'slideIn' | 'fadeIn' | 'bounceIn' | 'pulse' | 'shake';
  };
}

const animatedTemplates: AnimatedTemplate[] = [
  {
    id: 'slide-in-notification',
    name: 'Slide-In Notification',
    description: 'Smooth slide-in animation from the side',
    animations: ['slideInLeft', 'slideInRight', 'slideInUp', 'slideInDown'],
    preview: {
      content: '🛒 John from NYC just purchased Pro Plan!',
      position: 'bottom-right',
      color: '#10B981',
      animationType: 'slideIn'
    }
  },
  {
    id: 'fade-in-popup',
    name: 'Fade-In Popup',
    description: 'Elegant fade-in with subtle scaling',
    animations: ['fadeIn', 'fadeInScale', 'fadeInRotate'],
    preview: {
      content: '⭐ "Amazing product!" - Sarah M. (5 stars)',
      position: 'bottom-left',
      color: '#3B82F6',
      animationType: 'fadeIn'
    }
  },
  {
    id: 'bounce-alert',
    name: 'Bounce Alert',
    description: 'Attention-grabbing bounce animation',
    animations: ['bounceIn', 'bounceInDown', 'bounceInUp'],
    preview: {
      content: '🔥 Limited Time: 50% OFF - Only 3 left!',
      position: 'top-center',
      color: '#EF4444',
      animationType: 'bounceIn'
    }
  },
  {
    id: 'pulse-indicator',
    name: 'Pulse Indicator',
    description: 'Continuous pulse for ongoing activity',
    animations: ['pulse', 'heartbeat', 'glow'],
    preview: {
      content: '👥 18 people are viewing this page',
      position: 'top-right',
      color: '#8B5CF6',
      animationType: 'pulse'
    }
  },
  {
    id: 'shake-urgency',
    name: 'Shake Urgency',
    description: 'Shake animation for urgent notifications',
    animations: ['shake', 'wobble', 'jello'],
    preview: {
      content: '⏰ Cart expires in 5 minutes!',
      position: 'bottom-center',
      color: '#F59E0B',
      animationType: 'shake'
    }
  }
];

interface AnimatedTemplatePreviewProps {
  template: AnimatedTemplate;
  isSelected: boolean;
  onSelect: (template: AnimatedTemplate) => void;
}

interface AnimatedTemplateCardProps {
  template: AnimatedTemplate;
  isSelected: boolean;
  onSelect: (template: AnimatedTemplate) => void;
}

const AnimatedTemplateCard = ({ template, isSelected, onSelect }: AnimatedTemplateCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAnimation, setCurrentAnimation] = useState(0);

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setCurrentAnimation(prev => (prev + 1) % template.animations.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isPlaying, template.animations.length]);

  const getAnimationClass = () => {
    const animName = template.animations[currentAnimation];
    switch (template.preview.animationType) {
      case 'slideIn':
        return isPlaying ? 'animate-slide-in-right' : '';
      case 'fadeIn':
        return isPlaying ? 'animate-fade-in' : '';
      case 'bounceIn':
        return isPlaying ? 'animate-bounce' : '';
      case 'pulse':
        return isPlaying ? 'animate-pulse' : '';
      case 'shake':
        return isPlaying ? 'animate-shake' : '';
      default:
        return '';
    }
  };

  const getPositionClasses = () => {
    const pos = template.preview.position;
    const baseClasses = 'absolute p-3 bg-background border rounded-lg shadow-lg max-w-xs transition-all duration-500';
    
    if (pos.includes('top')) {
      if (pos.includes('center')) return `${baseClasses} top-4 left-1/2 transform -translate-x-1/2`;
      if (pos.includes('right')) return `${baseClasses} top-4 right-4`;
      return `${baseClasses} top-4 left-4`;
    }
    
    if (pos.includes('bottom')) {
      if (pos.includes('center')) return `${baseClasses} bottom-4 left-1/2 transform -translate-x-1/2`;
      if (pos.includes('right')) return `${baseClasses} bottom-4 right-4`;
      return `${baseClasses} bottom-4 left-4`;
    }
    
    return `${baseClasses} bottom-4 right-4`;
  };

  return (
    <Card 
      className={`cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'
      }`}
      onClick={() => onSelect(template)}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-medium">{template.name}</h4>
            <p className="text-sm text-muted-foreground">{template.description}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsPlaying(!isPlaying);
            }}
            className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          {template.animations.map((animation, index) => (
            <Badge 
              key={animation} 
              variant={index === currentAnimation && isPlaying ? "default" : "outline"}
              className="text-xs"
            >
              {animation}
            </Badge>
          ))}
        </div>

        {/* Preview Area */}
        <div className="relative bg-muted rounded-lg p-6 min-h-[120px] overflow-hidden">
          <div 
            className={`${getPositionClasses()} ${getAnimationClass()}`}
            style={{ 
              borderLeftColor: template.preview.color, 
              borderLeftWidth: '4px',
              opacity: isPlaying ? 1 : 0.7
            }}
          >
            <div className="text-sm">
              {template.preview.content}
            </div>
          </div>
          <div className="text-center text-muted-foreground text-xs">
            Preview Area
          </div>
        </div>
      </div>
    </Card>
  );
};

interface AnimatedTemplatePreviewMainProps {
  onSelectTemplate: (template: AnimatedTemplate) => void;
  selectedTemplate?: string;
}

export const AnimatedTemplatePreview = ({ onSelectTemplate, selectedTemplate }: AnimatedTemplatePreviewMainProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Enhanced Animation Templates</h2>
        <p className="text-muted-foreground">
          Choose from our collection of animated templates to make your notifications more engaging
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {animatedTemplates.map((template) => (
          <AnimatedTemplateCard
            key={template.id}
            template={template}
            isSelected={selectedTemplate === template.id}
            onSelect={onSelectTemplate}
          />
        ))}
      </div>
    </div>
  );
};

// Add these custom animations to your CSS
export const animationStyles = `
@keyframes slide-in-right {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}

.animate-slide-in-right {
  animation: slide-in-right 0.5s ease-out;
}

.animate-fade-in {
  animation: fade-in 0.5s ease-out;
}

.animate-shake {
  animation: shake 0.5s ease-in-out;
}
`;