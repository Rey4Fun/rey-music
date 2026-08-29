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
    {
      id: '14FuF64YtKIK1iom5vIEIvaabniWqof8O',
      name: 'KAHITNA - Soulmate.opus',
    },
    {
      id: '1lpyNbRayydV8j9R1va-vurIFijOjxREl',
      name: 'KAHITNA - Titik Nadir (feat. Monita Tahalea).opus',
    },
    {
      id: '1vp76UZDYZgp5E_Y8Xnjxcytv9UgWzR6F',
      name: 'KAHITNA - Mantan Terindah.opus',
    },
    {
      id: '1M36uXtvwfIaxsET-9xA60IkzbkC54Zrn',
      name: 'KAHITNA - Cinta Sudah Lewat.opus',
    },
    {
      id: '13f_oUAXCsYuFqU5FiwFsV5WcyaOLTX0Y',
      name: 'KAHITNA - Cantik.opus',
    },
    {
      id: '1xzvv6dT_zjUtD8gbW0AkzaeabU4ESTBx',
      name: 'KAHITNA - Engga Ngerti.opus',
    },
    {
      id: '1aaTpKFyHSqleK2X3Dp6eGH6IS3pFi6O0',
      name: 'KAHITNA - Cinta Sendiri.opus',
    },
    {
      id: '10i0YN3Dpxmquwa0ne7HXLSh0dVRX-Pta',
      name: 'KAHITNA - Cerita Cinta.opus',
    },
    {
      id: '1RbT0XRKPch2G0ZLZUiAHIbBHwJCxWBbU',
      name: 'KAHITNA - Rahasia Cintaku.opus',
    },
    {
      id: '1d7MQ-tYh3k2FbaIvxKGZHA-saueIqw4d',
      name: 'KAHITNA - Andai Dia Tahu.opus',
    },
    {
      id: '18L_ClbtqB6f_6Lo0wdQ7q4RX-vBnl1Oy',
      name: 'KAHITNA - Aku, Dirimu, Dirinya.opus',
    },
    {
      id: '1WhXrrKlhp1YeXXhuIkzDm25b37cO883Q',
      name: 'ENAU & ARI LESMANA - Sesi Potret.opus',
    },
    {
      id: '1EJvKCXMck0ZxvVy4Y3kxkWugWOPXzeHv',
      name: 'KAHITNA - Takkan Terganti.opus',
    },
    {
      id: '1YwRS2wyc_89Xrz8xEOPr0zActUqLGaY7',
      name: 'KAHITNA - Setahun Kemarin.opus',
    },
    {
      id: '1YYLDLgD0x8OeCL4OW75c5m8cCi4ZciSj',
      name: 'DEWA 19 - Kangen.opus',
    },
    {
      id: '14lB_l9aD50J8GJj4-fxvtddoIk_xfVgq',
      name: 'DEWA 19 - Roman Picisan.opus',
    },
    {
      id: '1sCba8B5gaFywI6j0bW3uI1grEGsuMjzZ',
      name: 'DEWA 19 - Dewi.opus',
    },
    {
      id: '1_pv-CpFyJ7V-1dNGHn7tGtBMrGbrSaZf',
      name: 'DEWA 19 - Separuh Nafas.opus',
    },
    {
      id: '1QXa01ebVdJz5bEfuQ3ip98RES7i137S7',
      name: 'DEWA 19 - Sedang Ingin Bercinta.opus',
    },
    {
      id: '1dBOHyhcZboLY0Zwu-s6AMHkzdVDNLJwp',
      name: 'DEWA 19 - Laskar Cinta.opus',
    },
    {
      id: '1zbtXnwRfZlWXhymSEUJqioeS5ccpZjvt',
      name: 'DEWA 19 - Selimut Hati.opus',
    },
    {
      id: '1XDWrrfpRhDUv8ZB3NbCkZ_L0bMRayD83',
      name: 'DEWA 19 - Larut.opus',
    },
    {
      id: '1TjPRmk5KYz_4ae7WlyHEcmImWuu313De',
      name: 'DEWA 19 - Live On.opus',
    },
    {
      id: '15-p_IF3M9hSePR2EjRXkshig-MVA-2JD',
      name: 'DEWA 19 - Bukan Cinta Manusia Biasa.opus',
    },
  ];

  return NextResponse.json(songs);
}