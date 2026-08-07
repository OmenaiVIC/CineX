export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  transactionId?: string;
}

const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

export const API_BASE = import.meta.env.VITE_API_BACKEND
  || (hostname === 'localhost' || hostname === '127.0.0.1'
    ? 'http://localhost:3001/api'
    : 'https://cine-x-api.vercel.app/api');

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function deepConvertKeys<T>(obj: unknown, convert: (s: string) => string): T {
  if (obj === null || obj === undefined) return obj as T;
  if (Array.isArray(obj)) return obj.map(item => deepConvertKeys(item, convert)) as T;
  if (typeof obj === 'object' && obj.constructor === Object) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[convert(key)] = deepConvertKeys(value, convert);
    }
    return result as T;
  }
  return obj as T;
}

export function getAuthToken(): string | null {
  try { return localStorage.getItem('cinex_auth_token'); } catch { return null; }
}

export function setAuthToken(token: string): void {
  try { localStorage.setItem('cinex_auth_token', token); } catch { /* storage unavailable */ }
}

export function clearAuthToken(): void {
  try { localStorage.removeItem('cinex_auth_token'); } catch { /* storage unavailable */ }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<ServiceResponse<T>> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const options: RequestInit = { method, headers };
    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }
    const res = await fetch(`${API_BASE}${path}`, options);
    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const errBody = await res.json();
        errMsg = errBody.error || errMsg;
      } catch { /* ignore */ }
      return { success: false, error: errMsg };
    }
    if (res.status === 204) return { success: true, data: true as T };
    const data = await res.json();
    const camelData = deepConvertKeys<T>(data, snakeToCamel);
    return { success: true, data: camelData };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export function get<T>(path: string): Promise<ServiceResponse<T>> {
  return request<T>('GET', path);
}

export function post<T>(path: string, body?: unknown): Promise<ServiceResponse<T>> {
  return request<T>('POST', path, body);
}

export function put<T>(path: string, body?: unknown): Promise<ServiceResponse<T>> {
  return request<T>('PUT', path, body);
}

export function del<T>(path: string): Promise<ServiceResponse<T>> {
  return request<T>('DELETE', path);
}
