import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

interface WelcomePageProps {
  welcomeMessage?: string;
  formTitle?: string;
  onNext: () => void;
}

export function WelcomePage({ welcomeMessage, formTitle, onNext }: WelcomePageProps) {
  return (
    <div className="text-center space-y-6 py-8">
      <div className="text-6xl mb-4">👋</div>
      <h2 className="text-3xl font-bold">
        {formTitle || 'Share Your Experience'}
      </h2>
      <p className="text-lg text-muted-foreground max-w-md mx-auto">
        {welcomeMessage || "We'd love to hear about your experience! Your feedback helps us improve and helps others make informed decisions."}
      </p>
      <div className="pt-4">
        <Button size="lg" onClick={onNext} className="min-w-[200px]">
          Get Started
          <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
