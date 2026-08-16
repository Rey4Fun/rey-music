import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Unwrap params menggunakan await
  const { id: fileId } = await params;
  const API_KEY = process.env.GOOGLE_DRIVE_API_KEY || 'AIzaSyCn4YNmjpe9Wh0Rco1eDUbbNaY8ifQc9fU';

  const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}`;

  try {
    let audioRes = await fetch(driveUrl, { cache: 'no-store' });

    // Jika API Key tertahan, gunakan fallback direct stream Drive
    if (!audioRes.ok) {
      const fallbackUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      audioRes = await fetch(fallbackUrl, { cache: 'no-store' });
    }

    const contentType = audioRes.headers.get('content-type') || 'audio/ogg';

    return new NextResponse(audioRes.body, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': audioRes.headers.get('content-length') || '',
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (error) {
    return new NextResponse('Gagal memutar audio', { status: 500 });
  }
}