import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GA4Property {
  property: string;
  displayName: string;
  account: string;
  accountDisplayName: string;
}

export default function GA4PropertySelection() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<GA4Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const state = searchParams.get('state');

  useEffect(() => {
    if (!state) {
      setError('Invalid session. Please try connecting again.');
      setLoading(false);
      return;
    }

    loadProperties();
  }, [state]);

  const loadProperties = async () => {
    try {
      const { data, error: fetchError } = await supabase.functions.invoke('ga4-auth', {
        body: { 
          action: 'get_properties',
          state
        }
      });

      if (fetchError || !data?.success) {
        throw new Error(data?.error || 'Failed to retrieve properties');
      }

      setProperties(data.properties || []);
      
      if (data.properties?.length === 1) {
        setSelectedProperty(data.properties[0].property);
      }
    } catch (err: any) {
      console.error('Error loading properties:', err);
      setError(err.message || 'Failed to load GA4 properties. Please try connecting again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!selectedProperty) {
      toast.error('Please select a GA4 property');
      return;
    }

    setFinalizing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated. Please log in again.');
      }

      const response = await fetch(
        `https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/ga4-auth?action=finalize`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            state,
            property_id: selectedProperty
          })
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success("Google Analytics 4 connected successfully!");
        navigate('/integrations', { replace: true });
      } else {
        throw new Error(result.error || 'Failed to finalize connection');
      }
    } catch (err: any) {
      console.error('Error finalizing connection:', err);
      toast.error(err.message || 'Failed to connect property');
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading your GA4 properties...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Connection Error</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error || 'Invalid session'}</AlertDescription>
            </Alert>
            <Button 
              onClick={() => navigate('/integrations', { replace: true })}
              className="w-full"
            >
              Return to Integrations
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Properties Found</CardTitle>
            <CardDescription>
              We couldn't find any GA4 properties associated with your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Please ensure you have at least one Google Analytics 4 property with Admin or Editor access.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => navigate('/integrations', { replace: true })}
              className="w-full"
            >
              Return to Integrations
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            <CardTitle>Select GA4 Property</CardTitle>
          </div>
          <CardDescription>
            Choose which Google Analytics 4 property to connect to NotiProof
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={selectedProperty} onValueChange={setSelectedProperty}>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {properties.map((property) => (
                <div
                  key={property.property}
                  className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => setSelectedProperty(property.property)}
                >
                  <RadioGroupItem value={property.property} id={property.property} />
                  <Label 
                    htmlFor={property.property} 
                    className="flex-1 cursor-pointer"
                  >
                    <div className="font-medium">{property.displayName}</div>
                    <div className="text-sm text-muted-foreground">
                      Account: {property.accountDisplayName}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {property.property}
                    </div>
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/integrations', { replace: true })}
              disabled={finalizing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleFinalize}
              disabled={!selectedProperty || finalizing}
              className="flex-1"
            >
              {finalizing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect Property'
              )}
            </Button>
          </div>

          <Alert>
            <AlertDescription className="text-sm">
              This connection will sync data from the selected property to power your social proof notifications.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
