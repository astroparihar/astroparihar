import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = 'https://astroparihar.com';

export async function fetchDynamicFeed(endpoint: string, cacheKey: string, force = false): Promise<any> {
  const key = `astroparihar_dynamic_${cacheKey}_v1`;
  if (force) {
    try {
      const res = await fetch(`${BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}t=${Date.now()}`, { headers: { Accept: 'application/json' } });
      if (!res.ok) return readCached(key);
      const data = await res.json();
      await AsyncStorage.setItem(key, JSON.stringify(data));
      return data;
    } catch { return readCached(key); }
  }

  try {
    const res = await fetch(`${BASE}${endpoint}`, { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      await AsyncStorage.setItem(key, JSON.stringify(data));
      return data;
    }
  } catch {}
  return readCached(key);
}

async function readCached(key: string): Promise<any> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function hydrateDynamicFeed(endpoint: string, cacheKey: string): Promise<any> {
  const key = `astroparihar_dynamic_${cacheKey}_v1`;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export async function postDynamic(endpoint: string, body: any): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    const res = await fetch(`${BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    let data: any = null;
    try { data = await res.json(); } catch {}
    return { ok: res.ok, status: res.status, data };
  } catch (e: any) { return { ok: false, status: 0, data: { message: e?.message || 'Network error' } }; }
}

export { BASE as ASTROPARIHAR_BASE };
