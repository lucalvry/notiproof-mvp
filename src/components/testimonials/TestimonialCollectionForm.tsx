import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// Import page components
import { WelcomePage } from './pages/WelcomePage';
import { RatingPage } from './pages/RatingPage';
import { NegativeFeedbackPage } from './pages/NegativeFeedbackPage';
import { MessagePage } from './pages/MessagePage';
import { QuestionPage } from './pages/QuestionPage';
import { PrivateFeedbackPage } from './pages/PrivateFeedbackPage';
import { ConsentPage } from './pages/ConsentPage';
import { AboutYouPage } from './pages/AboutYouPage';
import { AboutCompanyPage } from './pages/AboutCompanyPage';
import { RewardPage } from './pages/RewardPage';
import { ThankYouPage } from './pages/ThankYouPage';

interface TestimonialCollectionFormProps {
  websiteId: string;
  formId?: string;
  formConfig?: any;
  welcomeMessage?: string;
  thankYouMessage?: string;
  onSuccess?: () => void;
  showCompanyFields?: boolean;
}

interface FormData {
  rating: number;
  negative_feedback: string;
  message: string;
  private_feedback: string;
  consented: boolean;
  name: string;
  email: string;
  company: string;
  position: string;
  questions: Record<string, string | number>;
  avatarFile: File | null;
  videoFile: File | null;
  avatarPreview: string | null;
  videoPreview: string | null;
}

