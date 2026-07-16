const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

const TOKEN_KEY = 'proj.token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  role: string;
}

export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  return apiPost<{ token: string; user: AuthUser }>('/auth/login', { email, password });
}
export async function fetchMe(): Promise<AuthUser> {
  return apiGet<AuthUser>('/auth/me');
}

/** Error carrying the API's message(s) so the UI can surface them (§12.2). */
export class ApiError extends Error {
  status: number;
  messages: string[];
  constructor(status: number, messages: string[]) {
    super(messages.join(' '));
    this.status = status;
    this.messages = messages;
  }
}

function headers(): HeadersInit {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function handle<T>(res: Response): Promise<T> {
  if (res.ok) {
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  }
  let messages: string[] = [res.statusText];
  try {
    const body = await res.json();
    const m = body.message ?? body.error;
    messages = Array.isArray(m) ? m : [String(m ?? res.statusText)];
  } catch {
    /* keep statusText */
  }
  throw new ApiError(res.status, messages);
}

export async function apiGet<T>(path: string): Promise<T> {
  return handle<T>(await fetch(`${BASE_URL}${path}`, { headers: headers() }));
}
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return handle<T>(
    await fetch(`${BASE_URL}${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }),
  );
}
export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  return handle<T>(
    await fetch(`${BASE_URL}${path}`, { method: 'PUT', headers: headers(), body: JSON.stringify(body) }),
  );
}
export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return handle<T>(
    await fetch(`${BASE_URL}${path}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(body) }),
  );
}
export async function apiDelete<T>(path: string): Promise<T> {
  return handle<T>(await fetch(`${BASE_URL}${path}`, { method: 'DELETE', headers: headers() }));
}

export interface HealthResponse {
  status: string;
  db: string;
  timestamp: string;
}
