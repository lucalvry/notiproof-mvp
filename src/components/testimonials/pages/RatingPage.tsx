import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Star, ChevronRight } from 'lucide-react';

interface RatingPageProps {
  rating: number;
  onChange: (rating: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export function RatingPage({ rating, onChange, onNext, onBack }: RatingPageProps) {
  const [hoveredRating, setHoveredRating] = useState(0);

  const handleNext = () => {
    if (rating > 0) {
      onNext();
    }
  };

  return (
    <div className="space-y-8 py-8">
      <div className="text-center space-y-4">
        <h3 className="text-2xl font-bold">How would you rate your experience?</h3>
        <p className="text-muted-foreground">
          Your honest feedback helps us improve
        </p>
      </div>

      <div className="flex justify-center gap-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="transition-all hover:scale-110 focus:outline-none focus:scale-110"
          >
            <Star
              className={`h-12 w-12 transition-colors ${
                star <= (hoveredRating || rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground hover:text-yellow-200'
              }`}
            />
          </button>
        ))}
      </div>

      {rating > 0 && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            You selected: <span className="font-semibold">{rating} star{rating !== 1 ? 's' : ''}</span>
          </p>
        </div>
      )}

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext} disabled={rating === 0}>
          Next
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
