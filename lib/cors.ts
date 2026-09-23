/**
 * Centralized CORS helper for SavedLens API endpoints.
 * Restricts origin to known safe domains and Chrome Extension origins.
 */
const ALLOWED_ORIGIN_PATTERNS = [
  'https://savedlens.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'chrome-extension://',
]

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') || ''
  const isAllowed = ALLOWED_ORIGIN_PATTERNS.some((pattern) => {
    if (pattern.endsWith('/')) {
      return origin.startsWith(pattern)
    }
    return origin === pattern
  })

  const allowOrigin = isAllowed ? origin : ALLOWED_ORIGIN_PATTERNS[0]

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-savedlens-token, X-Requested-With, x-telegram-bot-api-secret-token',
  }
}
