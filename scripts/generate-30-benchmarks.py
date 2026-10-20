import sys
import io
import json
import swisseph as swe

# Ensure UTF-8 output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Set sidereal mode to Lahiri (Mode 1)
swe.set_sid_mode(swe.SIDM_LAHIRI)
flags = swe.FLG_SIDEREAL | swe.FLG_SPEED

# 30 Diverse Benchmark Test Charts with explicit timezones and coordinates
BENCHMARKS = [
    {
        "id": "AP-0001",
        "name": "Audit Benchmark Native (Chennai)",
        "category": "Baseline Audit Chart",
        "dob": "1968-05-28", "tob": "05:05 AM", "pob": "Chennai, India",
        "lat": 13.0827, "lon": 80.2707, "tz": 5.5,
        "ut_y": 1968, "ut_m": 5, "ut_d": 27, "ut_h": 23 + 35/60.0
    },
    {
        "id": "AP-0002",
        "name": "Indian Independence (New Delhi)",
        "category": "Midnight Historical Chart",
        "dob": "1947-08-15", "tob": "12:00 AM", "pob": "New Delhi, India",
        "lat": 28.6139, "lon": 77.2090, "tz": 5.5,
        "ut_y": 1947, "ut_m": 8, "ut_d": 14, "ut_h": 18 + 30/60.0
    },
    {
        "id": "AP-0003",
        "name": "Mahatma Gandhi (Porbandar)",
        "category": "19th Century Historical",
        "dob": "1869-10-02", "tob": "07:11 AM", "pob": "Porbandar, India",
        "lat": 21.6417, "lon": 69.6293, "tz": 4.64195,
        "ut_y": 1869, "ut_m": 10, "ut_d": 2, "ut_h": 7.18333 - 4.64195
    },
    {
        "id": "AP-0004",
        "name": "Sachin Tendulkar (Mumbai)",
        "category": "West India - Venus Dasha",
        "dob": "1973-04-24", "tob": "04:00 PM", "pob": "Mumbai, India",
        "lat": 19.0760, "lon": 72.8777, "tz": 5.5,
        "ut_y": 1973, "ut_m": 4, "ut_d": 24, "ut_h": 16.0 - 5.5
    },
    {
        "id": "AP-0005",
        "name": "Roger Federer (Basel, Switzerland)",
        "category": "Western Europe - Jupiter Dasha",
        "dob": "1981-08-08", "tob": "10:15 AM", "pob": "Basel, Switzerland",
        "lat": 47.5596, "lon": 7.5886, "tz": 2.0,
        "ut_y": 1981, "ut_m": 8, "ut_d": 8, "ut_h": 10.25 - 2.0
    },
    {
        "id": "AP-0006",
        "name": "Bill Gates (Seattle, USA)",
        "category": "North America - West Coast",
        "dob": "1955-10-28", "tob": "09:15 PM", "pob": "Seattle, USA",
        "lat": 47.6062, "lon": -122.3321, "tz": -8.0,
        "ut_y": 1955, "ut_m": 10, "ut_d": 29, "ut_h": 21.25 + 8.0 - 24.0
    },
    {
        "id": "AP-0007",
        "name": "Elon Musk (Pretoria, South Africa)",
        "category": "Southern Hemisphere (-25.7° S)",
        "dob": "1971-06-28", "tob": "07:30 AM", "pob": "Pretoria, South Africa",
        "lat": -25.7479, "lon": 28.2293, "tz": 2.0,
        "ut_y": 1971, "ut_m": 6, "ut_d": 28, "ut_h": 7.5 - 2.0
    },
    {
        "id": "AP-0008",
        "name": "Kolkata Winter Solstice (Kolkata)",
        "category": "Gandanta Water-Fire Cusp",
        "dob": "1984-12-22", "tob": "03:00 AM", "pob": "Kolkata, India",
        "lat": 22.5726, "lon": 88.3639, "tz": 5.5,
        "ut_y": 1984, "ut_m": 12, "ut_d": 21, "ut_h": 27.0 - 5.5
    },
    {
        "id": "AP-0009",
        "name": "London Midday (London, UK)",
        "category": "High Latitude (51.5° N) Europe",
        "dob": "1990-01-15", "tob": "12:30 PM", "pob": "London, UK",
        "lat": 51.5074, "lon": -0.1278, "tz": 0.0,
        "ut_y": 1990, "ut_m": 1, "ut_d": 15, "ut_h": 12.5
    },
    {
        "id": "AP-0010",
        "name": "Tokyo Y2K Midnight (Tokyo, Japan)",
        "category": "Millennial Rollover (East Asia)",
        "dob": "2000-01-01", "tob": "12:01 AM", "pob": "Tokyo, Japan",
        "lat": 35.6762, "lon": 139.6503, "tz": 9.0,
        "ut_y": 1999, "ut_m": 12, "ut_d": 31, "ut_h": 24.01667 - 9.0
    },
    {
        "id": "AP-0011",
        "name": "Shah Rukh Khan (New Delhi)",
        "category": "Mars Dasha - Dhanishta",
        "dob": "1965-11-02", "tob": "02:30 AM", "pob": "New Delhi, India",
        "lat": 28.6139, "lon": 77.2090, "tz": 5.5,
        "ut_y": 1965, "ut_m": 11, "ut_d": 1, "ut_h": 26.5 - 5.5
    },
    {
        "id": "AP-0012",
        "name": "Sydney Summer Sunrise (Sydney, Australia)",
        "category": "Southern Hemisphere (-33.8° S)",
        "dob": "1977-01-14", "tob": "06:45 AM", "pob": "Sydney, Australia",
        "lat": -33.8688, "lon": 151.2093, "tz": 11.0,
        "ut_y": 1977, "ut_m": 1, "ut_d": 13, "ut_h": 30.75 - 11.0
    },
    {
        "id": "AP-0013",
        "name": "Singapore Summer Solstice (Singapore)",
        "category": "Equatorial (1.35° N)",
        "dob": "2010-06-21", "tob": "08:00 PM", "pob": "Singapore",
        "lat": 1.3521, "lon": 103.8198, "tz": 8.0,
        "ut_y": 2010, "ut_m": 6, "ut_d": 21, "ut_h": 20.0 - 8.0
    },
    {
        "id": "AP-0014",
        "name": "Oslo Winter Solstice (Oslo, Norway)",
        "category": "Extreme High Latitude (59.9° N)",
        "dob": "1995-12-21", "tob": "07:00 PM", "pob": "Oslo, Norway",
        "lat": 59.9139, "lon": 10.7522, "tz": 1.0,
        "ut_y": 1995, "ut_m": 12, "ut_d": 21, "ut_h": 19.0 - 1.0
    },
    {
        "id": "AP-0015",
        "name": "London 1983 Victory (London, UK)",
        "category": "Summer Twilight High Latitude",
        "dob": "1983-06-25", "tob": "06:30 PM", "pob": "London, UK",
        "lat": 51.5074, "lon": -0.1278, "tz": 1.0,
        "ut_y": 1983, "ut_m": 6, "ut_d": 25, "ut_h": 18.5 - 1.0
    },
    {
        "id": "AP-0016",
        "name": "Indian Republic Day (New Delhi)",
        "category": "Historical Foundation Chart",
        "dob": "1950-01-26", "tob": "10:18 AM", "pob": "New Delhi, India",
        "lat": 28.6139, "lon": 77.2090, "tz": 5.5,
        "ut_y": 1950, "ut_m": 1, "ut_d": 26, "ut_h": 10.3 - 5.5
    },
    {
        "id": "AP-0017",
        "name": "Aryabhata Launch (Sriharikota)",
        "category": "Early Space Age Epoch",
        "dob": "1975-04-19", "tob": "06:00 AM", "pob": "Sriharikota, India",
        "lat": 13.7199, "lon": 80.2305, "tz": 5.5,
        "ut_y": 1975, "ut_m": 4, "ut_d": 19, "ut_h": 6.0 - 5.5
    },
    {
        "id": "AP-0018",
        "name": "Chandrayaan-1 Launch (Sriharikota)",
        "category": "Moon Mission Launch",
        "dob": "2008-10-22", "tob": "06:22 AM", "pob": "Sriharikota, India",
        "lat": 13.7199, "lon": 80.2305, "tz": 5.5,
        "ut_y": 2008, "ut_m": 10, "ut_d": 22, "ut_h": 6.36667 - 5.5
    },
    {
        "id": "AP-0019",
        "name": "Chandrayaan-3 Landing (Bengaluru)",
        "category": "Modern Lunar Landing",
        "dob": "2023-08-23", "tob": "06:04 PM", "pob": "Bengaluru, India",
        "lat": 12.9716, "lon": 77.5946, "tz": 5.5,
        "ut_y": 2023, "ut_m": 8, "ut_d": 23, "ut_h": 18.06667 - 5.5
    },
    {
        "id": "AP-0020",
        "name": "Apollo 11 Landing (Houston, USA)",
        "category": "First Moon Walk (Central USA)",
        "dob": "1969-07-20", "tob": "03:17 PM", "pob": "Houston, USA",
        "lat": 29.7604, "lon": -95.3698, "tz": -5.0,
        "ut_y": 1969, "ut_m": 7, "ut_d": 20, "ut_h": 15.28333 + 5.0
    },
    {
        "id": "AP-0021",
        "name": "Edinburgh 8-8-88 (Edinburgh, UK)",
        "category": "High Latitude Northern UK (55.9° N)",
        "dob": "1988-08-08", "tob": "08:08 AM", "pob": "Edinburgh, UK",
        "lat": 55.9533, "lon": -3.1883, "tz": 1.0,
        "ut_y": 1988, "ut_m": 8, "ut_d": 8, "ut_h": 8.13333 - 1.0
    },
    {
        "id": "AP-0022",
        "name": "Mexico City Solstice (Mexico City)",
        "category": "Central America High Elevation",
        "dob": "2012-12-21", "tob": "05:11 AM", "pob": "Mexico City, Mexico",
        "lat": 19.4326, "lon": -99.1332, "tz": -6.0,
        "ut_y": 2012, "ut_m": 12, "ut_d": 21, "ut_h": 5.18333 + 6.0
    },
    {
        "id": "AP-0023",
        "name": "London 1940 Wartime (London, UK)",
        "category": "WWII Mid-Century Epoch",
        "dob": "1940-05-10", "tob": "02:00 PM", "pob": "London, UK",
        "lat": 51.5074, "lon": -0.1278, "tz": 1.0,
        "ut_y": 1940, "ut_m": 5, "ut_d": 10, "ut_h": 14.0 - 1.0
    },
    {
        "id": "AP-0024",
        "name": "New Delhi Spring Equinox (New Delhi)",
        "category": "Modern Planetary Conjunctions",
        "dob": "2020-03-24", "tob": "08:00 PM", "pob": "New Delhi, India",
        "lat": 28.6139, "lon": 77.2090, "tz": 5.5,
        "ut_y": 2020, "ut_m": 3, "ut_d": 24, "ut_h": 20.0 - 5.5
    },
    {
        "id": "AP-0025",
        "name": "Ayodhya Prana Pratishtha (Ayodhya)",
        "category": "Auspicious Abhijit Muhurat",
        "dob": "2024-01-22", "tob": "12:29 PM", "pob": "Ayodhya, India",
        "lat": 26.7922, "lon": 82.1998, "tz": 5.5,
        "ut_y": 2024, "ut_m": 1, "ut_d": 22, "ut_h": 12.48333 - 5.5
    },
    {
        "id": "AP-0026",
        "name": "Munich Solar Eclipse (Munich, Germany)",
        "category": "Total Solar Eclipse Cusp",
        "dob": "1999-08-11", "tob": "01:03 PM", "pob": "Munich, Germany",
        "lat": 48.1351, "lon": 11.5820, "tz": 2.0,
        "ut_y": 1999, "ut_m": 8, "ut_d": 11, "ut_h": 13.05 - 2.0
    },
    {
        "id": "AP-0027",
        "name": "Buenos Aires Lunar Eclipse (Buenos Aires)",
        "category": "Southern Hemisphere Eclipse (-34.6° S)",
        "dob": "1985-05-04", "tob": "04:53 PM", "pob": "Buenos Aires, Argentina",
        "lat": -34.6037, "lon": -58.3816, "tz": -3.0,
        "ut_y": 1985, "ut_m": 5, "ut_d": 4, "ut_h": 16.88333 + 3.0
    },
    {
        "id": "AP-0028",
        "name": "Quito Exact Equator (Quito, Ecuador)",
        "category": "Exact Equator (-0.18° S)",
        "dob": "2005-03-20", "tob": "07:33 AM", "pob": "Quito, Ecuador",
        "lat": -0.1807, "lon": -78.4678, "tz": -5.0,
        "ut_y": 2005, "ut_m": 3, "ut_d": 20, "ut_h": 7.55 + 5.0
    },
    {
        "id": "AP-0029",
        "name": "Apollo 17 Night Launch (Cape Canaveral)",
        "category": "Subtropical Eastern USA",
        "dob": "1972-12-07", "tob": "12:33 AM", "pob": "Cape Canaveral, USA",
        "lat": 28.3922, "lon": -80.6077, "tz": -5.0,
        "ut_y": 1972, "ut_m": 12, "ut_d": 7, "ut_h": 0.55 + 5.0
    },
    {
        "id": "AP-0030",
        "name": "Ujjain Prime Meridian (Ujjain, India)",
        "category": "Classical Indian 0° Meridian",
        "dob": "2026-10-16", "tob": "12:00 PM", "pob": "Ujjain, India",
        "lat": 23.1765, "lon": 75.7885, "tz": 5.5,
        "ut_y": 2026, "ut_m": 10, "ut_d": 16, "ut_h": 12.0 - 5.5
    }
]

