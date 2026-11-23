/**
 * showDatePicker / showTimePicker equivalents (dark theme, gold primary like the Flutter builder override).
 * Android: native dialog via DateTimePickerAndroid. iOS/web: modal hosting the inline picker.
 * Usage: const d = await pickDate({ value, minimumDate, maximumDate });
 */
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Keyboard, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { create } from 'zustand';
import { useThemeColors } from '@/theme/themeStore';
import { Text } from './Text';

type Req = { id: number; mode: 'date' | 'time'; value: Date; min?: Date; max?: Date; resolve: (d: Date | null) => void };
let nextPickerId = 0;
const usePicker = create<{ req: Req | null; set: (r: Req | null) => void }>((set) => ({ req: null, set: (req) => set({ req }) }));

function sanitizeDate(value?: Date | null): Date | null {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  return value;
}

function clampDate(value: Date, min?: Date | null, max?: Date | null): Date {
  const safeValue = value instanceof Date && !Number.isNaN(value.getTime()) ? value : new Date();
  const minimum = sanitizeDate(min) ?? safeValue;
  const maximum = sanitizeDate(max) ?? safeValue;
  const clamped = new Date(Math.min(Math.max(safeValue.getTime(), minimum.getTime()), maximum.getTime()));
  return clamped;
}

function open(mode: 'date' | 'time', value: Date, min?: Date, max?: Date): Promise<Date | null> {
  return new Promise((resolve) => {
    const safeMin = sanitizeDate(min);
    const safeMax = sanitizeDate(max);
    const safeValue = sanitizeDate(value) ?? new Date();
    const clampedValue = clampDate(safeValue, safeMin, safeMax);
    if (Platform.OS === 'android') {
      Keyboard.dismiss();
      DateTimePickerAndroid.open({
        value: clampedValue, mode, minimumDate: safeMin ?? undefined, maximumDate: safeMax ?? undefined, is24Hour: false,
        onChange: (e, d) => resolve(e.type === 'set' && d ? d : null),
      });
      return;
    }

    usePicker.getState().set({ id: ++nextPickerId, mode, value: clampedValue, min: safeMin ?? undefined, max: safeMax ?? undefined, resolve });
  });
}

export const pickDate = (o: { value: Date; minimumDate?: Date; maximumDate?: Date }) => open('date', o.value, o.minimumDate, o.maximumDate);
export const pickTime = (o: { value: Date }) => open('time', o.value);

const TIME_WHEEL_ITEM_HEIGHT = 42;
const TIME_WHEEL_VISIBLE_ROWS = 5;
const TIME_WHEEL_PAD_ROWS = 2;
const TIME_WHEEL_TOP_PAD = TIME_WHEEL_ITEM_HEIGHT * TIME_WHEEL_PAD_ROWS;
const TIME_HOUR_OPTIONS = ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
const TIME_MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

function normalizeWheelTime(date: Date): { hour: string; minute: string; period: 'AM' | 'PM' } {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const normalizedHour = hours % 12 === 0 ? 12 : hours % 12;
  return {
    hour: String(normalizedHour),
    minute: String(minutes).padStart(2, '0'),
    period,
  };
}

function timeFromWheel(hour: string, minute: string, ampmIdx: number) {
  const parsedHour = Number(hour);
  const parsedMinute = Number(minute);
  const hour12 = parsedHour % 12;
  const finalHour = (hour12 + (ampmIdx === 1 ? 12 : 0)) % 24;
  return new Date(2000, 0, 1, finalHour, parsedMinute);
}

