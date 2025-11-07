import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GenericOAuthConfigProps {
  config: {
    client_id?: string;
    client_secret?: string;
  };
  onChange: (config: any) => void;
  redirectUri: string;
}

export function GenericOAuthConfig({ config, onChange, redirectUri }: GenericOAuthConfigProps) {
  return (
    <div className="space-y-4">
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">OAuth Redirect URI</CardTitle>
        </CardHeader>
        <CardContent>
          <code className="text-xs bg-background p-2 rounded block break-all">
            {redirectUri}
          </code>
          <p className="text-xs text-muted-foreground mt-2">
            Add this redirect URI to your OAuth provider's configuration
          </p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label htmlFor="generic_client_id">Client ID *</Label>
        <Input
          id="generic_client_id"
          placeholder="Enter OAuth Client ID"
          value={config.client_id || ''}
          onChange={(e) => onChange({ ...config, client_id: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="generic_client_secret">Client Secret *</Label>
        <Input
          id="generic_client_secret"
          type="password"
          placeholder="Enter OAuth Client Secret"
          value={config.client_secret || ''}
          onChange={(e) => onChange({ ...config, client_secret: e.target.value })}
        />
      </div>
    </div>
  );
}
