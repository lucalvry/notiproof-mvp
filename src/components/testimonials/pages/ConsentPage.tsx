import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronRight } from 'lucide-react';

interface ConsentPageProps {
  consented: boolean;
  onChange: (consented: boolean) => void;
  onNext: () => void;
  onBack: () => void;
}

export function ConsentPage({ consented, onChange, onNext, onBack }: ConsentPageProps) {
  return (
    <div className="space-y-8 py-8">
      <div className="text-center space-y-4">
        <div className="text-6xl mb-2">✅</div>
        <h3 className="text-2xl font-bold">Permission to Share</h3>
        <p className="text-muted-foreground">
          We'd love to share your testimonial
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-start gap-4 p-4 border-2 rounded-lg">
          <Checkbox
            id="consent"
            checked={consented}
            onCheckedChange={onChange}
            className="mt-1"
          />
          <label
            htmlFor="consent"
            className="text-sm leading-relaxed cursor-pointer"
          >
            I give permission to use my testimonial on your website, marketing materials, and social media. I understand that my name, photo/video (if provided), and feedback may be publicly displayed.
          </label>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> You can request removal of your testimonial at any time by contacting us. Your email address will never be publicly displayed without additional permission.
          </p>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!consented}>
          {consented ? 'Continue' : 'Please accept to continue'}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
