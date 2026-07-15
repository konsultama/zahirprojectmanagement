const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export interface HealthResponse {
  status: string;
  db: string;
  timestamp: string;
}
