 
import { WailsService } from './wails';


export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

const TOKEN_KEY = 'validex_token';
const EMAIL_KEY = 'validex_email';

export const getApiUrl = (): string => {
  let url = (import.meta as any).env?.VITE_API_URL;
  
  if (url && !url.endsWith('/api/v1')) {
    url = `${url.replace(/\/$/, '')}/api/v1`;
  }
  return url;
};

const API_BASE = getApiUrl();

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredEmail(): string | null {
  return localStorage.getItem(EMAIL_KEY);
}

export async function setStoredToken(token: string, email?: string): Promise<void> {
  localStorage.setItem(TOKEN_KEY, token);
  if (email) {
    localStorage.setItem(EMAIL_KEY, email);
  }
  await WailsService.saveSecureToken(token);
}

export async function clearStoredToken(): Promise<void> {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
  await WailsService.clearSecureToken();
}

function getHeaders(): HeadersInit {
  const token = getStoredToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}


export async function forceLogout(){

 localStorage.removeItem(TOKEN_KEY);
 localStorage.removeItem(EMAIL_KEY);

 await WailsService.clearSecureToken();

 window.dispatchEvent(
  new CustomEvent("auth-expired")
 );

}

export async function request<T = any>(
  path: string,
  options: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...options.headers,
        ...getHeaders(),
      },
    });

    const contentType = response.headers.get('content-type') || '';
    if (response.ok) {
      if (contentType.includes('application/json')) {
        const json = await response.json();
        if (json && typeof json === 'object' && 'success' in json) {
          return json;
        }
        return { success: true, message: 'Request successful', data: json };
      }
      const text = await response.text();
      return { success: true, message: 'Request successful', data: text as unknown as T };
    }

    let errorMsg = `HTTP Error ${response.status}`;
    if (contentType.includes('application/json')) {
      try {
        const errJson = await response.json();
        if (errJson.message) {
          errorMsg = errJson.message;
        }
      } catch {
        // ignore parse error
      }
    } else {
      const errorText = await response.text();
      if (errorText) {
        errorMsg = errorText;
      }
    }

  if(response.status === 401){

 await forceLogout();
}

return {
 success:false,
 message:errorMsg,
};
  } catch (err: any) {
    console.error('[ValidEx API] Request failed:', err?.message || err);
    return {
      success: false,
      message: `Network Error`,
    };
  }
}
