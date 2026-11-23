import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

const BASE = 'https://astroparihar.com';
export const NOTIFICATION_CACHE_KEY = 'astroparihar_notifications_cache';
export const UNREAD_KEY = 'astroparihar_notifications_unread';

export async function isAuthenticatedUser(): Promise<{ uid: string; phone: string } | null> {
  try {
    const raw = await AsyncStorage.getItem('astroparihar_auth_user');
    if (!raw) return null;
    const user = JSON.parse(raw);
    if (!user?.uid && !user?.phone) return null;
    return { uid: String(user.uid || ''), phone: String(user.phone || '') };
  } catch { return null; }
}

export async function clearNotificationState(): Promise<void> {
  await AsyncStorage.multiRemove([NOTIFICATION_CACHE_KEY, UNREAD_KEY, 'astroparihar_push_token']);
  if (Platform.OS === 'ios') {
    await Notifications.setBadgeCountAsync(0).catch(() => {});
  }
}

export async function fetchNotifications(force = false): Promise<any[]> {
  const auth = await isAuthenticatedUser();
  if (!auth) {
    await clearNotificationState();
    return [];
  }
  try {
    const res = await fetch(`${BASE}/api/app-dynamic/notifications${force ? `?t=${Date.now()}` : ''}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('notifications unavailable');
    const data = await res.json();
    const list = Array.from(Array.isArray(data) ? data : data?.notifications || data?.items || []);
    await AsyncStorage.setItem(NOTIFICATION_CACHE_KEY, JSON.stringify(list));
    const unread = list.filter((n: any) => !n.read).length;
    await AsyncStorage.setItem(UNREAD_KEY, String(unread));
    if (Platform.OS === 'ios') await Notifications.setBadgeCountAsync(unread).catch(() => {});
    return list;
  } catch {
    try {
      const raw = await AsyncStorage.getItem(NOTIFICATION_CACHE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }
}

let fcmRefreshListenerStarted = false;

async function registerFcmToken(): Promise<void> {
  const auth = await isAuthenticatedUser();
  if (!auth) return;

  const permission = await Notifications.getPermissionsAsync();
  let status = permission.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') return;

  const messagingModule = await import('@react-native-firebase/messaging');
  const messaging = (messagingModule as any).default || messagingModule;
  await messaging().registerDeviceForRemoteMessages();
  const fcmToken = await messaging().getToken();
  if (!fcmToken) return;

  const rawUser = await AsyncStorage.getItem('astroparihar_auth_user');
  const user = rawUser ? JSON.parse(rawUser) : null;
  const projectId = Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId;
  const expoToken = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined).catch(() => null);

  let deviceName = 'iPhone';
  try {
    const Device = await import('expo-device');
    deviceName = Device.modelName || ((Platform as any).isPad ? 'iPad' : 'iPhone');
  } catch {}

  await AsyncStorage.setItem('astroparihar_push_token', fcmToken);
  await fetch(`${BASE}/api/app-dynamic/notifications/register-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      uid: auth.uid,
      phone: auth.phone,
      name: user?.name || '',
      nativeToken: fcmToken,
      expoPushToken: expoToken?.data || null,
      platform: 'ios',
      deviceName,
    }),
  }).catch(() => {});

  console.log(`[FCM iOS] registered nativeToken: length=${fcmToken.length}, format=${/^.{100,}$/.test(fcmToken) && fcmToken.includes(':') ? 'long Firebase FCM token' : 'unexpected token format'}`);

  if (!fcmRefreshListenerStarted) {
    fcmRefreshListenerStarted = true;
    messaging().onTokenRefresh(() => { registerFcmToken().catch(() => {}); });
  }
}

export async function registerPushTokenIfAuthenticated(): Promise<void> {
  const auth = await isAuthenticatedUser();
  if (!auth) {
    await clearNotificationState();
    return;
  }

  if (Platform.OS === 'ios') {
    await registerFcmToken();
    return;
  }

  const permission = await Notifications.getPermissionsAsync();
  let status = permission.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') return;

  const projectId = Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId;
  const tokenResult = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined).catch(() => null);
  if (!tokenResult?.data) return;
  await AsyncStorage.setItem('astroparihar_push_token', tokenResult.data);
  await fetch(`${BASE}/api/app-dynamic/notifications/register-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ uid: auth.uid, phone: auth.phone, token: tokenResult.data, platform: 'android' }),
  }).catch(() => {});
}

export async function syncNotificationPreferences(preferences: Record<string, any>): Promise<void> {
  const auth = await isAuthenticatedUser();
  if (!auth) return;
  await fetch(`${BASE}/api/app-dynamic/notifications/preferences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ uid: auth.uid, phone: auth.phone, ...preferences }),
  }).catch(() => {});
}

export function configureNotificationPresentation() {
  Notifications.setNotificationHandler({
    handleNotification: async () => {
      const auth = await isAuthenticatedUser();
      return auth
        ? { shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }
        : { shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false };
    },
  });
}
