/**
 * Shared validation utilities for edge functions.
 * Lightweight validators without external dependencies.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validate a string is a valid UUID v4 format */
export function isValidUUID(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

/** Validate UUID and return 400 response if invalid */
export function validateUUID(value: unknown, fieldName: string, corsHeaders: Record<string, string>): Response | null {
  if (!isValidUUID(value)) {
    return new Response(JSON.stringify({ 
      error: 'Validation error',
      details: { [fieldName]: `Invalid UUID format` }
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  return null;
}

/** Strip control characters and trim a string */
export function sanitizeString(value: unknown, maxLength = 1000): string {
  if (typeof value !== 'string') return '';
  // Remove control characters (except newline/tab), trim, and truncate
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, maxLength);
}

/** Check payload size against max bytes. Returns error Response or null. */
export function checkPayloadSize(payload: string, maxBytes: number, corsHeaders: Record<string, string>): Response | null {
  const size = new TextEncoder().encode(payload).length;
  if (size > maxBytes) {
    return new Response(JSON.stringify({
      error: 'Payload too large',
      max_bytes: maxBytes,
      received_bytes: size
    }), {
      status: 413,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  return null;
}

/** Validate that a parsed JSON value is a non-null object (not array) */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Validate a string field: required, trimmed, within length bounds */
export function validateString(
  value: unknown, 
  fieldName: string, 
  opts: { min?: number; max?: number; required?: boolean } = {}
): string | null {
  const { min = 1, max = 255, required = true } = opts;
  if (value === undefined || value === null || value === '') {
    return required ? `${fieldName} is required` : null;
  }
  if (typeof value !== 'string') return `${fieldName} must be a string`;
  const trimmed = value.trim();
  if (required && trimmed.length < min) return `${fieldName} must be at least ${min} character(s)`;
  if (trimmed.length > max) return `${fieldName} must be at most ${max} characters`;
  return null;
}

/** Validate a value is one of allowed enum values */
export function validateEnum(value: unknown, fieldName: string, allowed: string[]): string | null {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    return `${fieldName} must be one of: ${allowed.join(', ')}`;
  }
  return null;
}

/** Collect validation errors and return a 400 response, or null if no errors */
export function validationResponse(
  errors: Record<string, string | null>,
  corsHeaders: Record<string, string>
): Response | null {
  const filtered = Object.fromEntries(
    Object.entries(errors).filter(([, v]) => v !== null)
  );
  if (Object.keys(filtered).length === 0) return null;
  return new Response(JSON.stringify({
    error: 'Validation error',
    details: filtered
  }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
