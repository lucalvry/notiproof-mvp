import { CheckCircle2 } from 'lucide-react';

interface ThankYouPageProps {
  thankYouMessage?: string;
}

export function ThankYouPage({ thankYouMessage }: ThankYouPageProps) {
  return (
    <div className="text-center space-y-6 py-12">
      <div className="flex justify-center">
        <div className="rounded-full bg-green-100 p-4">
          <CheckCircle2 className="h-16 w-16 text-green-600" />
        </div>
      </div>
      
      <div className="space-y-3">
        <h3 className="text-3xl font-bold">Thank You!</h3>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          {thankYouMessage || 'Your testimonial has been submitted and is pending review. We truly appreciate you taking the time to share your experience!'}
        </p>
      </div>

      <div className="pt-4">
        <p className="text-sm text-muted-foreground">
          You can now close this page
        </p>
      </div>
    </div>
  );
}
