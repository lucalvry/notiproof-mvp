import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronRight } from 'lucide-react';

interface AboutCompanyPageProps {
  company: string;
  position: string;
  onCompanyChange: (company: string) => void;
  onPositionChange: (position: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function AboutCompanyPage({
  company,
  position,
  onCompanyChange,
  onPositionChange,
  onNext,
  onBack,
}: AboutCompanyPageProps) {
  return (
    <div className="space-y-6 py-8">
      <div className="text-center space-y-2">
        <div className="text-6xl mb-2">🏢</div>
        <h3 className="text-2xl font-bold">About Your Company</h3>
        <p className="text-muted-foreground">
          Optional - but helps add credibility
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        <div className="space-y-2">
          <Label htmlFor="company">Company Name</Label>
          <Input
            id="company"
            value={company}
            onChange={(e) => onCompanyChange(e.target.value)}
            placeholder="Acme Inc"
            className="text-lg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="position">Your Role</Label>
          <Input
            id="position"
            value={position}
            onChange={(e) => onPositionChange(e.target.value)}
            placeholder="CEO, Founder, Manager, etc."
            className="text-lg"
          />
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext}>
          {company || position ? 'Continue' : 'Skip'}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
