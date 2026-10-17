import { NextRequest, NextResponse } from 'next/server';
import {
  calculateBirthChartData,
  resolveCityCoordinates,
} from '@/lib/vedicAstrologyEngine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      dob,
      tob = '12:00 PM',
      pob = 'India',
      lat,
      lon,
      name = 'Devotee',
      gender = 'Male',
      targetDate,
    } = body;

    if (!dob) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: dob (YYYY-MM-DD)' },
        { status: 400 }
      );
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
      targetDate
    );

    return NextResponse.json({
      success: true,
      calculationEngine: {
        provider: 'AstroParihar Precision Ephemeris Engine',
        library: 'astronomy-engine (IAU-standard celestial mechanics & vector ephemeris)',
        ayanamsaStandard: 'Lahiri (Chitra Paksha)',
        zodiacSystem: 'Vedic Sidereal Zodiac (Nirayana)',
        dashaSystem: 'Canonical Vimshottari 120-Year Parashari Cycle',
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
    });
  } catch (error: any) {
    console.error('Birth chart API calculation error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Calculation failure' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const dob = url.searchParams.get('dob') || '1968-05-28';
  const tob = url.searchParams.get('tob') || '05:05 AM';
  const pob = url.searchParams.get('pob') || 'Chennai';
  const lat = url.searchParams.get('lat') || undefined;
  const lon = url.searchParams.get('lon') || undefined;
  const targetDate = url.searchParams.get('targetDate') || '2026-10-14';

  const resolved = resolveCityCoordinates(pob, lat, lon);
  const chart = calculateBirthChartData(
    dob,
    tob,
    pob,
    resolved.lat,
    resolved.lon,
    'Devotee',
    'Male',
    targetDate
  );

  return NextResponse.json({
    success: true,
    calculationEngine: {
      provider: 'AstroParihar Precision Ephemeris Engine',
      library: 'astronomy-engine (IAU-standard celestial mechanics & vector ephemeris)',
      ayanamsaStandard: 'Lahiri (Chitra Paksha)',
      zodiacSystem: 'Vedic Sidereal Zodiac (Nirayana)',
      dashaSystem: 'Canonical Vimshottari 120-Year Parashari Cycle',
    },
    input: {
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
  });
}
