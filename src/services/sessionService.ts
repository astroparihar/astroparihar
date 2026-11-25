import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { API_ENDPOINTS } from '@/config/api';
import { useAuthStore } from '@/features/auth/authStore';

const STORAGE_SESSION_ID_KEY = 'astroparihar_active_session_id_v1';

export interface ActiveDeviceSession {
  sessionId: string;
  uid: string;
  phone: string;
  deviceName: string;
  osLabel: string;
  platform: string;
  appVersion: string;
  createdAt: string;
  lastActiveAt: string;
  lastActiveAtMs: number;
  isCurrent: boolean;
}

export function getCurrentDeviceDescriptor(): {
  deviceName: string;
  osLabel: string;
  platform: 'android' | 'ios' | 'web';
  appVersion: string;
} {
  const platform: 'android' | 'ios' | 'web' =
    Platform.OS === 'android' ? 'android' : Platform.OS === 'ios' ? 'ios' : 'web';

  const brand = Device.brand ? String(Device.brand).trim() : '';
  const model = Device.modelName ? String(Device.modelName).trim() : '';
  const devName = Device.deviceName ? String(Device.deviceName).trim() : '';

  let deviceName = 'Mobile Device';
  if (platform === 'web') {
    deviceName = 'Web Browser';
  } else if (model) {
    deviceName =
      brand && !model.toLowerCase().startsWith(brand.toLowerCase())
        ? `${brand} ${model}`
        : model;
  } else if (devName) {
    deviceName = devName;
  } else {
    deviceName = platform === 'ios' ? 'iPhone' : 'Android Device';
  }

  const osName = Device.osName || (platform === 'ios' ? 'iOS' : platform === 'android' ? 'Android' : 'Web');
  const osVersion = Device.osVersion ? ` ${Device.osVersion}` : '';
  const appVersion =
    Constants.expoConfig?.version ||
    Constants.nativeAppVersion ||
    '1.0.7';

  return {
    deviceName,
    osLabel: `${osName}${osVersion}`,
    platform,
    appVersion,
  };
}

export async function getOrCreateSessionId(uid?: string): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_SESSION_ID_KEY);
    if (existing && existing.length >= 10) return existing;
  } catch {}
  const fresh = `sess_${(uid || 'u').replace(/[^a-zA-Z0-9]/g, '').slice(-12)}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await AsyncStorage.setItem(STORAGE_SESSION_ID_KEY, fresh).catch(() => {});
  return fresh;
}

export async function resetLocalSessionId(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_SESSION_ID_KEY).catch(() => {});
}

export async function registerOrHeartbeatSession(): Promise<{ revoked: boolean }> {
  const st = useAuthStore.getState();
  if (!st.isAuthenticated || !st.user || (!st.user.uid && !st.user.phone)) {
    return { revoked: false };
  }

  const sessionId = await getOrCreateSessionId(st.user.uid);
  const info = getCurrentDeviceDescriptor();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(API_ENDPOINTS.authSessions, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        uid: st.user.uid || '',
        phone: st.user.phone || '',
        deviceName: info.deviceName,
        osLabel: info.osLabel,
        platform: info.platform,
        appVersion: info.appVersion,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.status === 401) {
      const data = await res.json().catch(() => ({}));
      if (data?.revoked) {
        await st.logout();
        return { revoked: true };
      }
    }
  } catch {
    // Non-blocking when offline
  }

  return { revoked: false };
}

export async function fetchActiveSessions(): Promise<{
  sessions: ActiveDeviceSession[];
  currentSessionId: string;
  currentSessionRevoked: boolean;
}> {
  const st = useAuthStore.getState();
  if (!st.isAuthenticated || !st.user || (!st.user.uid && !st.user.phone)) {
    return { sessions: [], currentSessionId: '', currentSessionRevoked: false };
  }

  const currentSessionId = await getOrCreateSessionId(st.user.uid);
  const info = getCurrentDeviceDescriptor();

  const localCurrentFallback: ActiveDeviceSession = {
    sessionId: currentSessionId,
    uid: st.user.uid || '',
    phone: st.user.phone || '',
    deviceName: info.deviceName,
    osLabel: info.osLabel,
    platform: info.platform,
    appVersion: info.appVersion,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    lastActiveAtMs: Date.now(),
    isCurrent: true,
  };

  try {
    // Ensure current device is registered first
    await registerOrHeartbeatSession();

    const params = new URLSearchParams();
    if (st.user.uid) params.set('uid', st.user.uid);
    if (st.user.phone) params.set('phone', st.user.phone);
    params.set('sessionId', currentSessionId);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(`${API_ENDPOINTS.authSessions}?${params.toString()}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data?.currentSessionRevoked) {
        await st.logout();
        return { sessions: [], currentSessionId, currentSessionRevoked: true };
      }
      if (data?.success && Array.isArray(data.sessions) && data.sessions.length > 0) {
        const list: ActiveDeviceSession[] = data.sessions.map((s: any) => ({
          sessionId: String(s.sessionId || ''),
          uid: String(s.uid || ''),
          phone: String(s.phone || ''),
          deviceName: String(s.deviceName || 'Mobile Device'),
          osLabel: String(s.osLabel || 'Mobile'),
          platform: String(s.platform || 'android'),
          appVersion: String(s.appVersion || ''),
          createdAt: String(s.createdAt || ''),
          lastActiveAt: String(s.lastActiveAt || ''),
          lastActiveAtMs: Number(s.lastActiveAtMs || 0),
          isCurrent: String(s.sessionId) === currentSessionId,
        }));
        // Ensure current device always appears first
        list.sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent) || b.lastActiveAtMs - a.lastActiveAtMs);
        return { sessions: list, currentSessionId, currentSessionRevoked: false };
      }
    }
  } catch {
    // Graceful fallback to real current device only (never mock other devices)
  }

  return {
    sessions: [localCurrentFallback],
    currentSessionId,
    currentSessionRevoked: false,
  };
}

export async function revokeDeviceSession(sessionId: string): Promise<boolean> {
  const st = useAuthStore.getState();
  if (!st.user) return false;

  try {
    const res = await fetch(API_ENDPOINTS.authSessions, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: st.user.uid || '',
        phone: st.user.phone || '',
        sessionId,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function revokeAllOtherDeviceSessions(currentSessionId: string): Promise<boolean> {
  const st = useAuthStore.getState();
  if (!st.user) return false;

  try {
    const res = await fetch(API_ENDPOINTS.authSessions, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: st.user.uid || '',
        phone: st.user.phone || '',
        revokeAllOthers: true,
        currentSessionId,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function markCurrentSessionLoggedOut(uid?: string, phone?: string): Promise<void> {
  try {
    const sessionId = await AsyncStorage.getItem(STORAGE_SESSION_ID_KEY);
    await AsyncStorage.removeItem(STORAGE_SESSION_ID_KEY);
    if (sessionId && (uid || phone)) {
      await fetch(API_ENDPOINTS.authSessions, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: uid || '',
          phone: phone || '',
          sessionId,
        }),
      }).catch(() => {});
    }
  } catch {}
}
