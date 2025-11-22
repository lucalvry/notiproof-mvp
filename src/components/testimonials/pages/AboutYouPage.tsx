import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronRight } from 'lucide-react';

interface AboutYouPageProps {
  name: string;
  email: string;
  onNameChange: (name: string) => void;
  onEmailChange: (email: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function AboutYouPage({
  name,
  email,
  onNameChange,
  onEmailChange,
  onNext,
  onBack,
}: AboutYouPageProps) {
  const isValid = name.trim().length >= 2;

  return (
    <div className="space-y-6 py-8">
      <div className="text-center space-y-2">
        <div className="text-6xl mb-2">👤</div>
        <h3 className="text-2xl font-bold">About You</h3>
        <p className="text-muted-foreground">
          Tell us a bit about yourself
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Your Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="John Doe"
            className="text-lg"
          />
          {name.trim().length > 0 && name.trim().length < 2 && (
            <p className="text-xs text-destructive">Name must be at least 2 characters</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email (Optional)</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="john@example.com"
            className="text-lg"
          />
          <p className="text-xs text-muted-foreground">
            We'll never share your email publicly
          </p>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!isValid}>
          Next
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
