/**
 * Port of lib/presentation/profile_screens/privacy_security_screens.dart (PrivacyScreen + SecurityScreen).
 * Dynamic theme support for Light Vedic & Dark Cosmic.
 */
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBar } from '@/components/AppBar';
import { AppIcon } from '@/components/AppIcon';
import { ProgressRing } from '@/components/common';
import { showSnackBar } from '@/components/overlays';
import { Text } from '@/components/Text';
import { IconBadge, ListTile, SettingsCard, SwitchTile, TileDivider } from '@/components/tiles';
import { AppRoutes, go, pop, push } from '@/navigation/routes';
import { useAuthStore } from '@/features/auth/authStore';
import { requestPermanentAccountDeletion } from '@/services/accountDeletionService';
import { fetchSessions, revokeSession, heartbeatSession, getOrCreateSessionId } from '@/services/sessionService';
import { withAlpha } from '@/theme/colors';
import { useTranslation } from '@/theme/languageStore';
import { useThemeColors } from '@/theme/themeStore';

const H = ({ children }: { children: string }) => {
  const colors = useThemeColors();
  return <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 12 }}>{children}</Text>;
};

export function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Record<string, boolean>>({
    'Profile Visibility': true,
    'Show Online Status': true,
    'Allow Astrologers to View Birth Chart': true,
    'Personalised Recommendations': true,
    'Analytics & Improvement': false,
    'Marketing Communications': false,
  });
  const keys = Object.keys(settings);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} testID="privacy.screen">
      <AppBar
        title={t('profile.privacy', 'Privacy')}
        onBack={pop}
        testIDPrefix="privacy"
        backgroundColor={colors.background}
        backColor={colors.textPrimary}
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: Math.max(150, insets.bottom + 90), gap: 20 }}>
        <LinearGradient
          colors={[withAlpha('#2D9E6B', colors.isLight ? 20 : 30), colors.surface]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{
            padding: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: withAlpha('#2D9E6B', 80),
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 28 }}>🔒</Text>
          <View style={{ marginLeft: 14, flex: 1 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700' }}>Your Privacy Matters</Text>
            <Text style={{ marginTop: 3, color: colors.textMuted, fontSize: 11, lineHeight: 16 }}>
              AstroParihar keeps your birth coordinates and consultations completely encrypted and private.
            </Text>
          </View>
        </LinearGradient>

        <View>
          <H>Privacy Controls</H>
          <SettingsCard>
            {keys.map((k, i) => (
              <View key={k}>
                <SwitchTile
                  testID={`privacy.toggle.${i}`}
                  title={k}
                  value={settings[k]}
                  onChange={(v) => {
                    setSettings((s) => ({ ...s, [k]: v }));
                    showSnackBar(`${k} ${v ? 'enabled' : 'disabled'}`, colors.surfaceVariant);
                  }}
                />
                {i < keys.length - 1 ? <TileDivider indent={16} endIndent={16} /> : null}
              </View>
            ))}
          </SettingsCard>
        </View>

        <View>
          <H>Your Data</H>
          <SettingsCard>
            <ListTile
              testID="privacy.downloadData"
              leading={<IconBadge icon="download_outlined" color={colors.goldAccent} />}
              title="Download My Astrological Data"
              titleColor={colors.goldAccent}
              titleWeight="600"
              subtitle="Get an encrypted copy of all saved charts and reports"
              trailing="chevron"
              onPress={() => showSnackBar('Preparing your data archive... Link will be sent via email.', colors.surfaceVariant)}
            />
            <TileDivider />
            <ListTile
              testID="privacy.deleteAccount"
              leading={<IconBadge icon="delete_outline_rounded" color="#CF4444" />}
              title="Delete My Account"
              titleColor="#CF4444"
              titleWeight="600"
              subtitle="Permanently remove your account and all data"
              trailing="chevron"
              onPress={() => {
                Alert.alert(
                  'Delete Account Permanently?',
                  'Are you sure you want to permanently delete your AstroParihar account?\n\nAll your Janam Kundli charts, consultations, wallet balance, and birth profiles will be erased forever.\n\nOnce deleted, this phone number cannot be reused to log in.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete Account',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await requestPermanentAccountDeletion();
                          Alert.alert(
                            'Account Deleted',
                            'Your account has been deleted. You can no longer log in with this phone number.'
                          );
                          showSnackBar('Account deleted permanently', '#CF4444');
                          go(AppRoutes.initial);
                        } catch (err: any) {
                          showSnackBar('Error deleting account: ' + err?.message, '#CF4444');
                        }
                      },
                    },
                  ],
                  { cancelable: true }
                );
              }}
            />
          </SettingsCard>
        </View>

        <SettingsCard>
          <ListTile
            testID="privacy.policyLink"
            leading={<AppIcon name="policy_outlined" color={colors.goldAccent} size={20} />}
            title="Privacy Policy"
            trailing="chevron"
            onPress={() => push(AppRoutes.privacyPolicyScreen)}
          />
          <TileDivider />
          <ListTile
            testID="privacy.termsLink"
            leading={<AppIcon name="gavel_outlined" color={colors.goldAccent} size={20} />}
            title="Terms of Service"
            trailing="chevron"
            onPress={() => push(AppRoutes.termsScreen)}
          />
        </SettingsCard>
      </ScrollView>
    </View>
  );
}

