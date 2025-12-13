import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Globe } from "lucide-react";

interface URLRulesCardProps {
  includeUrls: string[];
  excludeUrls: string[];
  onChange: (includeUrls: string[], excludeUrls: string[]) => void;
}

export function URLRulesCard({ includeUrls, excludeUrls, onChange }: URLRulesCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle>URL Targeting</CardTitle>
          </div>
        </div>
        <CardDescription>
          Control which pages display this notification
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Include URLs (Show only on these pages)</Label>
          <Textarea
            value={includeUrls.join('\n')}
            onChange={(e) => onChange(e.target.value.split('\n').filter(Boolean), excludeUrls)}
            placeholder="/products/*&#10;/checkout&#10;/landing-page"
            rows={4}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Use * for wildcards. Example: /products/* matches all product pages
          </p>
        </div>

        <div className="space-y-2">
          <Label>Exclude URLs (Never show on these pages)</Label>
          <Textarea
            value={excludeUrls.join('\n')}
            onChange={(e) => onChange(includeUrls, e.target.value.split('\n').filter(Boolean))}
            placeholder="/admin/*&#10;/account/*&#10;/checkout/thank-you"
            rows={4}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Exclude URLs take priority over include URLs
          </p>
        </div>

        <div className="rounded-lg bg-muted/50 p-3 space-y-2">
          <p className="text-sm font-medium">Examples:</p>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">/products/*</Badge>
              <span>All product pages</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">/blog/*/2024/*</Badge>
              <span>All 2024 blog posts</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">/*</Badge>
              <span>All pages (default)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
