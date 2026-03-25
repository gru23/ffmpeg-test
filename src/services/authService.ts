import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { APP_SCHEME, AUTH_DISCOVERY_ERROR_MESSAGE, AUTH_REQUEST_SCOPE, EXPO_PROJECT_FULL_NAME, GOOGLE_DISCOVERY_BASE_URL, GOOGLE_WEB_CLIENT_ID, REDIRECT_PATH } from '../constants';

WebBrowser.maybeCompleteAuthSession();

/* ova implementacija i dalje pravi prekid sa Metro Bundlerom tj. veza se prekida 
sa serverom jer za login je potrebno izaci iz aplikacije i otvoriti browser. Implementaciju
sistema nastavljam bez da koristim login pa na kraju svega ukljuciti i nju jer ona ne predstavlja
problem rada aplikacije na telefonu (aplikacija radi bez obzira na to samo ne vidim 
odzive/logove) */

export async function loginWithGoogle() {
  const discovery = await AuthSession.fetchDiscoveryAsync(GOOGLE_DISCOVERY_BASE_URL);

  if (!discovery) {
    throw new Error(AUTH_DISCOVERY_ERROR_MESSAGE);
  }

  const returnUrl = `${APP_SCHEME}:/${REDIRECT_PATH}`;

  const redirectUri = `https://auth.expo.io/${EXPO_PROJECT_FULL_NAME}`;

  const request = new AuthSession.AuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri,
    responseType: AuthSession.ResponseType.Token,
    usePKCE: false,
    scopes: AUTH_REQUEST_SCOPE,
  });

  const authUrl = await request.makeAuthUrlAsync(discovery);
  const startUrl = `${redirectUri}/start?authUrl=${encodeURIComponent(authUrl)}&returnUrl=${encodeURIComponent(returnUrl)}`;
  const result = await WebBrowser.openAuthSessionAsync(startUrl, returnUrl);

  if (result.type !== 'success') {
    return null;
  }

  const parsed = request.parseReturnUrl(result.url);

  if (parsed.type === 'success') {
    const token = parsed.authentication?.accessToken;
    return token ?? null;
  }

  // Fallback parse for providers that return token in URL fragment.
  const hash = result.url.split('#')[1] ?? '';
  if (hash) {
    const hashParams = new URLSearchParams(hash);
    const fallbackToken = hashParams.get('access_token');
    if (fallbackToken) {
      return fallbackToken;
    }
  }

  return null;
}
