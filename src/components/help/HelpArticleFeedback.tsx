import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface HelpArticleFeedbackProps {
  articleId: string;
}

interface Feedback {
  id: string;
  is_helpful: boolean;
  feedback_text?: string;
  created_at: string;
}

export const HelpArticleFeedback = ({ articleId }: HelpArticleFeedbackProps) => {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchExistingFeedback();
    }
  }, [articleId, user]);

  const fetchExistingFeedback = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('help_article_feedback')
        .select('*')
        .eq('article_id', articleId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setFeedback(data);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    }
  };

  const submitFeedback = async (isHelpful: boolean) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to provide feedback",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      const feedbackData = {
        article_id: articleId,
        user_id: user.id,
        is_helpful: isHelpful,
        feedback_text: feedbackText || null
      };

      if (feedback) {
        // Update existing feedback
        const { error } = await supabase
          .from('help_article_feedback')
          .update(feedbackData)
          .eq('id', feedback.id);

        if (error) throw error;
      } else {
        // Create new feedback
        const { data, error } = await supabase
          .from('help_article_feedback')
          .insert(feedbackData)
          .select()
          .single();

        if (error) throw error;
        setFeedback(data);
      }

      // Update helpful count
      await supabase.rpc('update_article_helpful_count', {
        article_uuid: articleId
      });

      toast({
        title: "Thank you!",
        description: "Your feedback has been recorded"
      });

      setShowFeedbackForm(false);
      setFeedbackText('');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleThumbsClick = (isHelpful: boolean) => {
    if (feedback && feedback.is_helpful === isHelpful) {
      // Same feedback already given
      return;
    }
    
    if (isHelpful) {
      // Immediate submit for positive feedback
      submitFeedback(true);
    } else {
      // Show form for negative feedback to get details
      setShowFeedbackForm(true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Was this article helpful?</h3>
        
        {!feedback ? (
          <div className="flex gap-2 justify-center">
            <Button
              variant={feedback?.is_helpful === true ? "default" : "outline"}
              onClick={() => handleThumbsClick(true)}
              disabled={submitting}
              className="gap-2"
            >
              <ThumbsUp className="h-4 w-4" />
              Yes
            </Button>
            <Button
              variant={feedback?.is_helpful === false ? "default" : "outline"}
              onClick={() => handleThumbsClick(false)}
              disabled={submitting}
              className="gap-2"
            >
              <ThumbsDown className="h-4 w-4" />
              No
            </Button>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Thank you for your feedback! You found this article{' '}
            {feedback.is_helpful ? 'helpful' : 'not helpful'}.
          </div>
        )}
      </div>

      {showFeedbackForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Help us improve
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="What could we improve about this article? (optional)"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => submitFeedback(false)}
                disabled={submitting}
                size="sm"
              >
                Submit Feedback
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowFeedbackForm(false);
                  setFeedbackText('');
                }}
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {feedback?.feedback_text && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Your feedback:</strong> {feedback.feedback_text}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};