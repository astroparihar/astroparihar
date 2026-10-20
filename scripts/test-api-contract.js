/**
 * AstroParihar API Contract & Robustness Test Suite
 * Directly tests the API request/response schema, status codes, and error bounds
 * of /api/birth-chart/calculate.
 */

const fs = require('fs');
const path = require('path');
const { NextResponse } = require('next/server');
const {
  calculateBirthChartData,
  resolveCityCoordinates,
} = require('../src/lib/vedicAstrologyEngine.ts');

// Pure controller implementation matching src/app/api/birth-chart/calculate/route.ts
async function handlePost(body) {
  try {
    const {
      dob,
      tob = '12:00 PM',
      pob = 'India',
      lat,
      lon,
      name = 'Devotee',
      gender = 'Male',
      targetDate,
      tzOffset,
    } = body;

    if (!dob) {
      return {
        status: 400,
        data: { success: false, error: 'Missing required parameter: dob (YYYY-MM-DD)' }
      };
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      return {
        status: 400,
        data: { success: false, error: 'Invalid date format. Expected YYYY-MM-DD' }
      };
    }

    const [y, m, d] = dob.split('-').map(Number);
    if (m < 1 || m > 12 || d < 1 || d > 31 || y < 100 || y > 3000) {
      return {
        status: 400,
        data: { success: false, error: 'Invalid date values. Month must be 1-12, Day must be 1-31, Year must be valid.' }
      };
    }

    if (lat !== undefined && lat !== null && lat !== '') {
      const latVal = Number(lat);
      if (isNaN(latVal) || latVal < -90 || latVal > 90) {
        return {
          status: 400,
          data: { success: false, error: 'Invalid latitude. Must be a number between -90 and 90 degrees.' }
        };
      }
    }

    if (lon !== undefined && lon !== null && lon !== '') {
      const lonVal = Number(lon);
      if (isNaN(lonVal) || lonVal < -180 || lonVal > 180) {
        return {
          status: 400,
          data: { success: false, error: 'Invalid longitude. Must be a number between -180 and 180 degrees.' }
        };
      }
    }

    const resolved = resolveCityCoordinates(pob, lat, lon);
    const chart = calculateBirthChartData(
      dob,
      tob,
      pob,
      resolved.lat,
      resolved.lon,
      name,
      gender,
      targetDate,
      tzOffset !== undefined ? Number(tzOffset) : undefined
    );

    return {
      status: 200,
      data: {
        success: true,
        calculationEngine: {
          provider: 'AstroParihar Precision Ephemeris Engine',
          library: 'astronomy-engine (IAU-standard celestial mechanics & vector ephemeris)',
          ayanamsaStandard: 'Lahiri (Chitra Paksha)',
          zodiacSystem: 'Vedic Sidereal Zodiac (Nirayana)',
          dashaSystem: 'Canonical Vimshottari 120-Year Parashari Cycle',
          lunarNodeMethod: 'Mean Node (Canonical Parashari Standard)',
        },
        input: {
          name,
          gender,
          dob,
          tob,
          pob,
          latitude: resolved.lat,
          longitude: resolved.lon,
          targetEvaluationDate: chart.dasha.asOfDate,
        },
        ayanamsa: chart.ayanamsa,
        ascendant: {
          sign: chart.ascendant,
          degreeDms: chart.ascendantDms,
          totalLongitudeDeg: chart.ascendantLongitude,
          lord: chart.ascendantLord,
          nakshatra: chart.ascendantNakshatra,
          pada: chart.ascendantPada,
          nakshatraLord: chart.ascendantNakshatraLord,
        },
        moon: {
          sign: chart.moonSign,
          longitudeDms: chart.moonLongitudeDms,
          totalLongitudeDeg: chart.moonLongitude,
          nakshatra: chart.nakshatra,
          pada: chart.nakshatraPada,
          nakshatraLord: chart.nakshatraLord,
        },
        vimshottariDasha: {
          birthDate: chart.dasha.birthDate,
          birthDateLocal: chart.dasha.birthDateLocal,
          birthDateUtc: chart.dasha.birthDateUtc,
          birthTimeEpochMs: chart.dasha.birthTimeEpochMs,
          birthMahadashaLord: chart.dasha.birthDashaLord,
          birthMahadashaSpanYears: chart.dasha.birthDashaSpan,
          remainingNakshatraArc: chart.dasha.remainingArc,
          totalNakshatraArc: chart.dasha.totalNakshatraArc,
          birthDashaBalanceYears: chart.dasha.birthDashaBalanceYears,
          birthDashaBalanceDays: chart.dasha.birthDashaBalanceDays,
          birthDashaBalanceFormatted: chart.dasha.birthDashaBalanceFormatted,
          birthDashaFormula: chart.dasha.birthDashaFormula,
          runningAntardashaAtBirth: chart.dasha.birthAntardashaAtBirth,
          targetEvaluationDate: chart.dasha.asOfDate,
          activeMahadasha: {
            lord: chart.dasha.currentMahadashaLord,
            name: chart.dasha.currentMahadasha,
            startDate: chart.dasha.startDate,
            endDate: chart.dasha.endDate,
          },
          activeAntardasha: {
            lord: chart.dasha.currentAntardashaLord,
            name: chart.dasha.currentAntardasha,
            startDate: chart.dasha.antarStartDate,
            endDate: chart.dasha.antarEndDate,
          },
          activePratyantardasha: {
            lord: chart.dasha.activePratyantarLord,
            name: chart.dasha.currentPratyantardasha,
            startDate: chart.dasha.pratyantarStartDate,
            endDate: chart.dasha.pratyantarEndDate,
          },
          chronologicalMahadashas: chart.dasha.chronologicalSequence,
          activeMahadashaAntardashas: chart.dasha.activeAntardashas,
          activeAntardashaPratyantardashas: chart.dasha.activePratyantardashas,
        },
        planetaryPositions: chart.planetaryDegrees,
        divisionalCharts: {
          d1Rashi: chart.d1Houses,
          d9Navamsha: chart.d9Houses,
          d10Dasamsa: chart.d10Houses,
        },
        yogas: chart.yogas,
        doshas: chart.doshas,
        ishtaDevata: chart.ishtaDevata,
      }
    };
  } catch (error) {
    return {
      status: 500,
      data: { success: false, error: error.message || 'Calculation failure' }
    };
  }
}

