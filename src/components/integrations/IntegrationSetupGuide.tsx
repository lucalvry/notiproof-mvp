import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  Copy, 
  ExternalLink, 
  CheckCircle2, 
  ArrowRight,
  Code,
  Settings,
  Link as LinkIcon
} from "lucide-react";
import { toast } from "sonner";

interface IntegrationSetupGuideProps {
  integrationType: string;
  webhookUrl?: string;
}

export function IntegrationSetupGuide({ integrationType, webhookUrl }: IntegrationSetupGuideProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const guides: Record<string, {
    title: string;
    description: string;
    steps: { title: string; content: React.ReactNode }[];
    docs?: string;
  }> = {
    shopify: {
      title: "Shopify Integration",
      description: "Display real-time purchase notifications from your Shopify store",
      docs: "https://help.shopify.com/en/manual/apps/app-types/custom-apps",
      steps: [
        {
          title: "Create Custom App",
          content: (
            <div className="space-y-2">
              <p>1. Go to <strong>Settings → Apps and sales channels</strong></p>
              <p>2. Click <strong>Develop apps</strong></p>
              <p>3. Click <strong>Create an app</strong> and name it "NotiProof"</p>
            </div>
          ),
        },
        {
          title: "Configure Webhooks",
          content: (
            <div className="space-y-2">
              <p>1. Go to <strong>Configuration → Webhook subscriptions</strong></p>
              <p>2. Subscribe to: orders/create, orders/updated, carts/update</p>
              <p>3. Use this webhook URL:</p>
              {webhookUrl && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded font-mono text-sm">
                  <code className="flex-1">{webhookUrl}</code>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(webhookUrl)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ),
        },
        {
          title: "Get Credentials",
          content: (
            <div className="space-y-2">
              <p>1. Go to <strong>API credentials</strong></p>
              <p>2. Copy your <strong>Admin API access token</strong></p>
              <p>3. Paste it in the connection form above</p>
            </div>
          ),
        },
      ],
    },
    stripe: {
      title: "Stripe Integration",
      description: "Show payment and subscription notifications",
      docs: "https://stripe.com/docs/webhooks",
      steps: [
        {
          title: "Get API Keys",
          content: (
            <div className="space-y-2">
              <p>1. Go to <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener" className="text-primary hover:underline">Stripe Dashboard → API Keys</a></p>
              <p>2. Copy your <strong>Secret key</strong> (starts with sk_)</p>
              <p>3. Paste it in the connection form</p>
            </div>
          ),
        },
        {
          title: "Configure Webhooks",
          content: (
            <div className="space-y-2">
              <p>1. Go to <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noopener" className="text-primary hover:underline">Developers → Webhooks</a></p>
              <p>2. Click <strong>Add endpoint</strong></p>
              <p>3. Enter this URL:</p>
              {webhookUrl && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded font-mono text-sm">
                  <code className="flex-1">{webhookUrl}</code>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(webhookUrl)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ),
        },
        {
          title: "Select Events",
          content: (
            <div className="space-y-2">
              <p>Select these events:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>payment_intent.succeeded</li>
                <li>checkout.session.completed</li>
                <li>customer.subscription.created</li>
                <li>invoice.payment_succeeded</li>
              </ul>
            </div>
          ),
        },
      ],
    },
    woocommerce: {
      title: "WooCommerce Integration",
      description: "Track orders and cart activity from WooCommerce",
      docs: "https://woocommerce.com/document/woocommerce-rest-api/",
      steps: [
        {
          title: "Generate API Keys",
          content: (
            <div className="space-y-2">
              <p>1. Go to <strong>WooCommerce → Settings → Advanced → REST API</strong></p>
              <p>2. Click <strong>Add key</strong></p>
              <p>3. Set description: "NotiProof"</p>
              <p>4. Set permissions: <strong>Read/Write</strong></p>
            </div>
          ),
        },
        {
          title: "Copy Credentials",
          content: (
            <div className="space-y-2">
              <p>Copy your Consumer key and Consumer secret</p>
              <Alert>
                <AlertDescription>
                  Store these securely - they won't be shown again!
                </AlertDescription>
              </Alert>
            </div>
          ),
        },
        {
          title: "Configure Webhooks",
          content: (
            <div className="space-y-2">
              <p>1. Go to <strong>WooCommerce → Settings → Advanced → Webhooks</strong></p>
              <p>2. Create webhooks for:</p>
              <ul className="list-disc list-inside text-sm">
                <li>Order created</li>
                <li>Order updated</li>
              </ul>
              {webhookUrl && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded font-mono text-sm mt-2">
                  <code className="flex-1">{webhookUrl}</code>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(webhookUrl)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ),
        },
      ],
    },
    ga4: {
      title: "Google Analytics 4 Integration",
      description: "Track real-time visitor activity and conversions",
      docs: "https://developers.google.com/analytics/devguides/reporting/data/v1",
      steps: [
        {
          title: "Enable GA4 API",
          content: (
            <div className="space-y-2">
              <p>1. Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener" className="text-primary hover:underline">Google Cloud Console</a></p>
              <p>2. Enable <strong>Google Analytics Data API</strong></p>
              <p>3. Create OAuth 2.0 credentials</p>
            </div>
          ),
        },
        {
          title: "Authorize Access",
          content: (
            <div className="space-y-2">
              <p>Click the <strong>Authorize</strong> button above to connect your GA4 property</p>
              <Alert>
                <AlertDescription>
                  You'll need admin access to the GA4 property
                </AlertDescription>
              </Alert>
            </div>
          ),
        },
        {
          title: "Select Property",
          content: (
            <div className="space-y-2">
              <p>After authorization, select the GA4 property you want to track</p>
            </div>
          ),
        },
      ],
    },
    zapier: {
      title: "Zapier Integration",
      description: "Connect 5,000+ apps via Zapier automation",
      docs: "https://zapier.com/app/webhooks",
      steps: [
        {
          title: "Create Zap",
          content: (
            <div className="space-y-2">
              <p>1. Go to <a href="https://zapier.com/app/zaps" target="_blank" rel="noopener" className="text-primary hover:underline">Zapier Dashboard</a></p>
              <p>2. Click <strong>Create Zap</strong></p>
              <p>3. Choose your trigger app (e.g., Gmail, Typeform, Slack)</p>
            </div>
          ),
        },
        {
          title: "Add Webhook Action",
          content: (
            <div className="space-y-2">
              <p>1. Add action: <strong>Webhooks by Zapier</strong></p>
              <p>2. Choose <strong>POST</strong> request</p>
              <p>3. Enter this webhook URL:</p>
              {webhookUrl && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded font-mono text-sm">
                  <code className="flex-1">{webhookUrl}</code>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(webhookUrl)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ),
        },
        {
          title: "Map Data Fields",
          content: (
            <div className="space-y-2">
              <p>Map your data to these fields:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li><code>message_template</code> - The notification message</li>
                <li><code>user_name</code> - (Optional) Customer name</li>
                <li><code>user_location</code> - (Optional) Location</li>
                <li><code>event_type</code> - (Optional) Event type</li>
              </ul>
            </div>
          ),
        },
      ],
    },
    wordpress: {
      title: "WordPress Integration",
      description: "Track form submissions, comments, and registrations",
      docs: "https://wordpress.org/plugins/",
      steps: [
        {
          title: "Install Plugin",
          content: (
            <div className="space-y-2">
              <p>1. Search for "Webhooks" in WordPress plugin directory</p>
              <p>2. Install <strong>WP Webhooks</strong> or similar plugin</p>
              <p>3. Activate the plugin</p>
            </div>
          ),
        },
        {
          title: "Configure Webhooks",
          content: (
            <div className="space-y-2">
              <p>1. Go to <strong>Settings → Webhooks</strong></p>
              <p>2. Create webhook for desired actions (form submit, comment, etc.)</p>
              <p>3. Enter this URL:</p>
              {webhookUrl && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded font-mono text-sm">
                  <code className="flex-1">{webhookUrl}</code>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(webhookUrl)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ),
        },
      ],
    },
  };

  const guide = guides[integrationType];

  if (!guide) {
    return (
      <Alert>
        <AlertDescription>
          Setup guide for {integrationType} is being prepared. For now, use the Generic Webhook option.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {guide.title}
              </CardTitle>
              <CardDescription>{guide.description}</CardDescription>
            </div>
            {guide.docs && (
              <Button variant="outline" size="sm" asChild>
                <a href={guide.docs} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Docs
                </a>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {guide.steps.map((step, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    {step.title}
                    {index < guide.steps.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </h4>
                  <div className="text-sm text-muted-foreground">
                    {step.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertDescription>
          <strong>Quick Test:</strong> After setup, click "Test Connection" above to verify everything works correctly.
        </AlertDescription>
      </Alert>
    </div>
  );
}
