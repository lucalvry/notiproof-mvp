import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageGenerationService } from '@/services/messageGenerationService';
import { Sparkles, RefreshCw, CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface SmartMessagePreviewProps {
  businessType: string;
  eventType: string;
  eventData: {
    name?: string;
    location?: string;
    product?: string;
    amount?: number;
    service?: string;
    rating?: number;
    count?: number;
  };
  onMessageSelect: (message: string) => void;
  className?: string;
}

export const SmartMessagePreview = ({ 
  businessType, 
  eventType, 
  eventData, 
  onMessageSelect,
  className 
}: SmartMessagePreviewProps) => {
  const [variations, setVariations] = useState<string[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<string>('');
  const [validation, setValidation] = useState<any>(null);

  useEffect(() => {
    generateMessages();
  }, [businessType, eventType, eventData]);

  const generateMessages = () => {
    if (!businessType || !eventType) return;

    const context = {
      businessType: businessType as any,
      eventType: eventType as any,
      data: eventData
    };

    // Generate variations
    const messageVariations = MessageGenerationService.generateVariations(context, 4);
    setVariations(messageVariations);

    // Validate data
    const validationResult = MessageGenerationService.validateMessageData(
      businessType, 
      eventType, 
      eventData
    );
    setValidation(validationResult);

    // Auto-select first variation
    if (messageVariations.length > 0 && !selectedMessage) {
      setSelectedMessage(messageVariations[0]);
    }
  };

  const handleMessageSelect = (message: string) => {
    setSelectedMessage(message);
    onMessageSelect(message);
  };

  const handleRefresh = () => {
    generateMessages();
  };

  const getValidationIcon = () => {
    if (!validation) return null;
    
    if (validation.isValid) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (validation.missingRequired.length > 0) {
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    } else {
      return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getRecommendedFields = () => {
    if (!businessType || !eventType) return null;
    
    return MessageGenerationService.getRecommendedFields(businessType, eventType);
  };

  const recommendedFields = getRecommendedFields();

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <CardTitle className="text-sm">Smart Message Generator</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
        <CardDescription className="text-xs">
          Context-aware messages for {businessType} {eventType} events
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Validation Status */}
        {validation && (
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
            {getValidationIcon()}
            <div className="flex-1">
              <div className="text-sm font-medium mb-1">
                {validation.isValid ? 'Data Complete' : 'Missing Data'}
              </div>
              <div className="text-xs text-muted-foreground">
                {validation.suggestions.map((suggestion: string, index: number) => (
                  <div key={index}>• {suggestion}</div>
                ))}
              </div>
              {validation.missingRequired.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-medium mb-1">Missing:</div>
                  <div className="flex gap-1 flex-wrap">
                    {validation.missingRequired.map((field: string) => (
                      <Badge key={field} variant="outline" className="text-xs">
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Message Variations */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Generated Messages</div>
          {variations.length > 0 ? (
            <div className="space-y-2">
              {variations.map((message, index) => (
                <div
                  key={index}
                  className={`
                    p-3 rounded-lg border cursor-pointer transition-colors
                    ${selectedMessage === message 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-muted hover:border-blue-200'
                    }
                  `}
                  onClick={() => handleMessageSelect(message)}
                >
                  <div className="text-sm">{message}</div>
                  {selectedMessage === message && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-blue-600">
                      <CheckCircle className="h-3 w-3" />
                      Selected
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-6">
              {businessType && eventType 
                ? 'Add event details to generate smart messages' 
                : 'Select business type and event type to get started'
              }
            </div>
          )}
        </div>

        {/* Recommended Fields */}
        {recommendedFields && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Recommended Fields</div>
            <div className="space-y-2">
              {recommendedFields.required.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-red-600 mb-1">Required:</div>
                  <div className="flex gap-1 flex-wrap">
                    {recommendedFields.required.map(field => (
                      <Badge key={field} variant="destructive" className="text-xs">
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {recommendedFields.optional.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-blue-600 mb-1">Optional:</div>
                  <div className="flex gap-1 flex-wrap">
                    {recommendedFields.optional.map(field => (
                      <Badge key={field} variant="secondary" className="text-xs">
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Examples */}
        {recommendedFields && (
          <div className="text-xs text-muted-foreground">
            <div className="font-medium mb-1">Examples:</div>
            {Object.entries(recommendedFields.examples).map(([field, example]) => (
              <div key={field}>
                <span className="font-medium">{field}:</span> {example}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};