import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system/legacy';

import { APP_SCHEME, AUTH_DISCOVERY_ERROR_MESSAGE, AUTH_REQUEST_SCOPE, EXPO_PROJECT_FULL_NAME, GOOGLE_DISCOVERY_BASE_URL, GOOGLE_WEB_CLIENT_ID, REDIRECT_PATH } from '../constants';

/* ova implementacija i dalje pravi prekid sa Metro Bundlerom tj. veza se prekida 
sa serverom jer za login je potrebno izaci iz aplikacije i otvoriti browser. Implementaciju
sistema nastavljam bez da koristim login pa na kraju svega ukljuciti i nju jer ona ne predstavlja
problem rada aplikacije na telefonu (aplikacija radi bez obzira na to samo ne vidim 
odzive/logove) */

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_SESSION_FILE = 'google-session.json';

type StoredGoogleSession = {
  idToken: string;
  issuedAt: number;
};

function getSessionPath() {
  if (!FileSystem.documentDirectory) {
    throw new Error('Document directory is not available');
  }

  return FileSystem.documentDirectory + GOOGLE_SESSION_FILE;
}

async function saveGoogleSession(idToken: string) {
  const path = getSessionPath();
  const payload: StoredGoogleSession = {
    idToken,
    issuedAt: Date.now(),
  };

  await FileSystem.writeAsStringAsync(path, JSON.stringify(payload));
}

async function readGoogleSession(): Promise<StoredGoogleSession | null> {
  try {
    const path = getSessionPath();
    const info = await FileSystem.getInfoAsync(path);

    if (!info.exists) {
      return null;
    }

    const raw = await FileSystem.readAsStringAsync(path);
    const parsed = JSON.parse(raw) as StoredGoogleSession;

    if (!parsed?.idToken) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function clearGoogleSession() {
  const path = getSessionPath();
  await FileSystem.deleteAsync(path, { idempotent: true });
}

export async function isStoredGoogleSessionValid() {
  const session = await readGoogleSession();

  if (!session?.idToken) {
    return false;
  }

  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(session.idToken)}`);

    if (!res.ok) {
      await clearGoogleSession();
      return false;
    }

    const data = (await res.json()) as { aud?: string; exp?: string };

    if (data.aud !== GOOGLE_WEB_CLIENT_ID) {
      await clearGoogleSession();
      return false;
    }

    if (data.exp) {
      const expiresAtMs = Number(data.exp) * 1000;
      if (!Number.isNaN(expiresAtMs) && Date.now() >= expiresAtMs) {
        await clearGoogleSession();
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

function generateNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let nonce = '';

  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return nonce;
}

export async function loginWithGoogle() {
  const discovery = await AuthSession.fetchDiscoveryAsync(GOOGLE_DISCOVERY_BASE_URL);

  if (!discovery) {
    throw new Error(AUTH_DISCOVERY_ERROR_MESSAGE);
  }

  const returnUrl = `${APP_SCHEME}:/${REDIRECT_PATH}`;
  const redirectUri = `https://auth.expo.io/${EXPO_PROJECT_FULL_NAME}`;
  const nonce = generateNonce();

  const request = new AuthSession.AuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri,
    responseType: AuthSession.ResponseType.IdToken,
    usePKCE: false,
    scopes: AUTH_REQUEST_SCOPE,
  });

  const authUrl = await request.makeAuthUrlAsync(discovery);
  const authUrlWithNonce = `${authUrl}&nonce=${encodeURIComponent(nonce)}`;
  const startUrl = `${redirectUri}/start?authUrl=${encodeURIComponent(authUrlWithNonce)}&returnUrl=${encodeURIComponent(returnUrl)}`;
  const result = await WebBrowser.openAuthSessionAsync(startUrl, returnUrl);

  if (result.type !== 'success') {
    return null;
  }

  const parsed = request.parseReturnUrl(result.url);

  if (parsed.type === 'success') {
    const token = parsed.authentication?.idToken;

    if (token) {
      await saveGoogleSession(token);
      return token;
    }
  }

  const hash = result.url.split('#')[1] ?? '';
  if (hash) {
    const hashParams = new URLSearchParams(hash);
    const fallbackToken = hashParams.get('id_token');

    if (fallbackToken) {
      await saveGoogleSession(fallbackToken);
      return fallbackToken;
    }
  }

  return null;
}
