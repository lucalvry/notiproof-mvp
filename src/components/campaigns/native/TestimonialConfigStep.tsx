import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Star, Settings2 } from "lucide-react";

interface TestimonialConfigStepProps {
  config: any;
  onChange: (config: any) => void;
  onComplete: () => void;
}

export function TestimonialConfigStep({
  config,
  onChange,
  onComplete
}: TestimonialConfigStepProps) {
  const [localConfig, setLocalConfig] = useState({
    collection_form_name: config.collection_form_name || '',
    auto_approve_threshold: config.auto_approve_threshold || 4,
    require_moderation: config.require_moderation ?? true,
    min_rating_display: config.min_rating_display || 3,
    show_only_verified: config.show_only_verified || false,
    include_fields: config.include_fields || ['name', 'company', 'rating', 'message'],
    thank_you_message: config.thank_you_message || 'Thank you for your testimonial!',
    ...config
  });

  const handleChange = (updates: any) => {
    const newConfig = { ...localConfig, ...updates };
    setLocalConfig(newConfig);
    onChange(newConfig);
  };

  const handleComplete = () => {
    onChange(localConfig);
    onComplete();
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-3">
            <Star className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h3 className="text-xl font-semibold">Testimonial Configuration</h3>
        <p className="text-sm text-muted-foreground">
          Configure how testimonials are collected, moderated, and displayed
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Collection Settings</CardTitle>
          <CardDescription>
            Set up how testimonials will be collected and managed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="form-name">Collection Form Name</Label>
            <Input
              id="form-name"
              placeholder="e.g., Product Reviews, Service Feedback"
              value={localConfig.collection_form_name}
              onChange={(e) => handleChange({ collection_form_name: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              A collection form will be created with this name
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="thank-you">Thank You Message</Label>
            <Textarea
              id="thank-you"
              placeholder="Thank you for taking the time to share your experience!"
              value={localConfig.thank_you_message}
              onChange={(e) => handleChange({ thank_you_message: e.target.value })}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Moderation & Display</CardTitle>
          <CardDescription>
            Control quality and visibility of testimonials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="moderation">Require Moderation</Label>
              <p className="text-sm text-muted-foreground">
                Review testimonials before displaying them
              </p>
            </div>
            <Switch
              id="moderation"
              checked={localConfig.require_moderation}
              onCheckedChange={(checked) => handleChange({ require_moderation: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="auto-approve">Auto-Approve Threshold</Label>
            <Select
              value={String(localConfig.auto_approve_threshold)}
              onValueChange={(value) => handleChange({ auto_approve_threshold: parseInt(value) })}
            >
              <SelectTrigger id="auto-approve">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3+ stars</SelectItem>
                <SelectItem value="4">4+ stars</SelectItem>
                <SelectItem value="5">5 stars only</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Testimonials at or above this rating can be auto-approved
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="min-rating">Minimum Rating to Display</Label>
            <Select
              value={String(localConfig.min_rating_display)}
              onValueChange={(value) => handleChange({ min_rating_display: parseInt(value) })}
            >
              <SelectTrigger id="min-rating">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1+ stars (show all)</SelectItem>
                <SelectItem value="2">2+ stars</SelectItem>
                <SelectItem value="3">3+ stars</SelectItem>
                <SelectItem value="4">4+ stars</SelectItem>
                <SelectItem value="5">5 stars only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="verified">Show Only Verified</Label>
              <p className="text-sm text-muted-foreground">
                Display only testimonials from verified customers
              </p>
            </div>
            <Switch
              id="verified"
              checked={localConfig.show_only_verified}
              onCheckedChange={(checked) => handleChange({ show_only_verified: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleComplete} size="lg">
          Complete Configuration
        </Button>
      </div>
    </div>
  );
}
