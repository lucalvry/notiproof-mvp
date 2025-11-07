import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, ExternalLink, AlertTriangle } from "lucide-react";

interface InstagramConfigProps {
  config: {
    client_id?: string;
    client_secret?: string;
  };
  onChange: (config: any) => void;
  redirectUri: string;
}

export function InstagramConfig({ config, onChange, redirectUri }: InstagramConfigProps) {
  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Instagram Basic Display API Setup</AlertTitle>
        <AlertDescription className="space-y-2 mt-2">
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noopener" className="text-primary hover:underline inline-flex items-center gap-1">Meta for Developers <ExternalLink className="h-3 w-3" /></a></li>
            <li>Create an app or select existing</li>
            <li>Add "Instagram Basic Display" product</li>
            <li>Go to Basic Display → Settings</li>
            <li>Add the OAuth Redirect URI below</li>
            <li>Copy App ID (as Client ID) and App Secret (as Client Secret)</li>
          </ol>
        </AlertDescription>
      </Alert>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Note:</strong> Instagram Basic Display requires users to have an Instagram Business or Creator account linked to a Facebook Page.
        </AlertDescription>
      </Alert>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">OAuth Redirect URI (Copy this)</CardTitle>
        </CardHeader>
        <CardContent>
          <code className="text-xs bg-background p-2 rounded block break-all">
            {redirectUri}
          </code>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label htmlFor="ig_client_id">App ID (Client ID) *</Label>
        <Input
          id="ig_client_id"
          placeholder="123456789012345"
          value={config.client_id || ''}
          onChange={(e) => onChange({ ...config, client_id: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ig_client_secret">App Secret (Client Secret) *</Label>
        <Input
          id="ig_client_secret"
          type="password"
          placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          value={config.client_secret || ''}
          onChange={(e) => onChange({ ...config, client_secret: e.target.value })}
        />
      </div>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">Required Scopes (Auto-configured)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">user_profile</Badge>
            <Badge variant="secondary">user_media</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">OAuth Endpoints (Pre-configured)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs font-mono">
          <p className="truncate">Auth: api.instagram.com/oauth/authorize</p>
          <p className="truncate">Token: api.instagram.com/oauth/access_token</p>
          <p className="text-muted-foreground mt-2">Tokens are automatically exchanged for 60-day long-lived tokens</p>
        </CardContent>
      </Card>
    </div>
  );
}
