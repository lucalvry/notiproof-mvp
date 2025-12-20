import Mustache from 'mustache';
import { CanonicalEvent } from './integrations/types';
import { shouldShowVerificationBadge, VERIFICATION_BADGE_TEXT } from './verificationBadgeUtils';

/**
 * Template Engine - Renders HTML templates with event data
 * Uses Mustache for safe templating
 */

const VERIFICATION_BADGE_HTML = `<span class="notiproof-verified">${VERIFICATION_BADGE_TEXT}</span>`;

export interface TemplateConfig {
  id: string;
  provider: string;
  template_key: string;
  name: string;
  description: string | null;
  style_variant: string;
  category: string;
  html_template: string;
  required_fields: string[];
  preview_json: Record<string, any>;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Render a template with event data
 */
export interface StyleConfig {
  font_size?: number;
  link_color?: string;
  text_color?: string;
  background_color?: string;
  border_radius?: number;
  font_family?: string;
}

export function renderTemplate(
  template: TemplateConfig,
  event: CanonicalEvent,
  styleConfig?: StyleConfig
): string {
  try {
    // Merge event normalized data with metadata
    const flatData = {
      ...event.normalized,
      _provider: event.provider,
      _event_id: event.event_id,
      _timestamp: event.timestamp,
    };
    
    // Add style namespace variables if provided
    if (styleConfig) {
      flatData['style.font_size'] = styleConfig.font_size ? `${styleConfig.font_size}px` : '14px';
      flatData['style.link_color'] = styleConfig.link_color || '#667eea';
      flatData['style.text_color'] = styleConfig.text_color || '#1a1a1a';
      flatData['style.background_color'] = styleConfig.background_color || '#ffffff';
      flatData['style.border_radius'] = styleConfig.border_radius ? `${styleConfig.border_radius}px` : '12px';
      flatData['style.font_family'] = styleConfig.font_family || 'system-ui';
    }

    // Convert flat keys to nested for Mustache
    const templateData = flatToNested(flatData);

    // Render using Mustache
    const rendered = Mustache.render(template.html_template, templateData);
    
    return rendered;
  } catch (error) {
    console.error('[TemplateEngine] Render error:', error);
    return `<div class="noti-error">Template rendering failed</div>`;
  }
}

/**
 * Validate that event has all required fields for template
 */
export function validateEventForTemplate(
  template: TemplateConfig,
  event: CanonicalEvent
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  for (const field of template.required_fields) {
    if (!(field in event.normalized) || event.normalized[field] == null) {
      missing.push(field);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Convert flat keys with dots to nested objects
 * Example: {"template.icon": "🎉"} -> {"template": {"icon": "🎉"}}
 */
function flatToNested(flat: Record<string, any>): Record<string, any> {
  const nested: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let current = nested;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  }
  
  return nested;
}

/**
 * Sanitize template HTML for safe preview rendering
 * Converts position: fixed to position: absolute
 * Removes/adjusts z-index values that would break out
 */
export function sanitizeTemplateForPreview(html: string): string {
  // Replace position: fixed with position: absolute
  let sanitized = html.replace(
    /position:\s*fixed/gi,
    'position: absolute'
  );
  
  // Cap z-index values to prevent escape
  sanitized = sanitized.replace(
    /z-index:\s*(\d+)/gi,
    (match, value) => {
      const zIndex = parseInt(value);
      return `z-index: ${Math.min(zIndex, 10)}`;
    }
  );
  
  return sanitized;
}

/**
 * Render template preview using preview data
 * Optionally includes verification badge based on provider
 */
export function renderTemplatePreview(
  template: TemplateConfig,
  options?: { includeVerificationBadge?: boolean }
): string {
  try {
    console.log('[TemplateEngine] 🎨 Rendering preview for template:', template.template_key);
    
    // Convert flat keys to nested structure for Mustache
    const nestedData = flatToNested(template.preview_json);
    
    // Render using Mustache
    let rendered = Mustache.render(template.html_template, nestedData);
    
    // Sanitize for safe preview rendering
    let sanitized = sanitizeTemplateForPreview(rendered);
    
    // Check if template already contains a verified badge (either static or Mustache conditional)
    const templateHasVerifiedBadge = /verified|{{#template\.verified}}|notiproof-verified/i.test(template.html_template);
    
    // Add verification badge if applicable AND template doesn't already have one
    const showBadge = options?.includeVerificationBadge !== false && 
      shouldShowVerificationBadge(template.provider) &&
      !templateHasVerifiedBadge;
    
    if (showBadge) {
      sanitized = appendVerificationBadgeToHtml(sanitized);
    }
    
    // Check if rendering actually replaced placeholders
    const hasUnresolvedPlaceholders = /\{\{[^}]+\}\}/.test(sanitized);
    if (hasUnresolvedPlaceholders) {
      console.warn('[TemplateEngine] ⚠️ Warning: Template has unresolved placeholders!');
    }
    
    return sanitized;
  } catch (error) {
    console.error('[TemplateEngine] ❌ Preview render error:', error);
    return `<div class="noti-error">Preview rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
  }
}

/**
 * Append verification badge HTML to rendered template
 */
function appendVerificationBadgeToHtml(html: string): string {
  // Try to insert badge before the last closing div
  const lastDivIndex = html.lastIndexOf('</div>');
  if (lastDivIndex !== -1) {
    return html.slice(0, lastDivIndex) + VERIFICATION_BADGE_HTML + html.slice(lastDivIndex);
  }
  
  // Fallback: append to end
  return html + VERIFICATION_BADGE_HTML;
}

/**
 * Extract placeholders from template HTML
 */
export function extractTemplatePlaceholders(htmlTemplate: string): string[] {
  const placeholders = new Set<string>();
  const regex = /\{\{[#^/]?([a-zA-Z0-9_.]+)\}\}/g;
  
  let match;
  while ((match = regex.exec(htmlTemplate)) !== null) {
    placeholders.add(match[1]);
  }
  
  return Array.from(placeholders);
}

/**
 * Field aliases for fuzzy matching between template placeholders and adapter fields
 */
const FIELD_ALIASES: Record<string, string[]> = {
  'template.visitor_count': ['count', 'visitor_count', 'visitors', 'template.count'],
  'template.page_name': ['page_name', 'page', 'pageName', 'template.page'],
  'template.page_url': ['page_url', 'url', 'pageUrl', 'template.url'],
  'template.location': ['location', 'loc', 'city', 'template.city'],
  'template.user_name': ['user_name', 'name', 'userName', 'customer_name'],
  'template.user_location': ['user_location', 'location', 'city', 'region'],
  'template.product_name': ['product_name', 'product', 'item_name', 'productName'],
  'template.time_ago': ['time_ago', 'timeAgo', 'timestamp', 'created_at'],
  'template.icon': ['icon', 'emoji', 'template.emoji'],
  'template.title': ['title', 'headline', 'template.headline'],
  'template.message': ['message', 'body', 'content', 'template.body'],
};

/**
 * Build template mapping for campaign
 * Maps adapter fields to template placeholders with fuzzy matching support
 */
export function buildTemplateMapping(
  adapterFields: string[],
  templatePlaceholders: string[]
): Record<string, string> {
  const mapping: Record<string, string> = {};
  
  for (const placeholder of templatePlaceholders) {
    // Try exact match first
    const exactMatch = adapterFields.find(f => f === placeholder);
    if (exactMatch) {
      mapping[placeholder] = exactMatch;
      continue;
    }
    
    // Try alias matching - check if placeholder matches any alias
    for (const [adapterField, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.includes(placeholder) && adapterFields.includes(adapterField)) {
        mapping[placeholder] = adapterField;
        break;
      }
    }
    
    // Reverse alias matching - check if adapter field matches placeholder via aliases
    if (!mapping[placeholder]) {
      for (const [adapterField, aliases] of Object.entries(FIELD_ALIASES)) {
        if (adapterField === placeholder) {
          // Find matching adapter field from aliases
          const matchingAdapterField = adapterFields.find(f => aliases.includes(f));
          if (matchingAdapterField) {
            mapping[placeholder] = matchingAdapterField;
            break;
          }
        }
      }
    }
  }
  
  return mapping;
}

/**
 * Apply custom mapping to event data
 */
export function applyTemplateMapping(
  eventData: Record<string, any>,
  mapping: Record<string, string>
): Record<string, any> {
  const mapped: Record<string, any> = {};
  
  for (const [placeholder, field] of Object.entries(mapping)) {
    mapped[placeholder] = eventData[field];
  }
  
  return mapped;
}
