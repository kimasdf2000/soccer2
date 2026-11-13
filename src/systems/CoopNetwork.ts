import Peer, { DataConnection } from 'peerjs';
import {
  ControllerSlot,
  DifficultyLevel,
  GameMode,
  MatchState,
  TacticalStance,
  WorldCupBallId
} from '../types';
import { SerializedGuestInput } from './TouchController';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 4;
const PEER_PREFIX = 'fwc3d-coop-';

export interface CoopInitPayload {
  homeTeamId: string;
  awayTeamId: string;
  teamSize: 5 | 7 | 11;
  ballId: WorldCupBallId;
  halfDurationSec: number;
  gameMode: GameMode;
  difficulty: DifficultyLevel;
}

export interface CoopPlayerSnap {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  facing: number;
  slot: ControllerSlot;
  stam: number;
  yc: number;
  rc: boolean;
  sentOff: boolean;
  kickT: number;
  slideT: number;
  fallT: number;
  diveT: number;
  diveZ: number;
  skillT: number;
  celebT: number;
  num: number;
  name: string;
}

export interface CoopStateSnapshot {
  state: MatchState;
  half: 1 | 2;
  clock: number;
  hScore: number;
  aScore: number;
  hYC: number;
  aYC: number;
  hRC: number;
  aRC: number;
  stance: TacticalStance;
  diff: DifficultyLevel;
  ballId: WorldCupBallId;
  bx: number;
  by: number;
  bz: number;
  bvx: number;
  bvy: number;
  bvz: number;
  ownerId: string | null;
  refX: number;
  refZ: number;
  refF: number;
  players: CoopPlayerSnap[];
}

export type CoopNetPacket =
  | { t: 'init'; payload: CoopInitPayload }
  | { t: 'snap'; snap: CoopStateSnapshot }
  | { t: 'input'; input: SerializedGuestInput }
  | { t: 'banner'; title: string; sub: string; cls: string; dur: number; sound?: string }
  | { t: 'ping'; ts: number }
  | { t: 'pong'; ts: number };

export function generateRoomCode(): string {
  const buf = new Uint8Array(ROOM_CODE_LENGTH);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) buf[i] = Math.floor(Math.random() * 256);
  }
  let out = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    out += ALPHABET[buf[i] % ALPHABET.length];
  }
  return out;
}

export function normalizeRoomCode(raw: string): string | null {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length !== ROOM_CODE_LENGTH) return null;
  for (const ch of clean) {
    if (!ALPHABET.includes(ch)) return null;
  }
  return clean;
}

export function getRoomCodeFromUrl(): string | null {
  const param = new URLSearchParams(window.location.search).get('room');
  return param ? normalizeRoomCode(param) : null;
}

export class CoopNetwork {
  public role: 'NONE' | 'HOST' | 'GUEST' = 'NONE';
  public roomCode: string | null = null;
  public isConnected: boolean = false;
  public latencyMs: number = 0;

  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private pingInterval: number | null = null;

  public onStatusChange?: (statusText: string, connected: boolean, isError?: boolean) => void;
  public onGuestConnected?: () => void;
  public onGuestInput?: (input: SerializedGuestInput) => void;
  public onGuestReceiveInit?: (payload: CoopInitPayload) => void;
  public onGuestReceiveSnap?: (snap: CoopStateSnapshot) => void;
  public onGuestReceiveBanner?: (title: string, sub: string, cls: string, dur: number, sound?: string) => void;
  public onDisconnected?: (reason: string) => void;

