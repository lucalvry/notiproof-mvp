import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChevronRight, Lock } from 'lucide-react';

interface PrivateFeedbackPageProps {
  feedback: string;
  onChange: (feedback: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function PrivateFeedbackPage({ feedback, onChange, onNext, onBack }: PrivateFeedbackPageProps) {
  return (
    <div className="space-y-6 py-8">
      <div className="text-center space-y-4">
        <div className="text-6xl mb-2">🔒</div>
        <h3 className="text-2xl font-bold">Private Feedback</h3>
        <p className="text-muted-foreground">
          Share any private thoughts or suggestions
        </p>
      </div>

      <div className="flex items-start gap-3 p-4 bg-muted rounded-lg mb-4">
        <Lock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          This feedback will remain private and only be visible to the team. It will not be published or shared publicly.
        </p>
      </div>

      <div className="space-y-2">
        <Textarea
          value={feedback}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Any private notes, suggestions, or concerns..."
          className="min-h-[150px]"
        />
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
