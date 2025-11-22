import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PAGE_DEFINITIONS } from '@/lib/testimonialTemplates';

interface LiveFormPreviewProps {
  config: any;
  previewMode?: boolean;
}

export function LiveFormPreview({ config, previewMode = false }: LiveFormPreviewProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const pages = config.pages_config?.sequence || ['welcome', 'thank_you'];
  
  const currentPageId = pages[currentPage];
  const pageInfo = PAGE_DEFINITIONS[currentPageId] || { 
    name: currentPageId, 
    description: '', 
    icon: '📝' 
  };

  const goNext = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goBack = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const renderPageContent = () => {
    // Find custom question for this page
    const questionId = currentPageId.startsWith('q') ? currentPageId : null;
    const question = questionId 
      ? config.questions?.find((q: any) => q.id === questionId)
      : null;

    switch (currentPageId) {
      case 'rating':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-lg mb-4">How would you rate your experience?</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className="text-4xl hover:scale-110 transition-transform"
                  >
                    ⭐
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'welcome':
        return (
          <div className="text-center space-y-4">
            <p className="text-xl">👋</p>
            <h3 className="text-2xl font-bold">Share Your Experience</h3>
            <p className="text-muted-foreground">
              We'd love to hear about your experience! Your feedback helps us improve.
            </p>
          </div>
        );

      case 'message':
        return (
          <div className="space-y-4">
            <label className="block text-sm font-medium">
              Tell us about your experience
            </label>
            <textarea
              className="w-full min-h-[120px] p-3 border rounded-md"
              placeholder="Share your thoughts..."
              disabled={!previewMode}
            />
            
            {config.settings?.allow_media_uploads && (
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex gap-4 text-3xl">
                    <span>📷</span>
                    <span>🎥</span>
                  </div>
                  <p className="text-sm font-medium">Upload Photo or Video</p>
                  <p className="text-xs text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      case 'about_you':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Your Name</label>
              <input
                type="text"
                className="w-full p-2 border rounded-md"
                placeholder="John Doe"
                disabled={!previewMode}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                className="w-full p-2 border rounded-md"
                placeholder="john@example.com"
                disabled={!previewMode}
              />
            </div>
          </div>
        );

      case 'about_company':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Company Name</label>
              <input
                type="text"
                className="w-full p-2 border rounded-md"
                placeholder="Acme Inc"
                disabled={!previewMode}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Your Role</label>
              <input
                type="text"
                className="w-full p-2 border rounded-md"
                placeholder="CEO"
                disabled={!previewMode}
              />
            </div>
          </div>
        );

      case 'consent':
        return (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                disabled={!previewMode}
              />
              <label className="text-sm">
                I give permission to use my testimonial on your website, marketing materials, and social media
              </label>
            </div>
          </div>
        );

      case 'negative_feedback':
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-4xl mb-2">😞</p>
              <h3 className="text-lg font-semibold">We're sorry to hear that</h3>
              <p className="text-sm text-muted-foreground">
                Could you tell us what went wrong?
              </p>
            </div>
            <textarea
              className="w-full min-h-[120px] p-3 border rounded-md"
              placeholder="Share your feedback privately..."
              disabled={!previewMode}
            />
          </div>
        );

      case 'private_feedback':
        return (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-muted rounded-md mb-2">
              <span className="text-lg">🔒</span>
              <p className="text-sm text-muted-foreground">
                This feedback will remain private and only be visible to your team
              </p>
            </div>
            <textarea
              className="w-full min-h-[120px] p-3 border rounded-md"
              placeholder="Any private notes or suggestions..."
              disabled={!previewMode}
            />
          </div>
        );

      case 'reward':
        return (
          <div className="text-center space-y-4">
            <p className="text-6xl">🎁</p>
            <h3 className="text-2xl font-bold">Here's Your Reward!</h3>
            {config.reward_config?.type === 'coupon' && (
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Your coupon code:</p>
                <p className="text-2xl font-bold font-mono">
                  {config.reward_config?.value || 'THANKS20'}
                </p>
              </div>
            )}
            {config.reward_config?.type === 'link' && (
              <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium">
                Claim Your Reward
              </button>
            )}
          </div>
        );

      case 'thank_you':
        return (
          <div className="text-center space-y-4">
            <p className="text-6xl">🎉</p>
            <h3 className="text-2xl font-bold">Thank You!</h3>
            <p className="text-muted-foreground">
              We appreciate you taking the time to share your feedback.
            </p>
          </div>
        );

      default:
        // Custom question page
        if (question) {
          return (
            <div className="space-y-4">
              <label className="block text-sm font-medium">
                {question.text}
                {question.is_required && <span className="text-destructive ml-1">*</span>}
              </label>
              {question.type === 'textarea' ? (
                <textarea
                  className="w-full min-h-[120px] p-3 border rounded-md"
                  placeholder="Your answer..."
                  disabled={!previewMode}
                />
              ) : question.type === 'rating' ? (
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      className="text-3xl hover:scale-110 transition-transform"
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="text"
                  className="w-full p-2 border rounded-md"
                  placeholder="Your answer..."
                  disabled={!previewMode}
                />
              )}
            </div>
          );
        }

        return (
          <div className="text-center text-muted-foreground">
            <p>Page: {pageInfo.icon} {pageInfo.name}</p>
          </div>
        );
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">{pageInfo.icon}</span>
          <span>{pageInfo.name}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderPageContent()}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={goBack}
            disabled={currentPage === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="text-sm text-muted-foreground">
            Page {currentPage + 1} of {pages.length}
          </div>

          <Button
            size="sm"
            onClick={goNext}
            disabled={currentPage === pages.length - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