  public disconnect(): void {
    if (this.pingInterval !== null) {
      window.clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    try {
      this.conn?.close();
    } catch {
      // ignore
    }
    try {
      this.peer?.destroy();
    } catch {
      // ignore
    }
    this.conn = null;
    this.peer = null;
    this.role = 'NONE';
    this.roomCode = null;
    this.isConnected = false;
  }

  public hostRoom(): string {
    this.disconnect();
    const code = generateRoomCode();
    this.roomCode = code;
    this.role = 'HOST';

    this.onStatusChange?.(`방 코드 [${code}] 생성 중...`, false);

    const peer = new Peer(PEER_PREFIX + code);
    this.peer = peer;

    peer.on('open', () => {
      this.onStatusChange?.(
        `대기 중 • 친구 기기에서 방 코드 [${code}] 입력 시 같은 팀(2P)으로 즉시 합류합니다!`,
        false
      );
    });

    peer.on('connection', (conn) => {
      if (this.conn && this.conn.open) {
        conn.close();
        return;
      }
      this.conn = conn;
      this.setupConnectionHandlers(conn);
    });

    peer.on('error', (err) => {
      const msg = err?.type === 'unavailable-id'
        ? '방 코드가 이미 사용 중입니다. 다시 시도해 주세요.'
        : `네트워크 오류: ${err?.message || '연결 실패'}`;
      this.onStatusChange?.(msg, false, true);
    });

    return code;
  }

  public joinRoom(rawCode: string): boolean {
    const code = normalizeRoomCode(rawCode);
    if (!code) {
      this.onStatusChange?.('방 코드는 영문/숫자 4자리로 입력해 주세요.', false, true);
      return false;
    }

    this.disconnect();
    this.roomCode = code;
    this.role = 'GUEST';
    this.onStatusChange?.(`방 [${code}] 호스트(1P)에 연결 중...`, false);

    const peer = new Peer();
    this.peer = peer;

    peer.on('open', () => {
      const conn = peer.connect(PEER_PREFIX + code, { reliable: false });
      this.conn = conn;
      this.setupConnectionHandlers(conn);
    });

    peer.on('error', (err) => {
      const msg =
        err?.type === 'peer-unavailable'
          ? `방 [${code}]을(를) 찾을 수 없습니다. 1P 기기에서 먼저 방을 만들었는지 확인하세요.`
          : `연결 오류: ${err?.message || '방 참가 실패'}`;
      this.onStatusChange?.(msg, false, true);
    });

    return true;
  }

  private setupConnectionHandlers(conn: DataConnection): void {
    conn.on('open', () => {
      this.isConnected = true;
      if (this.role === 'HOST') {
        this.onStatusChange?.(`✅ 2P 파트너 연결 완료! (방 코드: ${this.roomCode}) 같은 HOME 팀으로 협동 플레이 중!`, true);
        this.onGuestConnected?.();
      } else {
        this.onStatusChange?.(`✅ 1P 호스트와 연결 완료! (방 코드: ${this.roomCode}) [2P 그린] 선수를 조작합니다!`, true);
      }

      if (this.pingInterval !== null) window.clearInterval(this.pingInterval);
      this.pingInterval = window.setInterval(() => {
        this.send({ t: 'ping', ts: performance.now() });
      }, 2000);
    });

    conn.on('data', (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      const pkt = raw as CoopNetPacket;
      switch (pkt.t) {
        case 'input':
          if (this.role === 'HOST' && pkt.input) {
            this.onGuestInput?.(pkt.input);
          }
          break;
        case 'init':
          if (this.role === 'GUEST' && pkt.payload) {
            this.onGuestReceiveInit?.(pkt.payload);
          }
          break;
        case 'snap':
          if (this.role === 'GUEST' && pkt.snap) {
            this.onGuestReceiveSnap?.(pkt.snap);
          }
          break;
        case 'banner':
          if (this.role === 'GUEST') {
            this.onGuestReceiveBanner?.(pkt.title, pkt.sub, pkt.cls, pkt.dur, pkt.sound);
          }
          break;
        case 'ping':
          this.send({ t: 'pong', ts: pkt.ts });
          break;
        case 'pong':
          this.latencyMs = Math.max(1, Math.round(performance.now() - pkt.ts));
          break;
      }
    });

    const handleClose = () => {
      const wasConnected = this.isConnected;
      this.isConnected = false;
      if (this.pingInterval !== null) {
        window.clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
      if (wasConnected) {
        this.onStatusChange?.('⚠️ 2인 협동 파트너와의 연결이 종료되었습니다.', false, true);
        this.onDisconnected?.('파트너 연결 종료');
      }
    };

    conn.on('close', handleClose);
    conn.on('error', handleClose);
  }

  public send(pkt: CoopNetPacket): void {
    if (this.conn && this.conn.open) {
      try {
        this.conn.send(pkt);
      } catch {
        // ignore transient send error
      }
    }
  }
}
