import Mustache from 'mustache';
import { CanonicalEvent } from './integrations/types';

/**
 * Template Engine - Renders HTML templates with event data
 * Uses Mustache for safe templating
 */

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
export function renderTemplate(
  template: TemplateConfig,
  event: CanonicalEvent
): string {
  try {
    // Merge event normalized data with metadata
    const flatData = {
      ...event.normalized,
      _provider: event.provider,
      _event_id: event.event_id,
      _timestamp: event.timestamp,
    };

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
 */
export function renderTemplatePreview(template: TemplateConfig): string {
  try {
    console.log('[TemplateEngine] 🎨 Rendering preview for template:', template.template_key);
    console.log('[TemplateEngine] 📋 Original preview_json:', JSON.stringify(template.preview_json, null, 2));
    console.log('[TemplateEngine] 📝 HTML Template (first 300 chars):', template.html_template.substring(0, 300));
    
    // Convert flat keys to nested structure for Mustache
    const nestedData = flatToNested(template.preview_json);
    console.log('[TemplateEngine] 🔄 Converted to nested structure:', JSON.stringify(nestedData, null, 2));
    
    // Render using Mustache
    const rendered = Mustache.render(template.html_template, nestedData);
    
    // Sanitize for safe preview rendering
    const sanitized = sanitizeTemplateForPreview(rendered);
    
    console.log('[TemplateEngine] ✅ Rendered HTML (first 300 chars):', sanitized.substring(0, 300));
    console.log('[TemplateEngine] 📊 Rendered HTML length:', sanitized.length);
    
    // Check if rendering actually replaced placeholders
    const hasUnresolvedPlaceholders = /\{\{[^}]+\}\}/.test(sanitized);
    if (hasUnresolvedPlaceholders) {
      console.warn('[TemplateEngine] ⚠️ Warning: Template has unresolved placeholders!');
      console.warn('[TemplateEngine] Unresolved:', sanitized.match(/\{\{[^}]+\}\}/g));
    }
    
    return sanitized;
  } catch (error) {
    console.error('[TemplateEngine] ❌ Preview render error:', error);
    console.error('[TemplateEngine] Template data:', {
      template_key: template.template_key,
      preview_json: template.preview_json,
      html_length: template.html_template?.length || 0
    });
    return `<div class="noti-error">Preview rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
  }
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
 * Build template mapping for campaign
 * Maps adapter fields to template placeholders
 */
export function buildTemplateMapping(
  adapterFields: string[],
  templatePlaceholders: string[]
): Record<string, string> {
  const mapping: Record<string, string> = {};
  
  // Auto-map fields with exact matches
  for (const placeholder of templatePlaceholders) {
    const exactMatch = adapterFields.find(f => f === placeholder);
    if (exactMatch) {
      mapping[placeholder] = exactMatch;
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
