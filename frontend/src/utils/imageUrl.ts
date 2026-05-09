/**
 * Shared helper to build authenticated image URLs.
 *
 * The /api/uploads/* endpoint is JWT-protected, so plain <img src="...">
 * requests fail with 401.  Appending `?token=<jwt>` lets the browser
 * fetch the image without custom headers.
 */

const API_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

/**
 * Return a fully-qualified, token-authenticated URL for a stored image.
 * Pass any value that might come from the DB  (`thumbnailUrl`,
 * `coverImageUrl`, etc.).
 *
 * Returns `''` when the input is falsy so callers can do:
 *   `src={getAuthImageUrl(unit.thumbnailUrl) || fallback}`
 */
export function getAuthImageUrl(path?: string | null): string {
  if (!path) return '';

  const token = localStorage.getItem('token') || '';

  // External URLs: only allow actually-reachable domains.
  // Fake seed CDN URLs (cdn.wiley.com, cdn.elsevier.com, etc.) won't load,
  // so treat them as empty so the caller falls back to a generated cover.
  if (path.startsWith('http://') || path.startsWith('https://')) {
    if (/cdn\.(wiley|elsevier|springer|oxford|bit101|thieme)\.com/i.test(path)) {
      return '';  // fake seed URL – ignore
    }
    return path;
  }

  // Relative /uploads/... path — served directly by the backend WITHOUT the /api prefix
  const backendRoot = API_URL.replace(/\/api\/?$/, '');
  const base = path.startsWith('/') ? `${backendRoot}${path}` : `${backendRoot}/${path}`;
  return base;
}