function WheelColumn({
  values,
  selected,
  onSelect,
  accentColor,
  textColor,
}: {
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
  accentColor: string;
  textColor: string;
}) {
  const scrollRef = useRef<ScrollView | null>(null);
  const readyRef = useRef(false);
  const tapLockRef = useRef(false);
  const tapLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [wheelHeight, setWheelHeight] = useState(TIME_WHEEL_ITEM_HEIGHT * TIME_WHEEL_VISIBLE_ROWS);

  const releaseTapLock = () => {
    if (tapLockTimerRef.current) clearTimeout(tapLockTimerRef.current);
    tapLockTimerRef.current = setTimeout(() => {
      tapLockRef.current = false;
    }, 220);
  };

  useEffect(() => {
    const index = values.indexOf(selected);
    const y = Math.max(0, index * TIME_WHEEL_ITEM_HEIGHT);
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y, animated: false });
      readyRef.current = true;
    }, 0);

    return () => {
      clearTimeout(timer);
      if (tapLockTimerRef.current) clearTimeout(tapLockTimerRef.current);
    };
  }, [selected, values]);

  const handleScrollEnd = (event: { nativeEvent: { contentOffset: { y: number } } }) => {
    if (!readyRef.current || tapLockRef.current) return;
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.min(Math.max(Math.round(offsetY / TIME_WHEEL_ITEM_HEIGHT), 0), values.length - 1);
    const next = values[index];
    if (next !== selected) onSelect(next);
  };

  const handleTap = (value: string) => {
    if (value === selected) return;
    tapLockRef.current = true;
    releaseTapLock();
    const index = values.indexOf(value);
    const y = Math.max(0, index * TIME_WHEEL_ITEM_HEIGHT);
    scrollRef.current?.scrollTo({ y, animated: true });
    onSelect(value);
  };

  const topPad = TIME_WHEEL_TOP_PAD;
  const bottomPad = Math.max(TIME_WHEEL_TOP_PAD, wheelHeight - TIME_WHEEL_TOP_PAD - TIME_WHEEL_ITEM_HEIGHT);

  return (
    <View style={{ width: 88, height: TIME_WHEEL_ITEM_HEIGHT * TIME_WHEEL_VISIBLE_ROWS, overflow: 'hidden', alignItems: 'center' }}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: TIME_WHEEL_ITEM_HEIGHT * 2.1,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: accentColor,
          opacity: 0.25,
          zIndex: 1,
        }}
      />
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
        snapToInterval={TIME_WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        onLayout={(event) => setWheelHeight(event.nativeEvent.layout.height || TIME_WHEEL_ITEM_HEIGHT * TIME_WHEEL_VISIBLE_ROWS)}
        onScrollBeginDrag={() => {
          tapLockRef.current = false;
        }}
        onMomentumScrollEnd={(event) => {
          tapLockRef.current = false;
          handleScrollEnd(event);
        }}
        onScrollEndDrag={(event) => {
          tapLockRef.current = false;
          handleScrollEnd(event);
        }}
      >
        <View style={{ height: topPad }} />
        {values.map((value) => {
          const isSelected = value === selected;
          return (
            <Pressable key={value} onPress={() => handleTap(value)} style={{ height: TIME_WHEEL_ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
              <Text
                style={{
                  color: isSelected ? accentColor : textColor,
                  fontSize: isSelected ? 28 : 18,
                  fontWeight: isSelected ? '700' : '500',
                  lineHeight: 30,
                  opacity: isSelected ? 1 : 0.7,
                }}
              >
                {value}
              </Text>
            </Pressable>
          );
        })}
        <View style={{ height: bottomPad }} />
      </ScrollView>
    </View>
  );
}

/** Mount once at root. */
export function PickerHost() {
  const colors = useThemeColors();
  const { req, set } = usePicker();
  const pickedRef = useRef<Date | null>(null);
  const [previewLabel, setPreviewLabel] = useState<string>('');
  const [hour, setHour] = useState('12');
  const [minute, setMinute] = useState('00');
  const [ampmIdx, setAmpmIdx] = useState(0);

  useEffect(() => {
    if (!req) {
      pickedRef.current = null;
      setPreviewLabel('');
      setHour('12');
      setMinute('00');
      setAmpmIdx(0);
      return;
    }

    const base = sanitizeDate(req.value) ?? new Date();
    pickedRef.current = clampDate(base, sanitizeDate(req.min), sanitizeDate(req.max));
    if (req.mode === 'time') {
      const nextWheel = normalizeWheelTime(pickedRef.current);
      setHour(nextWheel.hour);
      setMinute(nextWheel.minute);
      setAmpmIdx(nextWheel.period === 'PM' ? 1 : 0);
    }
    setPreviewLabel(req.mode === 'time' ? formatTimeOfDay(pickedRef.current) : formatDobToDDMMYYYY(pickedRef.current));
    if (Platform.OS !== 'android') return;
    const onBack = () => {
      req.resolve(null);
      set(null);
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [req, set]);

  if (!req) return null;

  const safeMin = sanitizeDate(req.min);
  const safeMax = sanitizeDate(req.max);
  const baseValue = sanitizeDate(req.value) ?? new Date();
  const current = clampDate(baseValue, safeMin, safeMax);

  const close = (d: Date | null) => {
    req.resolve(d ?? pickedRef.current ?? current);
    setPreviewLabel('');
    set(null);
  };

  const updateTimeSelection = (nextHour?: string, nextMinute?: string, nextAmpmIdx?: number) => {
    const nextHourValue = nextHour ?? hour;
    const nextMinuteValue = nextMinute ?? minute;
    const nextAmpmValue = nextAmpmIdx ?? ampmIdx;
    setHour(nextHourValue);
    setMinute(nextMinuteValue);
    setAmpmIdx(nextAmpmValue);
    const picked = timeFromWheel(nextHourValue, nextMinuteValue, nextAmpmValue);
    pickedRef.current = picked;
    setPreviewLabel(formatTimeOfDay(picked));
  };

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 2000, justifyContent: 'center', paddingHorizontal: 10 }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => close(null)} />
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: 380, backgroundColor: colors.surface, borderRadius: 24, padding: 12, borderWidth: 1, borderColor: colors.cardBorder, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 18, elevation: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>
              {req.mode === 'time' ? 'Time of Birth' : 'Date of Birth'}
            </Text>
            <Text style={{ color: colors.goldAccent, fontSize: 12, fontWeight: '700' }}>{previewLabel}</Text>
          </View>

          {req.mode === 'time' ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                <WheelColumn
                  values={TIME_HOUR_OPTIONS}
                  selected={hour}
                  onSelect={(value) => updateTimeSelection(value, undefined, undefined)}
                  accentColor={colors.goldAccent}
                  textColor={colors.textPrimary}
                />
                <Text style={{ fontSize: 32, color: colors.textMuted, marginHorizontal: 8 }}>:</Text>
                <WheelColumn
                  values={TIME_MINUTE_OPTIONS}
                  selected={minute}
                  onSelect={(value) => updateTimeSelection(undefined, value, undefined)}
                  accentColor={colors.goldAccent}
                  textColor={colors.textPrimary}
                />
                <View style={{ width: 72, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {['AM', 'PM'].map((label, index) => {
                      const isSelected = ampmIdx === index;
                      return (
                        <Pressable
                          key={label}
                          onPress={() => updateTimeSelection(undefined, undefined, index)}
                          style={{
                            width: 54,
                            height: 38,
                            borderRadius: 11,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isSelected ? colors.goldAccent : 'transparent',
                            borderWidth: isSelected ? 0 : 1,
                            borderColor: colors.cardBorder,
                          }}
                        >
                          <Text style={{ color: isSelected ? '#1B1202' : colors.textPrimary, fontSize: 15, fontWeight: '700' }}>{label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <DateTimePicker
              key={req.id}
              value={req.value}
              mode={req.mode}
              display="inline"
              themeVariant={colors.isLight ? 'light' : 'dark'}
              accentColor={colors.goldAccent}
              minimumDate={safeMin ?? undefined}
              maximumDate={safeMax ?? undefined}
              style={{ width: '100%', minHeight: 320 }}
              onChange={(_, d) => {
                if (!d) return;
                pickedRef.current = d;
                setPreviewLabel(formatDobToDDMMYYYY(d));
              }}
            />
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
            <Pressable onPress={() => close(null)} style={{ padding: 12 }}>
              <Text style={{ color: colors.goldAccent, fontWeight: '600' }}>Cancel</Text>
            </Pressable>
            <Pressable onPress={() => close(pickedRef.current ?? current)} style={{ padding: 12 }}>
              <Text style={{ color: colors.goldAccent, fontWeight: '600' }}>OK</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

/** TimeOfDay.format(context) — 12h "h:mm AM" like en_US Material. */
export function formatTimeOfDay(d: Date) {
  const h = d.getHours(), m = d.getMinutes();
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export function normalizeTimeForApi(value?: string | Date | null): string {
  if (!value) return '12:00 PM';
  if (value instanceof Date) {
    return formatTimeOfDay(value);
  }

  const raw = String(value).trim();
  if (!raw) return '12:00 PM';
  if (/^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(raw)) {
    const [timePart, meridiem] = raw.split(/\s+/);
    const [hours, minutes] = timePart.split(':').map(Number);
    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      const h = /^PM$/i.test(meridiem || '') && hours < 12 ? hours + 12 : hours;
      const normalizedHours = h % 24;
      const d = new Date(2000, 0, 1, normalizedHours, minutes);
      if (!isNaN(d.getTime())) return formatTimeOfDay(d);
    }
  }
  if (/^\d{1,2}:\d{2}$/.test(raw)) {
    const [hours, minutes] = raw.split(':').map(Number);
    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      const d = new Date(2000, 0, 1, hours, minutes);
      if (!isNaN(d.getTime())) return formatTimeOfDay(d);
    }
  }
  const parsed = new Date(`2000-01-01 ${raw}`);
  if (!isNaN(parsed.getTime())) return formatTimeOfDay(parsed);
  return '12:00 PM';
}

export function normalizeDobForStorage(value?: string | Date | null): string {
  if (!value) return '';
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '';
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const clean = String(value).trim();
  if (!clean || clean === 'Not specified' || clean === 'Sign in to view') return '';

  const parsed = parseDobToDate(clean);
  if (isNaN(parsed.getTime())) return '';

  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function normalizeDobForApi(value?: string | Date | null): string {
  return normalizeDobForStorage(value);
}

export function normalizeTimeForStorage(value?: string | Date | null): string {
  return normalizeTimeForApi(value);
}

/**
 * Safely parses any date string (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD MMM YYYY, or ISO) into a valid Date object.
 */
export function parseDobToDate(dobStr?: string | null): Date {
  if (!dobStr) return new Date(1995, 9, 15);
  const clean = dobStr.trim();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const dmyText = clean.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/);
  if (dmyText) {
    const day = parseInt(dmyText[1], 10);
    const monthName = dmyText[2].slice(0, 3);
    const month = monthNames.findIndex((m) => m.toLowerCase() === monthName.toLowerCase());
    const year = parseInt(dmyText[3], 10);
    if (month >= 0) {
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
  }

  const dmy = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10) - 1;
    const year = parseInt(dmy[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  const dmyNoSep = clean.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (dmyNoSep) {
    const day = parseInt(dmyNoSep[1], 10);
    const month = parseInt(dmyNoSep[2], 10) - 1;
    const year = parseInt(dmyNoSep[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  const ymd = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymd) {
    const year = parseInt(ymd[1], 10);
    const month = parseInt(ymd[2], 10) - 1;
    const day = parseInt(ymd[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  const fallback = new Date(clean);
  return isNaN(fallback.getTime()) ? new Date(1995, 9, 15) : fallback;
}

export function parseTimeToDate(tobStr?: string | null): Date {
  if (!tobStr) return new Date(2000, 0, 1, 12, 0);
  const clean = String(tobStr).trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridiem = match[3]?.toUpperCase();
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    const d = new Date(2000, 0, 1, hours, minutes);
    if (!isNaN(d.getTime())) return d;
  }

  const fallback = new Date(`2000-01-01 ${clean}`);
  return isNaN(fallback.getTime()) ? new Date(2000, 0, 1, 12, 0) : fallback;
}

/**
 * Formats any Date object or raw date string into standard DD/MM/YYYY format.
 */
export function formatDobToDDMMYYYY(val?: Date | string | null): string {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const d = String(val.getDate()).padStart(2, '0');
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const y = val.getFullYear();
    return `${d}/${m}/${y}`;
  }
  const clean = val.trim();
  if (!clean || clean === 'Not specified' || clean === 'Sign in to view') return clean;
  // If already standard DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) return clean;
  // If DDMMYYYY (typed without separators)
  const dmyNoSep = clean.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (dmyNoSep) {
    const d = dmyNoSep[1];
    const m = dmyNoSep[2];
    const y = dmyNoSep[3];
    return `${d}/${m}/${y}`;
  }
  // If DD-MM-YYYY or DD/M/YYYY
  const dmy = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const d = dmy[1].padStart(2, '0');
    const m = dmy[2].padStart(2, '0');
    const y = dmy[3];
    return `${d}/${m}/${y}`;
  }
  // If YYYY-MM-DD or YYYY/MM/DD
  const ymd = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymd) {
    const y = ymd[1];
    const m = ymd[2].padStart(2, '0');
    const d = ymd[3].padStart(2, '0');
    return `${d}/${m}/${y}`;
  }
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const d = String(parsed.getDate()).padStart(2, '0');
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const y = parsed.getFullYear();
    return `${d}/${m}/${y}`;
  }
  return clean;
}
