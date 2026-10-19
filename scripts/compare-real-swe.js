const { calculateBirthChartData } = require('../src/lib/vedicAstrologyEngine.ts');
const c = calculateBirthChartData('1968-05-28', '05:05 AM', 'Chennai', '13.0827', '80.2707', 'Audit Native', 'Male');

// Swiss Ephemeris exact numbers from pyswisseph 2.10.03:
const sweData = {
  'Lahiri Ayanamsa': { deg: 23.415759, dms: '23° 24\' 56.73"' },
  'Ascendant (Lagna)': { deg: 33.184948, dms: 'Taurus 03° 11\' 05.81"' },
  'Sun': { deg: 43.291156, dms: 'Taurus 13° 17\' 28.16"' },
  'Moon': { deg: 50.601340, dms: 'Taurus 20° 36\' 04.82"' },
  'Mars': { deg: 50.093178, dms: 'Taurus 20° 05\' 35.44"' },
  'Mercury': { deg: 65.355342, dms: 'Gemini 05° 21\' 19.23"' },
  'Jupiter': { deg: 124.317328, dms: 'Leo 04° 19\' 02.38"' },
  'Venus': { deg: 36.920945, dms: 'Taurus 06° 55\' 15.40"' },
  'Saturn': { deg: 358.174744, dms: 'Pisces 28° 10\' 29.08"' },
  'Rahu': { deg: 352.742839, dms: 'Pisces 22° 44\' 34.22"' },
  'Ketu': { deg: 172.742839, dms: 'Virgo 22° 44\' 34.22"' }
};

console.log('------------------------------------------------------------------------------------------------------------------------');
console.log('Side-by-Side Comparison: AstroParihar vs Real Swiss Ephemeris v2.10.03');
console.log('------------------------------------------------------------------------------------------------------------------------');

function row(name, apDms, apDeg, sweDms, sweDeg) {
  const diffSec = (apDeg - sweDeg) * 3600;
  const diffMin = diffSec / 60;
  const sign = diffSec >= 0 ? '+' : '';
  console.log(`${name.padEnd(20)} | AP: ${apDms.padEnd(23)} (${apDeg.toFixed(6)}°) | SWE: ${sweDms.padEnd(23)} (${sweDeg.toFixed(6)}°) | Δ: ${sign}${diffSec.toFixed(2)}" (${sign}${diffMin.toFixed(3)}')`);
}

row('Lahiri Ayanamsa', c.ayanamsa.formatted, c.ayanamsa.valueDeg, sweData['Lahiri Ayanamsa'].dms, sweData['Lahiri Ayanamsa'].deg);
row('Ascendant (Lagna)', `${c.ascendant.split(' ')[0]} ${c.ascendantDms}`, c.ascendantLongitude, sweData['Ascendant (Lagna)'].dms, sweData['Ascendant (Lagna)'].deg);

c.planetaryDegrees.forEach(p => {
  const s = sweData[p.name];
  if (s) {
    row(p.name, `${p.rashi.split(' ')[0]} ${p.dms}`, p.longitude, s.dms, s.deg);
  }
});
console.log('------------------------------------------------------------------------------------------------------------------------');
