import * as THREE from 'three';
import { ControllerSlot, StarPlayerProfile, TeamConfig } from '../types';

export const TEAMS: Record<string, TeamConfig> = {
  KOR: {
    id: 'KOR',
    name: '대한민국 (KOREA)',
    shortName: 'KOR',
    flag: '🇰🇷',
    primaryColor: 0xe11d48,
    secondaryColor: 0x0f172a,
    shortsColor: 0x0f172a,
    gkColor: 0x10b981,
    uiHex: '#e11d48',
    roster: [
      { num: 1, name: 'JO H.W.', role: 'GK', speedStat: 1.0, shootStat: 0.9, curveStat: 0.9 },
      { num: 4, name: 'KIM M.J.', role: 'DF', speedStat: 1.08, shootStat: 0.92, curveStat: 0.9 },
      { num: 19, name: 'KIM Y.G.', role: 'DF', speedStat: 0.98, shootStat: 0.9, curveStat: 0.9 },
      { num: 2, name: 'SEOL Y.W.', role: 'DF', speedStat: 1.06, shootStat: 0.92, curveStat: 0.95 },
      { num: 3, name: 'KIM J.S.', role: 'DF', speedStat: 1.03, shootStat: 0.94, curveStat: 1.02 },
      { num: 6, name: 'HWANG I.B.', role: 'MF', speedStat: 1.02, shootStat: 1.04, curveStat: 1.08 },
      { num: 10, name: 'LEE K.I.', role: 'MF', speedStat: 1.06, shootStat: 1.12, curveStat: 1.24 },
      { num: 8, name: 'PAIK S.H.', role: 'MF', speedStat: 1.04, shootStat: 1.1, curveStat: 1.05 },
      { num: 11, name: 'HWANG H.C.', role: 'FW', speedStat: 1.14, shootStat: 1.08, curveStat: 1.02 },
      { num: 9, name: 'CHO G.S.', role: 'FW', speedStat: 1.03, shootStat: 1.12, curveStat: 1.0 },
      { num: 7, name: 'SON H.M.', role: 'FW', speedStat: 1.17, shootStat: 1.2, curveStat: 1.22 }
    ],
    bench: [
      { num: 14, name: 'YANG M.H.', role: 'FW', speedStat: 1.15, shootStat: 1.08, curveStat: 1.1 },
      { num: 17, name: 'JEONG W.Y.', role: 'MF', speedStat: 1.08, shootStat: 1.05, curveStat: 1.08 },
      { num: 18, name: 'OH H.G.', role: 'FW', speedStat: 1.09, shootStat: 1.14, curveStat: 1.02 }
    ]
  },
  BRA: {
    id: 'BRA',
    name: '브라질 (BRAZIL)',
    shortName: 'BRA',
    flag: '🇧🇷',
    primaryColor: 0xfacc15,
    secondaryColor: 0x15803d,
    shortsColor: 0x1d4ed8,
    gkColor: 0x06b6d4,
    uiHex: '#eab308',
    roster: [
      { num: 1, name: 'ALISSON', role: 'GK', speedStat: 1.02, shootStat: 0.9, curveStat: 0.9 },
      { num: 4, name: 'MARQUINHOS', role: 'DF', speedStat: 1.06, shootStat: 0.92, curveStat: 0.92 },
      { num: 3, name: 'MILITAO', role: 'DF', speedStat: 1.1, shootStat: 0.92, curveStat: 0.9 },
      { num: 2, name: 'DANILO', role: 'DF', speedStat: 1.02, shootStat: 0.95, curveStat: 0.95 },
      { num: 6, name: 'WENDELL', role: 'DF', speedStat: 1.05, shootStat: 0.92, curveStat: 0.98 },
      { num: 5, name: 'BRUNO G.', role: 'MF', speedStat: 1.03, shootStat: 1.05, curveStat: 1.08 },
      { num: 8, name: 'PAQUETA', role: 'MF', speedStat: 1.04, shootStat: 1.06, curveStat: 1.14 },
      { num: 10, name: 'RODRYGO', role: 'MF', speedStat: 1.13, shootStat: 1.12, curveStat: 1.16 },
      { num: 11, name: 'RAPHINHA', role: 'FW', speedStat: 1.12, shootStat: 1.14, curveStat: 1.18 },
      { num: 9, name: 'ENDRICK', role: 'FW', speedStat: 1.12, shootStat: 1.16, curveStat: 1.05 },
      { num: 7, name: 'VINICIUS JR', role: 'FW', speedStat: 1.18, shootStat: 1.16, curveStat: 1.2 }
    ],
    bench: [
      { num: 20, name: 'SAVINHO', role: 'FW', speedStat: 1.15, shootStat: 1.08, curveStat: 1.15 },
      { num: 18, name: 'CASEMIRO', role: 'MF', speedStat: 0.98, shootStat: 1.12, curveStat: 1.04 }
    ]
  },
  ARG: {
    id: 'ARG',
    name: '아르헨티나 (ARGENTINA)',
    shortName: 'ARG',
    flag: '🇦🇷',
    primaryColor: 0x38bdf8,
    secondaryColor: 0xffffff,
    shortsColor: 0x0f172a,
    gkColor: 0xf97316,
    uiHex: '#0284c7',
    roster: [
      { num: 1, name: 'E. MARTINEZ', role: 'GK', speedStat: 1.02, shootStat: 0.92, curveStat: 0.9 },
      { num: 4, name: 'C. ROMERO', role: 'DF', speedStat: 1.07, shootStat: 0.92, curveStat: 0.9 },
      { num: 3, name: 'OTAMENDI', role: 'DF', speedStat: 0.98, shootStat: 0.94, curveStat: 0.9 },
      { num: 2, name: 'MOLINA', role: 'DF', speedStat: 1.08, shootStat: 0.95, curveStat: 0.98 },
      { num: 6, name: 'TAGLIAFICO', role: 'DF', speedStat: 1.04, shootStat: 0.92, curveStat: 0.95 },
      { num: 7, name: 'DE PAUL', role: 'MF', speedStat: 1.06, shootStat: 1.04, curveStat: 1.06 },
      { num: 8, name: 'ENZO F.', role: 'MF', speedStat: 1.03, shootStat: 1.08, curveStat: 1.12 },
      { num: 20, name: 'MAC ALLISTER', role: 'MF', speedStat: 1.04, shootStat: 1.1, curveStat: 1.14 },
      { num: 11, name: 'DI MARIA', role: 'FW', speedStat: 1.08, shootStat: 1.12, curveStat: 1.24 },
      { num: 9, name: 'J. ALVAREZ', role: 'FW', speedStat: 1.12, shootStat: 1.15, curveStat: 1.1 },
      { num: 10, name: 'L. MESSI', role: 'FW', speedStat: 1.12, shootStat: 1.2, curveStat: 1.25 }
    ],
    bench: [
      { num: 22, name: 'LAUTARO M.', role: 'FW', speedStat: 1.1, shootStat: 1.18, curveStat: 1.08 },
      { num: 17, name: 'GARNACHO', role: 'FW', speedStat: 1.16, shootStat: 1.1, curveStat: 1.12 }
    ]
  },
  FRA: {
    id: 'FRA',
    name: '프랑스 (FRANCE)',
    shortName: 'FRA',
    flag: '🇫🇷',
    primaryColor: 0x1e3a8a,
    secondaryColor: 0xfbbf24,
    shortsColor: 0xffffff,
    gkColor: 0xa855f7,
    uiHex: '#1d4ed8',
    roster: [
      { num: 1, name: 'MAIGNAN', role: 'GK', speedStat: 1.02, shootStat: 0.9, curveStat: 0.9 },
      { num: 4, name: 'SALIBA', role: 'DF', speedStat: 1.09, shootStat: 0.9, curveStat: 0.9 },
      { num: 5, name: 'UPAMECANO', role: 'DF', speedStat: 1.08, shootStat: 0.92, curveStat: 0.9 },
      { num: 2, name: 'KOUNDE', role: 'DF', speedStat: 1.08, shootStat: 0.94, curveStat: 0.95 },
      { num: 3, name: 'THEO H.', role: 'DF', speedStat: 1.15, shootStat: 1.06, curveStat: 1.05 },
      { num: 8, name: 'TCHOUAMENI', role: 'MF', speedStat: 1.04, shootStat: 1.1, curveStat: 1.02 },
      { num: 6, name: 'CAMAVINGA', role: 'MF', speedStat: 1.09, shootStat: 1.02, curveStat: 1.05 },
      { num: 7, name: 'GRIEZMANN', role: 'MF', speedStat: 1.06, shootStat: 1.15, curveStat: 1.2 },
      { num: 11, name: 'DEMBELE', role: 'FW', speedStat: 1.16, shootStat: 1.08, curveStat: 1.15 },
      { num: 9, name: 'THURAM', role: 'FW', speedStat: 1.1, shootStat: 1.12, curveStat: 1.02 },
      { num: 10, name: 'MBAPPE', role: 'FW', speedStat: 1.18, shootStat: 1.2, curveStat: 1.16 }
    ],
    bench: [
      { num: 14, name: 'BARCOLA', role: 'FW', speedStat: 1.16, shootStat: 1.08, curveStat: 1.12 },
      { num: 13, name: 'KANTE', role: 'MF', speedStat: 1.12, shootStat: 0.98, curveStat: 1.0 }
    ]
  },
  ENG: {
    id: 'ENG',
    name: '잉글랜드 (ENGLAND)',
    shortName: 'ENG',
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    primaryColor: 0xf8fafc,
    secondaryColor: 0x1e3a8a,
    shortsColor: 0x1e3a8a,
    gkColor: 0xeab308,
    uiHex: '#64748b',
    roster: [
      { num: 1, name: 'PICKFORD', role: 'GK', speedStat: 1.0, shootStat: 0.92, curveStat: 0.9 },
      { num: 5, name: 'STONES', role: 'DF', speedStat: 1.03, shootStat: 0.94, curveStat: 0.95 },
      { num: 6, name: 'GUEHI', role: 'DF', speedStat: 1.06, shootStat: 0.9, curveStat: 0.9 },
      { num: 2, name: 'WALKER', role: 'DF', speedStat: 1.15, shootStat: 0.95, curveStat: 0.94 },
      { num: 3, name: 'SHAW', role: 'DF', speedStat: 1.04, shootStat: 0.98, curveStat: 1.06 },
      { num: 4, name: 'RICE', role: 'MF', speedStat: 1.05, shootStat: 1.08, curveStat: 1.04 },
      { num: 10, name: 'BELLINGHAM', role: 'MF', speedStat: 1.1, shootStat: 1.16, curveStat: 1.14 },
      { num: 11, name: 'FODEN', role: 'MF', speedStat: 1.11, shootStat: 1.15, curveStat: 1.18 },
      { num: 7, name: 'SAKA', role: 'FW', speedStat: 1.14, shootStat: 1.14, curveStat: 1.18 },
      { num: 8, name: 'PALMER', role: 'FW', speedStat: 1.07, shootStat: 1.16, curveStat: 1.2 },
      { num: 9, name: 'H. KANE', role: 'FW', speedStat: 1.02, shootStat: 1.2, curveStat: 1.15 }
    ],
    bench: [
      { num: 19, name: 'WATKINS', role: 'FW', speedStat: 1.13, shootStat: 1.14, curveStat: 1.04 },
      { num: 18, name: 'ALEXANDER-A.', role: 'MF', speedStat: 1.04, shootStat: 1.12, curveStat: 1.25 }
    ]
  },
  GER: {
    id: 'GER',
    name: '독일 (GERMANY)',
    shortName: 'GER',
    flag: '🇩🇪',
    primaryColor: 0xf1f5f9,
    secondaryColor: 0x111827,
    shortsColor: 0x111827,
    gkColor: 0xef4444,
    uiHex: '#334155',
    roster: [
      { num: 1, name: 'NEUER', role: 'GK', speedStat: 1.02, shootStat: 0.94, curveStat: 0.92 },
      { num: 4, name: 'RUDIGER', role: 'DF', speedStat: 1.12, shootStat: 0.94, curveStat: 0.9 },
      { num: 5, name: 'TAH', role: 'DF', speedStat: 1.05, shootStat: 0.9, curveStat: 0.9 },
      { num: 6, name: 'KIMMICH', role: 'DF', speedStat: 1.04, shootStat: 1.06, curveStat: 1.16 },
      { num: 3, name: 'MITTELSTADT', role: 'DF', speedStat: 1.06, shootStat: 0.98, curveStat: 1.04 },
      { num: 8, name: 'KROOS', role: 'MF', speedStat: 0.98, shootStat: 1.16, curveStat: 1.24 },
      { num: 21, name: 'GUNDOGAN', role: 'MF', speedStat: 1.02, shootStat: 1.12, curveStat: 1.14 },
      { num: 10, name: 'MUSIALA', role: 'MF', speedStat: 1.15, shootStat: 1.14, curveStat: 1.18 },
      { num: 7, name: 'WIRTZ', role: 'FW', speedStat: 1.12, shootStat: 1.15, curveStat: 1.2 },
      { num: 11, name: 'SANE', role: 'FW', speedStat: 1.17, shootStat: 1.14, curveStat: 1.12 },
      { num: 9, name: 'HAVERTZ', role: 'FW', speedStat: 1.08, shootStat: 1.14, curveStat: 1.1 }
    ],
    bench: [
      { num: 14, name: 'FULLKRUG', role: 'FW', speedStat: 1.0, shootStat: 1.18, curveStat: 1.02 }
    ]
  },
  ESP: {
    id: 'ESP',
    name: '스페인 (SPAIN)',
    shortName: 'ESP',
    flag: '🇪🇸',
    primaryColor: 0xdc2626,
    secondaryColor: 0xfacc15,
    shortsColor: 0x1e3a8a,
    gkColor: 0x10b981,
    uiHex: '#dc2626',
    roster: [
      { num: 1, name: 'UNAI SIMON', role: 'GK', speedStat: 1.02, shootStat: 0.9, curveStat: 0.9 },
      { num: 3, name: 'LE NORMAND', role: 'DF', speedStat: 1.04, shootStat: 0.92, curveStat: 0.9 },
      { num: 4, name: 'LAPORTE', role: 'DF', speedStat: 1.04, shootStat: 0.94, curveStat: 0.94 },
      { num: 2, name: 'CARVAJAL', role: 'DF', speedStat: 1.08, shootStat: 0.98, curveStat: 1.04 },
      { num: 24, name: 'CUCURELLA', role: 'DF', speedStat: 1.1, shootStat: 0.94, curveStat: 1.02 },
      { num: 16, name: 'RODRI', role: 'MF', speedStat: 1.04, shootStat: 1.16, curveStat: 1.12 },
      { num: 8, name: 'FABIAN R.', role: 'MF', speedStat: 1.05, shootStat: 1.14, curveStat: 1.16 },
      { num: 20, name: 'PEDRI', role: 'MF', speedStat: 1.09, shootStat: 1.08, curveStat: 1.2 },
      { num: 17, name: 'N. WILLIAMS', role: 'FW', speedStat: 1.18, shootStat: 1.12, curveStat: 1.15 },
      { num: 7, name: 'MORATA', role: 'FW', speedStat: 1.06, shootStat: 1.14, curveStat: 1.04 },
      { num: 19, name: 'L. YAMAL', role: 'FW', speedStat: 1.17, shootStat: 1.15, curveStat: 1.24 }
    ],
    bench: [
      { num: 10, name: 'DANI OLMO', role: 'MF', speedStat: 1.09, shootStat: 1.15, curveStat: 1.18 }
    ]
  },
  POR: {
    id: 'POR',
    name: '포르투갈 (PORTUGAL)',
    shortName: 'POR',
    flag: '🇵🇹',
    primaryColor: 0xb91c1c,
    secondaryColor: 0x15803d,
    shortsColor: 0x15803d,
    gkColor: 0xf59e0b,
    uiHex: '#b91c1c',
    roster: [
      { num: 1, name: 'DIOGO COSTA', role: 'GK', speedStat: 1.03, shootStat: 0.9, curveStat: 0.9 },
      { num: 4, name: 'RUBEN DIAS', role: 'DF', speedStat: 1.05, shootStat: 0.92, curveStat: 0.9 },
      { num: 3, name: 'PEPE', role: 'DF', speedStat: 1.02, shootStat: 0.9, curveStat: 0.9 },
      { num: 20, name: 'CANCELO', role: 'DF', speedStat: 1.1, shootStat: 1.04, curveStat: 1.15 },
      { num: 19, name: 'N. MENDES', role: 'DF', speedStat: 1.15, shootStat: 0.98, curveStat: 1.05 },
      { num: 6, name: 'PALHINHA', role: 'MF', speedStat: 1.01, shootStat: 1.05, curveStat: 0.98 },
      { num: 23, name: 'VITINHA', role: 'MF', speedStat: 1.09, shootStat: 1.1, curveStat: 1.16 },
      { num: 8, name: 'BRUNO F.', role: 'MF', speedStat: 1.06, shootStat: 1.18, curveStat: 1.22 },
      { num: 10, name: 'B. SILVA', role: 'FW', speedStat: 1.11, shootStat: 1.12, curveStat: 1.2 },
      { num: 17, name: 'R. LEAO', role: 'FW', speedStat: 1.18, shootStat: 1.12, curveStat: 1.14 },
      { num: 7, name: 'C. RONALDO', role: 'FW', speedStat: 1.12, shootStat: 1.22, curveStat: 1.18 }
    ],
    bench: [
      { num: 21, name: 'DIOGO JOTA', role: 'FW', speedStat: 1.11, shootStat: 1.15, curveStat: 1.08 }
    ]
  },
  NED: {
    id: 'NED',
    name: '네덜란드 (NETHERLANDS)',
    shortName: 'NED',
    flag: '🇳🇱',
    primaryColor: 0xf97316,
    secondaryColor: 0x0f172a,
    shortsColor: 0xf97316,
    gkColor: 0x22c55e,
    uiHex: '#f97316',
    roster: [
      { num: 1, name: 'VERBRUGGEN', role: 'GK', speedStat: 1.02, shootStat: 0.9, curveStat: 0.9 },
      { num: 4, name: 'VAN DIJK', role: 'DF', speedStat: 1.08, shootStat: 0.98, curveStat: 0.92 },
      { num: 6, name: 'DE VRIJ', role: 'DF', speedStat: 1.02, shootStat: 0.92, curveStat: 0.9 },
      { num: 22, name: 'DUMFRIES', role: 'DF', speedStat: 1.14, shootStat: 1.04, curveStat: 1.02 },
      { num: 5, name: 'AKE', role: 'DF', speedStat: 1.07, shootStat: 0.94, curveStat: 0.96 },
      { num: 14, name: 'REIJNDERS', role: 'MF', speedStat: 1.09, shootStat: 1.1, curveStat: 1.12 },
      { num: 21, name: 'F. DE JONG', role: 'MF', speedStat: 1.09, shootStat: 1.04, curveStat: 1.14 },
      { num: 7, name: 'X. SIMONS', role: 'MF', speedStat: 1.13, shootStat: 1.14, curveStat: 1.18 },
      { num: 12, name: 'FRIMPONG', role: 'FW', speedStat: 1.18, shootStat: 1.06, curveStat: 1.08 },
      { num: 10, name: 'DEPAY', role: 'FW', speedStat: 1.08, shootStat: 1.15, curveStat: 1.16 },
      { num: 11, name: 'GAKPO', role: 'FW', speedStat: 1.14, shootStat: 1.16, curveStat: 1.16 }
    ],
    bench: [
      { num: 9, name: 'WEGHORST', role: 'FW', speedStat: 0.98, shootStat: 1.16, curveStat: 0.98 }
    ]
  },
  ITA: {
    id: 'ITA',
    name: '이탈리아 (ITALY)',
    shortName: 'ITA',
    flag: '🇮🇹',
    primaryColor: 0x2563eb,
    secondaryColor: 0xffffff,
    shortsColor: 0xffffff,
    gkColor: 0xfacc15,
    uiHex: '#2563eb',
    roster: [
      { num: 1, name: 'DONNARUMMA', role: 'GK', speedStat: 1.03, shootStat: 0.9, curveStat: 0.9 },
      { num: 23, name: 'BASTONI', role: 'DF', speedStat: 1.06, shootStat: 0.94, curveStat: 1.02 },
      { num: 5, name: 'CALAFIORI', role: 'DF', speedStat: 1.08, shootStat: 0.98, curveStat: 1.04 },
      { num: 2, name: 'DI LORENZO', role: 'DF', speedStat: 1.06, shootStat: 0.96, curveStat: 1.0 },
      { num: 3, name: 'DIMARCO', role: 'DF', speedStat: 1.1, shootStat: 1.1, curveStat: 1.2 },
      { num: 8, name: 'JORGINHO', role: 'MF', speedStat: 0.98, shootStat: 1.04, curveStat: 1.14 },
      { num: 18, name: 'BARELLA', role: 'MF', speedStat: 1.12, shootStat: 1.12, curveStat: 1.14 },
      { num: 10, name: 'PELLEGRINI', role: 'MF', speedStat: 1.05, shootStat: 1.12, curveStat: 1.16 },
      { num: 7, name: 'FRATTESI', role: 'FW', speedStat: 1.1, shootStat: 1.1, curveStat: 1.05 },
      { num: 9, name: 'SCAMACCA', role: 'FW', speedStat: 1.04, shootStat: 1.16, curveStat: 1.06 },
      { num: 14, name: 'CHIESA', role: 'FW', speedStat: 1.16, shootStat: 1.14, curveStat: 1.15 }
    ],
    bench: [
      { num: 20, name: 'ZACCAGNI', role: 'FW', speedStat: 1.12, shootStat: 1.12, curveStat: 1.18 }
    ]
  },
  JPN: {
    id: 'JPN',
    name: '일본 (JAPAN)',
    shortName: 'JPN',
    flag: '🇯🇵',
    primaryColor: 0x1d4ed8,
    secondaryColor: 0xffffff,
    shortsColor: 0x0f172a,
    gkColor: 0xef4444,
    uiHex: '#1d4ed8',
    roster: [
      { num: 1, name: 'SUZUKI', role: 'GK', speedStat: 1.01, shootStat: 0.9, curveStat: 0.9 },
      { num: 4, name: 'ITAKURA', role: 'DF', speedStat: 1.06, shootStat: 0.92, curveStat: 0.9 },
      { num: 16, name: 'TOMIYASU', role: 'DF', speedStat: 1.08, shootStat: 0.94, curveStat: 0.94 },
      { num: 2, name: 'SUGAWARA', role: 'DF', speedStat: 1.09, shootStat: 1.02, curveStat: 1.08 },
      { num: 21, name: 'ITO H.', role: 'DF', speedStat: 1.08, shootStat: 0.98, curveStat: 1.02 },
      { num: 6, name: 'ENDO W.', role: 'MF', speedStat: 1.02, shootStat: 1.04, curveStat: 1.02 },
      { num: 5, name: 'MORITA', role: 'MF', speedStat: 1.05, shootStat: 1.06, curveStat: 1.08 },
      { num: 8, name: 'MINAMINO', role: 'MF', speedStat: 1.09, shootStat: 1.12, curveStat: 1.12 },
      { num: 10, name: 'DOAN R.', role: 'FW', speedStat: 1.1, shootStat: 1.12, curveStat: 1.14 },
      { num: 7, name: 'MITOMA', role: 'FW', speedStat: 1.16, shootStat: 1.1, curveStat: 1.16 },
      { num: 20, name: 'KUBO T.', role: 'FW', speedStat: 1.14, shootStat: 1.12, curveStat: 1.22 }
    ],
    bench: [
      { num: 14, name: 'ITO J.', role: 'FW', speedStat: 1.17, shootStat: 1.06, curveStat: 1.1 }
    ]
  },
  CRO: {
    id: 'CRO',
    name: '크로아티아 (CROATIA)',
    shortName: 'CRO',
    flag: '🇭🇷',
    primaryColor: 0xef4444,
    secondaryColor: 0xffffff,
    shortsColor: 0xffffff,
    gkColor: 0x06b6d4,
    uiHex: '#ef4444',
    roster: [
      { num: 1, name: 'LIVAKOVIC', role: 'GK', speedStat: 1.03, shootStat: 0.9, curveStat: 0.9 },
      { num: 4, name: 'GVARDIOL', role: 'DF', speedStat: 1.12, shootStat: 1.02, curveStat: 1.02 },
      { num: 6, name: 'SUTALO', role: 'DF', speedStat: 1.05, shootStat: 0.9, curveStat: 0.9 },
      { num: 2, name: 'STANISIC', role: 'DF', speedStat: 1.06, shootStat: 0.94, curveStat: 0.96 },
      { num: 19, name: 'SOSA', role: 'DF', speedStat: 1.05, shootStat: 0.96, curveStat: 1.1 },
      { num: 11, name: 'BROZOVIC', role: 'MF', speedStat: 1.04, shootStat: 1.08, curveStat: 1.08 },
      { num: 8, name: 'KOVACIC', role: 'MF', speedStat: 1.1, shootStat: 1.06, curveStat: 1.12 },
      { num: 10, name: 'L. MODRIC', role: 'MF', speedStat: 1.04, shootStat: 1.16, curveStat: 1.25 },
      { num: 7, name: 'MAJER', role: 'FW', speedStat: 1.06, shootStat: 1.12, curveStat: 1.16 },
      { num: 14, name: 'PERISIC', role: 'FW', speedStat: 1.1, shootStat: 1.14, curveStat: 1.14 },
      { num: 9, name: 'KRAMARIC', role: 'FW', speedStat: 1.07, shootStat: 1.16, curveStat: 1.14 }
    ],
    bench: [
      { num: 16, name: 'BUDIMIR', role: 'FW', speedStat: 1.01, shootStat: 1.15, curveStat: 1.02 }
    ]
  },
  URU: {
    id: 'URU',
    name: '우루과이 (URUGUAY)',
    shortName: 'URU',
    flag: '🇺🇾',
    primaryColor: 0x0ea5e9,
    secondaryColor: 0x0f172a,
    shortsColor: 0x0f172a,
    gkColor: 0x22c55e,
    uiHex: '#0ea5e9',
    roster: [
      { num: 1, name: 'ROCHET', role: 'GK', speedStat: 1.01, shootStat: 0.9, curveStat: 0.9 },
      { num: 4, name: 'R. ARAUJO', role: 'DF', speedStat: 1.13, shootStat: 0.94, curveStat: 0.9 },
      { num: 2, name: 'GIMENEZ', role: 'DF', speedStat: 1.04, shootStat: 0.92, curveStat: 0.9 },
      { num: 16, name: 'OLIVERA', role: 'DF', speedStat: 1.07, shootStat: 0.92, curveStat: 0.95 },
      { num: 17, name: 'VINA', role: 'DF', speedStat: 1.06, shootStat: 0.94, curveStat: 0.98 },
      { num: 5, name: 'UGARTE', role: 'MF', speedStat: 1.07, shootStat: 0.98, curveStat: 0.98 },
      { num: 6, name: 'BENTANCUR', role: 'MF', speedStat: 1.05, shootStat: 1.08, curveStat: 1.08 },
      { num: 15, name: 'VALVERDE', role: 'MF', speedStat: 1.15, shootStat: 1.2, curveStat: 1.14 },
      { num: 11, name: 'PELLISTRI', role: 'FW', speedStat: 1.14, shootStat: 1.06, curveStat: 1.08 },
      { num: 7, name: 'DE LA CRUZ', role: 'FW', speedStat: 1.1, shootStat: 1.12, curveStat: 1.18 },
      { num: 9, name: 'D. NUNEZ', role: 'FW', speedStat: 1.17, shootStat: 1.16, curveStat: 1.08 }
    ],
    bench: [
      { num: 10, name: 'SUAREZ', role: 'FW', speedStat: 1.0, shootStat: 1.2, curveStat: 1.2 }
    ]
  },
  BEL: {
    id: 'BEL',
    name: '벨기에 (BELGIUM)',
    shortName: 'BEL',
    flag: '🇧🇪',
    primaryColor: 0x991b1b,
    secondaryColor: 0xfacc15,
    shortsColor: 0x111827,
    gkColor: 0x38bdf8,
    uiHex: '#991b1b',
    roster: [
      { num: 1, name: 'CASTEELS', role: 'GK', speedStat: 1.01, shootStat: 0.9, curveStat: 0.9 },
      { num: 4, name: 'FAES', role: 'DF', speedStat: 1.04, shootStat: 0.9, curveStat: 0.9 },
      { num: 5, name: 'VERTONGHEN', role: 'DF', speedStat: 0.98, shootStat: 0.92, curveStat: 0.95 },
      { num: 21, name: 'CASTAGNE', role: 'DF', speedStat: 1.07, shootStat: 0.95, curveStat: 0.98 },
      { num: 3, name: 'THEATE', role: 'DF', speedStat: 1.05, shootStat: 0.92, curveStat: 0.95 },
      { num: 24, name: 'ONANA', role: 'MF', speedStat: 1.08, shootStat: 1.02, curveStat: 0.98 },
      { num: 8, name: 'TIELEMANS', role: 'MF', speedStat: 1.02, shootStat: 1.16, curveStat: 1.16 },
      { num: 7, name: 'DE BRUYNE', role: 'MF', speedStat: 1.06, shootStat: 1.19, curveStat: 1.25 },
      { num: 11, name: 'J. DOKU', role: 'FW', speedStat: 1.18, shootStat: 1.08, curveStat: 1.14 },
      { num: 9, name: 'TROSSARD', role: 'FW', speedStat: 1.1, shootStat: 1.14, curveStat: 1.16 },
      { num: 10, name: 'LUKAKU', role: 'FW', speedStat: 1.11, shootStat: 1.18, curveStat: 1.02 }
    ],
    bench: [
      { num: 20, name: 'OPENDA', role: 'FW', speedStat: 1.17, shootStat: 1.12, curveStat: 1.06 }
    ]
  },
  USA: {
    id: 'USA',
    name: '미국 (USA)',
    shortName: 'USA',
    flag: '🇺🇸',
    primaryColor: 0xf8fafc,
    secondaryColor: 0x1d4ed8,
    shortsColor: 0x1e3a8a,
    gkColor: 0xdc2626,
    uiHex: '#2563eb',
    roster: [
      { num: 1, name: 'TURNER', role: 'GK', speedStat: 1.01, shootStat: 0.9, curveStat: 0.9 },
      { num: 3, name: 'RICHARDS', role: 'DF', speedStat: 1.06, shootStat: 0.9, curveStat: 0.9 },
      { num: 13, name: 'REAM', role: 'DF', speedStat: 0.98, shootStat: 0.9, curveStat: 0.92 },
      { num: 2, name: 'DEST', role: 'DF', speedStat: 1.13, shootStat: 1.02, curveStat: 1.12 },
      { num: 5, name: 'A. ROBINSON', role: 'DF', speedStat: 1.15, shootStat: 0.96, curveStat: 1.04 },
      { num: 4, name: 'ADAMS', role: 'MF', speedStat: 1.08, shootStat: 0.98, curveStat: 0.98 },
      { num: 8, name: 'MCKENNIE', role: 'MF', speedStat: 1.08, shootStat: 1.08, curveStat: 1.05 },
      { num: 7, name: 'REYNA', role: 'MF', speedStat: 1.07, shootStat: 1.1, curveStat: 1.16 },
      { num: 21, name: 'T. WEAH', role: 'FW', speedStat: 1.15, shootStat: 1.1, curveStat: 1.08 },
      { num: 20, name: 'BALOGUN', role: 'FW', speedStat: 1.13, shootStat: 1.14, curveStat: 1.06 },
      { num: 10, name: 'PULISIC', role: 'FW', speedStat: 1.15, shootStat: 1.15, curveStat: 1.16 }
    ],
    bench: [
      { num: 9, name: 'PEPI', role: 'FW', speedStat: 1.09, shootStat: 1.13, curveStat: 1.04 }
    ]
  },
  MEX: {
    id: 'MEX',
    name: '멕시코 (MEXICO)',
    shortName: 'MEX',
    flag: '🇲🇽',
    primaryColor: 0x15803d,
    secondaryColor: 0xdc2626,
    shortsColor: 0xffffff,
    gkColor: 0xf97316,
    uiHex: '#15803d',
    roster: [
      { num: 1, name: 'OCHOA', role: 'GK', speedStat: 1.02, shootStat: 0.9, curveStat: 0.9 },
      { num: 3, name: 'MONTES', role: 'DF', speedStat: 1.04, shootStat: 0.92, curveStat: 0.9 },
      { num: 5, name: 'VASQUEZ', role: 'DF', speedStat: 1.06, shootStat: 0.9, curveStat: 0.9 },
      { num: 2, name: 'J. SANCHEZ', role: 'DF', speedStat: 1.08, shootStat: 0.94, curveStat: 0.96 },
      { num: 6, name: 'ARTEAGA', role: 'DF', speedStat: 1.08, shootStat: 0.95, curveStat: 0.98 },
      { num: 4, name: 'E. ALVAREZ', role: 'MF', speedStat: 1.05, shootStat: 1.04, curveStat: 1.0 },
      { num: 18, name: 'CHAVEZ', role: 'MF', speedStat: 1.03, shootStat: 1.16, curveStat: 1.22 },
      { num: 17, name: 'PINEDA', role: 'MF', speedStat: 1.09, shootStat: 1.08, curveStat: 1.1 },
      { num: 15, name: 'ANTUNA', role: 'FW', speedStat: 1.14, shootStat: 1.06, curveStat: 1.06 },
      { num: 22, name: 'LOZANO', role: 'FW', speedStat: 1.16, shootStat: 1.12, curveStat: 1.12 },
      { num: 9, name: 'S. GIMENEZ', role: 'FW', speedStat: 1.1, shootStat: 1.16, curveStat: 1.08 }
    ],
    bench: [
      { num: 11, name: 'QUINONES', role: 'FW', speedStat: 1.12, shootStat: 1.12, curveStat: 1.06 }
    ]
  },
  MAR: {
    id: 'MAR',
    name: '모로코 (MOROCCO)',
    shortName: 'MAR',
    flag: '🇲🇦',
    primaryColor: 0xc81e1e,
    secondaryColor: 0x047857,
    shortsColor: 0x047857,
    gkColor: 0x8b5cf6,
    uiHex: '#c81e1e',
    roster: [
      { num: 1, name: 'BONO', role: 'GK', speedStat: 1.03, shootStat: 0.9, curveStat: 0.9 },
      { num: 5, name: 'AGUERD', role: 'DF', speedStat: 1.07, shootStat: 0.92, curveStat: 0.9 },
      { num: 6, name: 'SAISS', role: 'DF', speedStat: 1.01, shootStat: 0.92, curveStat: 0.9 },
      { num: 2, name: 'A. HAKIMI', role: 'DF', speedStat: 1.18, shootStat: 1.1, curveStat: 1.14 },
      { num: 3, name: 'MAZRAOUI', role: 'DF', speedStat: 1.09, shootStat: 0.98, curveStat: 1.04 },
      { num: 4, name: 'AMRABAT', role: 'MF', speedStat: 1.06, shootStat: 1.02, curveStat: 0.98 },
      { num: 8, name: 'OUNAHI', role: 'MF', speedStat: 1.1, shootStat: 1.08, curveStat: 1.14 },
      { num: 10, name: 'BRAHIM DIAZ', role: 'MF', speedStat: 1.14, shootStat: 1.12, curveStat: 1.18 },
      { num: 7, name: 'H. ZIYECH', role: 'FW', speedStat: 1.08, shootStat: 1.14, curveStat: 1.24 },
      { num: 17, name: 'BOUFAL', role: 'FW', speedStat: 1.12, shootStat: 1.08, curveStat: 1.18 },
      { num: 19, name: 'EN-NESYRI', role: 'FW', speedStat: 1.11, shootStat: 1.15, curveStat: 1.02 }
    ],
    bench: [
      { num: 9, name: 'EL KAABI', role: 'FW', speedStat: 1.09, shootStat: 1.14, curveStat: 1.06 }
    ]
  }
};

