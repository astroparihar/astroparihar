/**
 * Modal primitives replacing Flutter's showModalBottomSheet, showDialog and ScaffoldMessenger SnackBar.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Keyboard,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text as RNText,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { AppColors } from '@/theme/colors';
import { ralewayFamily } from '@/theme/fonts';
import { useThemeColors } from '@/theme/themeStore';
import { AppIcon } from './AppIcon';
import { Text } from './Text';

const SCREEN_H = Dimensions.get('window').height;

type PortalEntry = { id: number; content: React.ReactNode };

type PortalStore = {
  entries: PortalEntry[];
  register: (entry: PortalEntry) => void;
  unregister: (id: number) => void;
};

const usePortalStore = create<PortalStore>((set) => ({
  entries: [],
  register: (entry) => set((state) => ({ entries: [...state.entries, entry] })),
  unregister: (id) => set((state) => ({ entries: state.entries.filter((entry) => entry.id !== id) })),
}));

export function OverlayHost() {
  const entries = usePortalStore((state) => state.entries);
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {entries.map((entry) => (
        <View key={entry.id} pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          {entry.content}
        </View>
      ))}
    </View>
  );
}

export function PortalOverlay({ visible, onRequestClose, children }: { visible: boolean; onRequestClose?: () => void; children: React.ReactNode }) {
  const uidRef = useRef(Math.random());

  useEffect(() => {
    const id = uidRef.current;
    if (!visible) {
      usePortalStore.getState().unregister(id);
      return;
    }

    usePortalStore.getState().register({
      id,
      content: (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          {children}
        </View>
      ),
    });

    return () => usePortalStore.getState().unregister(id);
  }, [visible, children]);

  useEffect(() => {
    if (!visible || Platform.OS !== 'android' || !onRequestClose) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onRequestClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onRequestClose]);

  return null;
}

/* ------------------------------------------------------------------ BottomSheet */
export function BottomSheet({ visible, onClose, children, style, maxHeightRatio = 0.9, backgroundColor = 'transparent', testID }: {
  visible: boolean; onClose: () => void; children: React.ReactNode; style?: StyleProp<ViewStyle>; maxHeightRatio?: number; backgroundColor?: string; testID?: string;
}) {
  const [mounted, setMounted] = useState(visible);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const { height: windowH } = useWindowDimensions();
  const y = useRef(new Animated.Value(windowH || SCREEN_H)).current;
  const barrier = useRef(new Animated.Value(0)).current;
  const sheetAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const barrierAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      const h = e.endCoordinates.height;
      setKeyboardHeight((prev) => (prev === h ? prev : h));
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight((prev) => (prev === 0 ? prev : 0));
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      sheetAnimRef.current?.stop();
      barrierAnimRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    const h = windowH || SCREEN_H;
    sheetAnimRef.current?.stop();
    barrierAnimRef.current?.stop();

    if (visible) {
      setMounted(true);
      barrierAnimRef.current = Animated.timing(barrier, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
      sheetAnimRef.current = Animated.timing(y, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
      Animated.parallel([barrierAnimRef.current, sheetAnimRef.current]).start();
    } else if (mounted) {
      Keyboard.dismiss();
      barrierAnimRef.current = Animated.timing(barrier, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      });
      sheetAnimRef.current = Animated.timing(y, {
        toValue: h,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      });
      Animated.parallel([barrierAnimRef.current, sheetAnimRef.current]).start(() => {
        setMounted(false);
      });
    }
  }, [visible, windowH, mounted, barrier, y]);

  useEffect(() => {
    if (!visible || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!mounted) return null;

  const currentWindowH = windowH || SCREEN_H;
  const screenH = Dimensions.get('screen').height;
  const topSafe = insets.top > 0 ? insets.top : 24;
  const isAndroidWindowResized = Platform.OS === 'android' && currentWindowH < screenH - 120;
  const androidBottomPad = Platform.OS === 'android' ? (isAndroidWindowResized ? 0 : keyboardHeight) : 0;
  const heightAboveKeyboard = isAndroidWindowResized ? currentWindowH : Math.max(300, currentWindowH - (keyboardHeight > 0 ? keyboardHeight : 0));
  const effectiveRatio = keyboardHeight > 0 ? 0.98 : maxHeightRatio;
  const maxAvailableH = Math.max(300, heightAboveKeyboard - topSafe - 8);
  const availableHeight = Math.min(Math.floor(heightAboveKeyboard * effectiveRatio), maxAvailableH);

  return (
    <PortalOverlay visible={mounted} onRequestClose={onClose}>
      <View pointerEvents={visible ? 'auto' : 'none'} style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: Platform.OS === 'ios' ? keyboardHeight : androidBottomPad }}>
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.54)',
            opacity: barrier,
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={onClose} testID={testID ? `${testID}.barrier` : undefined} />
        </Animated.View>
        <Animated.View
          testID={testID}
          style={[
            {
              width: '100%',
              maxHeight: availableHeight,
              backgroundColor,
              overflow: 'hidden',
              transform: [{ translateY: y }],
            },
            style,
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </PortalOverlay>
  );
}

