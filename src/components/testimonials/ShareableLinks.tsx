import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, QrCode, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";

interface ShareableLinksProps {
  formId: string;
  slug: string;
}

export function ShareableLinks({ formId, slug }: ShareableLinksProps) {
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // Generate collection form URL
  const baseUrl = window.location.origin;
  const collectionUrl = `${baseUrl}/collect/${slug}`;

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(collectionUrl);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  }

  async function generateQRCode() {
    try {
      const url = await QRCode.toDataURL(collectionUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    }
  }

  async function downloadQRCode() {
    if (!qrCodeUrl) return;

    const link = document.createElement('a');
    link.download = `testimonial-form-${slug}.png`;
    link.href = qrCodeUrl;
    link.click();

    toast({
      title: "Downloaded",
      description: "QR code downloaded successfully",
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="url">Collection Form URL</Label>
        <div className="flex gap-2">
          <Input
            id="url"
            value={collectionUrl}
            readOnly
            className="font-mono text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={copyToClipboard}
          >
            {copied ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Share this link with customers to collect testimonials
        </p>
      </div>

      <div className="space-y-3">
        <Label>QR Code</Label>
        {qrCodeUrl ? (
          <div className="space-y-3">
            <div className="flex justify-center p-4 bg-background border rounded-lg">
              <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={downloadQRCode}
                className="flex-1"
              >
                Download QR Code
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setQrCodeUrl(null)}
              >
                Hide
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={generateQRCode}
            className="w-full"
          >
            <QrCode className="h-4 w-4 mr-2" />
            Generate QR Code
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          Print and display QR code for easy access
        </p>
      </div>
    </div>
  );
}
