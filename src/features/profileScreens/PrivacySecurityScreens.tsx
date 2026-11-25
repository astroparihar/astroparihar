/**
 * Privacy & Security Screens — 100% Dynamic Content with offline cache,
 * live Admin Panel sync, pull-to-refresh, and persistent toggle preferences.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBar } from '@/components/AppBar';
import { AppIcon } from '@/components/AppIcon';
import { ElevatedButton } from '@/components/common';
import { showSnackBar } from '@/components/overlays';
import { Text } from '@/components/Text';
import { IconBadge, ListTile, SettingsCard, SwitchTile, TileDivider } from '@/components/tiles';
import { useAuthStore } from '@/features/auth/authStore';
import { AppRoutes, go, pop, push } from '@/navigation/routes';
import { requestPermanentAccountDeletion } from '@/services/accountDeletionService';
import {
  ActiveDeviceSession,
  fetchActiveSessions,
  revokeAllOtherDeviceSessions,
  revokeDeviceSession,
} from '@/services/sessionService';
import { useSupportLegalStore } from '@/services/supportLegalStore';
import { withAlpha } from '@/theme/colors';
import { useTranslation } from '@/theme/languageStore';
import { useThemeColors } from '@/theme/themeStore';

const STORAGE_PRIVACY_PREFS = 'astroparihar_user_privacy_toggles_v1';

const H = ({ children }: { children: string }) => {
  const colors = useThemeColors();
  return <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 12 }}>{children}</Text>;
};

export function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { t } = useTranslation();

  const privacy = useSupportLegalStore((s) => s.content.privacyScreen);
  const fetchContent = useSupportLegalStore((s) => s.fetchContent);
  const [refreshing, setRefreshing] = useState(false);

  const [settings, setSettings] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    (privacy.controls || []).forEach((c) => {
      init[c.key] = c.defaultValue;
    });
    return init;
  });

  useEffect(() => {
    fetchContent();
    AsyncStorage.getItem(STORAGE_PRIVACY_PREFS)
      .then((raw) => {
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved && typeof saved === 'object') {
            setSettings((prev) => ({ ...prev, ...saved }));
          }
        }
      })
      .catch(() => {});
  }, [fetchContent]);

  useEffect(() => {
    if (privacy.controls && privacy.controls.length > 0) {
      setSettings((prev) => {
        const next: Record<string, boolean> = {};
        privacy.controls.forEach((c) => {
          next[c.key] = prev[c.key] !== undefined ? prev[c.key] : c.defaultValue;
        });
        return next;
      });
    }
  }, [privacy.controls]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchContent();
    setRefreshing(false);
  };

  const handleToggle = (k: string, v: boolean) => {
    setSettings((s) => {
      const next = { ...s, [k]: v };
      AsyncStorage.setItem(STORAGE_PRIVACY_PREFS, JSON.stringify(next)).catch(() => {});
      return next;
    });
    showSnackBar(`${k} ${v ? 'enabled' : 'disabled'}`, colors.surfaceVariant);
  };

  const keys = Object.keys(settings);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} testID="privacy.screen">
      <AppBar
        title={privacy.appBarTitle || t('profile.privacy', 'Privacy')}
        onBack={pop}
        testIDPrefix="privacy"
        backgroundColor={colors.background}
        backColor={colors.textPrimary}
      />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.goldAccent} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: Math.max(150, insets.bottom + 90), gap: 20 }}
      >
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
          <Text style={{ fontSize: 28 }}>{privacy.bannerEmoji || '🔒'}</Text>
          <View style={{ marginLeft: 14, flex: 1 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700' }}>
              {privacy.bannerTitle || 'Your Privacy Matters'}
            </Text>
            <Text style={{ marginTop: 3, color: colors.textMuted, fontSize: 11, lineHeight: 16 }}>
              {privacy.bannerSubtitle || 'AstroParihar keeps your birth coordinates and consultations completely encrypted and private.'}
            </Text>
          </View>
        </LinearGradient>

        <View>
          <H>{privacy.controlsSectionTitle || 'Privacy Controls'}</H>
          <SettingsCard>
            {keys.map((k, i) => (
              <View key={k}>
                <SwitchTile
                  testID={`privacy.toggle.${i}`}
                  title={k}
                  value={settings[k]}
                  onChange={(v) => handleToggle(k, v)}
                />
                {i < keys.length - 1 ? <TileDivider indent={16} endIndent={16} /> : null}
              </View>
            ))}
          </SettingsCard>
        </View>

        <View>
          <H>{privacy.dataSectionTitle || 'Your Data'}</H>
          <SettingsCard>
            <ListTile
              testID="privacy.downloadData"
              leading={<IconBadge icon="download_outlined" color={colors.goldAccent} />}
              title={privacy.downloadDataTitle || 'Download My Astrological Data'}
              titleColor={colors.goldAccent}
              titleWeight="600"
              subtitle={privacy.downloadDataSubtitle || 'Get an encrypted copy of all saved charts and reports'}
              trailing="chevron"
              onPress={() =>
                showSnackBar(
                  privacy.downloadDataMessage || 'Preparing your data archive... Link will be sent via email.',
                  colors.surfaceVariant
                )
              }
            />
            <TileDivider />
            <ListTile
              testID="privacy.deleteAccount"
              leading={<IconBadge icon="delete_outline_rounded" color="#CF4444" />}
              title={privacy.deleteAccountTitle || 'Delete My Account'}
              titleColor="#CF4444"
              titleWeight="600"
              subtitle={privacy.deleteAccountSubtitle || 'Permanently remove your account and all data'}
              trailing="chevron"
              onPress={() => {
                Alert.alert(
                  privacy.deleteAccountConfirmTitle || 'Delete Account Permanently?',
                  privacy.deleteAccountConfirmMessage ||
                    'Are you sure you want to permanently delete your AstroParihar account?\n\nAll your Janam Kundli charts, consultations, wallet balance, and birth profiles will be erased forever.\n\nOnce deleted, this phone number cannot be reused to log in.',
                  [
                    { text: privacy.cancelButtonText || 'Cancel', style: 'cancel' },
                    {
                      text: privacy.confirmDeleteButtonText || 'Delete Account',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await requestPermanentAccountDeletion();
                          Alert.alert(
                            privacy.deleteAccountSuccessTitle || 'Account Deleted',
                            privacy.deleteAccountSuccessMessage ||
                              'Your account has been deleted. You can no longer log in with this phone number.'
                          );
                          showSnackBar(privacy.deleteAccountSuccessTitle || 'Account deleted permanently', '#CF4444');
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
            title={privacy.privacyPolicyLinkTitle || 'Privacy Policy'}
            trailing="chevron"
            onPress={() => push(AppRoutes.privacyPolicyScreen)}
          />
          <TileDivider />
          <ListTile
            testID="privacy.termsLink"
            leading={<AppIcon name="gavel_outlined" color={colors.goldAccent} size={20} />}
            title={privacy.termsLinkTitle || 'Terms of Service'}
            trailing="chevron"
            onPress={() => push(AppRoutes.termsScreen)}
          />
        </SettingsCard>
      </ScrollView>
    </View>
  );
}

function formatSessionLastActive(session: ActiveDeviceSession): string {
  if (session.isCurrent) return 'Active now';
  const ts = session.lastActiveAtMs || Date.parse(session.lastActiveAt || '');
  if (!ts || Number.isNaN(ts)) return 'Active recently';
  const diffMs = Math.max(0, Date.now() - ts);
  if (diffMs < 60_000) return 'Active just now';
  if (diffMs < 3_600_000) return `Active ${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86_400_000) return `Active ${Math.floor(diffMs / 3_600_000)}h ago`;
  return `Active ${Math.floor(diffMs / 86_400_000)}d ago`;
}

function getSessionDeviceIcon(platform: string): string {
  if (platform === 'web') return 'laptop_mac';
  if (platform === 'ios') return 'phone_iphone';
  return 'phone_android';
}

export function SecurityScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { t } = useTranslation();

  const sec = useSupportLegalStore((s) => s.content.securityScreen);
  const fetchContent = useSupportLegalStore((s) => s.fetchContent);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [refreshing, setRefreshing] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessions, setSessions] = useState<ActiveDeviceSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState('');
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!isAuthenticated) {
      setSessions([]);
      setCurrentSessionId('');
      return;
    }
    setLoadingSessions(true);
    try {
      const result = await fetchActiveSessions();
      if (result.currentSessionRevoked) {
        showSnackBar('This session was signed out from another device.', '#CF4444');
        go(AppRoutes.signInScreen);
        return;
      }
      setSessions(result.sessions);
      setCurrentSessionId(result.currentSessionId);
    } finally {
      setLoadingSessions(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchContent(), loadSessions()]);
    setRefreshing(false);
  };

  const handleChangeMobileNumber = () => {
    Alert.alert(
      'Change Mobile Number?',
      'To switch to a different mobile number, you will be signed out of this session and asked to verify your new number via OTP.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify New Number',
          onPress: async () => {
            await logout();
            go(AppRoutes.signInScreen);
          },
        },
      ]
    );
  };

  const handleRevokeSession = (session: ActiveDeviceSession) => {
    Alert.alert(
      'Revoke Device Session?',
      `Sign out "${session.deviceName}" from your AstroParihar account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: sec.revokeButtonText || 'Revoke',
          style: 'destructive',
          onPress: async () => {
            setRevokingId(session.sessionId);
            const ok = await revokeDeviceSession(session.sessionId);
            setRevokingId(null);
            if (ok) {
              setSessions((prev) => prev.filter((item) => item.sessionId !== session.sessionId));
              showSnackBar(`Signed out ${session.deviceName}`, '#2D9E6B');
            } else {
              showSnackBar('Could not revoke session. Please try again.', '#CF4444');
            }
          },
        },
      ]
    );
  };

  const handleRevokeAllOtherSessions = () => {
    const otherCount = sessions.filter((s) => !s.isCurrent).length;
    if (otherCount === 0 || !currentSessionId) return;

    Alert.alert(
      'Sign Out Other Devices?',
      `This will immediately revoke ${otherCount} other active ${otherCount === 1 ? 'session' : 'sessions'} while keeping this device signed in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out Others',
          style: 'destructive',
          onPress: async () => {
            setRevokingAll(true);
            const ok = await revokeAllOtherDeviceSessions(currentSessionId);
            setRevokingAll(false);
            if (ok) {
              setSessions((prev) => prev.filter((item) => item.isCurrent));
              showSnackBar('Signed out all other devices', '#2D9E6B');
            } else {
              showSnackBar('Could not revoke other sessions. Please try again.', '#CF4444');
            }
          },
        },
      ]
    );
  };

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} testID="security.screen">
      <AppBar
        title={sec.appBarTitle || t('profile.security', 'Security')}
        onBack={pop}
        testIDPrefix="security"
        backgroundColor={colors.background}
        backColor={colors.textPrimary}
      />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.goldAccent} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: Math.max(150, insets.bottom + 90), gap: 20 }}
      >
        {!isAuthenticated ? (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              padding: 24,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: withAlpha(colors.goldAccent, 24),
                borderWidth: 1,
                borderColor: withAlpha(colors.goldAccent, 60),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppIcon name="verified_user" color={colors.goldAccent} size={30} />
            </View>
            <Text style={{ marginTop: 16, color: colors.textPrimary, fontSize: 17, fontWeight: '700', textAlign: 'center' }}>
              Sign In to Manage Account Security
            </Text>
            <Text style={{ marginTop: 8, color: colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center' }}>
              Sign in with your mobile number via OTP to manage your verified mobile credential and active device sessions.
            </Text>
            <ElevatedButton
              label="Sign In / Register"
              onPress={() => go(AppRoutes.signInScreen)}
              bg={colors.goldAccent}
              fg="#FFFFFF"
              style={{ marginTop: 20, width: '100%' }}
              paddingV={13}
              fontSize={14}
            />
          </View>
        ) : (
          <>
            <LinearGradient
              colors={[withAlpha('#2D9E6B', colors.isLight ? 22 : 32), colors.surface]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{
                padding: 18,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: withAlpha('#2D9E6B', 80),
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: withAlpha('#2D9E6B', 28),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppIcon name="verified_user" color="#2D9E6B" size={24} />
              </View>
              <View style={{ marginLeft: 14, flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '700' }}>
                  OTP-Protected Account
                </Text>
                <Text style={{ marginTop: 3, color: colors.textMuted, fontSize: 12, lineHeight: 17 }}>
                  {authUser?.phone
                    ? `Verified mobile: ${authUser.phone}`
                    : 'Your account uses passwordless mobile OTP verification.'}
                </Text>
              </View>
            </LinearGradient>

            <View>
              <H>{sec.credentialsSectionTitle || 'Account Credentials'}</H>
              <SettingsCard>
                <ListTile
                  testID="security.changePhone"
                  leading={<IconBadge icon="phone_outlined" color="#4FC3F7" />}
                  title={sec.changePhoneTitle || 'Change Mobile Number'}
                  subtitle={
                    authUser?.phone
                      ? `Linked: ${authUser.phone}`
                      : sec.changePhoneSubtitle || 'Update linked OTP number'
                  }
                  trailing="chevron"
                  onPress={handleChangeMobileNumber}
                />
              </SettingsCard>
            </View>

            <View>
              <H>{sec.sessionSectionTitle || 'Active Sessions'}</H>
              <SettingsCard>
                {loadingSessions && sessions.length === 0 ? (
                  <View style={{ padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <ActivityIndicator size="small" color={colors.goldAccent} />
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>Loading active sessions...</Text>
                  </View>
                ) : (
                  sessions.map((session, i) => {
                    const isRevokingThis = revokingId === session.sessionId;
                    const versionPart = session.appVersion ? ` • v${session.appVersion}` : '';
                    const subtitleText = `${session.osLabel}${versionPart} • ${formatSessionLastActive(session)}`;

                    return (
                      <View key={session.sessionId}>
                        {i > 0 ? <TileDivider /> : null}
                        <ListTile
                          leading={
                            <IconBadge
                              icon={getSessionDeviceIcon(session.platform)}
                              color={session.isCurrent ? '#2D9E6B' : colors.goldAccent}
                            />
                          }
                          titleNode={
                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                              <Text
                                style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '600', flexShrink: 1 }}
                                numberOfLines={1}
                              >
                                {session.deviceName}
                              </Text>
                              {session.isCurrent ? (
                                <View
                                  style={{
                                    paddingHorizontal: 7,
                                    paddingVertical: 2,
                                    borderRadius: 6,
                                    backgroundColor: withAlpha('#2D9E6B', 25),
                                    flexShrink: 0,
                                  }}
                                >
                                  <Text style={{ color: '#2D9E6B', fontSize: 10, fontWeight: '700' }}>
                                    {sec.currentBadgeText || 'Current'}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          }
                          subtitle={subtitleText}
                          trailing={
                            session.isCurrent ? null : (
                              <Pressable
                                testID={`security.revoke.${i}`}
                                disabled={isRevokingThis || revokingAll}
                                onPress={() => handleRevokeSession(session)}
                                style={{ paddingHorizontal: 8, paddingVertical: 6 }}
                              >
                                {isRevokingThis ? (
                                  <ActivityIndicator size="small" color="#CF4444" />
                                ) : (
                                  <Text style={{ color: '#CF4444', fontSize: 12, fontWeight: '700' }}>
                                    {sec.revokeButtonText || 'Revoke'}
                                  </Text>
                                )}
                              </Pressable>
                            )
                          }
                        />
                      </View>
                    );
                  })
                )}
              </SettingsCard>

              {!loadingSessions && otherSessionsCount === 0 && sessions.length > 0 ? (
                <Text style={{ marginTop: 10, color: colors.textMuted, fontSize: 12, paddingHorizontal: 4 }}>
                  Only this device is currently signed in to your account.
                </Text>
              ) : null}

              {otherSessionsCount > 0 ? (
                <Pressable
                  testID="security.revokeAllOthers"
                  disabled={revokingAll}
                  onPress={handleRevokeAllOtherSessions}
                  style={{
                    marginTop: 12,
                    paddingVertical: 13,
                    paddingHorizontal: 16,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: withAlpha('#CF4444', 90),
                    backgroundColor: withAlpha('#CF4444', colors.isLight ? 14 : 22),
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 8,
                  }}
                >
                  {revokingAll ? (
                    <ActivityIndicator size="small" color="#CF4444" />
                  ) : (
                    <>
                      <AppIcon name="logout_rounded" color="#CF4444" size={16} />
                      <Text style={{ color: '#CF4444', fontSize: 13, fontWeight: '700' }}>
                        Sign Out All Other Devices ({otherSessionsCount})
                      </Text>
                    </>
                  )}
                </Pressable>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
