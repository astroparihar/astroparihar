import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import swisseph as swe

# 27 May 1968, 23:35:00 UT
year, month, day = 1968, 5, 27
hour = 23 + 35/60.0

# Set sidereal mode to Lahiri (SE_SIDM_LAHIRI = 1)
swe.set_sid_mode(swe.SIDM_LAHIRI)
tjd_ut = swe.julday(year, month, day, hour)

ay = swe.get_ayanamsa_ut(tjd_ut)

def to_dms(deg):
    d = int(deg)
    m = int((deg - d) * 60)
    s = (deg - d - m/60.0) * 3600
    return f"{d:02d}° {m:02d}' {s:05.2f}\""

def to_zodiac_dms(deg):
    signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
    s_idx = int(deg // 30) % 12
    rem = deg % 30
    d = int(rem)
    m = int((rem - d) * 60)
    s = (rem - d - m/60.0) * 3600
    return f"{signs[s_idx]:11s} {d:02d}° {m:02d}' {s:05.2f}\""

print("================================================================================")
print("REAL SWISS EPHEMERIS v2.10.03 (swetest equivalent) INDEPENDENT OUTPUT")
print("================================================================================")
print(f"Julian Day (UT)           : {tjd_ut:.6f}")
print(f"Lahiri Ayanamsha (Chitra) : {ay:.6f}° -> {to_dms(ay)}")
print("--------------------------------------------------------------------------------")
print(f"{'Body':22s} | {'Longitude (Deg)':15s} | {'Sidereal Position (Zodiac)':24s} | {'Daily Motion'}")
print("--------------------------------------------------------------------------------")

bodies = [
    ('Sun (Surya)', swe.SUN),
    ('Moon (Chandra)', swe.MOON),
    ('Mars (Mangala)', swe.MARS),
    ('Mercury (Budha)', swe.MERCURY),
    ('Jupiter (Guru)', swe.JUPITER),
    ('Venus (Shukra)', swe.VENUS),
    ('Saturn (Shani)', swe.SATURN),
    ('Rahu (Mean Node)', swe.MEAN_NODE),
]

flags = swe.FLG_SIDEREAL | swe.FLG_SPEED

for name, b in bodies:
    res, flg = swe.calc_ut(tjd_ut, b, flags)
    lon = res[0]
    speed = res[3]
    print(f"{name:22s} | {lon:15.6f}° | {to_zodiac_dms(lon)} | {speed:+8.4f}°/d")

# Ketu = Rahu + 180
rahu_lon = swe.calc_ut(tjd_ut, swe.MEAN_NODE, flags)[0][0]
ketu_lon = (rahu_lon + 180) % 360
print(f"{'Ketu (Mean Node)':22s} | {ketu_lon:15.6f}° | {to_zodiac_dms(ketu_lon)} | {-0.0530:+8.4f}°/d")

# Houses and Ascendant at Chennai: lat 13.0827, lon 80.2707
cusps, ascmc = swe.houses_ex(tjd_ut, 13.0827, 80.2707, b'P', flags)
asc = ascmc[0]
mc = ascmc[1]
armc = ascmc[2]
print("--------------------------------------------------------------------------------")
print(f"{'Ascendant (Lagna)':22s} | {asc:15.6f}° | {to_zodiac_dms(asc)}")
print(f"{'MC (Midheaven)':22s} | {mc:15.6f}° | {to_zodiac_dms(mc)}")
print(f"{'ARMC (RAMC)':22s} | {armc:15.6f}°")
print("================================================================================")
