import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Users, ChevronDown, Settings, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface LiveVisitorConfigProps {
  config: {
    mode: 'real' | 'simulated';
    scope: 'site' | 'page';
    min_count: number;
    max_count: number;
    variance_percent: number;
    update_interval_seconds: number;
    target_pages?: string[];
  };
  onChange: (config: any) => void;
}

export function LiveVisitorConfig({ config, onChange }: LiveVisitorConfigProps) {
  // Add safe defaults to prevent TypeError - default to 'real' for actual visitor tracking
  const safeConfig = {
    mode: config.mode || 'real',
    scope: config.scope || 'site',
    min_count: config.min_count ?? 5,
    max_count: config.max_count ?? 50,
    variance_percent: config.variance_percent ?? 30,
    update_interval_seconds: config.update_interval_seconds ?? 30,
    target_pages: config.target_pages || [],
  };
  
  const [previewCount, setPreviewCount] = useState(safeConfig.min_count);
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Visitors Pulse Setup
        </CardTitle>
        <CardDescription>
          Show how many people are viewing your site right now.
          {safeConfig.mode === 'real' && (
            <Badge variant="outline" className="ml-2 text-xs">Real-time tracking enabled</Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Phase 3: Simplified Default UI */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-base">Visitor Count Range</Label>
            <p className="text-sm text-muted-foreground">
              We'll show a realistic visitor count within this range
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Minimum Visitors</Label>
              <Select 
                value={safeConfig.min_count.toString()} 
                onValueChange={(v) => {
                  const min = parseInt(v);
                  const updatedConfig = { 
                    ...safeConfig, 
                    min_count: min,
                    max_count: Math.max(safeConfig.max_count, min + 5) 
                  };
                  onChange(updatedConfig);
                  setPreviewCount(min);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3-5 visitors</SelectItem>
                  <SelectItem value="10">10-20 visitors</SelectItem>
                  <SelectItem value="25">25-50 visitors</SelectItem>
                  <SelectItem value="50">50-100 visitors</SelectItem>
                  <SelectItem value="100">100+ visitors</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Maximum Visitors</Label>
              <Select 
                value={safeConfig.max_count.toString()} 
                onValueChange={(v) => onChange({ ...safeConfig, max_count: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">Up to 10</SelectItem>
                  <SelectItem value="30">Up to 30</SelectItem>
                  <SelectItem value="75">Up to 75</SelectItem>
                  <SelectItem value="150">Up to 150</SelectItem>
                  <SelectItem value="300">Up to 300</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Live Preview Card */}
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="p-6 text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <Badge variant="secondary" className="text-lg font-bold px-4 py-1">
                  {previewCount}
                </Badge>
              </div>
              <p className="text-sm font-medium">
                people are viewing this page right now
              </p>
              <p className="text-xs text-muted-foreground">
                Count updates every {safeConfig.update_interval_seconds}s between {safeConfig.min_count}-{safeConfig.max_count}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Transparency Notice */}
        {safeConfig.mode !== 'real' && (
          <Alert variant="default" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            <AlertDescription className="text-sm">
              <strong>Transparency Notice:</strong> Visitors will see "Live Count" indicator. 
              Ensure compliance with advertising standards in your region.
            </AlertDescription>
          </Alert>
        )}

        {/* Phase 3: Collapsible Advanced Options */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full gap-2">
              <Settings className="h-4 w-4" />
              Advanced Options
              <ChevronDown className={cn("h-4 w-4 transition-transform", showAdvanced && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-4 mt-4 pt-4 border-t">
            {/* Data Source */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label>Data Source</Label>
                <Info className="h-3 w-3 text-muted-foreground" />
              </div>
              <Select 
                value={safeConfig.mode} 
                onValueChange={(v) => onChange({ ...safeConfig, mode: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="real">
                    <div className="space-y-1">
                      <div className="font-medium flex items-center gap-2">
                        Real Tracking
                        <Badge variant="secondary" className="text-[10px]">Recommended</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Counts actual visitors on your site (±30s accuracy)
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="simulated">
                    <div className="space-y-1">
                      <div className="font-medium">Simulated</div>
                      <div className="text-xs text-muted-foreground">
                        Shows random counts within your configured range
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {safeConfig.mode === 'real' && (
                <Alert className="mt-2 py-2">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Real tracking uses actual visitor sessions. Min/max values act as bounds - 
                    if real count is below minimum, minimum is shown for better UX.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            {/* Update Frequency */}
            <div className="space-y-2">
              <Label>Update Frequency</Label>
              <Select
                value={safeConfig.update_interval_seconds.toString()}
                onValueChange={(v) => onChange({ ...safeConfig, update_interval_seconds: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">Every 15 seconds (more dynamic)</SelectItem>
                  <SelectItem value="30">Every 30 seconds (recommended)</SelectItem>
                  <SelectItem value="45">Every 45 seconds (balanced)</SelectItem>
                  <SelectItem value="60">Every 60 seconds (conservative)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Page Targeting */}
            <div className="space-y-3">
              <Label>Show On</Label>
              <RadioGroup 
                value={safeConfig.scope} 
                onValueChange={(v) => onChange({ ...safeConfig, scope: v as 'site' | 'page' })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="site" id="scope-site" />
                  <Label htmlFor="scope-site" className="font-normal cursor-pointer">All Pages</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="page" id="scope-page" />
                  <Label htmlFor="scope-page" className="font-normal cursor-pointer">Specific Pages</Label>
                </div>
              </RadioGroup>
              
              {safeConfig.scope === 'page' && (
                <div className="space-y-2 pl-6">
                  <Input
                    placeholder="e.g., /products, /pricing"
                    value={safeConfig.target_pages.join(', ')}
                    onChange={(e) => onChange({
                      ...safeConfig,
                      target_pages: e.target.value.split(',').map(p => p.trim()).filter(Boolean)
                    })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Separate multiple pages with commas. Use * for wildcards (e.g., /products/*)
                  </p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
