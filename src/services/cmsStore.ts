import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export const CMS_STORAGE_KEY = 'astroparihar_all_screens_cms_v1';
export const CMS_ENDPOINT = 'https://astroparihar.com/api/app-dynamic/screens-config';

export type AppScreensCmsConfig = Record<string, any>;

export const DEFAULT_APP_SCREENS_CMS: AppScreensCmsConfig = {
  navigation: { tabs: [
    { route: 'home-dashboard-screen', label: 'Home', icon: 'home_outlined', activeIcon: 'home_rounded' },
    { route: 'ai-chat-screen', label: 'AI Astro', icon: 'auto_awesome_outlined', activeIcon: 'auto_awesome' },
    { route: 'live-astrologers-screen', label: 'Astrologers', icon: 'people_outline', activeIcon: 'people_rounded' },
    { route: 'services-screen', label: 'Services', icon: 'grid_view_outlined', activeIcon: 'grid_view_rounded' },
    { route: 'profile-screen', label: 'Profile', icon: 'person_outline_rounded', activeIcon: 'person_rounded' },
  ] },
  splash: { tagline: 'Divine Guidance. Timeless Wisdom.', duration: 2200 },
  onboarding: { guestButton: 'Continue', signInPrompt: 'Sign In to save your journey' },
  signIn: { countryCodes: ['+91'], guestButton: 'Continue as Guest', astrologerLogin: 'Astrologer Login', astrologerApply: 'Apply as Astrologer' },
  birthProfileSetup: { steps: ['Profile Details', 'Birth Details', 'Review'] },
  home: { greeting: 'Namaste', guestLabel: 'Guest', defaultCity: 'New Delhi', quickActions: {}, sectionHeaders: {}, ctas: {} },
  services: { header: 'Astrology Services', categories: [] },
  liveAstrologers: { filters: ['All', 'Online'], callLabel: 'Call', chatLabel: 'Chat', empty: 'No astrologers available right now' },
  astrologerDetail: { tabs: ['About', 'Reviews'], callLabel: 'Call', chatLabel: 'Chat' },
  horoscope: { tabs: ['Rashi', 'Zodiac'], periods: ['Daily', 'Weekly', 'Monthly'] },
  panchang: { tithi: 'Tithi', nakshatra: 'Nakshatra', yoga: 'Yoga', karana: 'Karana', muhurat: 'Muhurat', rahuKaal: 'Rahu Kaal' },
  myKundli: { chartTabs: ['Rasi', 'Navamsa'], planetLabel: 'Planets', dashaLabel: 'Dasha', doshaLabel: 'Doshas', remedyLabel: 'Remedies' },
  matchKundli: { title: 'Match Kundli', ashtakootaLabel: 'Ashtakoota', gunMilanLabel: 'Gun Milan', compatibilityLabel: 'Compatibility' },
  remedies: { filters: ['All', 'Dosha', 'Health', 'Prosperity'], directions: [] },
  aiChat: { title: 'AI Astro', quickPrompts: [], voiceControls: {}, billingBanner: null },
  consultation: { callLabel: 'Call', chatLabel: 'Chat', endLabel: 'End', muteLabel: 'Mute' },
  birthProfiles: { title: 'Birth Profiles', addLabel: 'Add Profile', editLabel: 'Edit Profile' },
  kundliReports: { title: 'Kundli Reports', guideLabel: 'Mahadasha Guides' },
  matchReports: { title: 'Match Reports' },
  savedAstrologers: { title: 'Saved Astrologers', empty: 'No saved astrologers yet' },
  consultationHistory: { tabs: ['All', 'Completed', 'Upcoming'], topicPrefix: 'Topic', viewReport: 'View Report', consultAI: 'Consult AI', bookAgain: 'Book Again' },
  wallet: { balanceLabel: 'Wallet Balance', rechargeLabel: 'Recharge', historyLabel: 'Transactions' },
  astrologerLogin: { title: 'Astrologer Login', otpLabel: 'Enter OTP' },
  astrologerApply: { title: 'Apply as Astrologer', submitLabel: 'Submit Application' },
  astrologerDashboard: { availabilityLabel: 'Availability', earningsLabel: 'Earnings', sessionsLabel: 'Sessions' },
  cmsMicroLabels: { completed: 'Completed', viewReport: 'View Report', bookAgain: 'Book Again', cancel: 'Cancel', confirm: 'Confirm', signIn: 'Sign In / Register', error: 'Something went wrong' },
};

export function deepMergeCms(base: any, remote: any): any {
  if (Array.isArray(base)) return Array.isArray(remote) ? remote : base;
  if (!base || typeof base !== 'object') return remote === undefined ? base : remote;
  const out: any = { ...base };
  if (!remote || typeof remote !== 'object') return out;
  for (const key of Object.keys(remote)) {
    out[key] = key in out ? deepMergeCms(out[key], remote[key]) : remote[key];
  }
  return out;
}

export function fillCmsTemplate(template: unknown, vars: Record<string, any> = {}): string {
  if (typeof template !== 'string') return String(template ?? '');
  return template.replace(/\{\{?\s*([^{}]+?)\s*\}?\}/g, (_m, key) => {
    const value = vars[String(key).trim()];
    return value === undefined || value === null ? '' : String(value);
  });
}

export function resolveMediaUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (/^(https?:|data:|content:|file:)/i.test(url)) return url;
  if (url.startsWith('//')) return `https:${url}`;
  return `https://astroparihar.com${url.startsWith('/') ? '' : '/'}${url}`;
}

interface CmsState {
  config: AppScreensCmsConfig;
  updatedAt?: string;
  loaded: boolean;
  lastRefresh: number;
  hydrate: () => Promise<void>;
  refresh: (force?: boolean) => Promise<void>;
}

let refreshPromise: Promise<void> | null = null;

export const useCmsStore = create<CmsState>((set, get) => ({
  config: DEFAULT_APP_SCREENS_CMS,
  loaded: false,
  lastRefresh: 0,
  hydrate: async () => {
    try {
      const cached = await AsyncStorage.getItem(CMS_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        set({ config: deepMergeCms(DEFAULT_APP_SCREENS_CMS, parsed.config || parsed), loaded: true, updatedAt: parsed.updatedAt });
      } else set({ loaded: true });
    } catch { set({ loaded: true }); }
  },
  refresh: async (force = false) => {
    const now = Date.now();
    if (!force && now - get().lastRefresh < 15000) return;
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
      try {
        const cacheBuster = force ? `?t=${now}` : '';
        const res = await fetch(`${CMS_ENDPOINT}${cacheBuster}`, { headers: { Accept: 'application/json' } });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.success && data?.config) {
          const merged = deepMergeCms(DEFAULT_APP_SCREENS_CMS, data.config);
          set({ config: merged, updatedAt: data.updatedAt, lastRefresh: now, loaded: true });
          await AsyncStorage.setItem(CMS_STORAGE_KEY, JSON.stringify({ config: merged, updatedAt: data.updatedAt }));
        }
      } catch {}
      finally { refreshPromise = null; }
    })();
    return refreshPromise;
  },
}));
