export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = [
    'https://notiproof.com',
    'https://www.notiproof.com',
    'https://staging.notiproof.com',
    'https://app.notiproof.com',
  ];
  
  // Allow localhost in development
  const isDev = Deno.env.get('ENVIRONMENT') !== 'production';
  if (isDev && origin?.includes('localhost')) {
    allowedOrigins.push(origin);
  }
  
  const corsOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}
