import { useState, useEffect, useCallback } from 'react';
import { MessageGenerationService } from '@/services/messageGenerationService';

interface MessageData {
  name?: string;
  location?: string;
  product?: string;
  amount?: number;
  service?: string;
  category?: string;
  rating?: number;
  timeAgo?: string;
  count?: number;
}

interface UseSmartMessagesProps {
  businessType?: string;
  eventType?: string;
  data?: MessageData;
  autoGenerate?: boolean;
}

export const useSmartMessages = ({
  businessType,
  eventType,
  data = {},
  autoGenerate = true
}: UseSmartMessagesProps) => {
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [variations, setVariations] = useState<string[]>([]);
  const [validation, setValidation] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateMessages = useCallback(async () => {
    if (!businessType || !eventType) {
      setVariations([]);
      setCurrentMessage('');
      setValidation(null);
      return;
    }

    setIsGenerating(true);

    try {
      const context = {
        businessType: businessType as any,
        eventType: eventType as any,
        data
      };

      // Generate main message
      const mainMessage = MessageGenerationService.generateMessage(context);
      setCurrentMessage(mainMessage);

      // Generate variations
      const messageVariations = MessageGenerationService.generateVariations(context, 5);
      setVariations(messageVariations);

      // Validate data
      const validationResult = MessageGenerationService.validateMessageData(
        businessType, 
        eventType, 
        data
      );
      setValidation(validationResult);

    } catch (error) {
      console.error('Error generating smart messages:', error);
      setCurrentMessage('');
      setVariations([]);
      setValidation(null);
    } finally {
      setIsGenerating(false);
    }
  }, [businessType, eventType, data]);

  // Auto-generate when dependencies change
  useEffect(() => {
    if (autoGenerate) {
      generateMessages();
    }
  }, [generateMessages, autoGenerate]);

  const selectMessage = useCallback((message: string) => {
    setCurrentMessage(message);
  }, []);

  const refreshMessages = useCallback(() => {
    generateMessages();
  }, [generateMessages]);

  const getRecommendedFields = useCallback(() => {
    if (!businessType || !eventType) return null;
    return MessageGenerationService.getRecommendedFields(businessType, eventType);
  }, [businessType, eventType]);

  const validateCurrentData = useCallback(() => {
    if (!businessType || !eventType) return null;
    return MessageGenerationService.validateMessageData(businessType, eventType, data);
  }, [businessType, eventType, data]);

  return {
    currentMessage,
    variations,
    validation,
    isGenerating,
    generateMessages,
    selectMessage,
    refreshMessages,
    getRecommendedFields,
    validateCurrentData
  };
};