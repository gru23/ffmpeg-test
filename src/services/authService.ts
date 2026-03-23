import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const APP_SCHEME = 'ffmpeg1';
const REDIRECT_PATH = 'oauthredirect';
const DEV_CLIENT_SCHEME = `exp+${APP_SCHEME}`;
const EXPO_PROJECT_FULL_NAME = '@gru23/FFmpeg_1';
const GOOGLE_WEB_CLIENT_ID = '48939084992-ah3h7cvtjhp82dc5al8ser9g1h69lbk4.apps.googleusercontent.com';

export async function loginWithGoogle() {
  const discovery = await AuthSession.fetchDiscoveryAsync('https://accounts.google.com');

  if (!discovery) {
    throw new Error('Discovery document not loaded');
  }

  // In Expo dev client on Android, manifest registers exp+<scheme> deep links.
  const returnUrl = AuthSession.getDefaultReturnUrl(REDIRECT_PATH, {
    scheme: DEV_CLIENT_SCHEME,
  });

  const redirectUri = `https://auth.expo.io/${EXPO_PROJECT_FULL_NAME}`;

  const request = new AuthSession.AuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri,
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

  return null;
}
