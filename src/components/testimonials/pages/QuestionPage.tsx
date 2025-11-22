import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface Question {
  id: string;
  text: string;
  type: 'text' | 'textarea' | 'rating' | 'multiple_choice';
  is_required: boolean;
  options?: string[];
}

interface QuestionPageProps {
  question: Question;
  answer: string | number;
  onChange: (answer: string | number) => void;
  onNext: () => void;
  onBack: () => void;
}

export function QuestionPage({ question, answer, onChange, onNext, onBack }: QuestionPageProps) {
  const [hoveredRating, setHoveredRating] = useState(0);

  const handleNext = () => {
    if (question.is_required && !answer) {
      return;
    }
    onNext();
  };

  const isValid = !question.is_required || (answer && answer.toString().trim().length > 0);

  return (
    <div className="space-y-6 py-8">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold">{question.text}</h3>
        {question.is_required && (
          <p className="text-sm text-muted-foreground">* Required</p>
        )}
      </div>

      <div className="space-y-4">
        {question.type === 'text' && (
          <div className="space-y-2">
            <Input
              value={answer as string}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Your answer..."
              className="text-center text-lg"
            />
          </div>
        )}

        {question.type === 'textarea' && (
          <div className="space-y-2">
            <Textarea
              value={answer as string}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Your answer..."
              className="min-h-[150px]"
            />
          </div>
        )}

        {question.type === 'rating' && (
          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => onChange(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-all hover:scale-110"
              >
                <Star
                  className={`h-12 w-12 transition-colors ${
                    star <= (hoveredRating || (answer as number))
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground hover:text-yellow-200'
                  }`}
                />
              </button>
            ))}
          </div>
        )}

        {question.type === 'multiple_choice' && question.options && (
          <div className="space-y-2">
            {question.options.map((option, index) => (
              <button
                key={index}
                type="button"
                onClick={() => onChange(option)}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  answer === option
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext} disabled={!isValid}>
          {question.is_required && !answer ? 'Required' : 'Next'}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
