import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { TestimonialCollectionForm } from '@/components/testimonials/TestimonialCollectionForm';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function TestimonialCollection() {
  const { slug } = useParams<{ slug: string }>();
  const [formConfig, setFormConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadForm() {
      console.log('[Collection Page] Loading form for slug:', slug);
      
      if (!slug) {
        console.error('[Collection Page] No slug provided');
        setError(true);
        setLoading(false);
        return;
      }

      try {
        console.log('[Collection Page] Fetching form from database...');
        
        // Load form with questions
        const { data, error: fetchError } = await supabase
          .from('testimonial_forms')
          .select(`
            *,
            testimonial_form_questions(*)
          `)
          .eq('slug', slug)
          .eq('is_active', true)
          .single();

        if (fetchError || !data) {
          console.error('[Collection Page] Error fetching form:', fetchError);
          console.error('[Collection Page] Form not found or inactive for slug:', slug);
          setError(true);
        } else {
          console.log('[Collection Page] Form loaded successfully:', {
            id: data.id,
            name: data.name,
            isActive: data.is_active,
            websiteId: data.website_id,
            questionsCount: data.testimonial_form_questions?.length || 0
          });
          setFormConfig(data);
        }
      } catch (err) {
        console.error('[Collection Page] Exception loading form:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    loadForm();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !formConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Form Not Found</h1>
          <p className="text-muted-foreground">This testimonial form is invalid or has been disabled</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <TestimonialCollectionForm
          websiteId={formConfig.website_id}
          formId={formConfig.id}
          formConfig={{
            ...formConfig.form_config,
            name: formConfig.name,
            form_type: formConfig.form_type,
            pages_config: formConfig.pages_config,
            reward_config: formConfig.reward_config,
            negative_feedback_enabled: formConfig.negative_feedback_enabled,
            private_feedback_enabled: formConfig.private_feedback_enabled,
            consent_required: formConfig.consent_required,
          }}
          welcomeMessage={formConfig.welcome_message}
          thankYouMessage={formConfig.thank_you_message}
          showCompanyFields={formConfig.form_config?.show_company_fields || false}
        />
      </div>
    </div>
  );
}
