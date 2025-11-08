import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Settings2 } from "lucide-react";
import { useState, useEffect } from "react";
import { TargetingRules, DEFAULT_TARGETING_RULES } from "@/types/targeting";
import { URLRulesCard } from "./targeting/URLRulesCard";
import { GeoTargetingCard } from "./targeting/GeoTargetingCard";
import { DeviceTargetingCard } from "./targeting/DeviceTargetingCard";
import { BehaviorTargetingCard } from "./targeting/BehaviorTargetingCard";
import { ScheduleTargetingCard } from "./targeting/ScheduleTargetingCard";
import { FrequencyUsageIndicator } from "./FrequencyUsageIndicator";

interface RulesTargetingProps {
  rules: any;
  onChange: (rules: any) => void;
  campaignType?: string;
  dataSource?: string;
  templateName?: string;
}

export function RulesTargeting({ 
  rules, 
  onChange,
  campaignType,
  dataSource,
  templateName 
}: RulesTargetingProps) {
  const [targetingRules, setTargetingRules] = useState<TargetingRules>(() => {
    // Merge provided rules with defaults
    return {
      ...DEFAULT_TARGETING_RULES,
      ...rules,
      url_rules: {
        ...DEFAULT_TARGETING_RULES.url_rules,
        ...rules.url_rules,
      },
      countries: {
        ...DEFAULT_TARGETING_RULES.countries,
        ...rules.countries,
      },
      traffic_sources: {
        ...DEFAULT_TARGETING_RULES.traffic_sources,
        ...rules.traffic_sources,
      },
      behavior: {
        ...DEFAULT_TARGETING_RULES.behavior,
        ...rules.behavior,
      },
      schedule: {
        ...DEFAULT_TARGETING_RULES.schedule,
        ...rules.schedule,
      },
      display: {
        ...DEFAULT_TARGETING_RULES.display,
        ...rules.display,
      },
    };
  });

  useEffect(() => {
    onChange(targetingRules);
  }, [targetingRules]);

  const updateRules = (updates: Partial<TargetingRules>) => {
    setTargetingRules((prev) => ({ ...prev, ...updates }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings2 className="h-6 w-6 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">Campaign Targeting & Rules</h3>
          <p className="text-sm text-muted-foreground">
            Configure when, where, and to whom your campaign will be displayed
          </p>
        </div>
      </div>

      {/* Campaign Context Display */}
      {(campaignType || templateName) && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-sm flex-wrap">
                {campaignType && (
                  <Badge variant="secondary">
                    {campaignType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Campaign
                  </Badge>
                )}
                {templateName && (
                  <span className="text-muted-foreground">
                    Template: <span className="font-medium">{templateName}</span>
                  </span>
                )}
              </div>
              {dataSource && dataSource !== 'manual' && dataSource !== 'demo' && (
                <div className="text-sm text-muted-foreground">
                  <strong>Integration:</strong> Events will automatically sync from {dataSource}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="display" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="display">Display Settings</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
          <TabsTrigger value="behavior">Behavior & Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="display" className="space-y-4 mt-4">
          <FrequencyUsageIndicator 
            maxPerPage={targetingRules.display.max_per_page || 5}
            maxPerSession={targetingRules.display.max_per_session || 20}
          />
          
          <Card>
            <CardHeader>
              <CardTitle>Display Frequency</CardTitle>
              <CardDescription>Control how often notifications appear</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Initial Delay (milliseconds)</Label>
                <Input
                  type="number"
                  value={targetingRules.display.initial_delay_ms || 0}
                  onChange={(e) =>
                    updateRules({
                      display: {
                        ...targetingRules.display,
                        initial_delay_ms: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  min="0"
                  max="60000"
                />
                <p className="text-xs text-muted-foreground">
                  Wait before showing first notification (0 = show immediately)
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Display Duration (milliseconds)</Label>
                  {templateName && targetingRules.display.display_duration_ms && targetingRules.display.display_duration_ms !== DEFAULT_TARGETING_RULES.display.display_duration_ms && (
                    <Badge variant="secondary" className="text-[10px] gap-1 h-4 px-1.5">
                      <Sparkles className="h-2.5 w-2.5" />
                      Template
                    </Badge>
                  )}
                </div>
                <Input
                  type="number"
                  value={targetingRules.display.display_duration_ms || 5000}
                  onChange={(e) =>
                    updateRules({
                      display: {
                        ...targetingRules.display,
                        display_duration_ms: parseInt(e.target.value) || 5000,
                      },
                    })
                  }
                  min="1000"
                  max="30000"
                />
                <p className="text-xs text-muted-foreground">
                  How long each notification stays visible
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Interval Between Notifications (milliseconds)</Label>
                  {templateName && targetingRules.display.interval_ms && targetingRules.display.interval_ms !== DEFAULT_TARGETING_RULES.display.interval_ms && (
                    <Badge variant="secondary" className="text-[10px] gap-1 h-4 px-1.5">
                      <Sparkles className="h-2.5 w-2.5" />
                      Template
                    </Badge>
                  )}
                </div>
                <Input
                  type="number"
                  value={targetingRules.display.interval_ms || 8000}
                  onChange={(e) =>
                    updateRules({
                      display: {
                        ...targetingRules.display,
                        interval_ms: parseInt(e.target.value) || 8000,
                      },
                    })
                  }
                  min="1000"
                  max="120000"
                />
                <p className="text-xs text-muted-foreground">
                  Time between notifications
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Per Page</Label>
                  <Input
                    type="number"
                    value={targetingRules.display.max_per_page || 5}
                    onChange={(e) =>
                      updateRules({
                        display: {
                          ...targetingRules.display,
                          max_per_page: parseInt(e.target.value) || 5,
                        },
                      })
                    }
                    min="1"
                    max="20"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Per Session</Label>
                  <Input
                    type="number"
                    value={targetingRules.display.max_per_session || 20}
                    onChange={(e) =>
                      updateRules({
                        display: {
                          ...targetingRules.display,
                          max_per_session: parseInt(e.target.value) || 20,
                        },
                      })
                    }
                    min="1"
                    max="100"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audience" className="space-y-4 mt-4">
          <URLRulesCard
            includeUrls={targetingRules.url_rules.include_urls}
            excludeUrls={targetingRules.url_rules.exclude_urls}
            onChange={(include_urls, exclude_urls) =>
              updateRules({
                url_rules: { include_urls, exclude_urls },
              })
            }
          />

          <GeoTargetingCard
            includeCountries={targetingRules.countries.include}
            excludeCountries={targetingRules.countries.exclude}
            onChange={(include, exclude) =>
              updateRules({
                countries: { include, exclude },
              })
            }
          />

          <DeviceTargetingCard
            devices={targetingRules.devices}
            onChange={(devices) => updateRules({ devices })}
          />
        </TabsContent>

        <TabsContent value="behavior" className="space-y-4 mt-4">
          <BehaviorTargetingCard
            behavior={targetingRules.behavior}
            onChange={(behavior) => updateRules({ behavior })}
          />

          <ScheduleTargetingCard
            schedule={targetingRules.schedule}
            onChange={(schedule) => updateRules({ schedule })}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