export function SecurityScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [sessions, setSessions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');

  const loadSessions = async (force = false) => {
    if (!isAuthenticated || !user?.uid && !user?.phone) return;
    if (force) setRefreshing(true);
    const id = await getOrCreateSessionId();
    setCurrentSessionId(id);
    const result = await fetchSessions(user?.uid || '', user?.phone || '');
    if (result.revoked) {
      await useAuthStore.getState().logout();
      Alert.alert('Signed Out', 'This session was signed out from another device.');
      go(AppRoutes.signInScreen);
      return;
    }
    if (result.ok) {
      const list = Array.isArray(result.data?.sessions) ? result.data.sessions : Array.isArray(result.data) ? result.data : [];
      const normalized = list.map((s: any) => ({
        ...s,
        sessionId: String(s.sessionId || s.id || ''),
        deviceName: s.deviceName || s.name || 'iPhone',
        osLabel: s.osLabel || 'iOS',
        appVersion: s.appVersion || '1.0.0',
        current: s.current === true || String(s.sessionId || s.id || '') === id,
      }));
      normalized.sort((a: any, b: any) => Number(b.current) - Number(a.current));
      setSessions(normalized);
    }
    setRefreshing(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      heartbeatSession(user?.uid || '', user?.phone || '').then((r) => {
        if (r.revoked) {
          useAuthStore.getState().logout();
          Alert.alert('Signed Out', 'This session was signed out from another device.');
          go(AppRoutes.signInScreen);
        }
      });
      loadSessions();
    }
  }, [isAuthenticated, user?.uid, user?.phone]);

  const revokeOne = (targetId: string) => {
    Alert.alert('Revoke Session', 'Sign out this device?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke', style: 'destructive', onPress: async () => {
        const r = await revokeSession(user?.uid || '', user?.phone || '', targetId);
        if (!r.ok) { showSnackBar('Could not revoke this session', '#CF4444'); return; }
        setSessions((prev) => prev.filter((s) => s.sessionId !== targetId));
      } },
    ]);
  };

  const revokeOthers = () => {
    Alert.alert('Sign Out Other Devices', `Sign out ${sessions.filter((s) => !s.current).length} other device(s)?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        const r = await revokeSession(user?.uid || '', user?.phone || '', undefined, true, currentSessionId);
        if (!r.ok) { showSnackBar('Could not sign out other devices', '#CF4444'); return; }
        setSessions((prev) => prev.filter((s) => s.current));
      } },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} testID="security.screen">
      <AppBar title={t('profile.security', 'Security')} onBack={pop} testIDPrefix="security" backgroundColor={colors.background} backColor={colors.textPrimary} />
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSessions(true)} tintColor={colors.goldAccent} />} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: Math.max(150, insets.bottom + 90), gap: 20 }}>
        {!isAuthenticated ? (
          <SettingsCard>
            <View style={{ padding: 20, alignItems: 'center' }}>
              <IconBadge icon="security_outlined" color={colors.goldAccent} size={34} />
              <Text style={{ marginTop: 12, color: colors.textPrimary, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>Sign In to Manage Account Security</Text>
              <Pressable testID="security.signIn" onPress={() => push(AppRoutes.signInScreen)} style={{ marginTop: 16, borderRadius: 100, backgroundColor: colors.goldAccent, paddingHorizontal: 20, paddingVertical: 10 }}>
                <Text style={{ color: '#0A0E1A', fontSize: 13, fontWeight: '800' }}>Sign In / Register</Text>
              </Pressable>
            </View>
          </SettingsCard>
        ) : (
          <> 
            <LinearGradient colors={colors.isLight ? ['#F0FFF7', '#F2E9DE'] : [withAlpha('#2D9E6B', 25), colors.surfaceVariant]} style={{ padding: 18, borderRadius: 20, borderWidth: 1, borderColor: withAlpha('#2D9E6B', 70), flexDirection: 'row', alignItems: 'center' }}>
              <IconBadge icon="verified_user_outlined" color="#2D9E6B" size={30} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '800' }}>OTP-Protected Account</Text>
                <Text style={{ marginTop: 4, color: colors.textMuted, fontSize: 12 }}>Verified mobile: {user?.phone || '—'}</Text>
              </View>
            </LinearGradient>

            <View>
              <H>Account Credentials</H>
              <SettingsCard>
                <ListTile testID="security.changePhone" leading={<IconBadge icon="phone_outlined" color="#4FC3F7" />} title="Change Mobile Number" subtitle={`Linked: ${user?.phone || '—'}`} trailing="chevron" onPress={() => Alert.alert('Change Mobile Number', 'Switching numbers signs out this session and requires OTP verification on the new number.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Continue', style: 'destructive', onPress: async () => { await useAuthStore.getState().logout(); go(AppRoutes.signInScreen); } }])} />
              </SettingsCard>
            </View>

            <View>
              <H>Active Sessions</H>
              <SettingsCard>
                {sessions.map((s, i) => (
                  <View key={s.sessionId || i}>
                    {i > 0 ? <TileDivider /> : null}
                    <ListTile leading={<IconBadge icon={s.platform === 'ios' ? 'phone_iphone' : 'devices_outlined'} color={s.current ? '#2D9E6B' : colors.goldAccent} />} titleNode={<View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '700' }}>{s.deviceName}</Text>{s.current ? <View style={{ marginLeft: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: withAlpha('#2D9E6B', 25) }}><Text style={{ color: '#2D9E6B', fontSize: 10, fontWeight: '700' }}>Current</Text></View> : null}</View>} subtitle={`${s.osLabel} • v${s.appVersion} • ${s.current ? 'Active now' : s.lastActiveAt ? `Active ${s.lastActiveAt}` : 'Active recently'}`} trailing={!s.current ? (<Pressable testID={`security.revoke.${i}`} onPress={() => revokeOne(s.sessionId)}><Text style={{ color: '#CF4444', fontSize: 12, fontWeight: '700' }}>Revoke</Text></Pressable>) : null} />
                  </View>
                ))}
              </SettingsCard>
              {sessions.filter((s) => !s.current).length > 0 ? (
                <Pressable testID="security.revokeOthers" onPress={revokeOthers} style={{ marginTop: 12, borderRadius: 100, borderWidth: 1, borderColor: '#CF4444', alignItems: 'center', paddingVertical: 12 }}><Text style={{ color: '#CF4444', fontSize: 13, fontWeight: '800' }}>Sign Out All Other Devices ({sessions.filter((s) => !s.current).length})</Text></Pressable>
              ) : sessions.length === 1 ? (
                <Text style={{ marginTop: 10, color: colors.textMuted, fontSize: 11, textAlign: 'center' }}>Only this device is currently signed in to your account.</Text>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
