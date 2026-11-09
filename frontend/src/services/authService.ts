 

import { request, setStoredToken, clearStoredToken, getStoredToken, getStoredEmail, ApiResponse } from './apiClient';

export async function login(email: string, password: string): Promise<ApiResponse<string>> {
  const res = await request<string>('/users/auth/desktop/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (res.success && res.data) {
    await setStoredToken(res.data, email);
  }

  return res;
}

export async function logout(): Promise<ApiResponse<string>> {
  const res = await request<string>('/users/auth/desktop/logout', {
    method: 'POST',
  });

  await clearStoredToken();
  return res;
}

export async function restoreSession(): Promise<{ token: string; email: string } | null> {
  let token:any = await getStoredToken();
  const email = getStoredEmail();

  if (!token) {
    token = await window.go?.storage?.EncryptedStore?.LoadSecureToken?.();
    if (token) {
      await setStoredToken(token);
    }
  }

  if (token && email) {
    return { token, email };
  }

  return null;
}
