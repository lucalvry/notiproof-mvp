import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChevronRight } from 'lucide-react';

interface NegativeFeedbackPageProps {
  feedback: string;
  onChange: (feedback: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function NegativeFeedbackPage({ feedback, onChange, onNext, onBack }: NegativeFeedbackPageProps) {
  return (
    <div className="space-y-6 py-8">
      <div className="text-center space-y-4">
        <div className="text-6xl mb-2">😞</div>
        <h3 className="text-2xl font-bold">We're sorry to hear that</h3>
        <p className="text-muted-foreground">
          Could you tell us what went wrong? Your feedback helps us improve.
        </p>
      </div>

      <div className="space-y-2">
        <Textarea
          value={feedback}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Please share what could have been better..."
          className="min-h-[150px]"
        />
        <p className="text-xs text-muted-foreground">
          This feedback will be kept private and only used to improve our service
        </p>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext}>
          {feedback.trim() ? 'Continue' : 'Skip'}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
