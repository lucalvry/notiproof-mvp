export interface FieldSchema {
  type: 'text' | 'number' | 'date' | 'url' | 'email' | 'textarea' | 'select' | 'color' | 'boolean';
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    options?: string[];
  };
  helpText?: string;
  dependsOn?: string;
  showWhen?: any;
}

export interface EnhancedQuickWinTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  business_type: string;
  event_type: string;
  template_message: string;
  form_schema: Record<string, FieldSchema>;
  default_metadata: Record<string, any>;
  preview_config: {
    style?: 'notification' | 'banner' | 'sidebar' | 'modal';
    theme?: 'default' | 'urgency' | 'success' | 'info';
    icon?: string;
    colorScheme?: string;
  };
  performance_hints: {
    conversion_rate?: number;
    engagement_score?: number;
    industry_benchmark?: number;
  };
  tags: string[];
  is_premium?: boolean;
}

export interface QuickWinFormData {
  templateId: string;
  fieldValues: Record<string, any>;
  expiresAt?: string;
  customization?: {
    style?: string;
    theme?: string;
  };
}