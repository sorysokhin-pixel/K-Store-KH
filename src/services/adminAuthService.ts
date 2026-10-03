export interface AdminCredentials {
  username: string;
  code: string;
  isCustom?: boolean;
}

const STORAGE_KEY = 'kstore_admin_credentials';
const SESSION_KEY = 'kstore_admin_session';

const DEFAULT_CREDENTIALS: AdminCredentials = {
  username: 'admin',
  code: '888888',
  isCustom: false,
};

export function isCustomCredentialsSet(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.isCustom === true) return true;
      if (parsed.username !== DEFAULT_CREDENTIALS.username || parsed.code !== DEFAULT_CREDENTIALS.code) {
        return true;
      }
    }
  } catch (_) {}
  return false;
}

export function getStoredAdminCredentials(): AdminCredentials {
  if (typeof window === 'undefined') return DEFAULT_CREDENTIALS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.username && parsed.code) return parsed;
    }
  } catch (e) {
    console.warn('Error reading admin credentials:', e);
  }
  return DEFAULT_CREDENTIALS;
}

export function saveStoredAdminCredentials(creds: AdminCredentials): void {
  if (typeof window === 'undefined') return;
  try {
    const toSave: AdminCredentials = {
      username: creds.username.trim(),
      code: creds.code.trim(),
      isCustom: true,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));

    // Also sync to server in background
    fetch('/api/admin/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toSave),
    }).catch(() => {});
  } catch (e) {
    console.warn('Error saving admin credentials:', e);
  }
}

export async function verifyAdminCredentialsAsync(username: string, code: string): Promise<boolean> {
  const inUser = username.trim();
  const inCode = code.trim();

  // 1. Try server verification first so any device can authenticate
  try {
    const res = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: inUser, code: inCode }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.isValid) {
        saveStoredAdminCredentials({ username: inUser, code: inCode, isCustom: true });
        setAdminSession(true);
        return true;
      }
      return false;
    }
  } catch (err) {
    console.warn('Server verify check error, using local fallback:', err);
  }

  // 2. Local fallback
  const validLocal = verifyAdminCredentials(inUser, inCode);
  if (validLocal) {
    setAdminSession(true);
  }
  return validLocal;
}

export function verifyAdminCredentials(username: string, code: string): boolean {
  const stored = getStoredAdminCredentials();
  const inputUser = username.trim().toLowerCase();
  const targetUser = stored.username.trim().toLowerCase();
  const inputCode = code.trim();
  const targetCode = stored.code.trim();

  // If the admin has set custom credentials, strictly require the exact custom credentials!
  // The old default codes (888888 / 123456) are completely disabled.
  if (isCustomCredentialsSet() || stored.isCustom) {
    return inputUser === targetUser && inputCode === targetCode;
  }

  // Only if NO custom credentials have ever been set, allow initial default login
  const isDefaultAdmin = inputUser === 'admin' && inputCode === '888888';
  const isDefaultSory = inputUser === 'sorysokhin' && inputCode === '123456';
  return isDefaultAdmin || isDefaultSory;
}

export function isAdminSessionValid(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
  } catch (_) {
    return false;
  }
}

export function setAdminSession(valid: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (valid) {
      sessionStorage.setItem(SESSION_KEY, 'true');
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  } catch (_) {}
}
