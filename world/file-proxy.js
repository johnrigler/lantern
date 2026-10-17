/* Chisel-compatible File Proxy transport. Public settings only. */
export const SETTINGS_KEY = 'zorkmid.services.v1';
export const DEFAULT_SETTINGS = Object.freeze({ proxy: 'https://rigler.org/fileproxy', directory: 'zorkmid/comments', chronik: 'https://chronik.e.cash' });
export function serviceUrl(value) {
  const url = new URL(String(value).trim());
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) || url.username || url.password || url.search || url.hash) throw new Error('Use an HTTPS service URL without credentials, a query, or a fragment.');
  return url.href.replace(/\/$/, '');
}
export function safePath(value) {
  const path = String(value).trim();
  if (path.length > 240 || !/^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(path) || path.split('/').some(p => p === '.' || p === '..')) throw new Error('Use a relative File Proxy path with letters, digits, dashes, or underscores.');
  return path;
}
export function validateSettings(value) {
  return { proxy: serviceUrl(value.proxy), directory: safePath(value.directory), chronik: serviceUrl(value.chronik) };
}
export function readSettings(storage = globalThis.localStorage) {
  try { return validateSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(storage?.getItem(SETTINGS_KEY) || '{}') }); }
  catch { return { ...DEFAULT_SETTINGS }; }
}
export function saveSettings(value, storage = globalThis.localStorage) {
  const clean = validateSettings(value);
  storage?.setItem(SETTINGS_KEY, JSON.stringify(clean)); return clean;
}
export class FileProxy {
  constructor(url, fetcher = globalThis.fetch) { this.url = serviceUrl(url); this.fetch = fetcher.bind(globalThis); }
  async request(route, path, text) {
    const target = this.url + route + (text === undefined ? '?path=' + encodeURIComponent(safePath(path)) : '');
    const response = await this.fetch(target, { method: text === undefined ? 'GET' : 'POST',
      credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', signal: AbortSignal.timeout(12000),
      ...(text === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: safePath(path), text }) }) });
    const raw = await response.text();
    if (raw.length > 3000000) throw new Error('File Proxy response is too large.');
    let result; try { result = JSON.parse(raw); } catch { throw new Error('File Proxy returned an invalid response.'); }
    if (!response.ok || result.ok !== true) {
      const error = new Error(result.error || 'File Proxy HTTP ' + response.status);
      error.missingPath = response.status === 404 && result.error === 'Path does not exist'; throw error;
    }
    return result;
  }
  async list(path) {
    try {
      const result = await this.request('/list', path);
      if (!Array.isArray(result.items)) throw new Error('File Proxy listing is invalid.');
      return result.items;
    } catch (error) { if (error.missingPath) return []; throw error; }
  }
  async load(path, limit = 32000) {
    const result = await this.request('/load', path);
    if (typeof result.text !== 'string' || result.text.length > limit) throw new Error('The public artifact is too large or invalid.');
    return result.text;
  }
  async save(path, text) {
    if (typeof text !== 'string' || text.length > 512000) throw new Error('The public artifact is too large.');
    return this.request('/save', path, text);
  }
}
