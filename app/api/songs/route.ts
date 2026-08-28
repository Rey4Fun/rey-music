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
    {
      id: '1Ovr5LRobIG0FI_XY3JOAOUuOlS59Ti33',
      name: 'TULUS - Jatuh Suka.opus',
    },
    {
      id: '1-pqTlHzVIs9-Tqg2VRq3HEGB-Hha50s3',
      name: 'TULUS - Labirin.opus',
    },
    {
      id: '10yisy7wr8rHr4u-LSGfrtupOqHdbDf-N',
      name: 'JUICY LUICY - Lantas.opus',
    },
    {
      id: '1R6G0uo_cDrzZgzeP9exx0R49DrMDilBA',
      name: 'RAIM LAODE - Lesung Pipi.opus',
    },
    {
      id: '1IH0_uUWvep4HNNwkDW_p_oR84N3YtO_h',
      name: 'PAYUNG TEDUH - Akad.opus',
    },
    {
      id: '1WcUMA97ZmOchmdLdVI4psyi9flx_IiDj',
      name: 'BARASUARA - Terbuang Dalam Waktu.opus',
    },
    {
      id: '1JdwIVksMohqz9QK60CvQUuQMsgDHFRLi',
      name: 'MC BRUNINHO - Sou Favela (Slowed).opus',
    },
    {
      id: '1uIKBUi8ujWkuMY5gypUgEaG2Ycag1LP_',
      name: 'LUIS FONSI - Despacito (Slowed).opus',
    },
  ];

  return NextResponse.json(songs);
}