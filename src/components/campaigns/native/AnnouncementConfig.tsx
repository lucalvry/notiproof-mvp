import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AnnouncementConfigProps {
  config: {
    title: string;
    message: string;
    cta_text?: string;
    cta_url?: string;
    schedule_type: 'instant' | 'scheduled' | 'recurring';
    start_date?: string;
    end_date?: string;
    recurrence?: {
      pattern: 'daily' | 'weekly' | 'monthly';
      days_of_week?: number[];
      time_of_day?: string;
    };
    priority: number;
    variables: Record<string, string>;
  };
  onChange: (config: any) => void;
}

export function AnnouncementConfig({ config, onChange }: AnnouncementConfigProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>📢 Smart Announcement Setup</CardTitle>
        <CardDescription>
          Create promotional notifications without third-party tools
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Announcement Title (Internal)</Label>
            <Input
              placeholder="e.g., Black Friday Sale, Product Launch"
              value={config.title}
              onChange={(e) => {
                const updatedConfig = { ...config, title: e.target.value };
                onChange(updatedConfig);
              }}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Message Content</Label>
            <Textarea
              placeholder="e.g., Limited time: {{discount}}% off all products!"
              value={config.message}
              onChange={(e) => {
                const updatedConfig = { ...config, message: e.target.value };
                onChange(updatedConfig);
              }}
              rows={3}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">Available: {`{{discount}}`}</Badge>
              <Badge variant="secondary" className="text-xs">{`{{coupon_code}}`}</Badge>
              <Badge variant="secondary" className="text-xs">{`{{product_name}}`}</Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Call-to-Action Text (Optional)</Label>
              <Input
                placeholder="e.g., Shop Now, Learn More"
                value={config.cta_text ?? ''}
                onChange={(e) => {
                  console.log('✏️ CTA Text changed:', e.target.value);
                  const updatedConfig = { ...config, cta_text: e.target.value };
                  console.log('📤 Calling parent onChange with:', updatedConfig);
                  onChange(updatedConfig);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>CTA Link URL (Optional)</Label>
              <Input
                placeholder="https://..."
                value={config.cta_url ?? ''}
                onChange={(e) => {
                  console.log('✏️ CTA URL changed:', e.target.value);
                  const updatedConfig = { ...config, cta_url: e.target.value };
                  console.log('📤 Calling parent onChange with:', updatedConfig);
                  onChange(updatedConfig);
                }}
              />
            </div>
          </div>
        </div>

        {/* Schedule Configuration */}
        <div className="space-y-3">
          <Label>Schedule Type</Label>
          <Tabs 
            value={config.schedule_type} 
            onValueChange={(v) => onChange({ ...config, schedule_type: v as any })}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="instant">Publish Now</TabsTrigger>
              <TabsTrigger value="scheduled">Schedule Once</TabsTrigger>
              <TabsTrigger value="recurring">Recurring</TabsTrigger>
            </TabsList>
            
            <TabsContent value="scheduled" className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={config.start_date || ''}
                    onChange={(e) => onChange({ ...config, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date & Time (Optional)</Label>
                  <Input
                    type="datetime-local"
                    value={config.end_date || ''}
                    onChange={(e) => onChange({ ...config, end_date: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="recurring" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Recurrence Pattern</Label>
                <Select
                  value={config.recurrence?.pattern || 'daily'}
                  onValueChange={(v) => onChange({
                    ...config,
                    recurrence: { ...config.recurrence, pattern: v as any }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Every Day</SelectItem>
                    <SelectItem value="weekly">Specific Days of Week</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {config.recurrence?.pattern === 'weekly' && (
                <div className="space-y-2">
                  <Label>Days of Week</Label>
                  <div className="flex gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                      <Button
                        key={idx}
                        variant={config.recurrence?.days_of_week?.includes(idx) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          const days = config.recurrence?.days_of_week || [];
                          const newDays = days.includes(idx)
                            ? days.filter(d => d !== idx)
                            : [...days, idx];
                          onChange({
                            ...config,
                            recurrence: { ...config.recurrence, days_of_week: newDays }
                          });
                        }}
                      >
                        {day}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Time of Day</Label>
                <Input
                  type="time"
                  value={config.recurrence?.time_of_day || '09:00'}
                  onChange={(e) => onChange({
                    ...config,
                    recurrence: { ...config.recurrence, time_of_day: e.target.value }
                  })}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Display Priority</Label>
            <Badge>{config.priority || 5}/10</Badge>
          </div>
          <Slider
            min={1}
            max={10}
            step={1}
            value={[config.priority || 5]}
            onValueChange={(values) => onChange({ ...config, priority: values[0] })}
          />
          <p className="text-xs text-muted-foreground">
            Higher priority announcements show first when multiple are active
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
