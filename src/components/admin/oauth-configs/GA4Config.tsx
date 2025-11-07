import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, ExternalLink } from "lucide-react";

interface GA4ConfigProps {
  config: {
    client_id?: string;
    client_secret?: string;
  };
  onChange: (config: any) => void;
  redirectUri: string;
}

export function GA4Config({ config, onChange, redirectUri }: GA4ConfigProps) {
  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Google Analytics 4 Setup Instructions</AlertTitle>
        <AlertDescription className="space-y-2 mt-2">
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener" className="text-primary hover:underline inline-flex items-center gap-1">Google Cloud Console <ExternalLink className="h-3 w-3" /></a></li>
            <li>Create a new project or select an existing one</li>
            <li><strong>Enable both APIs:</strong> "Google Analytics Data API v1" and "Google Analytics Admin API v1"</li>
            <li>Navigate to "APIs & Services" → "Credentials"</li>
            <li>Click "Create Credentials" → "OAuth 2.0 Client ID"</li>
            <li>Select "Web application" as application type</li>
            <li>Add the redirect URI below to "Authorized redirect URIs"</li>
            <li>Copy the Client ID and Client Secret</li>
          </ol>
          <p className="text-xs text-muted-foreground mt-2">
            ⚠️ Important: Both APIs must be enabled for property listing to work.
          </p>
        </AlertDescription>
      </Alert>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">Redirect URI (Copy this)</CardTitle>
        </CardHeader>
        <CardContent>
          <code className="text-xs bg-background p-2 rounded block break-all">
            {redirectUri}
          </code>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label htmlFor="ga4_client_id">Client ID *</Label>
        <Input
          id="ga4_client_id"
          placeholder="580476221644-xxx.apps.googleusercontent.com"
          value={config.client_id || ''}
          onChange={(e) => onChange({ ...config, client_id: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ga4_client_secret">Client Secret *</Label>
        <Input
          id="ga4_client_secret"
          type="password"
          placeholder="GOCSPX-xxxxxxxxxxxxx"
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
            <Badge variant="secondary">analytics.readonly</Badge>
            <Badge variant="secondary">analytics.edit</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            analytics.edit scope is required to access the Analytics Admin API for listing properties.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">OAuth Endpoints (Pre-configured)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs font-mono">
          <p className="truncate">Auth: accounts.google.com/o/oauth2/v2/auth</p>
          <p className="truncate">Token: oauth2.googleapis.com/token</p>
        </CardContent>
      </Card>
    </div>
  );
}