export type PlayerRole = 'GK' | 'DF' | 'MF' | 'FW';

export type GoalCelebrationType =
  | 'KNEE_SLIDE'
  | 'GOALPOST_HANG'
  | 'SIUUU_JUMP'
  | 'AIRPLANE_SLIDE'
  | 'BACKFLIP'
  | 'TEAMMATE_CHEER';

export class Player {
  public id: string;
  public team: 'HOME' | 'AWAY';
  public teamConfig: TeamConfig;
  public role: PlayerRole;
  public shirtNumber: number;
  public starName: string;
  public nameLabel: string;

  // Individual Star Attributes & Stamina
  public speedStat: number = 1.0;
  public shootStat: number = 1.0;
  public curveStat: number = 1.0;
  public stamina: number = 100; // 0 to 100

  public group: THREE.Group;
  public bodyGroup: THREE.Group;
  private torsoMesh: THREE.Mesh;
  private leftLeg: THREE.Group;
  private rightLeg: THREE.Group;
  private leftShin: THREE.Group;
  private rightShin: THREE.Group;
  private leftArm: THREE.Group;
  private rightArm: THREE.Group;
  private activeRing: THREE.Mesh;
  private overheadArrow: THREE.Mesh;
  private yellowCardBadge: THREE.Mesh;

