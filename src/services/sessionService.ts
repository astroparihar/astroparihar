import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export const SESSION_ID_KEY = 'astroparihar_active_session_id';
const BASE = 'https://astroparihar.com';

export type ActiveSession = {
  sessionId: string;
  deviceName: string;
  osLabel: string;
  platform: string;
  appVersion: string;
  lastActiveAt?: string;
  current?: boolean;
};

export async function getOrCreateSessionId(): Promise<string> {
  let id = await AsyncStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = `ios_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

export async function getDeviceInfo() {
  let deviceName = Device.modelName || (Device.deviceType === Device.DeviceType.TABLET ? 'iPad' : 'iPhone');
  const osLabel = `iOS ${String(Platform.Version)}`;
  const appVersion = Constants.expoConfig?.version || Application.nativeApplicationVersion || '1.0.0';
  return { deviceName, osLabel, platform: 'ios', appVersion };
}

export async function heartbeatSession(uid: string, phone: string): Promise<{ ok: boolean; revoked?: boolean; data?: any }> {
  try {
    const sessionId = await getOrCreateSessionId();
    const device = await getDeviceInfo();
    const res = await fetch(`${BASE}/api/auth/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ sessionId, uid, phone, ...device }),
    });
    const data = await res.json().catch(() => null);
    if (res.status === 401 && data?.revoked) return { ok: false, revoked: true, data };
    return { ok: res.ok, data };
  } catch { return { ok: false }; }
}

export async function fetchSessions(uid: string, phone: string): Promise<{ ok: boolean; revoked?: boolean; data?: any }> {
  try {
    const sessionId = await AsyncStorage.getItem(SESSION_ID_KEY);
    const params = new URLSearchParams({ uid, phone, sessionId: sessionId || '' });
    const res = await fetch(`${BASE}/api/auth/sessions?${params.toString()}`, { headers: { Accept: 'application/json' } });
    const data = await res.json().catch(() => null);
    if (res.status === 401 || data?.currentSessionRevoked === true) return { ok: false, revoked: true, data };
    return { ok: res.ok, data };
  } catch { return { ok: false }; }
}

export async function revokeSession(uid: string, phone: string, targetSessionId?: string, revokeAllOthers = false, currentSessionId?: string) {
  const body: any = { uid, phone };
  if (revokeAllOthers) Object.assign(body, { revokeAllOthers: true, currentSessionId });
  else body.sessionId = targetSessionId;
  const res = await fetch(`${BASE}/api/auth/sessions`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  let data: any = null;
  try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data };
}

export async function clearSessionId() {
  await AsyncStorage.removeItem(SESSION_ID_KEY);
}
