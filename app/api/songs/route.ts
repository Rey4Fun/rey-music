import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const songs = [
    {
      id: '1wgmkPesMIy844TI0tsa749nEJnTpmDhh',
      name: 'TULUS - Teh Hijau.opus',
    },
    {
      id: '181XQhXIDbZTOtWofAT1KHl93AmkZA3T5',
      name: 'NADHIF BASALAMAH - Penjaga Hati.opus',
    },
    {
      id: '1GjKHTXTxv_aERy8AB7pxv5izvJgN2AGE',
      name: 'TULUS - 1000 Tahun Lamanya.opus',
    },
    {
      id: '1oP65KUN4h-ekEF0D2YXzSbIlnvFKkbVH',
      name: 'TULUS - Diri.opus',
    },
    {
      id: '1qoYAxCGBEEblBU_Tg-xClxw77OCiViUI',
      name: 'TULUS - Interaksi.opus',
    },
    {
      id: '1tLuE0aPewwgqQU35ogEAW_Fj5jyhviih',
      name: 'TULUS - Monokrom.opus',
    },
  ];

  return NextResponse.json(songs);
}