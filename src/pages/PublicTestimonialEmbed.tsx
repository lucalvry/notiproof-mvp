import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { TestimonialEmbedPreview } from '@/components/testimonials/TestimonialEmbedPreview';

export default function PublicTestimonialEmbed() {
  const { embedId } = useParams();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEmbed();
  }, [embedId]);

  const loadEmbed = async () => {
    if (!embedId) {
      setError('No embed ID provided');
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from('testimonial_embeds')
      .select('*')
      .eq('id', embedId)
      .eq('is_active', true)
      .single();

    if (fetchError || !data) {
      setError('Embed not found or inactive');
    } else {
      setConfig(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading testimonials...</div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-destructive">{error || 'Failed to load embed'}</div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen p-6"
      style={{
        backgroundColor: config.style_config?.backgroundColor || '#ffffff'
      }}
    >
      <TestimonialEmbedPreview config={config} websiteId={config.website_id} />
    </div>
  );
}
