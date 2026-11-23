/**
 * Root layout — port of lib/main.dart + top-level GoRouter routes.
 *  - portrait lock (SystemChrome.setPreferredOrientations)
 *  - theme/accent rehydration (ThemeProvider._loadPreferences)
 *  - global error boundary (ErrorWidget.builder → CustomErrorWidget)
 *  - text scaling disabled inside <Text/> (TextScaler.linear(1.0))
 *  - route transitions: splash fade 280 ms; onboarding/birth-profile fade 320 ms; push routes slide 300 ms
 */
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { AppState, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppErrorBoundary } from '@/components/ErrorBoundary';
import { OverlayHost, SnackbarHost } from '@/components/overlays';
import { PickerHost } from '@/components/pickers';
import { fontAssets } from '@/theme/fonts';
import { useLanguageStore } from '@/theme/languageStore';
import { useThemeColors, useThemeStore } from '@/theme/themeStore';
import { useCmsStore } from '@/services/cmsStore';
import { useAuthStore } from '@/features/auth/authStore';
import { heartbeatSession } from '@/services/sessionService';
import { clearNotificationState, configureNotificationPresentation, fetchNotifications, registerPushTokenIfAuthenticated } from '@/services/notificationService';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

SplashScreen.preventAutoHideAsync().catch(() => {});

const PUSH = { animation: 'slide_from_right' as const, animationDuration: 300 };
const PUSH_ROUTES = [
  'my-kundli-screen', 'match-kundli-screen', 'panchang-screen', 'remedies-screen', 'remedy-detail-screen',
  'horoscope-screen', 'astrologer-detail-screen', 'birth-profiles-screen', 'kundli-reports-screen',
  'match-reports-screen', 'consultation-history-screen', 'wallet-screen',
  'language-screen', 'theme-screen', 'privacy-screen',
  'security-screen', 'help-centre-screen', 'contact-support-screen', 'terms-screen', 'privacy-policy-screen',
  'consultation-screen', 'career-astrology-screen', 'marriage-astrology-screen', 'business-astrology-screen',
  'finance-astrology-screen', 'tarot-screen', 'numerology-screen', 'muhurat-screen', 'spiritual-guidance-screen',
  'astrology-reports-screen', 'astrologer-login-screen', 'astrologer-apply-screen', 'astrologer-dashboard-screen',
];

export default function RootLayout() {
  const [fontsLoaded] = useFonts(fontAssets);
  const hydrated = useThemeStore((s) => s.hydrated);
  const loadTheme = useThemeStore((s) => s.load);
  const loadLanguage = useLanguageStore((s) => s.load);
  const colors = useThemeColors();

  useEffect(() => {
    loadTheme();
    loadLanguage();
    if (Platform.OS !== 'web') {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    }
  }, [loadTheme, loadLanguage]);

  useEffect(() => {
    if (fontsLoaded && hydrated) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, hydrated]);

  useEffect(() => {
    const cms = useCmsStore.getState();
    cms.hydrate().then(() => cms.refresh());

    const syncAuthServices = async () => {
      try {
        const auth = useAuthStore.getState();
        await auth.load();
        configureNotificationPresentation();
        if (auth.isAuthenticated && auth.user) {
          await heartbeatSession(auth.user.uid, auth.user.phone);
          await registerPushTokenIfAuthenticated();
        } else {
          await clearNotificationState();
        }
        await fetchNotifications(false);
      } catch {}
    };
    syncAuthServices();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        useCmsStore.getState().refresh();
        syncAuthServices();
      }
    });
    return () => {
      subscription.remove();
      const foregroundNotification = Notifications.addNotificationReceivedListener(() => {});
      const notificationResponse = Notifications.addNotificationResponseReceivedListener(async (response) => {
        const auth = useAuthStore.getState();
        if (!auth.isAuthenticated || (!auth.user?.uid && !auth.user?.phone)) {
          router.replace('/sign-in-screen');
          return;
        }
        const route = response.notification.request.content.data?.route;
        if (typeof route === 'string' && route.startsWith('/')) router.push(route as any);
      });
      foregroundNotification.remove();
      notificationResponse.remove();
    };
  }, []);

  if (!fontsLoaded || !hydrated) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <StatusBar style={colors.isLight ? 'dark' : 'light'} />
        <AppErrorBoundary>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, ...PUSH }}>
            <Stack.Screen name="index" options={{ animation: 'fade', animationDuration: 280, contentStyle: { backgroundColor: colors.background } }} />
            <Stack.Screen name="splash-screen" options={{ animation: 'fade', animationDuration: 280, contentStyle: { backgroundColor: colors.background } }} />
            <Stack.Screen name="sign-in-screen" options={{ animation: 'fade', animationDuration: 280, contentStyle: { backgroundColor: colors.background } }} />
            <Stack.Screen name="onboarding-screen" options={{ animation: 'fade', animationDuration: 320, contentStyle: { backgroundColor: colors.background } }} />
            <Stack.Screen name="birth-profile-setup-screen" options={{ animation: 'fade', animationDuration: 320, contentStyle: { backgroundColor: colors.background } }} />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade', contentStyle: { backgroundColor: colors.background } }} />
            {PUSH_ROUTES.map((r) => (
              <Stack.Screen key={r} name={r} options={PUSH} />
            ))}
          </Stack>
        </AppErrorBoundary>
        <OverlayHost />
        <PickerHost />
        <SnackbarHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
