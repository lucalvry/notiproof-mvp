import { Button } from '@/components/ui/button';
import { Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface RewardConfig {
  enabled: boolean;
  type: 'coupon' | 'link';
  value: string;
  limit_to_video?: boolean;
}

interface RewardPageProps {
  rewardConfig: RewardConfig;
  hasVideo: boolean;
  onNext: () => void;
}

export function RewardPage({ rewardConfig, hasVideo, onNext }: RewardPageProps) {
  // Check if reward should be shown
  const shouldShowReward = rewardConfig.enabled && 
    (!rewardConfig.limit_to_video || hasVideo);

  if (!shouldShowReward) {
    // Skip this page if no reward
    onNext();
    return null;
  }

  const handleCopyCoupon = () => {
    if (rewardConfig.type === 'coupon') {
      navigator.clipboard.writeText(rewardConfig.value);
      toast.success('Coupon code copied to clipboard!');
    }
  };

  const handleOpenLink = () => {
    if (rewardConfig.type === 'link') {
      window.open(rewardConfig.value, '_blank');
    }
  };

  return (
    <div className="space-y-8 py-8">
      <div className="text-center space-y-4">
        <div className="text-7xl mb-4 animate-bounce">🎁</div>
        <h3 className="text-3xl font-bold">Thank You! Here's Your Reward</h3>
        <p className="text-lg text-muted-foreground">
          As a token of our appreciation
        </p>
      </div>

      <div className="max-w-md mx-auto">
        {rewardConfig.type === 'coupon' && (
          <div className="space-y-4">
            <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border-2 border-primary/20">
              <p className="text-sm text-muted-foreground mb-2 text-center">Your Coupon Code:</p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-3xl font-bold font-mono tracking-wider">
                  {rewardConfig.value}
                </p>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCopyCoupon}
                  className="shrink-0"
                >
                  <Copy className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-center text-muted-foreground">
              Use this code at checkout to get your discount
            </p>
          </div>
        )}

        {rewardConfig.type === 'link' && (
          <div className="space-y-4">
            <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border-2 border-primary/20 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Click below to claim your reward
              </p>
              <Button
                size="lg"
                onClick={handleOpenLink}
                className="w-full"
              >
                Claim Your Reward
                <ExternalLink className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center pt-4">
        <Button size="lg" onClick={onNext}>
          Continue
        </Button>
      </div>
    </div>
  );
}
