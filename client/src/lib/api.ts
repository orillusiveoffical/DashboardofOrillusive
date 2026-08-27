import type { ApiResponse } from '@/types';

const API_URL = (import.meta as any).env.VITE_API_URL || '/api';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: { field: string; message: string }[]
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getToken(): string | null {
  return localStorage.getItem('token');
}

export function setToken(token: string) {
  localStorage.setItem('token', token);
}

export function clearToken() {
  localStorage.removeItem('token');
}

export async function api<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  let json: ApiResponse<T> & { code?: string } | null = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      json = await response.json();
    } catch {
      json = null;
    }
  }

  if (!response.ok || !json?.success) {
    const errorMsg = json?.error || `HTTP ${response.status}: ${response.statusText || 'Server Error'}`;
    const errorCode = json?.code;

    if (response.status === 401 && (errorCode === 'DEMO_EXPIRED' || errorCode === 'SUBSCRIPTION_EXPIRED')) {
      clearToken();
    }

    throw new ApiError(
      errorMsg,
      response.status,
      errorCode,
      json?.details
    );
  }

  return json.data as T;
}

export { ApiError };
