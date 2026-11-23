/**
 * Port of lib/widgets/app_navigation.dart — floating glass bottom navigation.
 * 68 px high, 32 px radius, blur σ20, surface @ alpha 217, accent border @ alpha 51,
 * active pill accent @ alpha 26 (AnimatedContainer 250 ms easeOutCubic), label 200 ms.
 * Dynamically translated and themed for Light Vedic & Dark Cosmic.
 */
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, View } from 'react-native';
import Animated, { Easing, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '@/components/AppIcon';
import { withAlpha } from '@/theme/colors';
import { ralewayFamily } from '@/theme/fonts';
import { useTranslation } from '@/theme/languageStore';
import { useThemeColors } from '@/theme/themeStore';
import { useCmsStore } from '@/services/cmsStore';

type TabSpec = { route: string; labelKey: string; defaultLabel: string; icon: string; activeIcon: string; testID: string };

export const TAB_SPECS: TabSpec[] = [
  { route: 'home-dashboard-screen', labelKey: 'nav.home', defaultLabel: 'Home', icon: 'home_outlined', activeIcon: 'home_rounded', testID: 'nav.tab.home' },
  { route: 'ai-chat-screen', labelKey: 'nav.aiAstro', defaultLabel: 'AI Astro', icon: 'auto_awesome_outlined', activeIcon: 'auto_awesome', testID: 'nav.tab.aiAstro' },
  { route: 'live-astrologers-screen', labelKey: 'nav.astrologers', defaultLabel: 'Astrologers', icon: 'people_outline', activeIcon: 'people_rounded', testID: 'nav.tab.astrologers' },
  { route: 'services-screen', labelKey: 'nav.services', defaultLabel: 'Services', icon: 'grid_view_outlined', activeIcon: 'grid_view_rounded', testID: 'nav.tab.services' },
  { route: 'profile-screen', labelKey: 'nav.profile', defaultLabel: 'Profile', icon: 'person_outline_rounded', activeIcon: 'person_rounded', testID: 'nav.tab.profile' },
];

function TabItem({
  spec, label, active, onPress, accent, muted,
}: { spec: TabSpec; label: string; active: boolean; onPress: () => void; accent: string; muted: string }) {
  const p = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    p.value = withTiming(active ? 1 : 0, { duration: 250, easing: Easing.out(Easing.cubic) });
  }, [active, p]);

  const pillColor = withAlpha(accent, 26);
  const pill = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], ['rgba(0,0,0,0)', pillColor]),
  }));
  const color = active ? accent : muted;

  return (
    <Pressable
      testID={spec.testID}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{ flex: 1 }}
    >
      <Animated.View
        style={[{ flex: 1, marginHorizontal: 4, marginVertical: 8, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }, pill]}
      >
        <AppIcon name={active ? spec.activeIcon : spec.icon} color={color} size={22} />
        <Animated.Text
          allowFontScaling={false}
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{
            marginTop: 3,
            fontSize: 9.5,
            color,
            fontFamily: ralewayFamily(active ? 700 : 400),
            textAlign: 'center',
            paddingHorizontal: 1,
          }}
        >
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

export function AppNavigation({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { accent, surface, textMuted, isLight } = useThemeColors();
  const { t } = useTranslation();
  const cmsNavigation = useCmsStore((s) => s.config.navigation);
  const currentName = state.routes[state.index]?.name;

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (isKeyboardVisible || currentName === 'ai-chat-screen') return null;

  const onTabTap = (spec: TabSpec) => {
    const route = state.routes.find((r) => r.name === spec.route);
    if (!route) return;
    const isActive = currentName === spec.route;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!isActive && !event.defaultPrevented) navigation.navigate(route.name);
  };

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 12 }}
    >
      <View style={{ height: 68, borderRadius: 32, overflow: 'hidden' }}>
        <BlurView
          intensity={38}
          tint={isLight ? 'light' : 'dark'}
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            borderRadius: 32,
            borderWidth: 1,
            borderColor: withAlpha(accent, 25),
            backgroundColor: isLight ? 'rgba(255,255,255,0.10)' : 'rgba(12,15,22,0.14)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: isLight ? 0.08 : 0.18,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          {TAB_SPECS.map((spec) => {
            const live = Array.isArray(cmsNavigation?.tabs)
              ? cmsNavigation.tabs.find((tab: any) => tab.route === spec.route)
              : null;
            const liveSpec = live ? {
              ...spec,
              labelKey: spec.labelKey,
              defaultLabel: live.label || spec.defaultLabel,
              icon: live.icon || spec.icon,
              activeIcon: live.activeIcon || spec.activeIcon,
            } : spec;
            return (
              <TabItem
                key={spec.route}
                spec={liveSpec}
                label={live?.label || t(spec.labelKey, spec.defaultLabel)}
                active={currentName === spec.route}
                onPress={() => onTabTap(liveSpec)}
                accent={accent}
                muted={textMuted}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}