export function SheetContainer({ children, style, handle = true, radius = 28 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; handle?: boolean; radius?: number }) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderTopLeftRadius: radius,
          borderTopRightRadius: radius,
          borderWidth: 1,
          borderBottomWidth: 0,
          borderColor: colors.cardBorder,
          paddingBottom: insets.bottom,
          flexShrink: 1,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {handle ? (
        <View style={{ alignItems: 'center', paddingTop: 12 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.divider }} />
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Dialog({ visible, onClose, children, barrierDismissible = true, style, testID }: { visible: boolean; onClose: () => void; children: React.ReactNode; barrierDismissible?: boolean; style?: StyleProp<ViewStyle>; testID?: string }) {
  const colors = useThemeColors();
  return (
    <PortalOverlay visible={visible} onRequestClose={barrierDismissible ? onClose : undefined}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={barrierDismissible ? onClose : undefined} />
        <View testID={testID} style={[{ width: '100%', maxWidth: 420, backgroundColor: colors.surface, borderRadius: 24, padding: 24, borderWidth: 1.5, borderColor: colors.cardBorder, elevation: 25, zIndex: 10 }, style]}>
          {children}
        </View>
      </View>
    </PortalOverlay>
  );
}

type SnackState = {
  message: string | null;
  bg?: string;
  key: number;
  show: (m: string, bg?: string) => void;
  hide: () => void;
};

export const useSnackbar = create<SnackState>((set) => ({
  message: null,
  bg: undefined,
  key: 0,
  show: (message, bg) => set((s) => ({ message, bg, key: s.key + 1 })),
  hide: () => set({ message: null }),
}));

export const showSnackBar = (m: string, bg?: string) => useSnackbar.getState().show(m, bg);

export function SnackbarHost() {
  const { message, bg, key, hide } = useSnackbar();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message) return;

    Animated.timing(opacity, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) hide();
      });
    }, 4000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      opacity.stopAnimation();
    };
  }, [key, message, hide, opacity]);

  if (!message) return null;

  const isError = bg === '#CF4444' || bg === '#EF4444' || /error|failed|invalid|declined/i.test(message);
  const isSuccess = bg === '#075E54' || bg === '#2D9E6B' || /success|purchased|verified|added|saved|completed/i.test(message);

  let containerBg = '#0B132B';
  let borderColor = '#C9A84C';
  let iconName = 'auto_awesome';
  let iconColor = '#FFD700';
  let iconBg = 'rgba(201, 168, 76, 0.22)';

  if (isError) {
    containerBg = '#22080B';
    borderColor = '#FF5252';
    iconName = 'error_outline';
    iconColor = '#FF6B6B';
    iconBg = 'rgba(255, 82, 82, 0.22)';
  } else if (isSuccess) {
    containerBg = '#052317';
    borderColor = '#34D399';
    iconName = 'check_circle';
    iconColor = '#4ADE80';
    iconBg = 'rgba(52, 211, 153, 0.22)';
  } else if (bg && bg !== AppColors.surfaceVariantDark) {
    containerBg = bg;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: insets.bottom + 90,
        backgroundColor: containerBg,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: borderColor,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 25,
        zIndex: 999999,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        opacity,
        transform: [
          { translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
          { scale: opacity.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
        ],
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: iconBg,
          borderWidth: 1,
          borderColor: borderColor,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <AppIcon name={iconName} size={18} color={iconColor} />
      </View>
      <RNText allowFontScaling={false} style={{ flex: 1, color: '#FFFFFF', fontSize: 14.5, fontFamily: ralewayFamily(700), fontWeight: '700', letterSpacing: 0.25, lineHeight: 20 }}>
        {message}
      </RNText>
    </Animated.View>
  );
}

export function useSheet<T>() {
  const [state, setState] = useState<{ visible: boolean; value: T | null }>({ visible: false, value: null });
  return {
    visible: state.visible,
    value: state.value,
    open: (value: T) => setState({ visible: true, value }),
    close: () => setState((s) => ({ ...s, visible: false })),
  };
}

export function PopupMenu<T extends string>({
  items, onSelected, icon = 'more_vert_rounded', iconColor, iconSize = 20, testID, menuColor,
}: {
  items: Array<{ value: T; label: string; color?: string }>; onSelected: (v: T) => void; icon?: string; iconColor?: string; iconSize?: number; testID?: string; menuColor?: string;
}) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const ref = React.useRef<View>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const open = () => ref.current?.measureInWindow((x, y, w, h) => setPos({ x: x + w, y: y + h }));
  const screenW = Dimensions.get('window').width;
  const screenH = Dimensions.get('window').height;
  const handleClose = () => setPos(null);

  return (
    <>
      <Pressable ref={ref} testID={testID} onPress={open} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
        <AppIcon name={icon} color={iconColor ?? colors.textMuted} size={iconSize} />
      </Pressable>
      <PortalOverlay visible={!!pos} onRequestClose={handleClose}>
        <Pressable style={{ flex: 1 }} onPress={handleClose}>
          {pos ? (
            <View
              style={{
                position: 'absolute',
                top: Math.min(Math.max(pos.y - 40, insets.top + 12), screenH - 220),
                right: Math.max(8, screenW - pos.x),
                minWidth: 160,
                paddingVertical: 8,
                borderRadius: 14,
                backgroundColor: menuColor ?? colors.surface,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                elevation: 8,
                shadowColor: '#000',
                shadowOpacity: 0.15,
                shadowRadius: 10,
              }}
            >
              {items.map((it) => (
                <Pressable
                  key={it.value}
                  testID={testID ? `${testID}.${it.value}` : undefined}
                  onPress={() => {
                    setPos(null);
                    onSelected(it.value);
                  }}
                  style={{ paddingHorizontal: 16, height: 48, justifyContent: 'center' }}
                >
                  <Text style={{ color: it.color ?? colors.textPrimary, fontSize: 14 }}>{it.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Pressable>
      </PortalOverlay>
    </>
  );
}