  // 3D Overhead Nameplate & Stamina Sprite
  private nameSprite: THREE.Sprite;
  private nameCanvas: HTMLCanvasElement;
  private nameTexture: THREE.CanvasTexture;
  private lastHudKey: string = '';

  public position: THREE.Vector3 = new THREE.Vector3();
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public homePosition: THREE.Vector3 = new THREE.Vector3();
  public setPieceTarget: THREE.Vector3 | null = null;
  public facingAngle: number = 0;

  // Discipline / Card Status
  public yellowCards: number = 0;
  public redCard: boolean = false;
  public isSentOff: boolean = false;

  // Action Timers
  public slideTimer: number = 0;
  public slideCooldown: number = 0;
  public slideDir: THREE.Vector3 = new THREE.Vector3();
  public slideHasDealtContact: boolean = false;

  public kickAnimTimer: number = 0;
  public fallenTimer: number = 0;
  public jumpTimer: number = 0;
  public diveTimer: number = 0;
  public diveDirZ: number = 0;
  public gkSaveCooldown: number = 0;

  // Skill Move & Celebration & Throw-in & Dash Burst States
  public skillTimer: number = 0;
  public skillCooldown: number = 0;
  public celebrationTimer: number = 0;
  public celebrationDuration: number = 3.0;
  public celebrationType: GoalCelebrationType = 'KNEE_SLIDE';
  public celebrationTarget: THREE.Vector3 | null = null;
  private celebrationArrivedAtTarget: boolean = false;
  private celebrationHangStart: number = 0;
  public isThrowInTaker: boolean = false;
  public dashBurstTimer: number = 0;
  private wasSprinting: boolean = false;

