/**
 * AstroParihar Gold-Standard Benchmark Test Suite: AP-0001
 * 
 * Case AP-0001:
 * - Date of birth: 28 May 1968
 * - Time of birth: 04:44 AM IST
 * - Place of birth: Chennai, Tamil Nadu, India
 * 
 * This regression test verifies:
 * 1. Textual extraction of birth details & city geocoding
 * 2. Exact Lahiri Ayanamsha (Chitra Paksha)
 * 3. Exact Ascendant (Aries / Mesha) degree & minutes
 * 4. Exact positions of all 9 Grahas (Sun through Ketu)
 * 5. Rohini ruler correctly verified as Moon (NOT Venus)
 * 6. Starting Mahadasha at birth verified as Moon Mahadasha (~2.18y balance)
 * 7. Authentic Vimshottari chronology reaching Saturn Mahadasha
 * 8. Availability of D1, D9 (Navamsha), and D10 (Dasamsa) divisional charts
 */

const {
  extractBirthDetailsFromText,
  calculateBirthChartData,
  formatChartSummaryForAI,
} = require('../src/lib/vedicAstrologyEngine.ts');

function runBenchmarkAP0001() {
  console.log('================================================================');
  console.log('RUNNING ASTROPARIHAR BENCHMARK CASE: AP-0001');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, expected, actual) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      console.error(`       Expected: ${expected}`);
      console.error(`       Actual:   ${actual}`);
      failed++;
    }
  }

  // 1. Text Extraction Test
  const testPrompt = `Do not give me predictions, remedies, Mahadasha interpretation or general advice. I am testing your astronomical calculation capability.
Using:
Date of birth: 28 May 1968
Time of birth: 04:44 AM IST
Place of birth: Chennai, Tamil Nadu, India
Calculate the Vedic sidereal birth chart.`;

  const extracted = extractBirthDetailsFromText(testPrompt);
  assert(extracted !== null, '1. Extract birth details from natural language prompt', 'non-null', extracted);
  assert(extracted?.dob === '1968-05-28', '2. Extracted DOB', '1968-05-28', extracted?.dob);
  assert(extracted?.tob === '04:44 AM', '3. Extracted TOB', '04:44 AM', extracted?.tob);
  assert(extracted?.pob === 'Chennai', '4. Extracted POB', 'Chennai', extracted?.pob);
  assert(extracted?.lat === '13.0827', '5. Geocoded Latitude for Chennai', '13.0827', extracted?.lat);
  assert(extracted?.lon === '80.2707', '6. Geocoded Longitude for Chennai', '80.2707', extracted?.lon);

  // 2. Chart Calculation Test
  const chart = calculateBirthChartData(
    extracted.dob,
    extracted.tob,
    extracted.pob,
    extracted.lat,
    extracted.lon,
    'Benchmark Native',
    'Male'
  );

  assert(chart.ayanamsa.name.includes('Lahiri'), '7. Ayanamsa system is Lahiri', 'Lahiri', chart.ayanamsa.name);
  assert(chart.ayanamsa.formatted.startsWith('23° 24\''), '8. Lahiri Ayanamsa value ~23° 24\'', '23° 24\'', chart.ayanamsa.formatted);
  assert(chart.ascendant.includes('Aries'), '9. Ascendant Sign is Aries', 'Aries', chart.ascendant);
  assert(chart.ascendantDms.startsWith('27° 41\''), '10. Ascendant exact degree is ~27° 41\'', '27° 41\'', chart.ascendantDms);
  assert(chart.ascendantLord === 'Mars', '11. Lagna Lord is Mars', 'Mars', chart.ascendantLord);

  // 3. Moon & Nakshatra Canon Verification
  assert(chart.moonSign.includes('Taurus'), '12. Moon Sign is Taurus', 'Taurus', chart.moonSign);
  assert(chart.nakshatra === 'Rohini (Pada 4)', '13. Moon Nakshatra & Pada is Rohini (Pada 4)', 'Rohini (Pada 4)', chart.nakshatra);
  assert(chart.nakshatraLord === 'Moon', '14. Rohini Nakshatra Lord is MOON (Zero Hallucination)', 'Moon', chart.nakshatraLord);

  // 4. Planetary Degrees Verification
  const pMap = {};
  chart.planetaryDegrees.forEach((p) => {
    pMap[p.name] = p;
  });

  assert(pMap['Sun']?.rashi.includes('Taurus') && pMap['Sun']?.dms.startsWith('13° 16\''), '15. Sun: Taurus ~13° 16\'', '13° 16\'', pMap['Sun']?.dms);
  assert(pMap['Moon']?.rashi.includes('Taurus') && pMap['Moon']?.dms.startsWith('20° 25\''), '16. Moon: Taurus ~20° 25\'', '20° 25\'', pMap['Moon']?.dms);
  assert(pMap['Mars']?.rashi.includes('Taurus') && pMap['Mars']?.dms.startsWith('20° 05\''), '17. Mars: Taurus ~20° 05\'', '20° 05\'', pMap['Mars']?.dms);
  assert(pMap['Mercury']?.rashi.includes('Gemini') && pMap['Mercury']?.dms.startsWith('05° 20\''), '18. Mercury: Gemini ~05° 20\'', '05° 20\'', pMap['Mercury']?.dms);
  assert(pMap['Jupiter']?.rashi.includes('Leo') && pMap['Jupiter']?.dms.startsWith('04° 18\''), '19. Jupiter: Leo ~04° 18\'', '04° 18\'', pMap['Jupiter']?.dms);
  assert(pMap['Venus']?.rashi.includes('Taurus') && pMap['Venus']?.dms.startsWith('06° 54\''), '20. Venus: Taurus ~06° 54\'', '06° 54\'', pMap['Venus']?.dms);
  assert(pMap['Saturn']?.rashi.includes('Pisces') && pMap['Saturn']?.dms.startsWith('28° 10\''), '21. Saturn: Pisces ~28° 10\'', '28° 10\'', pMap['Saturn']?.dms);
  assert(pMap['Rahu']?.rashi.includes('Pisces') && pMap['Rahu']?.dms.startsWith('22° 44\''), '22. Rahu: Pisces ~22° 44\'', '22° 44\'', pMap['Rahu']?.dms);
  assert(pMap['Ketu']?.rashi.includes('Virgo') && pMap['Ketu']?.dms.startsWith('22° 44\''), '23. Ketu: Virgo ~22° 44\'', '22° 44\'', pMap['Ketu']?.dms);

  // 5. Vimshottari Dasha Engine Verification
  assert(chart.dasha.birthDashaLord === 'Moon', '24. Starting Mahadasha is Moon Mahadasha', 'Moon', chart.dasha.birthDashaLord);
  assert(chart.dasha.birthDashaSpan === 10, '25. Moon Mahadasha duration is 10 years', 10, chart.dasha.birthDashaSpan);
  assert(chart.dasha.birthDashaBalanceYears >= 2.15 && chart.dasha.birthDashaBalanceYears <= 2.25, '26. Birth Dasha Balance is ~2.18 years', '~2.18', chart.dasha.birthDashaBalanceYears.toFixed(3));
  assert(chart.dasha.currentMahadasha === 'Saturn Mahadasha', '27. Active Mahadasha in 2026 is Saturn Mahadasha', 'Saturn Mahadasha', chart.dasha.currentMahadasha);

  // 6. Divisional Charts Verification
  assert(Array.isArray(chart.d1Houses) && chart.d1Houses.length === 12, '28. D1 Rashi Chart has 12 houses', 12, chart.d1Houses?.length);
  assert(Array.isArray(chart.d9Houses) && chart.d9Houses.length === 12, '29. D9 Navamsha Chart has 12 houses', 12, chart.d9Houses?.length);
  assert(Array.isArray(chart.d10Houses) && chart.d10Houses.length === 12, '30. D10 Dasamsa Chart has 12 houses', 12, chart.d10Houses?.length);

  // 7. Summary String & Anti-Refusal Directives
  const summary = formatChartSummaryForAI(chart);
  assert(summary.includes('Ayanamsa Used: Lahiri (Chitra Paksha)'), '31. Summary includes exact Ayanamsa label', 'true', summary.includes('Ayanamsa Used: Lahiri (Chitra Paksha)'));
  assert(summary.includes('Rohini nakshatra is strictly ruled by the MOON, NOT Venus'), '32. Summary enforces Rohini canonical lord as Moon', 'true', summary.includes('Rohini nakshatra is strictly ruled by the MOON, NOT Venus'));
  assert(summary.includes('D10 Dasamsa Chart'), '33. Summary includes D10 Dasamsa Chart', 'true', summary.includes('D10 Dasamsa Chart'));
  assert(summary.includes('TEST & CALCULATION INQUIRIES: If the devotee asks to test your astronomical calculation capability'), '34. Summary includes explicit anti-refusal directive', 'true', summary.includes('TEST & CALCULATION INQUIRIES'));

  // =========================================================================
  // CASE AP-0001B: AUDIT BENCHMARK CHART (05:05 AM IST, CHENNAI, 16 OCT 2026)
  // =========================================================================
  console.log('\n--- SECTION 2: AUDIT BENCHMARK CHART (05:05 AM IST, CHENNAI) ---');
  const auditChart = calculateBirthChartData(
    '1968-05-28',
    '05:05 AM',
    'Chennai',
    '13.0827',
    '80.2707',
    'Audit Benchmark Native',
    'Male',
    new Date('2026-10-16T00:00:00Z')
  );

  assert(auditChart.ascendant.includes('Taurus'), '35. 05:05 AM Ascendant is Taurus (Vrishabha)', 'Taurus', auditChart.ascendant);
  assert(auditChart.ascendantDms.startsWith('03° 10\''), '36. 05:05 AM Ascendant degree ~03° 10\'', '03° 10\'', auditChart.ascendantDms);
  assert(Math.abs(auditChart.ascendantLongitude - 33.182438) < 0.005, '37. Numerical Lagna 33.1824° conforms within 0.005° (<18")', '33.1824°', auditChart.ascendantLongitude.toFixed(4) + '°');
  assert(auditChart.ascendantNakshatra === 'Krittika' && auditChart.ascendantPada === 2, '38. 05:05 AM Ascendant Nakshatra is Krittika (Pada 2)', 'Krittika (Pada 2)', `${auditChart.ascendantNakshatra} (Pada ${auditChart.ascendantPada})`);
  assert(auditChart.dasha.birthDashaBalanceYears >= 2.049 && auditChart.dasha.birthDashaBalanceYears <= 2.051, '39. 05:05 AM Birth Dasha balance is 2.050y (2y 0m 18d)', '~2.050y', auditChart.dasha.birthDashaBalanceYears.toFixed(4));
  assert(auditChart.dasha.birthAntardashaAtBirth.includes('Venus'), '40. Active Antardasha at birth is Venus Antardasha', 'Venus', auditChart.dasha.birthAntardashaAtBirth);
  assert(auditChart.dasha.currentMahadasha === 'Saturn Mahadasha', '41. Active Mahadasha on 16 Oct 2026 is Saturn Mahadasha', 'Saturn Mahadasha', auditChart.dasha.currentMahadasha);
  assert(auditChart.dasha.currentAntardasha.includes('Rahu'), '42. Active Antardasha on 16 Oct 2026 is Rahu Antardasha', 'Rahu Antardasha', auditChart.dasha.currentAntardasha);
  assert(auditChart.dasha.currentPratyantardasha.includes('Ketu'), '43. Active Pratyantardasha on 16 Oct 2026 is Ketu Pratyantardasha', 'Ketu Pratyantardasha', auditChart.dasha.currentPratyantardasha);

  const aMap = {};
  auditChart.planetaryDegrees.forEach((p) => { aMap[p.name] = p; });
  assert(aMap['Sun']?.rashi.includes('Taurus') && Math.abs(aMap['Sun'].longitude - 43.289865) < 0.005, '44. Sun: Taurus 13° 17\' (43.2899° ± 0.005°)', '43.2899°', aMap['Sun']?.longitude.toFixed(4) + '°');
  assert(aMap['Moon']?.rashi.includes('Taurus') && Math.abs(aMap['Moon'].longitude - 50.599879) < 0.005, '45. Moon: Taurus 20° 36\' Rohini 4 (50.5999° ± 0.005°)', '50.5999°', aMap['Moon']?.longitude.toFixed(4) + '°');
  assert(aMap['Mars']?.rashi.includes('Taurus') && Math.abs(aMap['Mars'].longitude - 50.097722) < 0.005, '46. Mars: Taurus 20° 05\' (50.0977° ± 0.005°)', '50.0977°', aMap['Mars']?.longitude.toFixed(4) + '°');
  assert(aMap['Mercury']?.rashi.includes('Gemini') && Math.abs(aMap['Mercury'].longitude - 65.359295) < 0.005, '47. Mercury: Gemini 05° 21\' (65.3593° ± 0.005°)', '65.3593°', aMap['Mercury']?.longitude.toFixed(4) + '°');
  assert(aMap['Jupiter']?.rashi.includes('Leo') && Math.abs(aMap['Jupiter'].longitude - 124.317124) < 0.005, '48. Jupiter: Leo 04° 19\' (124.3171° ± 0.005°)', '124.3171°', aMap['Jupiter']?.longitude.toFixed(4) + '°');
  assert(aMap['Venus']?.rashi.includes('Taurus') && Math.abs(aMap['Venus'].longitude - 36.925462) < 0.005, '49. Venus: Taurus 06° 55\' (36.9255° ± 0.005°)', '36.9255°', aMap['Venus']?.longitude.toFixed(4) + '°');
  assert(aMap['Saturn']?.rashi.includes('Pisces') && Math.abs(aMap['Saturn'].longitude - 358.176317) < 0.005, '50. Saturn: Pisces 28° 10\' (358.1763° ± 0.005°)', '358.1763°', aMap['Saturn']?.longitude.toFixed(4) + '°');
  assert(aMap['Rahu']?.rashi.includes('Pisces') && Math.abs(aMap['Rahu'].longitude - 352.742867) < 0.005, '51. Rahu (Mean): Pisces 22° 44\' (352.7429° ± 0.005°)', '352.7429°', aMap['Rahu']?.longitude.toFixed(4) + '°');
  assert(aMap['Ketu']?.rashi.includes('Virgo') && Math.abs(aMap['Ketu'].longitude - 172.742867) < 0.005, '52. Ketu (Mean): Virgo 22° 44\' (172.7429° ± 0.005°)', '172.7429°', aMap['Ketu']?.longitude.toFixed(4) + '°');

  const kaalSarp = auditChart.doshas.find((d) => d.name.includes('Kaal Sarp'));
  assert(kaalSarp?.status.includes('Active (Vishdhar Kaal Sarp Dosha'), '53. Kaal Sarp Dosha accurately detected as Active (Vishdhar Kaal Sarp Dosha)', 'Active', kaalSarp?.status);
  const mangal = auditChart.doshas.find((d) => d.name.includes('Mangal'));
  assert(mangal?.status.includes('Active (1st House Mars)'), '54. Mangal Dosha formatted with correct ordinal (1st House Mars)', 'Active (1st House Mars)', mangal?.status);
  assert(auditChart.dasha.birthTimeEpochMs === -50372700000, '55. Epoch timestamp is exact UTC -50372700000 ms (27 May 1968 23:35 UTC)', '-50372700000', auditChart.dasha.birthTimeEpochMs);

  console.log('\n================================================================');
  console.log(`BENCHMARK RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('SUCCESS: All AP-0001 gold-standard assertions passed flawlessly!\n');
  }
}

runBenchmarkAP0001();
