import * as THREE from 'three';

export type WorldCupBallId =
  | 'trionda_26'
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

export interface StarPlayerProfile {
  num: number;
  name: string;
  role: 'GK' | 'DF' | 'MF' | 'FW';
  speedStat: number;   // 0.85 ~ 1.18
  shootStat: number;   // 0.85 ~ 1.20
  curveStat: number;   // 0.85 ~ 1.25
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
  roster: StarPlayerProfile[];
  bench: StarPlayerProfile[];
}

export type GameMode =
  | 'EXHIBITION'
  | 'TOURNAMENT'
  | 'PENALTY_SHOOTOUT'
  | 'FREE_KICK_CHALLENGE';

export type DifficultyLevel = 'EASY' | 'NORMAL' | 'HARD' | 'LEGEND';

export type TacticalStance = 'ATTACK' | 'BALANCED' | 'DEFEND';

export type MatchState =
  | 'KICKOFF'
  | 'PLAYING'
  | 'VAR_REVIEW'
  | 'FOUL_CINEMATIC'
  | 'FREE_KICK_SETUP'
  | 'FREE_KICK_PLAY'
  | 'PENALTY_SETUP'
  | 'PENALTY_PLAY'
  | 'CORNER_KICK_SETUP'
  | 'THROW_IN_SETUP'
  | 'GOAL_CELEBRATION'
  | 'REPLAY_PLAYBACK'
  | 'HALF_TIME'
  | 'FULL_TIME'
  | 'TROPHY_CELEBRATION';

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
  useVarCheck?: boolean;
}

export interface MatchSettings {
  homeTeamId: string;
  awayTeamId: string;
  teamSize: 5 | 7 | 11;
  ballId: WorldCupBallId;
  halfDurationSec: number;
  gameMode: GameMode;
  difficulty?: DifficultyLevel;
}

export interface ReplayActorSnapshot {
  id: string;
  x: number;
  y: number;
  z: number;
  facing: number;
  kickTimer: number;
  slideTimer: number;
  diveTimer: number;
  diveDirZ: number;
}

export interface ReplayFrame {
  ballPos: THREE.Vector3;
  ballQuat: THREE.Quaternion;
  actors: ReplayActorSnapshot[];
  refPos: THREE.Vector3;
  refFacing: number;
}