  public controllerSlot: ControllerSlot = 'NONE';
  public inDefensiveWall: boolean = false;

  public get isControlled(): boolean {
    return this.controllerSlot !== 'NONE';
  }

  public set isControlled(val: boolean) {
    this.controllerSlot = val ? 'P1' : 'NONE';
  }

  private animPhase: number = Math.random() * Math.PI * 2;

  constructor(
    scene: THREE.Scene,
    id: string,
    team: 'HOME' | 'AWAY',
    teamConfig: TeamConfig,
    profile: StarPlayerProfile,
    homeX: number,
    homeZ: number
  ) {
    this.id = id;
    this.team = team;
    this.teamConfig = teamConfig;
    this.role = profile.role;
    this.shirtNumber = profile.num;
    this.starName = profile.name;
    this.speedStat = profile.speedStat;
    this.shootStat = profile.shootStat;
    this.curveStat = profile.curveStat;
    this.nameLabel = `${profile.name} (#${profile.num})`;

    this.homePosition.set(homeX, 0, homeZ);
    this.position.set(homeX, 0, homeZ);
    this.facingAngle = team === 'HOME' ? Math.PI / 2 : -Math.PI / 2;

    this.group = new THREE.Group();
    this.bodyGroup = new THREE.Group();
    this.group.add(this.bodyGroup);

    const isGK = this.role === 'GK';
    const jerseyColor = isGK ? teamConfig.gkColor : teamConfig.primaryColor;
    const trimColor = teamConfig.secondaryColor;
    const shortsHex = isGK ? 0x111827 : teamConfig.shortsColor;

    // Torso with Jersey Number Texture
    const jerseyTex = this.createJerseyTexture(jerseyColor, trimColor, this.shirtNumber);
    const torsoMat = new THREE.MeshStandardMaterial({
      map: jerseyTex,
      roughness: 0.65
    });
    this.torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.92, 0.42), torsoMat);
    this.torsoMesh.position.y = 1.38;
    this.torsoMesh.castShadow = true;
    this.bodyGroup.add(this.torsoMesh);

    // Shorts
    const shortsMat = new THREE.MeshStandardMaterial({ color: shortsHex, roughness: 0.7 });
    const shorts = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.36, 0.4), shortsMat);
    shorts.position.y = 0.82;
    shorts.castShadow = true;
    this.bodyGroup.add(shorts);

    // Head & Hair
    const skinTones = [0xf1c27d, 0xe0ac69, 0xc68642, 0xffdbac, 0x8d5524];
    const skinMat = new THREE.MeshStandardMaterial({
      color: skinTones[this.shirtNumber % skinTones.length],
      roughness: 0.6
    });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), skinMat);
    head.position.y = 2.15;
    head.castShadow = true;
    this.bodyGroup.add(head);

    const hairMat = new THREE.MeshStandardMaterial({
      color: this.shirtNumber % 3 === 0 ? 0x27272a : this.shirtNumber % 3 === 1 ? 0x451a03 : 0x111827
    });
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.29, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58),
      hairMat
    );
    hair.position.y = 2.18;
    hair.rotation.x = -0.15;
    this.bodyGroup.add(hair);

    // Arms
    this.leftArm = this.createLimb(jerseyColor, skinMat, 0.18, 0.72, isGK);
    this.leftArm.position.set(-0.48, 1.76, 0);
    this.rightArm = this.createLimb(jerseyColor, skinMat, 0.18, 0.72, isGK);
    this.rightArm.position.set(0.48, 1.76, 0);
    this.bodyGroup.add(this.leftArm, this.rightArm);

    // Legs (thigh + knee-articulated shin)
    const leftParts = this.createLeg(jerseyColor, skinMat);
    this.leftLeg = leftParts.leg;
    this.leftShin = leftParts.shin;
    this.leftLeg.position.set(-0.2, 0.72, 0);

    const rightParts = this.createLeg(jerseyColor, skinMat);
    this.rightLeg = rightParts.leg;
    this.rightShin = rightParts.shin;
    this.rightLeg.position.set(0.2, 0.72, 0);
    this.bodyGroup.add(this.leftLeg, this.rightLeg);

    // Active Player Ground Neon Ring
    const ringGeo = new THREE.RingGeometry(0.75, 0.95, 28);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: team === 'HOME' ? 0x00e5ff : 0xff4081,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    this.activeRing = new THREE.Mesh(ringGeo, ringMat);
    this.activeRing.position.y = 0.04;
    this.activeRing.visible = false;
    this.group.add(this.activeRing);

    // Overhead Active Marker (Inverted cone)
    const arrowGeo = new THREE.ConeGeometry(0.22, 0.38, 4);
    arrowGeo.rotateX(Math.PI);
    const arrowMat = new THREE.MeshBasicMaterial({
      color: team === 'HOME' ? 0x00e5ff : 0xff4081
    });
    this.overheadArrow = new THREE.Mesh(arrowGeo, arrowMat);
    this.overheadArrow.position.y = 2.85;
    this.overheadArrow.visible = false;
    this.group.add(this.overheadArrow);

    // Overhead Yellow Card Warning Indicator
    const ycGeo = new THREE.PlaneGeometry(0.28, 0.38);
    const ycMat = new THREE.MeshBasicMaterial({
      color: 0xffea00,
      side: THREE.DoubleSide
    });
    this.yellowCardBadge = new THREE.Mesh(ycGeo, ycMat);
    this.yellowCardBadge.position.set(0.55, 2.75, 0);
    this.yellowCardBadge.visible = false;
    this.group.add(this.yellowCardBadge);

    // 3D Overhead Star Name & Stamina Bar Sprite
    this.nameCanvas = document.createElement('canvas');
    this.nameCanvas.width = 256;
    this.nameCanvas.height = 72;
    this.nameTexture = new THREE.CanvasTexture(this.nameCanvas);
    this.nameSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.nameTexture, transparent: true, depthTest: false })
    );
    this.nameSprite.scale.set(2.9, 0.82, 1);
    this.nameSprite.position.set(0, 3.45, 0);
    this.nameSprite.visible = false;
    this.group.add(this.nameSprite);

    this.group.position.copy(this.position);
    scene.add(this.group);
  }

  public substituteWithBenchProfile(benchProfile: StarPlayerProfile): void {
    this.shirtNumber = benchProfile.num;
    this.starName = benchProfile.name;
    this.speedStat = benchProfile.speedStat;
    this.shootStat = benchProfile.shootStat;
    this.curveStat = benchProfile.curveStat;
    this.nameLabel = `${benchProfile.name} (#${benchProfile.num})`;
    this.stamina = 100;
    this.yellowCards = 0;

    const isGK = this.role === 'GK';
    const jerseyColor = isGK ? this.teamConfig.gkColor : this.teamConfig.primaryColor;
    const jerseyTex = this.createJerseyTexture(jerseyColor, this.teamConfig.secondaryColor, this.shirtNumber);
    (this.torsoMesh.material as THREE.MeshStandardMaterial).map = jerseyTex;
    (this.torsoMesh.material as THREE.MeshStandardMaterial).needsUpdate = true;
    this.lastHudKey = '';
  }

  private createJerseyTexture(primaryHex: number, secondaryHex: number, num: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const pColor = '#' + primaryHex.toString(16).padStart(6, '0');
    const sColor = '#' + secondaryHex.toString(16).padStart(6, '0');

    ctx.fillStyle = pColor;
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = sColor;
    ctx.fillRect(0, 0, 256, 28);
    ctx.fillRect(0, 224, 256, 32);

    ctx.fillStyle = primaryHex > 0xaaaaaa ? '#0f172a' : '#ffffff';
    ctx.font = '900 120px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(num), 128, 134);

    return new THREE.CanvasTexture(canvas);
  }

  private createLimb(
    sleeveHex: number,
    skinMat: THREE.Material,
    radius: number,
    len: number,
    isGK: boolean
  ): THREE.Group {
    const g = new THREE.Group();
    const sleeveMat = new THREE.MeshStandardMaterial({ color: sleeveHex, roughness: 0.7 });
    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(radius, len * 0.45, radius), sleeveMat);
    sleeve.position.y = -len * 0.22;
    g.add(sleeve);

    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 0.85, len * 0.55, radius * 0.85),
      isGK ? new THREE.MeshStandardMaterial({ color: 0xfef08a }) : skinMat
    );
    arm.position.y = -len * 0.7;
    g.add(arm);
    return g;
  }

  private createLeg(sockHex: number, skinMat: THREE.Material): { leg: THREE.Group; shin: THREE.Group } {
    const g = new THREE.Group();
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.34, 0.22), skinMat);
    thigh.position.y = -0.17;
    g.add(thigh);

    const shin = new THREE.Group();
    shin.position.y = -0.34;
    g.add(shin);

    const sockMat = new THREE.MeshStandardMaterial({ color: sockHex, roughness: 0.7 });
    const sock = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.32, 0.2), sockMat);
    sock.position.y = -0.14;
    shin.add(sock);

    const bootMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4 });
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.34), bootMat);
    boot.position.set(0, -0.31, 0.05);
    shin.add(boot);

    return { leg: g, shin };
  }

  public triggerSkillMove(): boolean {
    if (this.skillTimer > 0 || this.skillCooldown > 0 || this.fallenTimer > 0 || this.slideTimer > 0) {
      return false;
    }
    this.skillTimer = 0.52;
    this.skillCooldown = 1.4;
    this.stamina = Math.max(10, this.stamina - 6);
    return true;
  }

  public triggerGoalCelebration(
    duration: number = 3.2,
    type: GoalCelebrationType = 'KNEE_SLIDE',
    target: THREE.Vector3 | null = null
  ): void {
    this.celebrationTimer = duration;
    this.celebrationDuration = duration;
    this.celebrationType = type;
    this.celebrationTarget = target ? target.clone() : null;
    this.celebrationArrivedAtTarget = false;
    this.celebrationHangStart = 0;
    this.slideTimer = 0;
    this.fallenTimer = 0;
    this.diveTimer = 0;
  }

  public resetPose(): void {
    this.celebrationTimer = 0;
    this.celebrationTarget = null;
    this.bodyGroup.position.y = 0;
    this.bodyGroup.rotation.set(0, this.facingAngle, 0);
    this.leftArm.rotation.set(0, 0, 0);
    this.rightArm.rotation.set(0, 0, 0);
    this.leftLeg.rotation.set(0, 0, 0);
    this.rightLeg.rotation.set(0, 0, 0);
    this.leftShin.rotation.set(0, 0, 0);
    this.rightShin.rotation.set(0, 0, 0);
  }

  public triggerSlideTackle(dir: THREE.Vector3): boolean {
    if (this.slideTimer > 0 || this.slideCooldown > 0 || this.fallenTimer > 0 || this.isSentOff) {
      return false;
    }
    this.slideTimer = 0.48;
    this.slideCooldown = 1.15;
    this.slideHasDealtContact = false;
    this.stamina = Math.max(5, this.stamina - 5);

    if (dir.lengthSq() > 0.01) {
      this.slideDir.copy(dir).normalize();
    } else {
      this.slideDir.set(Math.sin(this.facingAngle), 0, Math.cos(this.facingAngle));
    }
    this.facingAngle = Math.atan2(this.slideDir.x, this.slideDir.z);
    return true;
  }

  public triggerFallDown(duration: number = 1.4): void {
    this.fallenTimer = duration;
    this.slideTimer = 0;
    this.velocity.set(0, 0, 0);
  }

  public triggerWallJump(): void {
    if (this.jumpTimer <= 0) {
      this.jumpTimer = 0.65;
    }
  }

  public triggerGKDive(dirZ: number): void {
    if (this.diveTimer <= 0) {
      this.diveTimer = 0.75;
      this.diveDirZ = dirZ;
    }
  }

  public getEffectiveSpeedMultiplier(isSprinting: boolean): number {
    const staminaFactor = 0.9 + 0.1 * (this.stamina / 100);
    const skillBoost = this.skillTimer > 0 ? 1.3 : 1.0;
    const dashBurst = isSprinting && this.dashBurstTimer > 0 ? 1.18 : 1.0;
    return this.speedStat * (isSprinting ? staminaFactor : 1.0) * skillBoost * dashBurst;
  }

  public update(dt: number, isSprinting: boolean = false): void {
    if (this.isSentOff) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;

    if (isSprinting && !this.wasSprinting) {
      this.dashBurstTimer = 0.45;
    }
    this.wasSprinting = isSprinting;
    if (this.dashBurstTimer > 0) this.dashBurstTimer = Math.max(0, this.dashBurstTimer - dt);

    if (this.slideCooldown > 0) this.slideCooldown = Math.max(0, this.slideCooldown - dt);
    if (this.skillCooldown > 0) this.skillCooldown = Math.max(0, this.skillCooldown - dt);
    if (this.kickAnimTimer > 0) this.kickAnimTimer = Math.max(0, this.kickAnimTimer - dt);
    if (this.gkSaveCooldown > 0) this.gkSaveCooldown = Math.max(0, this.gkSaveCooldown - dt);

    // Stamina drain / recovery
    const moveSpd = Math.hypot(this.velocity.x, this.velocity.z);
    if (isSprinting && moveSpd > 6.5) {
      this.stamina = Math.max(15, this.stamina - dt * 3.2);
    } else {
      this.stamina = Math.min(100, this.stamina + dt * 4.2);
    }

    // Goal Celebration Animations (Knee Slide, Goalpost Hang, Siuuu Jump, Airplane Slide, Backflip, Teammate Cheer)
    if (this.celebrationTimer > 0) {
      this.celebrationTimer = Math.max(0, this.celebrationTimer - dt);
      this.updateCelebrationAnimation(dt);
      this.position.x = THREE.MathUtils.clamp(this.position.x, -56, 56);
      this.position.z = THREE.MathUtils.clamp(this.position.z, -38, 38);
      this.group.position.copy(this.position);
      this.syncIndicators();
      return;
    }

    // Reset extra celebration joint rotations when not celebrating
    this.leftArm.rotation.z = 0;
    this.rightArm.rotation.z = 0;
    this.leftLeg.rotation.z = 0;
    this.rightLeg.rotation.z = 0;
    this.leftShin.rotation.x = 0;
    this.rightShin.rotation.x = 0;

    // Fallen (Fouled) State
    if (this.fallenTimer > 0) {
      this.fallenTimer = Math.max(0, this.fallenTimer - dt);
      this.bodyGroup.rotation.x = Math.PI * 0.46;
      this.bodyGroup.position.y = 0.25;
      this.syncIndicators();
      return;
    }

    // GK Horizontal Dive
    if (this.diveTimer > 0) {
      this.diveTimer = Math.max(0, this.diveTimer - dt);
      this.position.z += this.diveDirZ * 9.5 * dt;
      this.position.z = THREE.MathUtils.clamp(this.position.z, -7.2, 7.2);
      this.bodyGroup.rotation.z = -this.diveDirZ * 1.15;
      this.bodyGroup.position.y = Math.sin((this.diveTimer / 0.75) * Math.PI) * 0.75;
      this.group.position.copy(this.position);
      this.syncIndicators();
      return;
    } else {
      this.bodyGroup.rotation.z = 0;
    }

    // Slide Tackle Lunging
    if (this.slideTimer > 0) {
      this.slideTimer = Math.max(0, this.slideTimer - dt);
      const slideSpeed = 13.8 * (0.4 + (this.slideTimer / 0.48) * 0.6);
      this.velocity.set(this.slideDir.x * slideSpeed, 0, this.slideDir.z * slideSpeed);
      this.position.addScaledVector(this.velocity, dt);

      this.bodyGroup.rotation.x = -Math.PI * 0.38;
      this.bodyGroup.position.y = 0.18;
      this.rightLeg.rotation.x = -0.75;
      this.leftLeg.rotation.x = 0.45;
    } else {
      this.bodyGroup.rotation.x = 0;

      // Defensive Wall Jump
      if (this.jumpTimer > 0) {
        this.jumpTimer = Math.max(0, this.jumpTimer - dt);
        this.bodyGroup.position.y = Math.sin((this.jumpTimer / 0.65) * Math.PI) * 1.15;
      } else {
        this.bodyGroup.position.y = 0;
      }

      this.position.addScaledVector(this.velocity, dt);

      const speed = Math.hypot(this.velocity.x, this.velocity.z);
      if (speed > 0.25) {
        this.facingAngle = Math.atan2(this.velocity.x, this.velocity.z);
        this.animPhase += dt * (4.5 + speed * 0.95);
        const swing = Math.sin(this.animPhase) * Math.min(0.85, speed * 0.08);
        this.leftLeg.rotation.x = swing;
        this.rightLeg.rotation.x = -swing;
        this.leftShin.rotation.x = Math.max(0, -swing * 0.55);
        this.rightShin.rotation.x = Math.max(0, swing * 0.55);
        this.leftArm.rotation.x = -swing * 0.75;
        this.rightArm.rotation.x = swing * 0.75;
      } else {
        this.leftLeg.rotation.x *= 0.85;
        this.rightLeg.rotation.x *= 0.85;
        this.leftArm.rotation.x *= 0.85;
        this.rightArm.rotation.x *= 0.85;
      }

      if (this.isThrowInTaker) {
        // Hold ball overhead with both hands
        this.leftArm.rotation.x = -Math.PI * 0.85;
        this.rightArm.rotation.x = -Math.PI * 0.85;
      }

      if (this.kickAnimTimer > 0) {
        this.rightLeg.rotation.x = -1.15 * (this.kickAnimTimer / 0.25);
      }
    }

    // Clamp to outer stadium apron
    this.position.x = THREE.MathUtils.clamp(this.position.x, -56, 56);
    this.position.z = THREE.MathUtils.clamp(this.position.z, -38, 38);

    this.group.position.copy(this.position);

    // Marseille 360° Skill Spin visual rotation!
    if (this.skillTimer > 0) {
      this.skillTimer = Math.max(0, this.skillTimer - dt);
      const spinProgress = (0.52 - this.skillTimer) / 0.52;
      this.bodyGroup.rotation.y = this.facingAngle + spinProgress * Math.PI * 2;
    } else {
      this.bodyGroup.rotation.y = this.facingAngle;
    }

    this.syncIndicators();
  }

  private updateCelebrationAnimation(dt: number): void {
    const elapsed = Math.max(0, this.celebrationDuration - this.celebrationTimer);
    const applyRunStride = (spd: number, armRaiseBias: number = 0) => {
      this.animPhase += dt * (6.0 + spd * 0.9);
      const swing = Math.sin(this.animPhase) * 0.85;
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
      this.leftLeg.rotation.z = 0;
      this.rightLeg.rotation.z = 0;
      this.leftShin.rotation.x = Math.max(0, -swing * 0.6);
      this.rightShin.rotation.x = Math.max(0, swing * 0.6);
      this.leftArm.rotation.x = -swing * 0.7 - armRaiseBias;
      this.rightArm.rotation.x = swing * 0.7 - armRaiseBias;
      this.leftArm.rotation.z = -0.18;
      this.rightArm.rotation.z = 0.18;
      this.bodyGroup.position.y = Math.abs(Math.sin(this.animPhase)) * 0.12;
      this.bodyGroup.rotation.x = 0.08;
      this.bodyGroup.rotation.z = 0;
    };

    const applyKneeSlidePose = (tWave: number) => {
      this.bodyGroup.position.y = -0.34;
      this.bodyGroup.rotation.x = -0.26;
      this.bodyGroup.rotation.z = 0;
      this.leftLeg.rotation.x = -0.22;
      this.rightLeg.rotation.x = -0.22;
      this.leftLeg.rotation.z = -0.06;
      this.rightLeg.rotation.z = 0.06;
      this.leftShin.rotation.x = 1.62;
      this.rightShin.rotation.x = 1.62;
      // Spread arms wide & pump fists triumphantly while sliding on knees
      this.leftArm.rotation.x = -0.55 + Math.sin(tWave * 8) * 0.18;
      this.rightArm.rotation.x = -0.55 + Math.sin(tWave * 8) * 0.18;
      this.leftArm.rotation.z = -1.05 - Math.cos(tWave * 6) * 0.2;
      this.rightArm.rotation.z = 1.05 + Math.cos(tWave * 6) * 0.2;
    };

    switch (this.celebrationType) {
      case 'KNEE_SLIDE': {
        if (elapsed < 0.65) {
          // Sprint toward corner/touchline before dropping to knees
          const runSpd = 10.5;
          const dir = new THREE.Vector3(Math.sin(this.facingAngle), 0, Math.cos(this.facingAngle));
          this.velocity.copy(dir).multiplyScalar(runSpd);
          this.position.addScaledVector(this.velocity, dt);
          applyRunStride(runSpd, 0.85);
          this.bodyGroup.rotation.y = this.facingAngle;
        } else if (elapsed < 2.55) {
          // Smoothly slide on both knees across the grass!
          const slideFrac = (elapsed - 0.65) / 1.9;
          const slideSpeed = 10.2 * Math.pow(Math.max(0, 1 - slideFrac), 1.35);
          const dir = new THREE.Vector3(Math.sin(this.facingAngle), 0, Math.cos(this.facingAngle));
          this.position.addScaledVector(dir, slideSpeed * dt);
          applyKneeSlidePose(elapsed);
          this.bodyGroup.rotation.y = this.facingAngle;
        } else {
          // Pop back up & double fist-pump roar
          this.bodyGroup.position.y = Math.abs(Math.sin(elapsed * 8)) * 0.35;
          this.bodyGroup.rotation.x = -0.08;
          this.leftLeg.rotation.x = 0;
          this.rightLeg.rotation.x = 0;
          this.leftShin.rotation.x = 0;
          this.rightShin.rotation.x = 0;
          this.leftArm.rotation.x = -Math.PI * 0.85;
          this.rightArm.rotation.x = -Math.PI * 0.85;
          this.leftArm.rotation.z = -0.35;
          this.rightArm.rotation.z = 0.35;
          this.bodyGroup.rotation.y = this.facingAngle;
        }
        break;
      }

      case 'GOALPOST_HANG': {
        const target = this.celebrationTarget;
        if (!this.celebrationArrivedAtTarget && target) {
          const toPost = target.clone().sub(this.position);
          toPost.y = 0;
          const dist = toPost.length();
          if (dist > 0.55 && elapsed < 1.35) {
            toPost.normalize();
            const sprintSpd = 11.5;
            this.velocity.copy(toPost).multiplyScalar(sprintSpd);
            this.position.addScaledVector(this.velocity, dt);
            this.facingAngle = Math.atan2(toPost.x, toPost.z);
            applyRunStride(sprintSpd, 1.25);
            this.bodyGroup.rotation.y = this.facingAngle;
            break;
          }
          this.celebrationArrivedAtTarget = true;
          this.celebrationHangStart = elapsed;
          this.position.copy(target);
          // Face back out toward the stadium/camera while gripping the crossbar
          this.facingAngle = target.x > 0 ? -Math.PI / 2 : Math.PI / 2;
        }

        const hangElapsed = elapsed - this.celebrationHangStart;
        if (elapsed < 2.8) {
          // Leap up and hang from the 3.45m crossbar with both hands, swinging and kicking legs!
          const jumpBlend = Math.min(1, hangElapsed / 0.18);
          this.bodyGroup.position.y = THREE.MathUtils.lerp(0, 1.07, jumpBlend) + Math.sin(hangElapsed * 5.2) * 0.05;
          this.bodyGroup.rotation.y = this.facingAngle;
          this.bodyGroup.rotation.x = Math.sin(hangElapsed * 5.2) * 0.28 * jumpBlend;
          this.bodyGroup.rotation.z = 0;

          // Both hands locked tightly onto the crossbar overhead
          this.leftArm.rotation.x = -Math.PI * 0.96;
          this.rightArm.rotation.x = -Math.PI * 0.96;
          this.leftArm.rotation.z = 0.08;
          this.rightArm.rotation.z = -0.08;

          // Legs kicking & bending joyfully in mid-air
          this.leftLeg.rotation.x = 0.35 + Math.sin(hangElapsed * 7.5) * 0.32;
          this.rightLeg.rotation.x = 0.35 - Math.sin(hangElapsed * 7.5) * 0.32;
          this.leftLeg.rotation.z = -0.1;
          this.rightLeg.rotation.z = 0.1;
          this.leftShin.rotation.x = 0.72;
          this.rightShin.rotation.x = 0.72;
        } else {
          // Drop cleanly back down to the grass
          const dropFrac = Math.min(1, (elapsed - 2.8) / 0.35);
          this.bodyGroup.position.y = THREE.MathUtils.lerp(1.07, 0, dropFrac);
          this.bodyGroup.rotation.x = 0;
          this.bodyGroup.rotation.y = this.facingAngle;
          this.leftArm.rotation.x = -1.2;
          this.rightArm.rotation.x = -1.2;
          this.leftArm.rotation.z = -0.8;
          this.rightArm.rotation.z = 0.8;
          this.leftLeg.rotation.x = 0;
          this.rightLeg.rotation.x = 0;
          this.leftShin.rotation.x = 0;
          this.rightShin.rotation.x = 0;
        }
        break;
      }

      case 'SIUUU_JUMP': {
        if (elapsed < 0.75) {
          const dir = new THREE.Vector3(Math.sin(this.facingAngle), 0, Math.cos(this.facingAngle));
          this.position.addScaledVector(dir, 9.2 * dt);
          applyRunStride(9.2, 0.4);
          this.bodyGroup.rotation.y = this.facingAngle;
        } else if (elapsed < 1.38) {
          // Explosive mid-air 180-degree spin!
          const jFrac = (elapsed - 0.75) / 0.63;
          this.bodyGroup.position.y = Math.sin(jFrac * Math.PI) * 1.48;
          this.bodyGroup.rotation.y = this.facingAngle + jFrac * Math.PI;
          this.bodyGroup.rotation.x = -0.1;
          this.leftLeg.rotation.x = -0.25;
          this.rightLeg.rotation.x = -0.25;
          this.leftShin.rotation.x = 0.75;
          this.rightShin.rotation.x = 0.75;
          this.leftArm.rotation.x = -1.4;
          this.rightArm.rotation.x = -1.4;
          this.leftArm.rotation.z = -0.35;
          this.rightArm.rotation.z = 0.35;
        } else {
          // Iconic wide landing stance ("SIUUU!")
          this.bodyGroup.position.y = 0;
          this.bodyGroup.rotation.y = this.facingAngle + Math.PI;
          this.bodyGroup.rotation.x = -0.15;
          this.bodyGroup.rotation.z = 0;
          this.leftLeg.rotation.x = 0;
          this.rightLeg.rotation.x = 0;
          this.leftLeg.rotation.z = -0.32;
          this.rightLeg.rotation.z = 0.32;
          this.leftShin.rotation.x = 0;
          this.rightShin.rotation.x = 0;
          this.leftArm.rotation.x = 0.48;
          this.rightArm.rotation.x = 0.48;
          this.leftArm.rotation.z = -0.68;
          this.rightArm.rotation.z = 0.68;
        }
        break;
      }

      case 'AIRPLANE_SLIDE': {
        if (elapsed < 1.35) {
          // Airplane sprint with wings banked left/right
          const dir = new THREE.Vector3(Math.sin(this.facingAngle), 0, Math.cos(this.facingAngle));
          this.position.addScaledVector(dir, 9.8 * dt);
          applyRunStride(9.8, 0);
          this.leftArm.rotation.x = 0;
          this.rightArm.rotation.x = 0;
          this.leftArm.rotation.z = -1.42;
          this.rightArm.rotation.z = 1.42;
          this.bodyGroup.rotation.z = Math.sin(elapsed * 5.2) * 0.24;
          this.bodyGroup.rotation.y = this.facingAngle;
        } else if (elapsed < 2.7) {
          // Finish with a smooth knee slide!
          const slideFrac = (elapsed - 1.35) / 1.35;
          const slideSpeed = 9.0 * Math.pow(Math.max(0, 1 - slideFrac), 1.3);
          const dir = new THREE.Vector3(Math.sin(this.facingAngle), 0, Math.cos(this.facingAngle));
          this.position.addScaledVector(dir, slideSpeed * dt);
          applyKneeSlidePose(elapsed);
          this.bodyGroup.rotation.y = this.facingAngle;
        } else {
          this.bodyGroup.position.y = 0;
          this.bodyGroup.rotation.x = 0;
          this.leftShin.rotation.x = 0;
          this.rightShin.rotation.x = 0;
          this.leftArm.rotation.x = -Math.PI * 0.85;
          this.rightArm.rotation.x = -Math.PI * 0.85;
          this.leftArm.rotation.z = -0.3;
          this.rightArm.rotation.z = 0.3;
        }
        break;
      }

      case 'BACKFLIP': {
        if (elapsed < 0.6) {
          const dir = new THREE.Vector3(Math.sin(this.facingAngle), 0, Math.cos(this.facingAngle));
          this.position.addScaledVector(dir, 8.2 * dt);
          applyRunStride(8.2, 0.3);
          this.bodyGroup.rotation.y = this.facingAngle;
        } else if (elapsed < 1.38) {
          // Full 360-degree backward somersault in mid-air!
          const flipFrac = (elapsed - 0.6) / 0.78;
          this.bodyGroup.position.y = Math.sin(flipFrac * Math.PI) * 1.95;
          this.bodyGroup.rotation.y = this.facingAngle;
          this.bodyGroup.rotation.x = -flipFrac * Math.PI * 2;
          this.bodyGroup.rotation.z = 0;
          this.leftLeg.rotation.x = -0.95;
          this.rightLeg.rotation.x = -0.95;
          this.leftShin.rotation.x = 1.65;
          this.rightShin.rotation.x = 1.65;
          this.leftArm.rotation.x = -1.6;
          this.rightArm.rotation.x = -1.6;
        } else {
          // Land & salute/cheer
          this.bodyGroup.position.y = Math.abs(Math.sin(elapsed * 7)) * 0.22;
          this.bodyGroup.rotation.x = 0;
          this.bodyGroup.rotation.y = this.facingAngle;
          this.leftLeg.rotation.x = 0;
          this.rightLeg.rotation.x = 0;
          this.leftShin.rotation.x = 0;
          this.rightShin.rotation.x = 0;
          this.leftArm.rotation.x = -Math.PI * 0.85;
          this.rightArm.rotation.x = -Math.PI * 0.85;
          this.leftArm.rotation.z = -0.45;
          this.rightArm.rotation.z = 0.45;
        }
        break;
      }

      case 'TEAMMATE_CHEER':
      default: {
        // Run toward the celebrating scorer & cheer with raised arms!
        if (this.celebrationTarget) {
          const toScorer = this.celebrationTarget.clone().sub(this.position);
          toScorer.y = 0;
          if (toScorer.length() > 2.2) {
            toScorer.normalize();
            this.position.addScaledVector(toScorer, 8.2 * dt);
            this.facingAngle = Math.atan2(toScorer.x, toScorer.z);
            applyRunStride(8.2, 1.3);
            this.bodyGroup.rotation.y = this.facingAngle;
            break;
          }
        }
        this.bodyGroup.position.y = Math.abs(Math.sin(elapsed * 8.5)) * 0.55;
        this.bodyGroup.rotation.x = 0;
        this.bodyGroup.rotation.z = 0;
        this.bodyGroup.rotation.y = this.facingAngle;
        this.leftLeg.rotation.x = 0;
        this.rightLeg.rotation.x = 0;
        this.leftShin.rotation.x = 0;
        this.rightShin.rotation.x = 0;
        this.leftArm.rotation.x = -Math.PI * 0.88 + Math.sin(elapsed * 10) * 0.2;
        this.rightArm.rotation.x = -Math.PI * 0.88 - Math.sin(elapsed * 10) * 0.2;
        this.leftArm.rotation.z = -0.35;
        this.rightArm.rotation.z = 0.35;
        break;
      }
    }
  }

  private syncIndicators(): void {
    const controlled = this.controllerSlot !== 'NONE';
    this.activeRing.visible = controlled;
    this.overheadArrow.visible = controlled;
    this.nameSprite.visible = controlled || this.celebrationTimer > 0;

    if (controlled) {
      const slotHex = this.controllerSlot === 'P2' ? 0x00e676 : 0x00e5ff;
      (this.activeRing.material as THREE.MeshBasicMaterial).color.setHex(slotHex);
      (this.overheadArrow.material as THREE.MeshBasicMaterial).color.setHex(slotHex);
      this.overheadArrow.position.y = 2.85 + Math.sin(performance.now() * 0.008) * 0.12;
      this.overheadArrow.rotation.y += 0.04;
      this.renderOverheadNameAndStamina();
    }

    this.yellowCardBadge.visible = this.yellowCards === 1 && !this.redCard;
    if (this.yellowCardBadge.visible) {
      this.yellowCardBadge.rotation.y += 0.03;
    }
  }

  private renderOverheadNameAndStamina(): void {
    const roundedStam = Math.round(this.stamina / 4) * 4;
    const key = `${this.controllerSlot}|${this.starName}|${this.shirtNumber}|${roundedStam}|${this.yellowCards}|${this.skillTimer > 0}`;
    if (this.lastHudKey === key) return;
    this.lastHudKey = key;

    const ctx = this.nameCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 72);

    const isP2 = this.controllerSlot === 'P2';
    const accentHex = isP2 ? '#00e676' : '#00e5ff';

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.roundRect(14, 6, 228, 56, 12);
    ctx.fill();

    ctx.strokeStyle = this.skillTimer > 0 ? '#facc15' : accentHex;
    ctx.lineWidth = 2.8;
    ctx.stroke();

    // Controller Tag Pill (1P or 2P) on the left of the overhead bar
    if (this.controllerSlot === 'P1' || this.controllerSlot === 'P2') {
      ctx.fillStyle = accentHex;
      ctx.beginPath();
      ctx.roundRect(22, 12, 36, 22, 6);
      ctx.fill();

      ctx.fillStyle = '#04121f';
      ctx.font = '900 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.controllerSlot === 'P2' ? '2P' : '1P', 40, 28);
    }

    // Star Name & Number
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 18px sans-serif';
    ctx.textAlign = 'center';
    const label = `${this.yellowCards > 0 ? '🟨 ' : ''}${this.starName} #${this.shirtNumber}${this.skillTimer > 0 ? ' ✨' : ''}`;
    ctx.fillText(label, 146, 29);

    // Stamina Bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(36, 42, 184, 10);

    const stamPct = Math.max(0.05, this.stamina / 100);
    ctx.fillStyle = stamPct > 0.5 ? '#00e676' : stamPct > 0.25 ? '#facc15' : '#ff1744';
    ctx.fillRect(36, 42, 184 * stamPct, 10);

    this.nameTexture.needsUpdate = true;
  }
}
