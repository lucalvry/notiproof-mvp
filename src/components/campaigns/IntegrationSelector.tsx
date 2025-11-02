import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getIntegrationMetadata, normalizeIntegrationKey } from "@/lib/integrationMetadata";
import { getDataSourcesForCampaignType } from "@/lib/campaignDataSources";
import { useToast } from "@/hooks/use-toast";

interface IntegrationSelectorProps {
  campaignType: string;
  selectedIntegration: string;
  onSelect: (integration: string) => void;
}

export function IntegrationSelector({ 
  campaignType, 
  selectedIntegration,
  onSelect 
}: IntegrationSelectorProps) {
  const { toast } = useToast();
  
  // Get relevant integrations for this campaign type
  const relevantIntegrations = getDataSourcesForCampaignType(campaignType);
  
  // Filter out 'manual' and 'csv' as they're not real integrations
  const integrationOptions = relevantIntegrations
    .filter(source => source !== 'manual' && source !== 'csv')
    .map(integration => getIntegrationMetadata(integration));

  // Sort: Platform-specific integrations first, then Generic Webhook/Zapier
  const platformIntegrations = integrationOptions.filter(
    i => i.displayName !== 'Generic Webhook' && i.displayName !== 'Zapier'
  ).sort((a, b) => (a.phase || 99) - (b.phase || 99));
  
  const catchAllIntegrations = integrationOptions.filter(
    i => i.displayName === 'Generic Webhook' || i.displayName === 'Zapier'
  );
  
  const sortedIntegrations = [...platformIntegrations, ...catchAllIntegrations];

  // Top 4 recommended (prioritize platform integrations)
  const topRecommended = sortedIntegrations.slice(0, 4);
  const otherIntegrations = sortedIntegrations.slice(4);
  
  console.info('IntegrationSelector - Campaign type:', campaignType);
  console.info('IntegrationSelector - Top recommended:', topRecommended.map(i => i.displayName));
  console.info('IntegrationSelector - Total integrations:', sortedIntegrations.length);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold">Choose Your Data Source</h3>
        <p className="text-sm text-muted-foreground">
          Select how you want to connect data for this campaign
        </p>
      </div>

      {/* Recommended Integrations */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Recommended for this campaign</h4>
        <div className="grid gap-3 md:grid-cols-2">
          {topRecommended.map((integration) => {
            const Icon = integration.icon;
            const isSelected = selectedIntegration === integration.displayName.toLowerCase().replace(/\s+/g, '_').replace(/\//g, '_');
            
            return (
              <Card
                key={integration.displayName}
                onClick={() => {
                  const key = normalizeIntegrationKey(integration.displayName);
                  onSelect(key);
                  toast({
                    title: "Integration Selected",
                    description: `${integration.displayName} selected! Click Next to continue.`,
                  });
                }}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-lg relative",
                  isSelected && "ring-2 ring-primary"
                )}
              >
                {isSelected && (
                  <div className="absolute -top-2 -right-2 z-10">
                    <div className="rounded-full bg-primary p-1">
                      <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                    </div>
                  </div>
                )}
                
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base flex items-center gap-2">
                        {integration.displayName}
                        {integration.requiresOauth && (
                          <Badge variant="outline" className="text-xs">OAuth</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {integration.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="secondary" className="text-xs">
                      {integration.connectorType || 'webhook'}
                    </Badge>
                    {integration.phase && (
                      <span className="text-muted-foreground">Phase {integration.phase}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Other Compatible Integrations */}
      {otherIntegrations.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Other compatible integrations</h4>
          <div className="grid gap-3 md:grid-cols-3">
            {otherIntegrations.map((integration) => {
              const Icon = integration.icon;
              const isSelected = selectedIntegration === integration.displayName.toLowerCase().replace(/\s+/g, '_').replace(/\//g, '_');
              
              return (
                <Card
                  key={integration.displayName}
                  onClick={() => {
                    const key = normalizeIntegrationKey(integration.displayName);
                    onSelect(key);
                    toast({
                      title: "Integration Selected",
                      description: `${integration.displayName} selected! Click Next to continue.`,
                    });
                  }}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    isSelected && "ring-2 ring-primary"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium truncate">{integration.displayName}</span>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-primary ml-auto shrink-0" />}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Help text */}
      <div className="text-xs text-muted-foreground text-center p-3 bg-muted rounded-md">
        💡 Don't see your integration? Choose <strong>Generic Webhook</strong> or <strong>Zapier</strong> to connect any tool.
      </div>
    </div>
  );
}