NAKSHATRAS = [
    ("Ashwini", "Ketu", 7), ("Bharani", "Venus", 20), ("Krittika", "Sun", 6),
    ("Rohini", "Moon", 10), ("Mrigashira", "Mars", 7), ("Ardra", "Rahu", 18),
    ("Punarvasu", "Jupiter", 16), ("Pushya", "Saturn", 19), ("Ashlesha", "Mercury", 17),
    ("Magha", "Ketu", 7), ("Purva Phalguni", "Venus", 20), ("Uttara Phalguni", "Sun", 6),
    ("Hasta", "Moon", 10), ("Chitra", "Mars", 7), ("Swati", "Rahu", 18),
    ("Vishakha", "Jupiter", 16), ("Anuradha", "Saturn", 19), ("Jyeshtha", "Mercury", 17),
    ("Mula", "Ketu", 7), ("Purva Ashadha", "Venus", 20), ("Uttara Ashadha", "Sun", 6),
    ("Shravana", "Moon", 10), ("Dhanishta", "Mars", 7), ("Shatabhisha", "Rahu", 18),
    ("Purva Bhadrapada", "Jupiter", 16), ("Uttara Bhadrapada", "Saturn", 19), ("Revati", "Mercury", 17)
]

SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']

def get_nakshatra(lon):
    arc_deg = 360.0 / 27.0
    idx = int(lon // arc_deg) % 27
    rem = lon % arc_deg
    pada = int(rem // (arc_deg / 4.0)) + 1
    rem_arc = arc_deg - rem
    name, lord, span = NAKSHATRAS[idx]
    bal_years = (rem_arc / arc_deg) * span
    return {
        "name": name,
        "lord": lord,
        "pada": pada,
        "spanYears": span,
        "remArcDeg": rem_arc,
        "balanceYears": bal_years
    }

results = []

for b in BENCHMARKS:
    tjd_ut = swe.julday(b["ut_y"], b["ut_m"], b["ut_d"], b["ut_h"])
    ayanamsa = swe.get_ayanamsa_ut(tjd_ut)
    
    planet_ids = [
        ("Sun", swe.SUN),
        ("Moon", swe.MOON),
        ("Mars", swe.MARS),
        ("Mercury", swe.MERCURY),
        ("Jupiter", swe.JUPITER),
        ("Venus", swe.VENUS),
        ("Saturn", swe.SATURN),
        ("Rahu", swe.MEAN_NODE),
    ]
    
    planets_data = {}
    for name, pid in planet_ids:
        res, flg = swe.calc_ut(tjd_ut, pid, flags)
        lon = res[0]
        speed = res[3]
        planets_data[name] = {
            "longitude": lon,
            "speed": speed,
            "sign": SIGNS[int(lon // 30) % 12]
        }
    
    rahu_lon = planets_data["Rahu"]["longitude"]
    ketu_lon = (rahu_lon + 180.0) % 360.0
    planets_data["Ketu"] = {
        "longitude": ketu_lon,
        "speed": planets_data["Rahu"]["speed"],
        "sign": SIGNS[int(ketu_lon // 30) % 12]
    }
    
    cusps, ascmc = swe.houses_ex(tjd_ut, b["lat"], b["lon"], b'P', flags)
    asc_lon = ascmc[0]
    asc_sign = SIGNS[int(asc_lon // 30) % 12]
    
    moon_lon = planets_data["Moon"]["longitude"]
    nak = get_nakshatra(moon_lon)
    
    results.append({
        "id": b["id"],
        "name": b["name"],
        "category": b["category"],
        "dob": b["dob"],
        "tob": b["tob"],
        "pob": b["pob"],
        "lat": b["lat"],
        "lon": b["lon"],
        "tz": b["tz"],
        "julianDayUT": tjd_ut,
        "ayanamsa": ayanamsa,
        "ascendant": {
            "longitude": asc_lon,
            "sign": asc_sign
        },
        "moon": {
            "longitude": moon_lon,
            "sign": planets_data["Moon"]["sign"],
            "nakshatra": nak["name"],
            "pada": nak["pada"],
            "dashaLord": nak["lord"],
            "dashaSpanYears": nak["spanYears"],
            "balanceYears": nak["balanceYears"]
        },
        "planets": planets_data
    })

output_path = "scripts/benchmarks_30_ground_truth.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

print(f"Successfully generated updated Swiss Ephemeris ground truth for {len(results)} charts in {output_path}")
