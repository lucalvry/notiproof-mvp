import { useParams, useSearchParams } from 'react-router-dom';
import { TestimonialEmbedBuilder } from '@/components/testimonials/TestimonialEmbedBuilder';

export default function TestimonialEmbedBuilderPage() {
  const { embedId } = useParams();
  const [searchParams] = useSearchParams();
  const websiteId = searchParams.get('websiteId');

  if (!websiteId) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center text-destructive">
          Error: Website ID is required
        </div>
      </div>
    );
  }

  return (
    <TestimonialEmbedBuilder
      websiteId={websiteId}
      embedId={embedId === 'new' ? undefined : embedId}
    />
  );
}
