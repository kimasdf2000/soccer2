import * as THREE from 'three';

export type WorldCupBallId =
  | 'al_rihla'
  | 'telstar_18'
  | 'brazuca'
  | 'jabulani'
  | 'fevernova';

export interface WorldCupBallConfig {
  id: WorldCupBallId;
  name: string;
  year: number;
  host: string;
  subtitle: string;
  curveFactor: number;
  speedFactor: number;
  knuckleFactor: number;
  accentColor: string;
}

export interface TeamConfig {
  id: string;
  name: string;
  shortName: string;
  flag: string;
  primaryColor: number;
  secondaryColor: number;
  shortsColor: number;
  gkColor: number;
  uiHex: string;
}

export type MatchState =
  | 'KICKOFF'
  | 'PLAYING'
  | 'FOUL_CINEMATIC'
  | 'FREE_KICK_SETUP'
  | 'FREE_KICK_PLAY'
  | 'PENALTY_SETUP'
  | 'PENALTY_PLAY'
  | 'GOAL_CELEBRATION'
  | 'OUT_OF_BOUNDS'
  | 'HALF_TIME'
  | 'FULL_TIME';

export type CameraMode = 'BROADCAST' | 'THIRD_PERSON' | 'WIDE';

export type CardType = 'NONE' | 'YELLOW' | 'SECOND_YELLOW_RED' | 'DIRECT_RED';

export interface FoulDecision {
  offenderId: string;
  offenderTeam: 'HOME' | 'AWAY';
  victimId: string;
  foulPosition: THREE.Vector3;
  isPenaltyBox: boolean;
  cardType: CardType;
  reasonKo: string;
  severity: number;
}

export interface MatchSettings {
  homeTeamId: string;
  awayTeamId: string;
  teamSize: 5 | 7 | 11;
  ballId: WorldCupBallId;
  halfDurationSec: number;
}
