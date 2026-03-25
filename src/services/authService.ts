import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

/* ova implementacija i dalje pravi prekid sa Metro Bundlerom tj. veza se prekida 
sa serverom jer za login je potrebno izaci iz aplikacije i otvoriti browser. Implementaciju
sistema nastavljam bez da koristim login pa na kraju svega ukljuciti i nju jer ona ne predstavlja
problem rada aplikacije na telefonu (aplikacija radi bez obzira na to samo ne vidim 
odzive/logove) */

const APP_SCHEME = 'ffmpeg1';
const REDIRECT_PATH = 'oauthredirect';
const EXPO_PROJECT_FULL_NAME = '@gru23/FFmpeg_1';
const GOOGLE_WEB_CLIENT_ID = '48939084992-ah3h7cvtjhp82dc5al8ser9g1h69lbk4.apps.googleusercontent.com';

export async function loginWithGoogle() {
  const discovery = await AuthSession.fetchDiscoveryAsync('https://accounts.google.com');

  if (!discovery) {
    throw new Error('Discovery document not loaded');
  }

  const returnUrl = `${APP_SCHEME}:/${REDIRECT_PATH}`;

  const redirectUri = `https://auth.expo.io/${EXPO_PROJECT_FULL_NAME}`;

  const request = new AuthSession.AuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri,
    responseType: AuthSession.ResponseType.Token,
    usePKCE: false,
    scopes: ['openid', 'profile', 'email'],
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
