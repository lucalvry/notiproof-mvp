import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Gift, Link as LinkIcon, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RewardSettingsProps {
  config: {
    enabled: boolean;
    type?: 'coupon' | 'link';
    value?: string;
    limit_to_video?: boolean;
  };
  onChange: (config: any) => void;
}

export function RewardSettings({ config, onChange }: RewardSettingsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Reward System</h3>
        <p className="text-xs text-muted-foreground">
          Incentivize testimonials with rewards
        </p>
      </div>

      <div className="flex items-center justify-between">
        <Label>Enable Rewards</Label>
        <Switch
          checked={config.enabled}
          onCheckedChange={(enabled) => onChange({ ...config, enabled })}
        />
      </div>

      {config.enabled && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                <CardTitle className="text-base">Coupon Code</CardTitle>
              </div>
              <CardDescription>
                Provide a discount code or promotional offer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="coupon"
                  checked={config.type === 'coupon'}
                  onChange={() => onChange({ ...config, type: 'coupon' })}
                />
                <Label htmlFor="coupon" className="cursor-pointer">
                  Use this reward type
                </Label>
              </div>
              {config.type === 'coupon' && (
                <div className="space-y-2 ml-6">
                  <Label>Coupon Code</Label>
                  <Input
                    value={config.value || ''}
                    onChange={(e) => onChange({ ...config, value: e.target.value })}
                    placeholder="e.g., THANKS20"
                  />
                  <p className="text-xs text-muted-foreground">
                    This code will be shown to users after submission
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                <CardTitle className="text-base">External Link</CardTitle>
              </div>
              <CardDescription>
                Redirect users to a special offer page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="link"
                  checked={config.type === 'link'}
                  onChange={() => onChange({ ...config, type: 'link' })}
                />
                <Label htmlFor="link" className="cursor-pointer">
                  Use this reward type
                </Label>
              </div>
              {config.type === 'link' && (
                <div className="space-y-2 ml-6">
                  <Label>Reward URL</Label>
                  <Input
                    value={config.value || ''}
                    onChange={(e) => onChange({ ...config, value: e.target.value })}
                    placeholder="https://example.com/special-offer"
                    type="url"
                  />
                  <p className="text-xs text-muted-foreground">
                    Users will be redirected to this URL after submission
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base text-muted-foreground">
                    Spin-the-Wheel
                  </CardTitle>
                </div>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
              <CardDescription>
                Gamified reward system with randomized prizes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 opacity-50">
                <input type="radio" disabled />
                <Label className="cursor-not-allowed">
                  Use this reward type (Available in Pro plan)
                </Label>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <Label>Limit to Video Submissions</Label>
              <p className="text-xs text-muted-foreground">
                Only give rewards for video testimonials
              </p>
            </div>
            <Switch
              checked={config.limit_to_video}
              onCheckedChange={(limit_to_video) =>
                onChange({ ...config, limit_to_video })
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
