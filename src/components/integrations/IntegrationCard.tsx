import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Plug, RefreshCw, AlertCircle, Settings, TrendingUp, Star, Zap, List, ExternalLink, Globe, Palette } from "lucide-react";

interface IntegrationCardProps {
  integration: any;
  websiteDomain?: string;
  onConnect: () => void;
  onSync: () => void;
  onSettings: () => void;
  onDisconnect: () => void;
  onModerate?: () => void;
  onManage?: () => void;
  onDesignDefaults?: () => void;
  quota?: { quota: number; used: number };
  pendingCount?: number;
}

export function IntegrationCard({
  integration,
  websiteDomain,
  onConnect,
  onSync,
  onSettings,
  onDisconnect,
  onModerate,
  onManage,
  onDesignDefaults,
  quota,
  pendingCount = 0,
}: IntegrationCardProps) {
  const Icon = integration.icon;
  const isConnected = integration.status === "connected";
  const hasError = integration.status === "error";
  const canConnect = !quota || quota.used < quota.quota;
  const popularityScore = integration.popularityScore || 0;
  const isTrending = integration.isTrending;

  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
      {/* Trending Badge */}
      {isTrending && !isConnected && (
        <div className="absolute top-3 right-3">
          <Badge variant="default" className="gap-1 bg-gradient-to-r from-primary to-primary/80">
            <TrendingUp className="h-3 w-3" />
            Trending
          </Badge>
        </div>
      )}

      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 relative">
              <Icon className="h-6 w-6 text-primary" />
              {isConnected && (
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-success rounded-full border-2 border-background flex items-center justify-center">
                  <CheckCircle className="h-2.5 w-2.5 text-background" />
                </div>
              )}
            </div>
            <div>
              <CardTitle className="text-lg">{integration.name}</CardTitle>
              <div className="flex gap-2 mt-1 flex-wrap">
                <Badge
                  variant={isConnected ? "default" : hasError ? "destructive" : "secondary"}
                >
                  {isConnected && <CheckCircle className="h-3 w-3 mr-1" />}
                  {hasError && <AlertCircle className="h-3 w-3 mr-1" />}
                  {!isConnected && !hasError && <XCircle className="h-3 w-3 mr-1" />}
                  {integration.status}
                </Badge>
                {integration.isNative && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    <Zap className="h-3 w-3 mr-1" />
                    Native
                  </Badge>
                )}
                {/* Website badge for connected integrations */}
                {isConnected && websiteDomain && (
                  <Badge variant="secondary" className="text-xs">
                    <Globe className="h-3 w-3 mr-1" />
                    {websiteDomain}
                  </Badge>
                )}
                {!isConnected && integration.connectorType === 'oauth' && integration.configured && (
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Ready
                  </Badge>
                )}
                {!isConnected && integration.connectorType === 'oauth' && !integration.configured && (
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Setup Required
                  </Badge>
                )}
                {quota && (
                  <Badge variant="outline">
                    {quota.used}/{quota.quota} used
                  </Badge>
                )}
                {!isConnected && !integration.isNative && integration.connectorType === 'oauth' && (
                  <Badge variant="outline" className="gap-1">
                    <Zap className="h-3 w-3" />
                    One-Click
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {integration.description}
        </p>

        {/* Native integration helper text */}
        {!isConnected && integration.isNative && (
          <div className="flex items-center gap-2 text-xs text-primary bg-primary/5 rounded-md px-2 py-1.5">
            <Zap className="h-3 w-3" />
            <span>Enable to get started — no external account needed</span>
          </div>
        )}

        {/* Popularity indicator */}
        {!isConnected && !integration.isNative && popularityScore > 80 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
            <span>Popular choice ({Math.round(popularityScore)}% adoption)</span>
          </div>
        )}

        {isConnected && integration.lastSync && (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-success" />
            <div>
              <p className="font-medium">Connected & Syncing</p>
              <p className="text-xs text-muted-foreground">
                Last sync: {new Date(integration.lastSync).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {!isConnected ? (
            <Button
              className="flex-1"
              onClick={onConnect}
              disabled={!canConnect}
            >
              <Plug className="h-4 w-4 mr-2" />
              {canConnect ? "Connect" : "Quota Reached"}
            </Button>
          ) : (
            <>
              {/* Manage button for native integrations */}
              {onManage && (
                <Button className="flex-1" onClick={onManage}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Manage
                </Button>
              )}
              {!onManage && (
                <Button variant="outline" className="flex-1" onClick={onSync}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync
                </Button>
              )}
              {onModerate && (
                <Button variant="outline" onClick={onModerate}>
                  <List className="h-4 w-4 mr-2" />
                  Moderate
                  {pendingCount > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                      {pendingCount}
                    </Badge>
                  )}
                </Button>
              )}
              {onDesignDefaults && (
                <Button variant="outline" onClick={onDesignDefaults} title="Design Defaults">
                  <Palette className="h-4 w-4" />
                </Button>
              )}
              <Button variant="outline" onClick={onSettings}>
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="destructive" onClick={onDisconnect}>
                Disconnect
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
