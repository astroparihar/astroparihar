import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const LANG_CODE_MAP: Record<string, string> = {
  te: 'te',
  telugu: 'te',
  hi: 'hi',
  hindi: 'hi',
  ta: 'ta',
  tamil: 'ta',
  kn: 'kn',
  kannada: 'kn',
  en: 'en',
  english: 'en',
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get('text');
    const rawLang = (searchParams.get('lang') || 'en').toLowerCase().trim();
    const lang = LANG_CODE_MAP[rawLang] || 'en';

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Text parameter is required' }, { status: 400 });
    }

    // Maximum safe query length for Google TTS chunk is ~250 characters
    const trimmedText = text.trim().slice(0, 300);

    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(
      lang
    )}&q=${encodeURIComponent(trimmedText)}`;

    const response = await fetch(googleTtsUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Referer: 'https://translate.google.com/',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `TTS upstream returned ${response.status}` },
        { status: response.status }
      );
    }

    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=604800, immutable',
        'Content-Length': arrayBuffer.byteLength.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error generating audio in /api/tts:', error);
    return NextResponse.json({ error: error.message || 'TTS generation failed' }, { status: 500 });
  }
}