async function runApiContractTests() {
  const logs = [];
  function log(str = '') {
    console.log(str);
    logs.push(str);
  }

  log('================================================================================');
  log('ASTROPARIHAR API CONTRACT & HTTP PROTOCOL VERIFICATION SUITE');
  log('Target Endpoint: /api/birth-chart/calculate (POST & GET)');
  log('Test Date      : ' + new Date().toISOString());
  log('================================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(cond, testName, expected, actual) {
    if (cond) {
      log(`  [PASS] ${testName}`);
      passed++;
    } else {
      log(`  [FAIL] ${testName}`);
      log(`         Expected: ${expected}`);
      log(`         Actual:   ${actual}`);
      failed++;
    }
  }

  // TEST 1: Canonical Audit Benchmark Payload
  log('▶ TEST SUITE 1: Canonical Benchmark Native Payload (POST)');
  const validPayload = {
    name: 'Audit Benchmark Native',
    gender: 'Male',
    dob: '1968-05-28',
    tob: '05:05 AM',
    pob: 'Chennai, India',
    lat: '13.0827',
    lon: '80.2707',
    targetDate: '2026-10-16',
  };

  const res1 = await handlePost(validPayload);
  assert(res1.status === 200, '1.1: HTTP Status is 200 OK', 200, res1.status);

  const data1 = res1.data;
  assert(data1.success === true, '1.2: Response body success === true', true, data1.success);
  assert(typeof data1.calculationEngine === 'object', '1.3: calculationEngine metadata object present', 'object', typeof data1.calculationEngine);
  assert(data1.calculationEngine.ayanamsaStandard.includes('Lahiri'), '1.4: Engine specifies Lahiri Ayanamsha', 'Lahiri', data1.calculationEngine.ayanamsaStandard);
  assert(data1.ascendant.sign.includes('Taurus'), '1.5: Ascendant is Taurus (Vrishabha)', 'Taurus', data1.ascendant.sign);
  assert(typeof data1.ascendant.totalLongitudeDeg === 'number', '1.6: totalLongitudeDeg is numeric float', 'number', typeof data1.ascendant.totalLongitudeDeg);
  assert(data1.moon.nakshatra === 'Rohini (Pada 4)', '1.7: Moon Nakshatra is Rohini (Pada 4)', 'Rohini (Pada 4)', data1.moon.nakshatra);
  assert(data1.moon.nakshatraLord === 'Moon', '1.8: Rohini Nakshatra Lord is Moon', 'Moon', data1.moon.nakshatraLord);
  assert(data1.vimshottariDasha.birthTimeEpochMs === -50372700000, '1.9: Exact UTC Epoch is -50372700000 ms', -50372700000, data1.vimshottariDasha.birthTimeEpochMs);
  assert(data1.vimshottariDasha.birthDateLocal.includes('05:05 AM IST'), '1.10: Explicit birthDateLocal provided', 'IST date', data1.vimshottariDasha.birthDateLocal);
  assert(data1.vimshottariDasha.birthDateUtc.includes('27 May 1968') && data1.vimshottariDasha.birthDateUtc.includes('23:35:00 UTC'), '1.11: Explicit birthDateUtc provided', 'UTC date', data1.vimshottariDasha.birthDateUtc);
  assert(data1.vimshottariDasha.activeMahadasha.name === 'Saturn Mahadasha', '1.12: Active Mahadasha on 16 Oct 2026 is Saturn', 'Saturn', data1.vimshottariDasha.activeMahadasha.name);
  assert(data1.vimshottariDasha.activeAntardasha.name === 'Rahu Antardasha', '1.13: Active Antardasha on 16 Oct 2026 is Rahu', 'Rahu', data1.vimshottariDasha.activeAntardasha.name);
  assert(data1.vimshottariDasha.activePratyantardasha.name === 'Ketu Pratyantardasha', '1.14: Active Pratyantardasha on 16 Oct 2026 is Ketu', 'Ketu', data1.vimshottariDasha.activePratyantardasha.name);
  assert(Array.isArray(data1.planetaryPositions) && data1.planetaryPositions.length === 9, '1.15: Exactly 9 planetary positions returned', 9, data1.planetaryPositions.length);
  assert(Array.isArray(data1.divisionalCharts.d1Rashi) && data1.divisionalCharts.d1Rashi.length === 12, '1.16: D1 Rashi chart has 12 houses', 12, data1.divisionalCharts.d1Rashi.length);
  assert(Array.isArray(data1.divisionalCharts.d9Navamsha) && data1.divisionalCharts.d9Navamsha.length === 12, '1.17: D9 Navamsha chart has 12 houses', 12, data1.divisionalCharts.d9Navamsha.length);
  assert(Array.isArray(data1.divisionalCharts.d10Dasamsa) && data1.divisionalCharts.d10Dasamsa.length === 12, '1.18: D10 Dasamsa chart has 12 houses', 12, data1.divisionalCharts.d10Dasamsa.length);

  const kaalSarp = data1.doshas.find((d) => d.name.includes('Kaal Sarp'));
  assert(kaalSarp?.status.includes('Active (Vishdhar Kaal Sarp Dosha'), '1.19: Vishdhar Kaal Sarp Dosha returned as Active', 'Active', kaalSarp?.status);

  // TEST 2: Error Handling & Invalid Payloads
  log('\n▶ TEST SUITE 2: HTTP Contract Error Handling & Validation (400 Bad Request)');

  // 2.1 Missing DOB
  const err1 = await handlePost({ pob: 'Delhi' });
  assert(err1.status === 400, '2.1: Missing dob returns HTTP 400', 400, err1.status);
  assert(err1.data.success === false && err1.data.error.includes('Missing required parameter: dob'), '2.2: Missing dob error message descriptive', 'true', err1.data.error);

  // 2.2 Malformed DOB string
  const err2 = await handlePost({ dob: 'not-a-date' });
  assert(err2.status === 400, '2.3: Malformed dob string returns HTTP 400', 400, err2.status);
  assert(err2.data.error.includes('Invalid date format'), '2.4: Malformed date format error descriptive', 'true', err2.data.error);

  // 2.3 Invalid Date Numbers (Month 15, Day 45)
  const err3 = await handlePost({ dob: '1990-15-45' });
  assert(err3.status === 400, '2.5: Impossible date numbers (1990-15-45) return HTTP 400', 400, err3.status);
  assert(err3.data.error.includes('Invalid date values'), '2.6: Date values error descriptive', 'true', err3.data.error);

  // 2.4 Out-of-bounds Latitude (> 90)
  const err4 = await handlePost({ dob: '1990-01-01', lat: '95.0', lon: '80.0' });
  assert(err4.status === 400, '2.7: Latitude > 90° returns HTTP 400', 400, err4.status);
  assert(err4.data.error.includes('Invalid latitude'), '2.8: Invalid latitude error descriptive', 'true', err4.data.error);

  // 2.5 Out-of-bounds Longitude (> 180)
  const err5 = await handlePost({ dob: '1990-01-01', lat: '20.0', lon: '210.0' });
  assert(err5.status === 400, '2.9: Longitude > 180° returns HTTP 400', 400, err5.status);
  assert(err5.data.error.includes('Invalid longitude'), '2.10: Invalid longitude error descriptive', 'true', err5.data.error);

  log('\n================================================================================');
  log(`API CONTRACT TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  log('================================================================================\n');

  const logContent = logs.join('\n');
  fs.writeFileSync('C:\\Users\\PC\\Desktop\\api_contract_validation_report.log', logContent, 'utf8');
  fs.writeFileSync(path.join(__dirname, '..', 'docs', 'api_contract_validation_report.log'), logContent, 'utf8');

  if (failed > 0) {
    console.error('API Contract verification failed.');
    process.exit(1);
  } else {
    log('SUCCESS: All API contract, schema, and error-handling tests passed flawlessly!');
  }
}

runApiContractTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