export function TestimonialCollectionForm({
  websiteId,
  formId,
  formConfig: initialFormConfig,
  welcomeMessage,
  thankYouMessage,
  onSuccess,
  showCompanyFields = false,
}: TestimonialCollectionFormProps) {
  const params = useParams();
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pageSequence, setPageSequence] = useState<string[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [formConfig, setFormConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    rating: 0,
    negative_feedback: '',
    message: '',
    private_feedback: '',
    consented: false,
    name: '',
    email: '',
    company: '',
    position: '',
    questions: {},
    avatarFile: null,
    videoFile: null,
    avatarPreview: null,
    videoPreview: null,
  });

  // Track form view on mount
  useEffect(() => {
    const trackView = async () => {
      const slug = params.slug;
      console.log('[Form Init] Tracking view for slug:', slug);
      
      if (slug) {
        try {
          await supabase.rpc('increment_form_views', { form_slug: slug });
          console.log('[Form Init] View tracked successfully');
        } catch (error) {
          console.error('[Form Init] Error tracking form view:', error);
        }
      }
    };
    trackView();
  }, [params.slug]);

  // Load form configuration and questions on mount if not provided
  useEffect(() => {
    async function loadFormConfig() {
      console.log('[Form Config] Loading configuration...', {
        hasInitialConfig: !!initialFormConfig,
        formId,
        websiteId
      });

      // If formConfig is already provided, use it
      if (initialFormConfig) {
        console.log('[Form Config] Using provided configuration');
        setFormConfig(initialFormConfig);
        
        // Extract page sequence
        const pagesConfig = initialFormConfig.pages_config as any;
        const sequence = pagesConfig?.sequence || [
          'welcome',
          'rating',
          'message',
          'about_you',
          'about_company',
          'thank_you',
        ];
        console.log('[Form Config] Page sequence:', sequence);
        setPageSequence(sequence);
        
        // Load questions if formId is provided
        if (formId) {
          console.log('[Form Config] Loading questions for form:', formId);
          const { data: questionsList, error: questionsError } = await supabase
            .from('testimonial_form_questions')
            .select('*')
            .eq('form_id', formId)
            .order('sort_order');
          
          if (questionsError) {
            console.error('[Form Config] Error loading questions:', questionsError);
          } else {
            console.log('[Form Config] Loaded questions:', questionsList?.length || 0);
            setQuestions(questionsList || []);
          }
        }
        
        setLoading(false);
        console.log('[Form Config] Configuration loaded successfully');
        return;
      }

      // Otherwise load from database
      if (!formId) {
        console.warn('[Form Config] No formId provided, skipping database load');
        setLoading(false);
        return;
      }

      try {
        console.log('[Form Config] Loading from database for formId:', formId);
        
        // Load form configuration
        const { data: form, error: formError } = await supabase
          .from('testimonial_forms')
          .select('*')
          .eq('id', formId)
          .single();

        if (formError) {
          console.error('[Form Config] Error loading form:', formError);
          throw formError;
        }

        console.log('[Form Config] Form loaded:', {
          name: form.name,
          isActive: form.is_active,
          formType: form.form_type
        });

        // Load questions
        const { data: questionsList, error: questionsError } = await supabase
          .from('testimonial_form_questions')
          .select('*')
          .eq('form_id', formId)
          .order('sort_order');

        if (questionsError) {
          console.error('[Form Config] Error loading questions:', questionsError);
          throw questionsError;
        }

        console.log('[Form Config] Questions loaded:', questionsList?.length || 0);

        setFormConfig(form);
        setQuestions(questionsList || []);
        
        // Set page sequence from config or use default
        const pagesConfig = form.pages_config as any;
        const sequence = pagesConfig?.sequence || [
          'welcome',
          'rating',
          'message',
          'about_you',
          'about_company',
          'thank_you',
        ];
        console.log('[Form Config] Page sequence:', sequence);
        setPageSequence(sequence);
        
        console.log('[Form Config] Configuration loaded successfully from database');
      } catch (error) {
        console.error('[Form Config] Fatal error loading form config:', error);
        toast.error('Failed to load form configuration');
      } finally {
        setLoading(false);
      }
    }

    loadFormConfig();
  }, [formId, initialFormConfig]);

  const currentPageId = pageSequence[currentPageIndex];
  const totalPages = pageSequence.length;
  const progress = ((currentPageIndex + 1) / totalPages) * 100;

  const goNext = () => {
    // Handle conditional branching
    if (currentPageId === 'rating' && formData.rating < 3 && formConfig?.negative_feedback_enabled) {
      // Check if negative_feedback page is in sequence
      const negFeedbackIndex = pageSequence.indexOf('negative_feedback');
      if (negFeedbackIndex > currentPageIndex) {
        setCurrentPageIndex(negFeedbackIndex);
        return;
      }
    }

    // Check if we're moving to the last page
    const nextPageIndex = currentPageIndex + 1;
    const nextPageId = pageSequence[nextPageIndex];
    
    // If next page is thank_you or reward, trigger submission first
    if (nextPageId === 'thank_you' || nextPageId === 'reward') {
      console.log('[Navigation] Moving to final page, triggering submission...');
      handleSubmit();
    } else if (currentPageIndex < pageSequence.length - 1) {
      setCurrentPageIndex(nextPageIndex);
    }
  };

  const goBack = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };

  const uploadFile = async (file: File, type: 'avatar' | 'video', retryCount = 0): Promise<string | null> => {
    const maxRetries = 2;
    
    try {
      console.log(`[Upload] Starting ${type} upload:`, {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        websiteId,
        attempt: retryCount + 1
      });

      // Validate file size
      const maxSize = type === 'avatar' ? 2 * 1024 * 1024 : 10 * 1024 * 1024; // 2MB for avatar, 10MB for video
      if (file.size > maxSize) {
        const sizeMB = (maxSize / 1024 / 1024).toFixed(0);
        throw new Error(`File size exceeds ${sizeMB}MB limit`);
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${websiteId}/${type}s/${fileName}`;

      console.log(`[Upload] Uploading to path: ${filePath}`);

      const { error: uploadError } = await supabase.storage
        .from('testimonials')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error(`[Upload] Storage error:`, uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('testimonials')
        .getPublicUrl(filePath);

      console.log(`[Upload] Success! Public URL:`, publicUrl);
      return publicUrl;
    } catch (error) {
      console.error(`[Upload] Error uploading ${type} (attempt ${retryCount + 1}/${maxRetries + 1}):`, error);
      
      // Retry logic for transient errors
      if (retryCount < maxRetries && error instanceof Error && 
          (error.message.includes('network') || error.message.includes('timeout'))) {
        console.log(`[Upload] Retrying ${type} upload...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        return uploadFile(file, type, retryCount + 1);
      }

      // Log error to backend
      try {
        await supabase.rpc('log_integration_action', {
          _integration_type: 'testimonial_submission',
          _action: 'file_upload',
          _status: 'error',
          _error_message: error instanceof Error ? error.message : 'Unknown error',
          _details: {
            type,
            fileName: file.name,
            fileSize: file.size,
            websiteId,
            attempt: retryCount + 1
          }
        });
      } catch (logError) {
        console.error('[Upload] Failed to log error:', logError);
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to upload ${type}: ${errorMessage}`);
      return null;
    }
  };

  const handleSubmit = async () => {
    // Prevent double submission
    if (hasSubmitted) {
      console.log('[Submit] Already submitted, moving to next page...');
      setCurrentPageIndex(currentPageIndex + 1);
      return;
    }

    console.log('=== TESTIMONIAL SUBMISSION STARTED ===');
    console.log('[Submit] Form data:', {
      websiteId,
      formId,
      hasAvatar: !!formData.avatarFile,
      hasVideo: !!formData.videoFile,
      name: formData.name,
      email: formData.email,
      rating: formData.rating,
      messageLength: formData.message?.length || 0
    });

    setSubmitting(true);
    
    try {
      let avatarUrl: string | null = null;
      let videoUrl: string | null = null;

      // Phase 1: Upload media files
      console.log('[Submit] Phase 1: Uploading media files...');
      
      if (formData.avatarFile) {
        console.log('[Submit] Uploading avatar...');
        avatarUrl = await uploadFile(formData.avatarFile, 'avatar');
        if (!avatarUrl) {
          console.warn('[Submit] Avatar upload failed, continuing without avatar...');
          toast.error('Avatar upload failed, but submitting your testimonial anyway');
        } else {
          console.log('[Submit] Avatar uploaded successfully:', avatarUrl);
        }
      } else {
        console.log('[Submit] No avatar provided, continuing without avatar');
      }
      
      if (formData.videoFile) {
        console.log('[Submit] Uploading video...');
        videoUrl = await uploadFile(formData.videoFile, 'video');
        if (!videoUrl) {
          console.warn('[Submit] Video upload failed, but continuing...');
        } else {
          console.log('[Submit] Video uploaded successfully:', videoUrl);
        }
      }

      // Phase 2: Insert testimonial record
      console.log('[Submit] Phase 2: Inserting testimonial record...');
      
      // Validate required fields before submission
      if (!websiteId) {
        throw new Error('Website ID is required');
      }
      
      if (!formId) {
        console.error('[Submit] Missing formId - this should not happen');
        throw new Error('Form ID is required');
      }

      const testimonialData = {
        website_id: websiteId,
        form_id: formId,
        source: 'form' as const,
        author_name: formData.name,
        author_email: formData.email || null,
        rating: formData.rating,
        message: formData.message,
        author_avatar_url: avatarUrl, // Author's profile picture
        image_url: null, // Reserved for testimonial-related images (screenshots, products, etc.)
        video_url: videoUrl,
        metadata: {
          form_id: formId,
          company: formData.company,
          position: formData.position,
          private_feedback: formData.private_feedback,
          negative_feedback: formData.negative_feedback,
          questions: formData.questions,
          consented: formData.consented,
        },
        status: 'pending' as const,
      };

      console.log('[Submit] Testimonial data prepared:', {
        ...testimonialData,
        metadata: JSON.stringify(testimonialData.metadata)
      });

      const { data: testimonial, error } = await supabase
        .from('testimonials')
        .insert(testimonialData)
        .select()
        .single();

      if (error) {
        console.error('[Submit] Database insert error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        // Log to backend
        try {
          await supabase.rpc('log_integration_action', {
            _integration_type: 'testimonial_submission',
            _action: 'insert_testimonial',
            _status: 'error',
            _error_message: error.message,
            _details: {
              code: error.code,
              hint: error.hint,
              websiteId,
              formId
            }
          });
        } catch (logError) {
          console.error('[Submit] Failed to log database error:', logError);
        }

        throw error;
      }

      console.log('[Submit] Testimonial inserted successfully:', testimonial?.id);

      // Phase 3: Process submission (rewards, thank you email)
      if (testimonial && formId) {
        console.log('[Submit] Phase 3: Processing submission...');
        
        try {
          const { data, error: processError } = await supabase.functions.invoke('process-testimonial-submission', {
            body: {
              testimonial_id: testimonial.id,
              form_id: formId,
              email: formData.email,
              name: formData.name,
              has_video: !!videoUrl,
            },
          });

          if (processError) {
            console.warn('[Submit] Processing error (non-fatal):', processError);
          } else {
            console.log('[Submit] Processing completed:', data);
          }
        } catch (processError) {
          console.warn('[Submit] Processing failed (non-fatal):', processError);
          // Don't fail the submission if processing fails
        }
      }

      // Phase 4: Success!
      console.log('=== TESTIMONIAL SUBMISSION COMPLETED ===');
      setHasSubmitted(true);
      toast.success('Thank you for your testimonial!');
      
      // Move to reward or thank you page
      setCurrentPageIndex(currentPageIndex + 1);
      onSuccess?.();
      
    } catch (error) {
      console.error('=== TESTIMONIAL SUBMISSION FAILED ===');
      console.error('[Submit] Error details:', error);
      console.error('[Submit] Error type:', typeof error);
      console.error('[Submit] Error stringified:', JSON.stringify(error, null, 2));
      
      // Extract error message from various error types
      let errorMessage = 'An unexpected error occurred';
      let errorCode = 'UNKNOWN';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        errorCode = error.name;
      } else if (typeof error === 'object' && error !== null) {
        // Handle Supabase errors
        const supabaseError = error as any;
        if (supabaseError.message) errorMessage = supabaseError.message;
        if (supabaseError.code) errorCode = supabaseError.code;
        if (supabaseError.details) console.error('[Submit] Error details:', supabaseError.details);
        if (supabaseError.hint) console.error('[Submit] Error hint:', supabaseError.hint);
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      console.error('[Submit] Processed error:', { errorMessage, errorCode });
      
      // Log critical error to backend
      try {
        await supabase.rpc('log_integration_action', {
          _integration_type: 'testimonial_submission',
          _action: 'submit_testimonial',
          _status: 'error',
          _error_message: errorMessage,
          _details: {
            websiteId,
            formId,
            errorCode,
            hasAvatar: !!formData.avatarFile,
            hasVideo: !!formData.videoFile,
            errorType: typeof error,
            rawError: JSON.stringify(error)
          }
        });
      } catch (logError) {
        console.error('[Submit] Failed to log critical error:', logError);
      }

      // Show user-friendly error message
      if (errorMessage.includes('violates row-level security policy')) {
        toast.error('Unable to submit: Form may be inactive. Please contact support.');
        console.error('[Submit] RLS Policy violation - form might not be active or form_id is invalid');
      } else if (errorMessage.includes('duplicate key')) {
        toast.error('This testimonial has already been submitted.');
      } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
        toast.error('Network error. Please check your connection and try again.');
      } else if (!formId) {
        toast.error('Form configuration error. Please refresh and try again.');
      } else {
        toast.error(`Failed to submit: ${errorMessage}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
      </Card>
    );
  }

  // Render current page
  const renderPage = () => {
    // Get question for this page if it's a question page
    const questionMatch = currentPageId?.match(/^q(\d+)$/);
    const questionIndex = questionMatch ? parseInt(questionMatch[1]) - 1 : -1;
    const currentQuestion = questionIndex >= 0 ? questions[questionIndex] : null;

    switch (currentPageId) {
      case 'welcome':
        return (
          <WelcomePage
            welcomeMessage={welcomeMessage}
            formTitle={formConfig?.name}
            onNext={goNext}
          />
        );

      case 'rating':
        return (
          <RatingPage
            rating={formData.rating}
            onChange={(rating) => setFormData({ ...formData, rating })}
            onNext={goNext}
            onBack={goBack}
          />
        );

      case 'negative_feedback':
        return (
          <NegativeFeedbackPage
            feedback={formData.negative_feedback}
            onChange={(feedback) => setFormData({ ...formData, negative_feedback: feedback })}
            onNext={goNext}
            onBack={goBack}
          />
        );

      case 'message':
        return (
          <MessagePage
            message={formData.message}
            onChange={(message) => setFormData({ ...formData, message })}
            avatarFile={formData.avatarFile}
            videoFile={formData.videoFile}
            avatarPreview={formData.avatarPreview}
            videoPreview={formData.videoPreview}
            onAvatarChange={(file, preview) =>
              setFormData({ ...formData, avatarFile: file, avatarPreview: preview })
            }
            onVideoChange={(file, preview) =>
              setFormData({ ...formData, videoFile: file, videoPreview: preview })
            }
            onNext={goNext}
            onBack={goBack}
          />
        );

      case 'private_feedback':
        return (
          <PrivateFeedbackPage
            feedback={formData.private_feedback}
            onChange={(feedback) => setFormData({ ...formData, private_feedback: feedback })}
            onNext={goNext}
            onBack={goBack}
          />
        );

      case 'consent':
        return (
          <ConsentPage
            consented={formData.consented}
            onChange={(consented) => setFormData({ ...formData, consented })}
            onNext={goNext}
            onBack={goBack}
          />
        );

      case 'about_you':
        return (
          <AboutYouPage
            name={formData.name}
            email={formData.email}
            onNameChange={(name) => setFormData({ ...formData, name })}
            onEmailChange={(email) => setFormData({ ...formData, email })}
            onNext={goNext}
            onBack={goBack}
          />
        );

      case 'about_company':
        return (
          <AboutCompanyPage
            company={formData.company}
            position={formData.position}
            onCompanyChange={(company) => setFormData({ ...formData, company })}
            onPositionChange={(position) => setFormData({ ...formData, position })}
            onNext={goNext}
            onBack={goBack}
          />
        );

      case 'reward':
        return (
          <RewardPage
            rewardConfig={formConfig?.reward_config || { enabled: false }}
            hasVideo={!!formData.videoFile}
            onNext={goNext}
          />
        );

      case 'thank_you':
        return <ThankYouPage thankYouMessage={thankYouMessage} />;

      default:
        // Handle custom question pages
        if (currentQuestion) {
          return (
            <QuestionPage
              question={currentQuestion}
              answer={formData.questions[currentQuestion.id] || ''}
              onChange={(answer) =>
                setFormData({
                  ...formData,
                  questions: { ...formData.questions, [currentQuestion.id]: answer },
                })
              }
              onNext={goNext}
              onBack={goBack}
            />
          );
        }

        return (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Page not found: {currentPageId}</p>
            <button onClick={goNext} className="mt-4 underline">
              Skip
            </button>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      {currentPageId !== 'welcome' && currentPageId !== 'thank_you' && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">
            Step {currentPageIndex + 1} of {totalPages}
          </p>
        </div>
      )}

      {/* Current page */}
      <Card className="p-6">
        {submitting ? (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Submitting your testimonial...</p>
          </div>
        ) : (
          renderPage()
        )}
      </Card>
    </div>
  );
}
