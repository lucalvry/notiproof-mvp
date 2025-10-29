import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

interface RulesTargetingProps {
  rules: any;
  onChange: (rules: any) => void;
}

export function RulesTargeting({ rules, onChange }: RulesTargetingProps) {
  const [config, setConfig] = useState({
    frequency: "10",
    sessionLimit: "5",
    pageTargeting: "all",
    customUrls: "",
    scheduling: false,
    startDate: "",
    endDate: "",
    deviceTargeting: "both",
    geoEnabled: false,
    countries: "",
    timeBasedEnabled: false,
    timeWindow: "",
    ...rules,
  });

  const updateConfig = (updates: Partial<typeof config>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onChange(newConfig);
  };

  const startDate = rules.startDate ? new Date(rules.startDate) : undefined;
  const endDate = rules.endDate ? new Date(rules.endDate) : undefined;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Campaign Schedule</CardTitle>
          <CardDescription>Set when your campaign should run</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Select start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => updateConfig({ startDate: date?.toISOString() })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>End Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "No end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => updateConfig({ endDate: date?.toISOString() })}
                    disabled={(date) => startDate ? date < startDate : false}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Display Frequency</CardTitle>
          <CardDescription>Control how often notifications appear</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Show notification every (seconds)</Label>
            <Input
              type="number"
              value={config.frequency}
              onChange={(e) => updateConfig({ frequency: e.target.value })}
              min="1"
              max="60"
            />
          </div>
          <div className="space-y-2">
            <Label>Maximum per session</Label>
            <Input
              type="number"
              value={config.sessionLimit}
              onChange={(e) => updateConfig({ sessionLimit: e.target.value })}
              min="1"
              max="20"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Page Targeting</CardTitle>
          <CardDescription>Choose where notifications appear</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            value={config.pageTargeting}
            onValueChange={(value) => updateConfig({ pageTargeting: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pages</SelectItem>
              <SelectItem value="home">Homepage Only</SelectItem>
              <SelectItem value="product">Product Pages</SelectItem>
              <SelectItem value="checkout">Checkout Pages</SelectItem>
              <SelectItem value="custom">Custom URLs</SelectItem>
            </SelectContent>
          </Select>

          {config.pageTargeting === "custom" && (
            <div className="space-y-2">
              <Label>Custom URLs (one per line)</Label>
              <Textarea
                value={config.customUrls}
                onChange={(e) => updateConfig({ customUrls: e.target.value })}
                placeholder="/products/item-1&#10;/landing-page&#10;/special-offer"
                rows={4}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scheduling</CardTitle>
          <CardDescription>Set campaign start and end dates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable scheduling</Label>
            <Switch
              checked={config.scheduling}
              onCheckedChange={(checked) => updateConfig({ scheduling: checked })}
            />
          </div>
          {config.scheduling && (
            <>
              <div className="space-y-2">
                <Label>Start Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={config.startDate}
                  onChange={(e) => updateConfig({ startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={config.endDate}
                  onChange={(e) => updateConfig({ endDate: e.target.value })}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Device Targeting</CardTitle>
          <CardDescription>Choose which devices to show notifications on</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={config.deviceTargeting}
            onValueChange={(value) => updateConfig({ deviceTargeting: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="both">Desktop & Mobile</SelectItem>
              <SelectItem value="desktop">Desktop Only</SelectItem>
              <SelectItem value="mobile">Mobile Only</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Advanced Options</CardTitle>
              <CardDescription>Pro features for enhanced targeting</CardDescription>
            </div>
            <Badge variant="secondary">Pro</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between opacity-50">
            <Label>Geo Targeting</Label>
            <Switch disabled />
          </div>
          <div className="flex items-center justify-between opacity-50">
            <Label>Time-based Targeting</Label>
            <Switch disabled />
          </div>
          <p className="text-xs text-muted-foreground">
            Upgrade to Pro to unlock geo-targeting and time-based rules
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
