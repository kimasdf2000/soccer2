import * as THREE from 'three';
import {
  CameraMode,
  CardType,
  ControllerSlot,
  CoopPlayMode,
  DifficultyLevel,
  FoulDecision,
  GameMode,
  MatchSettings,
  MatchState,
  TacticalStance,
  TeamConfig
} from './types';
import { AudioSystem } from './systems/AudioSystem';
import { PlayerInputState, TouchController } from './systems/TouchController';
import { CoopNetwork, CoopStateSnapshot } from './systems/CoopNetwork';
import { CommentarySystem } from './systems/CommentarySystem';
import { ReplaySystem } from './systems/ReplaySystem';
import { WorldCupBall, WORLD_CUP_BALLS } from './entities/WorldCupBall';
import { Stadium } from './entities/Stadium';
import { Player, TEAMS } from './entities/Player';
import { Referee } from './entities/Referee';
import { Linesman } from './entities/Linesman';

export interface DifficultyProfile {
  id: DifficultyLevel;
  labelKo: string;
  shortKo: string;
  descKo: string;
  aiSpeedMult: number;
  aiShootSpeedMult: number;
  aiShootFreqMult: number;
  aiPassFreqMult: number;
  aiTackleFreqMult: number;
  aiStealMult: number;
  aiGkSpeedMult: number;
  aiGkDiveAccuracy: number;
}

export const DIFFICULTY_PROFILES: Record<DifficultyLevel, DifficultyProfile> = {
  EASY: {
    id: 'EASY',
    labelKo: '🌱 쉬움 (루키)',
    shortKo: '🌱쉬움',
    descKo: '상대 AI 속도와 압박이 완만하여 누구나 쉽게 드리블과 득점을 즐길 수 있습니다.',
    aiSpeedMult: 0.76,
    aiShootSpeedMult: 0.8,
    aiShootFreqMult: 0.45,
    aiPassFreqMult: 0.6,
    aiTackleFreqMult: 0.3,
    aiStealMult: 0.42,
    aiGkSpeedMult: 0.68,
    aiGkDiveAccuracy: 0.15
  },
  NORMAL: {
    id: 'NORMAL',
    labelKo: '⚽ 보통 (프로)',
    shortKo: '⚽보통',
    descKo: '균형 잡힌 AI 속도와 수비로 표준적인 월드컵 매치를 즐깁니다.',
    aiSpeedMult: 0.96,
    aiShootSpeedMult: 0.96,
    aiShootFreqMult: 0.95,
    aiPassFreqMult: 1.0,
    aiTackleFreqMult: 0.85,
    aiStealMult: 0.82,
    aiGkSpeedMult: 0.95,
    aiGkDiveAccuracy: 0.38
  },
  HARD: {
    id: 'HARD',
    labelKo: '🔥 어려움 (월드클래스)',
    shortKo: '🔥어려움',
    descKo: '빠른 압박과 날카로운 패스·슈팅을 구사하는 월드클래스 AI입니다.',
    aiSpeedMult: 1.09,
    aiShootSpeedMult: 1.08,
    aiShootFreqMult: 1.45,
    aiPassFreqMult: 1.45,
    aiTackleFreqMult: 1.25,
    aiStealMult: 1.18,
    aiGkSpeedMult: 1.18,
    aiGkDiveAccuracy: 0.62
  },
  LEGEND: {
    id: 'LEGEND',
    labelKo: '👑 레전드 (전설)',
    shortKo: '👑레전드',
    descKo: '초고속 압박, 칼같은 구석 슈팅, 동물적인 골키퍼 반응의 최고 난이도!',
    aiSpeedMult: 1.2,
    aiShootSpeedMult: 1.18,
    aiShootFreqMult: 1.95,
    aiPassFreqMult: 1.9,
    aiTackleFreqMult: 1.55,
    aiStealMult: 1.48,
    aiGkSpeedMult: 1.38,
    aiGkDiveAccuracy: 0.82
  }
};

export class Game {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  public audio: AudioSystem;
  public controls: TouchController;
  public net: CoopNetwork;
  public commentary: CommentarySystem;
  public replay: ReplaySystem;

  public stadium: Stadium;
  public ball: WorldCupBall;
  public referee: Referee;
  public northLinesman: Linesman;
  public southLinesman: Linesman;

  public players: Player[] = [];
  public homePlayers: Player[] = [];
  public awayPlayers: Player[] = [];
  public controlledPlayer: Player | null = null;
  public controlledPlayer2: Player | null = null;

  public homeTeam: TeamConfig = TEAMS.KOR;
  public awayTeam: TeamConfig = TEAMS.BRA;
  public teamSize: 5 | 7 | 11 = 7;
  public gameMode: GameMode = 'EXHIBITION';
  public difficulty: DifficultyLevel = 'NORMAL';
  public coopMode: CoopPlayMode = 'SOLO';
  public tacticalStance: TacticalStance = 'BALANCED';
  public isPaused: boolean = false;
  private netSnapTimer: number = 0;

  public get isCoopActive(): boolean {
    return (
      this.coopMode === 'LOCAL_COOP' ||
      (this.coopMode === 'ONLINE_COOP' && this.net.isConnected)
    );
  }

  public matchState: MatchState = 'KICKOFF';
  public cameraMode: CameraMode = 'BROADCAST';

  public homeScore: number = 0;
  public awayScore: number = 0;
  public homeYellows: number = 0;
  public awayYellows: number = 0;
  public homeReds: number = 0;
  public awayReds: number = 0;

  public half: 1 | 2 = 1;
  public matchClockSec: number = 0;
  public halfDurationSec: number = 180;

  // Tournament State (8강 -> 4강 -> 결승 -> 우승!)
  public tournamentRound: 1 | 2 | 3 = 1; // 1=8강(QF), 2=4강(SF), 3=결승(FINAL)
  private tournamentOpponents: string[] = ['BRA', 'FRA', 'ARG'];

  // Penalty Shootout Mode State
  public shootoutRound: number = 1;
  public shootoutIsUserTurn: boolean = true;
  public shootoutHomeResults: ('O' | 'X')[] = [];
  public shootoutAwayResults: ('O' | 'X')[] = [];

  // Free Kick Challenge Mode State
  public fkChallengeStage: number = 1;
  public fkChallengeScore: number = 0;
  public fkChallengeBest: number = 0;

  // Set-piece & Foul state
  public activeFoul: FoulDecision | null = null;
  private stateTimer: number = 0;
  private cardSoundPlayed: boolean = false;
  private secondCardSoundPlayed: boolean = false;

  private setPieceKicker: Player | null = null;
  private setPieceTeam: 'HOME' | 'AWAY' = 'HOME';
  private setPieceAimYaw: number = 0;
  private setPieceAimY: number = 1.8;
  private setPieceAimZ: number = 0;
  private aiSetPieceTimer: number = 0;
  private userPenaltyDiveChoice: number = 0;

  // Offside tracking on pass
  private pendingOffsideReceiverId: string | null = null;
  private pendingOffsideLineX: number = 0;

  // Bench substitution index
  private benchIndex: number = 0;

  // Camera smoothing vectors
  private camPosTarget: THREE.Vector3 = new THREE.Vector3(0, 26, 38);
  private camLookTarget: THREE.Vector3 = new THREE.Vector3(0, 1, 0);
  private currentCamLook: THREE.Vector3 = new THREE.Vector3(0, 1, 0);

  // Minimap Canvas
  private radarCanvas: HTMLCanvasElement;
  private radarCtx: CanvasRenderingContext2D;

  private lastFrameTime: number = performance.now();

  constructor(container: HTMLElement) {
    this.container = container;
    this.audio = new AudioSystem();
    this.controls = new TouchController();
    this.net = new CoopNetwork();
    this.commentary = new CommentarySystem();
    this.replay = new ReplaySystem();

    this.setupNetworkCallbacks();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b1528);
    this.scene.fog = new THREE.FogExp2(0x0b1528, 0.0038);

    this.camera = new THREE.PerspectiveCamera(
      46,
      window.innerWidth / window.innerHeight,
      0.5,
      260
    );
    this.camera.position.set(0, 26, 38);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.setupLighting();

    this.stadium = new Stadium(this.scene);
    this.ball = new WorldCupBall(this.scene, 'trionda_26');
    this.referee = new Referee(this.scene);
    this.northLinesman = new Linesman(this.scene, 'NORTH');
    this.southLinesman = new Linesman(this.scene, 'SOUTH');

    this.radarCanvas = document.getElementById('radar-canvas') as HTMLCanvasElement;
    this.radarCtx = this.radarCanvas.getContext('2d')!;

    window.addEventListener('resize', () => this.onResize());

    this.startNewMatch({
      homeTeamId: 'KOR',
      awayTeamId: 'BRA',
      teamSize: 7,
      ballId: 'trionda_26',
      halfDurationSec: 180,
      gameMode: 'EXHIBITION'
    });

    this.animate();
  }

  private setupLighting(): void {
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x14532d, 0.85);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.55);
    sunLight.position.set(35, 58, 32);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 160;
    const d = 62;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    this.scene.add(sunLight);
  }

  private setupNetworkCallbacks(): void {
    this.net.onGuestConnected = () => {
      this.coopMode = 'ONLINE_COOP';
      this.controls.isLocalCoop = false;
      this.controls.isOnlineCoopHost = true;
      this.syncCoopControllers();
      this.updateCoopHUDLayout();
      this.updateModeSpecificHUD();
      this.sendNetworkInitPayload();
      this.showBanner(
        '🤝 온라인 2인 협동 연결 완료! (1P + 2P 같은 팀)',
        `${this.homeTeam.flag} ${this.homeTeam.name} 팀에서 [1P 시안]과 [2P 그린]으로 함께 플레이합니다!`,
        'banner-clean',
        2.8
      );
      this.commentary.announce(
        `2P 파트너가 온라인으로 합류했습니다! ${this.homeTeam.name} 대표팀에서 환상의 호흡을 보여주세요!`,
        'high'
      );
    };

    this.net.onGuestInput = (inp) => {
      this.controls.applyRemoteGuestInput(inp);
    };

    this.net.onGuestReceiveInit = (payload) => {
      this.coopMode = 'ONLINE_COOP';
      this.controls.isLocalCoop = false;
      this.controls.isOnlineCoopHost = false;
      this.startNewMatch({
        homeTeamId: payload.homeTeamId,
        awayTeamId: payload.awayTeamId,
        teamSize: payload.teamSize,
        ballId: payload.ballId,
        halfDurationSec: payload.halfDurationSec,
        gameMode: payload.gameMode,
        difficulty: payload.difficulty,
        coopMode: 'ONLINE_COOP'
      });
      this.updateCoopHUDLayout();
      document.getElementById('lobby-modal')?.classList.add('hidden');
      this.showBanner(
        '🌐 2P 파트너 합류 완료! (같은 HOME 팀)',
        `당신은 [2P 네온 그린] 마커 선수를 조작합니다! 1P와 패스를 주고받으며 득점하세요!`,
        'banner-clean',
        3.0
      );
    };

    this.net.onGuestReceiveSnap = (snap) => {
      this.applyNetworkSnapshot(snap);
    };

    this.net.onGuestReceiveBanner = (title, sub, cls, dur) => {
      this.showBanner(title, sub, cls, dur, true);
    };

    this.net.onDisconnected = () => {
      this.controls.isOnlineCoopHost = false;
      this.controls.resetP2State();
      if (this.coopMode === 'ONLINE_COOP') {
        this.coopMode = 'SOLO';
      }
      this.syncCoopControllers();
      this.updateCoopHUDLayout();
      this.updateModeSpecificHUD();
    };
  }

  public sendNetworkInitPayload(): void {
    if (this.net.role === 'HOST' && this.net.isConnected) {
      this.net.send({
        t: 'init',
        payload: {
          homeTeamId: this.homeTeam.id,
          awayTeamId: this.awayTeam.id,
          teamSize: this.teamSize,
          ballId: this.ball.currentBallId,
          halfDurationSec: this.halfDurationSec,
          gameMode: this.gameMode,
          difficulty: this.difficulty
        }
      });
    }
  }

  public setCoopMode(mode: CoopPlayMode, showNotice: boolean = true): void {
    if (mode !== 'ONLINE_COOP' && this.net.role !== 'NONE') {
      this.net.disconnect();
    }
    this.coopMode = mode;
    this.controls.isLocalCoop = mode === 'LOCAL_COOP';
    this.controls.isOnlineCoopHost = mode === 'ONLINE_COOP' && this.net.role === 'HOST';
    this.controls.resetP2State();
    this.syncCoopControllers();
    this.updateCoopHUDLayout();
    this.updateModeSpecificHUD();

    if (showNotice) {
      if (mode === 'LOCAL_COOP') {
        const p1Name = this.controlledPlayer?.starName || '1P';
        const p2Name = this.controlledPlayer2?.starName || '2P';
        this.showBanner(
          `👥 2인 협동 모드 ON! (같은 ${this.homeTeam.shortName} 팀)`,
          `[1P 시안: ${p1Name}] + [2P 그린: ${p2Name}] • 듀얼 터치패드 & 키보드(WASD / 방향키) 동시 지원!`,
          'banner-clean',
          2.6
        );
        this.commentary.announce(
          `같은 팀 2인 협동 모드가 활성화되었습니다! 1P와 2P가 함께 ${this.homeTeam.name} 공격을 이끕니다!`,
          'normal'
        );
      } else if (mode === 'SOLO') {
        this.showBanner(
          '👤 1인 플레이 모드 전환',
          '단독 조작 모드로 전환되었습니다.',
          'banner-setpiece',
          1.6
        );
      }
    }
  }

  public toggleLocalCoop(): CoopPlayMode {
    const next: CoopPlayMode = this.coopMode === 'LOCAL_COOP' ? 'SOLO' : 'LOCAL_COOP';
    this.setCoopMode(next, true);
    return this.coopMode;
  }

  private updateCoopHUDLayout(): void {
    const bottomHud = document.getElementById('bottom-hud');
    const p2Deck = document.getElementById('p2-coop-deck');
    const p1Tag = document.getElementById('p1-joy-tag');
    const coopQuickBtn = document.getElementById('btn-quick-coop');
    const coopPill = document.getElementById('hud-coop-status');

    const isLocal2P = this.coopMode === 'LOCAL_COOP';
    const isOnline2P = this.coopMode === 'ONLINE_COOP' && this.net.isConnected;

    bottomHud?.classList.toggle('local-coop-active', isLocal2P);
    p2Deck?.classList.toggle('hidden', !isLocal2P);
    if (p1Tag) {
      if (isOnline2P && this.net.role === 'GUEST') {
        p1Tag.textContent = '2P 그린 조작 (WASD·터치)';
        p1Tag.className = 'joy-hint tag-p2';
      } else if (isLocal2P || isOnline2P) {
        p1Tag.textContent = isLocal2P ? '1P 시안 (WASD·좌측터치)' : '1P 시안 조작 (호스트)';
        p1Tag.className = 'joy-hint tag-p1';
      } else {
        p1Tag.textContent = '이동 / 조준 (WASD·터치)';
        p1Tag.className = 'joy-hint';
      }
    }

    if (coopQuickBtn) {
      if (isOnline2P) {
        coopQuickBtn.textContent = `🌐 2인온라인(${this.net.roomCode})`;
        coopQuickBtn.classList.add('coop-active');
      } else if (isLocal2P) {
        coopQuickBtn.textContent = '👥 2인협동 ON';
        coopQuickBtn.classList.add('coop-active');
      } else {
        coopQuickBtn.textContent = '👥 2인협동';
        coopQuickBtn.classList.remove('coop-active');
      }
    }

    if (coopPill) {
      if (isOnline2P) {
        const mySlot = this.net.role === 'GUEST' ? '2P 그린' : '1P 시안';
        coopPill.textContent = `🌐 같은팀 2P (${mySlot} • 방:${this.net.roomCode})`;
        coopPill.classList.add('coop-pill-on');
      } else if (isLocal2P) {
        coopPill.textContent = `👥 같은팀 2인 협동 (1P시안 + 2P그린)`;
        coopPill.classList.add('coop-pill-on');
      } else {
        coopPill.textContent = `👤 플레이: 1인 (터치시 2인협동)`;
        coopPill.classList.remove('coop-pill-on');
      }
    }
  }

  public startNewMatch(settings: MatchSettings): void {
    this.setPaused(false);
    this.homeTeam = TEAMS[settings.homeTeamId] || TEAMS.KOR;
    this.gameMode = settings.gameMode || 'EXHIBITION';
    if (settings.difficulty) {
      this.difficulty = settings.difficulty;
    }
    if (settings.coopMode) {
      this.coopMode = settings.coopMode;
      this.controls.isLocalCoop = this.coopMode === 'LOCAL_COOP';
      this.controls.isOnlineCoopHost = this.coopMode === 'ONLINE_COOP' && this.net.role === 'HOST';
    }
    this.teamSize = settings.teamSize;
    this.halfDurationSec = settings.halfDurationSec;
    this.benchIndex = 0;

    if (this.gameMode === 'TOURNAMENT') {
      this.tournamentRound = 1;
      const pool = Object.keys(TEAMS).filter((id) => id !== this.homeTeam.id);
      this.tournamentOpponents = pool.slice(0, 3);
      this.awayTeam = TEAMS[this.tournamentOpponents[0]] || TEAMS.BRA;
    } else {
      this.awayTeam = TEAMS[settings.awayTeamId] || TEAMS.BRA;
    }

    this.ball.setBallStyle(settings.ballId);
    this.ball.windForce.set(0, 0, 0);
    this.stadium.challengeRingsGroup.visible = this.gameMode === 'FREE_KICK_CHALLENGE';
    this.stadium.trophyGroup.visible = false;
    this.stadium.clearVanishingSpray();

    this.homeScore = 0;
    this.awayScore = 0;
    this.homeYellows = 0;
    this.awayYellows = 0;
    this.homeReds = 0;
    this.awayReds = 0;
    this.half = 1;
    this.matchClockSec = 0;

    this.spawnTeams(this.teamSize);

    if (this.gameMode === 'PENALTY_SHOOTOUT') {
      this.shootoutRound = 1;
      this.shootoutIsUserTurn = true;
      this.shootoutHomeResults = [];
      this.shootoutAwayResults = [];
      this.commentary.announce('월드컵 승부차기 대결이 시작됩니다! 첫 번째 키커가 준비합니다.', 'high');
      this.enterPenaltySetup('HOME');
    } else if (this.gameMode === 'FREE_KICK_CHALLENGE') {
      this.fkChallengeStage = 1;
      this.fkChallengeScore = 0;
      this.setupNextFreeKickChallengeStage();
    } else {
      this.setupKickoff('HOME');
      if (this.gameMode === 'TOURNAMENT') {
        this.commentary.announce(
          `월드컵 8강전! ${this.homeTeam.name} 대 ${this.awayTeam.name}의 경기가 시작됩니다!`,
          'high'
        );
      } else {
        this.commentary.announce(
          `${this.homeTeam.name} 대 ${this.awayTeam.name}, 월드컵 매치 킥오프합니다!`,
          'normal'
        );
      }
    }

    this.updateCoopHUDLayout();
    this.updateScoreboardHUD();
    this.updateModeSpecificHUD();
    this.sendNetworkInitPayload();
  }

  private setupNextFreeKickChallengeStage(): void {
    const stages: { x: number; z: number; windZ: number; windLabel: string }[] = [
      { x: 30, z: 0, windZ: 0, windLabel: '무풍 (0.0m/s)' },
      { x: 28, z: 9.5, windZ: -2.4, windLabel: '북풍 2.4m/s (좌측 바람)' },
      { x: 27, z: -10.5, windZ: 3.1, windLabel: '남풍 3.1m/s (우측 바람)' },
      { x: 24, z: 13.0, windZ: -4.2, windLabel: '강풍 4.2m/s (강한 좌측 바람)' },
      { x: 22, z: -12.0, windZ: 4.8, windLabel: '돌풍 4.8m/s (최고 난이도!)' }
    ];
    const st = stages[(this.fkChallengeStage - 1) % stages.length];
    this.ball.windForce.set(0, 0, st.windZ);
    this.stadium.challengeRingsGroup.visible = true;

    this.showBanner(
      `🎯 프리킥 챌린지 STAGE ${this.fkChallengeStage}/5`,
      `💨 바람: ${st.windLabel} • 골대 안 타겟 링을 맞히면 보너스 점수!`,
      'banner-setpiece',
      2.5
    );
    this.commentary.announce(
      `프리킥 챌린지 스테이지 ${this.fkChallengeStage}! 바람은 ${st.windLabel}입니다. 골문 구석 타겟을 노려보세요!`,
      'normal'
    );
    this.enterFreeKickSetup('HOME', new THREE.Vector3(st.x, 0, st.z));
    this.updateModeSpecificHUD();
  }

  private spawnTeams(size: 5 | 7 | 11): void {
    for (const p of this.players) {
      this.scene.remove(p.group);
    }
    this.players = [];
    this.homePlayers = [];
    this.awayPlayers = [];

    const positions: Record<5 | 7 | 11, { x: number; z: number; rosterIdx: number }[]> = {
      5: [
        { x: -49.5, z: 0, rosterIdx: 0 },
        { x: -30, z: -10, rosterIdx: 1 },
        { x: -30, z: 10, rosterIdx: 3 },
        { x: -16, z: 0, rosterIdx: 6 },
        { x: -6, z: 0, rosterIdx: 10 }
      ],
      7: [
        { x: -49.5, z: 0, rosterIdx: 0 },
        { x: -34, z: -12, rosterIdx: 1 },
        { x: -34, z: 12, rosterIdx: 3 },
        { x: -20, z: -15, rosterIdx: 5 },
        { x: -19, z: 0, rosterIdx: 6 },
        { x: -20, z: 15, rosterIdx: 8 },
        { x: -7, z: 0, rosterIdx: 10 }
      ],
      11: [
        { x: -49.5, z: 0, rosterIdx: 0 },
        { x: -36, z: -20, rosterIdx: 3 },
        { x: -38, z: -7, rosterIdx: 1 },
        { x: -38, z: 7, rosterIdx: 2 },
        { x: -36, z: 20, rosterIdx: 4 },
        { x: -22, z: -16, rosterIdx: 5 },
        { x: -21, z: 0, rosterIdx: 7 },
        { x: -22, z: 16, rosterIdx: 6 },
        { x: -10, z: -18, rosterIdx: 8 },
        { x: -7, z: 0, rosterIdx: 9 },
        { x: -10, z: 18, rosterIdx: 10 }
      ]
    };

    const template = positions[size];

    template.forEach((slot, idx) => {
      const profile = this.homeTeam.roster[slot.rosterIdx] || this.homeTeam.roster[0];
      const p = new Player(
        this.scene,
        `HOME_${idx}`,
        'HOME',
        this.homeTeam,
        profile,
        slot.x,
        slot.z
      );
      this.players.push(p);
      this.homePlayers.push(p);
    });

    template.forEach((slot, idx) => {
      const profile = this.awayTeam.roster[slot.rosterIdx] || this.awayTeam.roster[0];
      const p = new Player(
        this.scene,
        `AWAY_${idx}`,
        'AWAY',
        this.awayTeam,
        profile,
        -slot.x,
        -slot.z
      );
      this.players.push(p);
      this.awayPlayers.push(p);
    });

    const initialCtrl = this.homePlayers[this.homePlayers.length - 1];
    this.controlledPlayer = initialCtrl;
    this.controlledPlayer2 =
      this.homePlayers.length >= 3 ? this.homePlayers[this.homePlayers.length - 2] : null;
    this.syncCoopControllers();
  }

  public syncCoopControllers(): void {
    const validOutfield = this.homePlayers.filter((p) => !p.isSentOff && p.role !== 'GK');

    // Ensure 1P is valid
    if (!this.controlledPlayer || this.controlledPlayer.isSentOff) {
      this.controlledPlayer = validOutfield[validOutfield.length - 1] || this.homePlayers[0] || null;
    }

    if (this.isCoopActive) {
      if (
        !this.controlledPlayer2 ||
        this.controlledPlayer2.isSentOff ||
        this.controlledPlayer2.role === 'GK' ||
        this.controlledPlayer2 === this.controlledPlayer
      ) {
        const candidates = validOutfield.filter((p) => p !== this.controlledPlayer);
        // Pick the closest forward/midfield partner to the ball or second-last player
        if (candidates.length > 0) {
          candidates.sort(
            (a, b) => a.position.distanceTo(this.ball.position) - b.position.distanceTo(this.ball.position)
          );
          this.controlledPlayer2 = candidates[0];
        } else {
          this.controlledPlayer2 = null;
        }
      }
    } else {
      this.controlledPlayer2 = null;
    }

    for (const p of this.homePlayers) {
      if (p === this.controlledPlayer) {
        p.controllerSlot = 'P1';
      } else if (this.isCoopActive && p === this.controlledPlayer2) {
        p.controllerSlot = 'P2';
      } else {
        p.controllerSlot = 'NONE';
      }
    }
  }

  public setControlledPlayer(player: Player): void {
    if (player.isSentOff) return;
    if (this.isCoopActive && player === this.controlledPlayer2) {
      // If 2P is already controlling this player and 1P is still valid, keep 2P on this player!
      if (this.controlledPlayer && !this.controlledPlayer.isSentOff && this.controlledPlayer.role !== 'GK') {
        this.syncCoopControllers();
        return;
      }
      this.controlledPlayer2 = null;
    }
    this.controlledPlayer = player;
    this.syncCoopControllers();
  }

  public setControlledPlayer2(player: Player | null): void {
    if (!player || player.isSentOff || player.role === 'GK') return;
    if (player === this.controlledPlayer) {
      return;
    }
    this.controlledPlayer2 = player;
    this.syncCoopControllers();
  }

  private switchToNearestHomePlayer(slot: 'P1' | 'P2' = 'P1'): void {
    const candidates = this.homePlayers.filter((p) => !p.isSentOff && p.role !== 'GK');
    if (candidates.length === 0) return;

    const currentSelf = slot === 'P2' ? this.controlledPlayer2 : this.controlledPlayer;
    const currentPartner = slot === 'P2' ? this.controlledPlayer : this.controlledPlayer2;

    let best: Player | null = null;
    let bestScore = Infinity;
    for (const p of candidates) {
      if (p === currentSelf && candidates.length > 1) continue;
      if (this.isCoopActive && p === currentPartner && candidates.length > 2) continue;
      const d = p.position.distanceTo(this.ball.position);
      if (d < bestScore) {
        bestScore = d;
        best = p;
      }
    }
    if (!best) best = candidates[0];

    if (slot === 'P2') {
      this.setControlledPlayer2(best);
    } else {
      this.setControlledPlayer(best);
    }
  }

  public cycleTacticalStance(): TacticalStance {
    if (this.tacticalStance === 'BALANCED') {
      this.tacticalStance = 'ATTACK';
      this.showBanner('🔥 전술 변경: 총공격 (ALL-OUT ATTACK)', '라인을 높여 공격적으로 침투합니다!', 'banner-setpiece', 1.6);
      this.commentary.announce('감독이 총공격 전술을 지시합니다! 수비 라인이 높게 올라갑니다.', 'normal');
    } else if (this.tacticalStance === 'ATTACK') {
      this.tacticalStance = 'DEFEND';
      this.showBanner('🛡️ 전술 변경: 철벽 수비 (PARK THE BUS)', '수비 라인을 깊게 내려 공간을 차단합니다!', 'banner-clean', 1.6);
      this.commentary.announce('전술을 수비적으로 전환합니다. 위험 지역을 단단히 잠급니다.', 'normal');
    } else {
      this.tacticalStance = 'BALANCED';
      this.showBanner('⚖️ 전술 변경: 밸런스 (BALANCED)', '공수 균형을 유지하며 경기를 운영합니다.', 'banner-setpiece', 1.6);
      this.commentary.announce('공수 밸런스 전술로 전환합니다.', 'low');
    }
    this.updateModeSpecificHUD();
    return this.tacticalStance;
  }

  public setDifficulty(diff: DifficultyLevel, showNotice: boolean = true): void {
    this.difficulty = diff;
    const prof = DIFFICULTY_PROFILES[diff];
    this.updateModeSpecificHUD();
    if (showNotice) {
      this.showBanner(
        `🎚️ AI 난이도 변경: ${prof.labelKo}`,
        prof.descKo,
        diff === 'LEGEND' ? 'banner-red' : diff === 'HARD' ? 'banner-yellow' : 'banner-setpiece',
        1.9
      );
      this.commentary.announce(`게임 난이도가 ${prof.labelKo} 단계로 설정되었습니다.`, 'low');
    }
  }

  public cycleDifficulty(): DifficultyLevel {
    const order: DifficultyLevel[] = ['EASY', 'NORMAL', 'HARD', 'LEGEND'];
    const next = order[(order.indexOf(this.difficulty) + 1) % order.length];
    this.setDifficulty(next, true);
    return next;
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
    const pauseModal = document.getElementById('pause-modal');
    const pauseBtn = document.getElementById('btn-quick-pause');
    const pauseSummary = document.getElementById('pause-match-summary');

    if (pauseModal) {
      pauseModal.classList.toggle('hidden', !paused);
    }
    if (pauseBtn) {
      pauseBtn.textContent = paused ? '▶️ 재개' : '⏸️ 일시정지';
      pauseBtn.classList.toggle('paused-active', paused);
    }
    if (paused && pauseSummary) {
      const clockText = document.getElementById('hud-clock')?.textContent || '00:00';
      const halfText = this.half === 1 ? '전반(1ST)' : '후반(2ND)';
      const ballCfg = WORLD_CUP_BALLS[this.ball.currentBallId];
      const diffProf = DIFFICULTY_PROFILES[this.difficulty];
      pauseSummary.textContent = `${this.homeTeam.flag} ${this.homeTeam.name} ${this.homeScore} : ${this.awayScore} ${this.awayTeam.name} ${this.awayTeam.flag}  •  ${halfText} ${clockText}  •  ${diffProf.shortKo}  •  ⚽ ${ballCfg.name}`;
    }
  }

  public togglePause(): boolean {
    this.setPaused(!this.isPaused);
    return this.isPaused;
  }

  public substituteTiredPlayer(): void {
    const outfield = this.homePlayers.filter((p) => !p.isSentOff && p.role !== 'GK');
    if (outfield.length === 0) return;

    // Find lowest stamina player
    outfield.sort((a, b) => a.stamina - b.stamina);
    const tired = outfield[0];
    const oldName = tired.nameLabel;

    const benchPool = this.homeTeam.bench;
    if (benchPool && benchPool.length > 0) {
      const subProfile = benchPool[this.benchIndex % benchPool.length];
      this.benchIndex++;
      tired.substituteWithBenchProfile(subProfile);

      // Also give a small breather boost to teammates
      for (const p of this.homePlayers) {
        p.stamina = Math.min(100, p.stamina + 25);
      }

      this.showBanner(
        `🔄 선수 교체 완료!`,
        `OUT: ${oldName}  ➡️  IN: ${tired.nameLabel} (체력 100% 충전!)`,
        'banner-clean',
        2.4
      );
      this.commentary.announce(
        `선수 교체가 이루어집니다! ${oldName} 선수가 나가고 벤치에서 ${tired.starName} 선수가 투입됩니다!`,
        'high'
      );
    }
  }

  public setupKickoff(kickoffTeam: 'HOME' | 'AWAY'): void {
    this.matchState = 'KICKOFF';
    this.stateTimer = 0.85;
    this.pendingOffsideReceiverId = null;
    this.ball.resetToCenter();
    this.ball.updateTrajectoryGuide(this.ball.position, new THREE.Vector3(1, 0, 0), 0, 0, 0, false);
    this.stadium.clearVanishingSpray();
    this.hideSetPiecePanel();
    this.replay.clear();

    for (const p of this.players) {
      if (p.isSentOff) continue;
      p.inDefensiveWall = false;
      p.isThrowInTaker = false;
      p.setPieceTarget = null;
      p.fallenTimer = 0;
      p.slideTimer = 0;
      p.celebrationTimer = 0;
      p.velocity.set(0, 0, 0);
      p.position.copy(p.homePosition);
      p.facingAngle = p.team === 'HOME' ? Math.PI / 2 : -Math.PI / 2;
      p.group.position.copy(p.position);
    }

    const strikers = (kickoffTeam === 'HOME' ? this.homePlayers : this.awayPlayers).filter(
      (p) => !p.isSentOff && p.role !== 'GK'
    );
    if (strikers.length > 0) {
      const kicker = strikers[strikers.length - 1];
      kicker.position.set(kickoffTeam === 'HOME' ? -1.2 : 1.2, 0, 0);
      kicker.group.position.copy(kicker.position);
      this.ball.ownerId = kicker.id;
      if (kickoffTeam === 'HOME') {
        this.setControlledPlayer(kicker);
      }
    }

    this.referee.resetPosition(0, -11.0);
  }

  public triggerInstantFreeKick(spotX: number = 28, spotZ: number = 7.5): void {
    this.audio.playWhistle('foul');
    this.showBanner(
      'FREE KICK 🎯 (배니싱 스프레이 마킹)',
      '프리킥 세트피스 모드 (조이스틱 조준 + 커브 조절 후 슛!)',
      'banner-setpiece',
      2.2
    );
    this.commentary.announce('위험 지역에서 프리킥이 선언됩니다! 심판이 배니싱 스프레이로 수비벽 위치를 표시합니다.', 'high');
    this.enterFreeKickSetup('HOME', new THREE.Vector3(spotX, 0, spotZ));
  }

  public triggerInstantPenaltyKick(attackingTeam: 'HOME' | 'AWAY' = 'HOME'): void {
    this.audio.playWhistle('foul');
    this.showBanner(
      'PENALTY KICK 🥅',
      attackingTeam === 'HOME'
        ? '페널티킥 선언! 골대 타겟을 조준하고 슛 버튼을 누르세요!'
        : '상대 팀 페널티킥! 골키퍼 다이빙 방향을 선택하세요!',
      'banner-penalty',
      2.4
    );
    this.commentary.announce('페널티킥이 선언됩니다! 키커와 골키퍼의 숨막히는 일대일 승부입니다!', 'high');
    this.enterPenaltySetup(attackingTeam);
  }

  public triggerInstantCornerKick(): void {
    this.audio.playWhistle('short');
    const sideZ = Math.random() < 0.5 ? -Stadium.HALF_WIDTH + 0.6 : Stadium.HALF_WIDTH - 0.6;
    this.enterCornerKickSetup('HOME', sideZ);
  }

  public triggerInstantFoulCardDemo(forceRed: boolean = false, useVar: boolean = false): void {
    const activeAway = this.awayPlayers.filter((p) => !p.isSentOff && p.role !== 'GK');
    const activeHome = this.homePlayers.filter((p) => !p.isSentOff && p.role !== 'GK');
    if (activeAway.length === 0 || activeHome.length === 0) return;

    const offender = activeAway[0];
    const victim = this.controlledPlayer && !this.controlledPlayer.isSentOff ? this.controlledPlayer : activeHome[0];

    const isInsideBox = useVar ? true : Math.random() < 0.38;
    const foulX = isInsideBox ? 40.5 : 29.0;
    const foulZ = (Math.random() - 0.5) * 14;

    victim.position.set(foulX, 0, foulZ);
    offender.position.set(foulX - 0.8, 0, foulZ + 0.5);
    this.ball.placeAt(foulX + 0.6, foulZ);

    let cardType: CardType = 'YELLOW';
    if (forceRed) {
      cardType = offender.yellowCards >= 1 ? 'SECOND_YELLOW_RED' : 'DIRECT_RED';
    } else if (offender.yellowCards >= 1) {
      cardType = 'SECOND_YELLOW_RED';
    }

    this.commitFoul({
      offenderId: offender.id,
      offenderTeam: offender.team,
      victimId: victim.id,
      foulPosition: victim.position.clone(),
      isPenaltyBox: isInsideBox,
      cardType,
      reasonKo: forceRed ? '위험한 후방 깊숙한 백태클 반칙!' : '거친 슬라이딩 태클 반칙!',
      severity: forceRed ? 0.95 : 0.65,
      useVarCheck: useVar
    });
  }

  private commitFoul(decision: FoulDecision): void {
    this.activeFoul = decision;
    this.pendingOffsideReceiverId = null;
    this.ball.ownerId = null;
    this.ball.velocity.multiplyScalar(0.15);

    const offender = this.players.find((p) => p.id === decision.offenderId);
    const victim = this.players.find((p) => p.id === decision.victimId);

    if (victim) {
      victim.triggerFallDown(3.8);
    }
    if (offender) {
      offender.slideTimer = 0;
      offender.velocity.set(0, 0, 0);
    }

    this.audio.playWhistle('foul');
    this.audio.playTackleHit(true);

    // Optional Dramatic VAR Check before final card/penalty declaration!
    if (decision.useVarCheck) {
      this.matchState = 'VAR_REVIEW';
      this.stateTimer = 2.6;
      this.showBanner(
        '📺 VAR CHECKING... (비디오 판독 진행 중)',
        '페널티 박스 내 반칙 및 카드 수위를 주심이 온필드 리뷰로 확인하고 있습니다...',
        'banner-setpiece',
        2.5
      );
      this.commentary.announce('잠시만요! 주심이 VAR 비디오 판독 시그널을 그립니다! 온필드 리뷰가 진행됩니다.', 'high');
      return;
    }

    this.finalizeFoulAndShowCard(decision);
  }

  private finalizeFoulAndShowCard(decision: FoulDecision): void {
    this.matchState = 'FOUL_CINEMATIC';
    this.stateTimer = 3.4;
    this.cardSoundPlayed = false;
    this.secondCardSoundPlayed = false;

    const offender = this.players.find((p) => p.id === decision.offenderId);

    if (offender) {
      if (decision.cardType === 'YELLOW') {
        offender.yellowCards = 1;
        if (offender.team === 'HOME') this.homeYellows++;
        else this.awayYellows++;
      } else if (decision.cardType === 'SECOND_YELLOW_RED') {
        offender.yellowCards = 2;
        offender.redCard = true;
        if (offender.team === 'HOME') {
          this.homeYellows++;
          this.homeReds++;
        } else {
          this.awayYellows++;
          this.awayReds++;
        }
      } else if (decision.cardType === 'DIRECT_RED') {
        offender.redCard = true;
        if (offender.team === 'HOME') this.homeReds++;
        else this.awayReds++;
      }
    }

    this.referee.startFoulSequence(decision.cardType);

    const offenderLabel = offender ? `${offender.teamConfig.flag} ${offender.nameLabel}` : decision.offenderId;
    const nextSetPieceText = decision.isPenaltyBox ? '➡️ 페널티킥(PK) 선언!' : '➡️ 프리킥(FK) 선언!';

    let title = `📢 파울 선언! (FOUL)`;
    let bannerClass = 'banner-foul';
    if (decision.cardType === 'YELLOW') {
      title = `🟨 옐로카드 경고! (${offenderLabel})`;
      bannerClass = 'banner-yellow';
      this.commentary.announce(`주심이 달려와 ${offender?.starName || ''} 선수에게 옐로카드를 꺼내듭니다!`, 'high');
    } else if (decision.cardType === 'SECOND_YELLOW_RED') {
      title = `🟨🟥 경고 누적 퇴장! (${offenderLabel})`;
      bannerClass = 'banner-red';
      this.commentary.announce(`경고 누적입니다! 옐로카드에 이어 레드카드가 선언되며 퇴장당합니다!`, 'high');
    } else if (decision.cardType === 'DIRECT_RED') {
      title = `🟥 다이렉트 레드카드 퇴장! (${offenderLabel})`;
      bannerClass = 'banner-red';
      this.commentary.announce(`아, 위험한 반칙! 주심이 주저 없이 다이렉트 레드카드를 들어 올립니다! 퇴장입니다!`, 'high');
    }

    this.showBanner(title, `${decision.reasonKo}  •  ${nextSetPieceText}`, bannerClass, 3.3);
    this.updateScoreboardHUD();
  }

  public enterFreeKickSetup(attackingTeam: 'HOME' | 'AWAY', spot: THREE.Vector3): void {
    this.matchState = 'FREE_KICK_SETUP';
    this.setPieceTeam = attackingTeam;
    this.aiSetPieceTimer = 1.8;

    const clampedX = THREE.MathUtils.clamp(spot.x, -44, 44);
    const clampedZ = THREE.MathUtils.clamp(spot.z, -28, 28);
    this.ball.placeAt(clampedX, clampedZ);

    const goalX = attackingTeam === 'HOME' ? Stadium.HALF_LENGTH : -Stadium.HALF_LENGTH;
    const toGoal = new THREE.Vector3(goalX - clampedX, 0, -clampedZ).normalize();

    this.setPieceAimYaw = Math.atan2(toGoal.x, toGoal.z);
    this.setPieceAimY = 2.1;
    this.controls.setPieceSpin = attackingTeam === 'HOME' ? -0.65 : 0.5;
    const spinSlider = document.getElementById('setpiece-spin-slider') as HTMLInputElement | null;
    if (spinSlider) spinSlider.value = String(this.controls.setPieceSpin);

    const attackers = (attackingTeam === 'HOME' ? this.homePlayers : this.awayPlayers).filter(
      (p) => !p.isSentOff && p.role !== 'GK'
    );
    const defenders = (attackingTeam === 'HOME' ? this.awayPlayers : this.homePlayers).filter(
      (p) => !p.isSentOff && p.role !== 'GK'
    );

    for (const p of this.players) {
      p.inDefensiveWall = false;
      p.isThrowInTaker = false;
      p.fallenTimer = 0;
      p.slideTimer = 0;
      p.velocity.set(0, 0, 0);
    }

    if (attackers.length > 0) {
      const kicker = attackers[attackers.length - 1];
      this.setPieceKicker = kicker;
      kicker.position.set(clampedX - toGoal.x * 1.75, 0, clampedZ - toGoal.z * 1.75);
      kicker.facingAngle = this.setPieceAimYaw;
      kicker.group.position.copy(kicker.position);
      if (attackingTeam === 'HOME') {
        this.setControlledPlayer(kicker);
      }

      attackers.forEach((p, idx) => {
        if (p === kicker) return;
        const boxX = attackingTeam === 'HOME' ? Math.max(clampedX + 10, 36) : Math.min(clampedX - 10, -36);
        const boxZ = (idx - attackers.length / 2) * 5.5;
        p.position.set(THREE.MathUtils.clamp(boxX, -46, 46), 0, THREE.MathUtils.clamp(boxZ, -22, 22));
        p.group.position.copy(p.position);
      });
    }

    // Form 3-4 player Defensive Wall 9.5m from the ball along the ball-to-goal line
    const wallCount = Math.min(3, defenders.length);
    const wallCenter = new THREE.Vector3(
      clampedX + toGoal.x * 9.5,
      0,
      clampedZ + toGoal.z * 9.5
    );
    const wallPerp = new THREE.Vector3(-toGoal.z, 0, toGoal.x);

    defenders.forEach((d, idx) => {
      if (idx < wallCount) {
        d.inDefensiveWall = true;
        const offset = (idx - (wallCount - 1) / 2) * 0.92;
        d.position.set(
          wallCenter.x + wallPerp.x * offset,
          0,
          wallCenter.z + wallPerp.z * offset
        );
        d.facingAngle = Math.atan2(-toGoal.x, -toGoal.z);
      } else {
        const guardX = attackingTeam === 'HOME' ? 42 : -42;
        const guardZ = (idx - wallCount - 1) * 6;
        d.position.set(guardX, 0, THREE.MathUtils.clamp(guardZ, -16, 16));
        d.facingAngle = Math.atan2(-toGoal.x, -toGoal.z);
      }
      d.group.position.copy(d.position);
    });

    // Show 3D White Foam Vanishing Spray at Ball & Defensive Wall!
    this.stadium.showVanishingSpray(
      this.ball.position,
      wallCenter,
      Math.atan2(wallPerp.z, wallPerp.x)
    );

    this.referee.resetPosition(clampedX + toGoal.x * 4.5, clampedZ + (clampedZ > 0 ? -8.5 : 8.5));
    this.referee.facingAngle = Math.atan2(clampedX - this.referee.position.x, clampedZ - this.referee.position.z);

    this.showSetPiecePanel(attackingTeam === 'HOME', 'FREE_KICK');
  }

  public enterCornerKickSetup(attackingTeam: 'HOME' | 'AWAY', cornerZ: number): void {
    this.matchState = 'CORNER_KICK_SETUP';
    this.setPieceTeam = attackingTeam;
    this.aiSetPieceTimer = 1.7;
    this.stadium.clearVanishingSpray();

    const cornerX = attackingTeam === 'HOME' ? Stadium.HALF_LENGTH - 0.5 : -Stadium.HALF_LENGTH + 0.5;
    const clampedZ = cornerZ > 0 ? Stadium.HALF_WIDTH - 0.5 : -Stadium.HALF_WIDTH + 0.5;
    this.ball.placeAt(cornerX, clampedZ);

    const targetBoxX = attackingTeam === 'HOME' ? 43.0 : -43.0;
    const toBox = new THREE.Vector3(targetBoxX - cornerX, 0, -clampedZ).normalize();
    this.setPieceAimYaw = Math.atan2(toBox.x, toBox.z);
    this.controls.setPieceElevation = 0.78;
    this.controls.setPieceSpin = clampedZ > 0 ? 0.85 : -0.85;

    const line = clampedZ < 0 ? this.northLinesman : this.southLinesman;
    line.raiseFlag('CORNER KICK!', 2.5);

    const attackers = (attackingTeam === 'HOME' ? this.homePlayers : this.awayPlayers).filter(
      (p) => !p.isSentOff && p.role !== 'GK'
    );
    const defenders = (attackingTeam === 'HOME' ? this.awayPlayers : this.homePlayers).filter(
      (p) => !p.isSentOff && p.role !== 'GK'
    );

    for (const p of this.players) {
      p.inDefensiveWall = false;
      p.isThrowInTaker = false;
      p.velocity.set(0, 0, 0);
    }

    if (attackers.length > 0) {
      const kicker = attackers[0];
      this.setPieceKicker = kicker;
      kicker.position.set(cornerX - toBox.x * 1.4, 0, clampedZ - toBox.z * 1.4);
      kicker.facingAngle = this.setPieceAimYaw;
      kicker.group.position.copy(kicker.position);
      if (attackingTeam === 'HOME') this.setControlledPlayer(kicker);

      // Put remaining attackers inside the box for headers!
      attackers.slice(1).forEach((p, idx) => {
        p.position.set(targetBoxX + (idx % 2) * 3.5, 0, (idx - 2) * 3.8);
        p.facingAngle = attackingTeam === 'HOME' ? Math.PI / 2 : -Math.PI / 2;
        p.group.position.copy(p.position);
      });
    }

    defenders.forEach((d, idx) => {
      d.position.set(targetBoxX + (attackingTeam === 'HOME' ? 2.5 : -2.5), 0, (idx - 2.5) * 3.2);
      d.group.position.copy(d.position);
    });

    this.showBanner('🚩 CORNER KICK (코너킥)', '골문 앞 동료 머리를 향해 크로스를 올리거나 감아차세요!', 'banner-setpiece', 2.2);
    this.commentary.announce('코너킥 찬스입니다! 골문 앞에 장신 선수들이 대거 몰려듭니다!', 'normal');
    this.showSetPiecePanel(attackingTeam === 'HOME', 'FREE_KICK');
  }

  public enterThrowInSetup(attackingTeam: 'HOME' | 'AWAY', outX: number, outZ: number): void {
    this.matchState = 'THROW_IN_SETUP';
    this.setPieceTeam = attackingTeam;
    this.aiSetPieceTimer = 1.2;

    const clampedX = THREE.MathUtils.clamp(outX, -46, 46);
    const sidelineZ = outZ > 0 ? Stadium.HALF_WIDTH - 0.2 : -Stadium.HALF_WIDTH + 0.2;

    const line = sidelineZ < 0 ? this.northLinesman : this.southLinesman;
    line.raiseFlag('THROW-IN!', 2.0);

    const teamPool = (attackingTeam === 'HOME' ? this.homePlayers : this.awayPlayers).filter(
      (p) => !p.isSentOff && p.role !== 'GK'
    );
    for (const p of this.players) {
      p.isThrowInTaker = false;
      p.velocity.set(0, 0, 0);
    }

    if (teamPool.length > 0) {
      const thrower = teamPool[0];
      this.setPieceKicker = thrower;
      thrower.isThrowInTaker = true;
      thrower.position.set(clampedX, 0, sidelineZ);
      thrower.facingAngle = sidelineZ > 0 ? Math.PI : 0;
      thrower.group.position.copy(thrower.position);
      this.ball.position.set(clampedX, 2.35, sidelineZ);
      this.ball.syncMesh();
      if (attackingTeam === 'HOME') this.setControlledPlayer(thrower);
    }

    this.showBanner('🚩 THROW-IN (스로인)', '패스 또는 슛 버튼을 눌러 동료에게 공을 던지세요!', 'banner-setpiece', 1.6);
    this.commentary.announce('터치라인 아웃! 선심이 깃발을 들며 스로인이 선언됩니다.', 'low');
  }

  public enterPenaltySetup(attackingTeam: 'HOME' | 'AWAY'): void {
    this.matchState = 'PENALTY_SETUP';
    this.setPieceTeam = attackingTeam;
    this.aiSetPieceTimer = 2.1;
    this.userPenaltyDiveChoice = 0;
    this.stadium.clearVanishingSpray();

    const spotX = attackingTeam === 'HOME' ? Stadium.PENALTY_SPOT_X : -Stadium.PENALTY_SPOT_X;
    const goalX = attackingTeam === 'HOME' ? Stadium.HALF_LENGTH : -Stadium.HALF_LENGTH;
    this.ball.placeAt(spotX, 0);

    this.setPieceAimYaw = attackingTeam === 'HOME' ? Math.PI / 2 : -Math.PI / 2;
    this.setPieceAimZ = attackingTeam === 'HOME' ? 2.4 : -2.4;
    this.setPieceAimY = 1.9;
    this.controls.setPieceSpin = 0.25;

    const attackers = (attackingTeam === 'HOME' ? this.homePlayers : this.awayPlayers).filter(
      (p) => !p.isSentOff && p.role !== 'GK'
    );
    const defendingGK = (attackingTeam === 'HOME' ? this.awayPlayers : this.homePlayers).find(
      (p) => p.role === 'GK'
    );

    for (const p of this.players) {
      if (p.isSentOff) continue;
      p.inDefensiveWall = false;
      p.isThrowInTaker = false;
      p.fallenTimer = 0;
      p.slideTimer = 0;
      p.velocity.set(0, 0, 0);
    }

    if (attackers.length > 0) {
      const kicker = attackers[attackers.length - 1];
      this.setPieceKicker = kicker;
      kicker.position.set(spotX + (attackingTeam === 'HOME' ? -2.2 : 2.2), 0, 0);
      kicker.facingAngle = this.setPieceAimYaw;
      kicker.group.position.copy(kicker.position);
      if (attackingTeam === 'HOME') {
        this.setControlledPlayer(kicker);
      }
    }

    if (defendingGK) {
      defendingGK.position.set(goalX + (attackingTeam === 'HOME' ? -0.4 : 0.4), 0, 0);
      defendingGK.facingAngle = attackingTeam === 'HOME' ? -Math.PI / 2 : Math.PI / 2;
      defendingGK.group.position.copy(defendingGK.position);
      if (attackingTeam === 'AWAY') {
        this.setControlledPlayer(defendingGK);
      }
    }

    let lineIdx = 0;
    for (const p of this.players) {
      if (p.isSentOff || p === this.setPieceKicker || p.role === 'GK') continue;
      const arcX = attackingTeam === 'HOME' ? 32.0 : -32.0;
      const arcZ = (lineIdx - 5) * 3.1;
      p.position.set(arcX, 0, THREE.MathUtils.clamp(arcZ, -20, 20));
      p.facingAngle = this.setPieceAimYaw;
      p.group.position.copy(p.position);
      lineIdx++;
    }

    this.referee.resetPosition(spotX + (attackingTeam === 'HOME' ? 2.5 : -2.5), -9.5);
    this.referee.facingAngle = Math.atan2(spotX - this.referee.position.x, -this.referee.position.z);

    this.showSetPiecePanel(attackingTeam === 'HOME', 'PENALTY_KICK');
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;

    const lobbyEl = document.getElementById('lobby-modal');
    const isLobbyOpen = lobbyEl ? !lobbyEl.classList.contains('hidden') : false;

    if (!this.isPaused && !isLobbyOpen) {
      this.update(dt);
    }
    this.renderer.render(this.scene, this.camera);
    this.renderRadarMinimap();
  };

  private update(dt: number): void {
    this.controls.update(dt);
    this.stadium.update(dt);

    const isSetPiece =
      this.matchState === 'FREE_KICK_SETUP' ||
      this.matchState === 'PENALTY_SETUP' ||
      this.matchState === 'CORNER_KICK_SETUP';
    const ownerPlayer = this.players.find((p) => p.id === this.ball.ownerId);
    const isDefense = !isSetPiece && ownerPlayer !== undefined && ownerPlayer.team === 'AWAY';
    this.controls.setContextMode(isDefense, isSetPiece);

    const powerBarWrap = document.getElementById('shot-power-wrap');
    const powerBarFill = document.getElementById('shot-power-fill');
    if (powerBarWrap && powerBarFill) {
      const p1Charging = this.controls.isChargingShot;
      const p2Charging = this.isCoopActive && this.controls.p2.isChargingShot;
      if (p1Charging || p2Charging) {
        const activePower = p1Charging ? this.controls.shotPower : this.controls.p2.shotPower;
        powerBarWrap.classList.remove('hidden');
        powerBarFill.style.width = `${Math.round(activePower * 100)}%`;
      } else {
        powerBarWrap.classList.add('hidden');
      }
    }

    // Online 2P Co-op Guest Mode: send local controller input to Host and render replicated state
    if (this.coopMode === 'ONLINE_COOP' && this.net.role === 'GUEST' && this.net.isConnected) {
      this.net.send({
        t: 'input',
        input: this.controls.consumeLocalAsGuestPacket()
      });
      this.updateGuestVisuals(dt);
      this.updateCamera(dt);
      this.updateRefereeStatusHUD();
      return;
    }

    // Update Assistant Referees (Linesmen) along North & South touchlines
    this.northLinesman.update(dt, this.awayPlayers, this.ball.position);
    this.southLinesman.update(dt, this.homePlayers, this.ball.position);

    switch (this.matchState) {
      case 'KICKOFF':
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.audio.playWhistle('short');
          this.matchState = 'PLAYING';
        }
        this.updateCamera(dt);
        break;

      case 'PLAYING':
      case 'FREE_KICK_PLAY':
      case 'PENALTY_PLAY':
        this.updateOpenPlay(dt);
        this.updateCamera(dt);
        break;

      case 'VAR_REVIEW':
        this.stateTimer -= dt;
        this.referee.updateVarSignal(dt);
        this.updateCamera(dt);
        if (this.stateTimer <= 0 && this.activeFoul) {
          this.audio.playWhistle('double');
          this.finalizeFoulAndShowCard(this.activeFoul);
        }
        break;

      case 'FOUL_CINEMATIC':
        this.updateFoulCinematic(dt);
        this.updateCamera(dt);
        break;

      case 'FREE_KICK_SETUP':
      case 'CORNER_KICK_SETUP':
        this.updateFreeKickSetup(dt);
        this.updateCamera(dt);
        break;

      case 'THROW_IN_SETUP':
        this.updateThrowInSetup(dt);
        this.updateCamera(dt);
        break;

      case 'PENALTY_SETUP':
        this.updatePenaltySetup(dt);
        this.updateCamera(dt);
        break;

      case 'GOAL_CELEBRATION':
        this.stateTimer -= dt;
        this.ball.update(dt);
        for (const p of this.players) p.update(dt);
        this.updateCamera(dt);
        if (this.stateTimer <= 0) {
          this.handlePostGoalTransition();
        }
        break;

      case 'REPLAY_PLAYBACK': {
        const stillPlaying = this.replay.updatePlayback(dt, this.ball, this.players, this.referee);
        this.updateCamera(dt);
        if (!stillPlaying || this.controls.triggerPass || this.controls.triggerShootWithPower !== null) {
          this.controls.triggerPass = false;
          this.controls.triggerShootWithPower = null;
          document.getElementById('replay-badge')?.classList.add('hidden');
          this.setupKickoff(this.ball.position.x > 0 ? 'AWAY' : 'HOME');
        }
        break;
      }

      case 'TROPHY_CELEBRATION':
        this.stateTimer -= dt;
        for (const p of this.homePlayers) {
          p.celebrationTimer = 1.0;
          p.update(dt);
        }
        this.updateCamera(dt);
        break;

      default:
        this.updateCamera(dt);
        break;
    }

    this.updateRefereeStatusHUD();

    if (this.coopMode === 'ONLINE_COOP' && this.net.role === 'HOST' && this.net.isConnected) {
      this.broadcastNetworkSnapshot(dt);
    }
  }

  private handlePostGoalTransition(): void {
    if (this.gameMode === 'PENALTY_SHOOTOUT') {
      this.advancePenaltyShootoutRound(true);
      return;
    }
    if (this.gameMode === 'FREE_KICK_CHALLENGE') {
      this.advanceFreeKickChallenge(true);
      return;
    }

    // Play Slow-Motion Instant Replay after a goal in Exhibition / Tournament!
    if (this.replay.startPlayback()) {
      this.matchState = 'REPLAY_PLAYBACK';
      document.getElementById('replay-badge')?.classList.remove('hidden');
      this.commentary.announce('방금 터진 환상적인 득점 장면을 슬로우 모션 리플레이로 다시 보시겠습니다!', 'normal');
    } else {
      this.setupKickoff(this.ball.position.x > 0 ? 'AWAY' : 'HOME');
    }
  }

  private advancePenaltyShootoutRound(scored: boolean): void {
    if (this.shootoutIsUserTurn) {
      this.shootoutHomeResults.push(scored ? 'O' : 'X');
      this.shootoutIsUserTurn = false;
      this.updateModeSpecificHUD();
      this.enterPenaltySetup('AWAY');
    } else {
      this.shootoutAwayResults.push(scored ? 'O' : 'X');
      this.shootoutIsUserTurn = true;
      this.shootoutRound++;
      this.updateModeSpecificHUD();

      if (this.shootoutRound > 5 && this.homeScore !== this.awayScore) {
        const won = this.homeScore > this.awayScore;
        this.showBanner(
          won ? '🏆 승부차기 승리!!' : '😢 승부차기 패배',
          `최종 승부차기 스코어 ${this.homeScore} : ${this.awayScore}`,
          won ? 'banner-goal' : 'banner-red',
          3.5
        );
        this.commentary.announce(
          won ? '승부차기 끝에 짜릿한 승리를 거둡니다!' : '아쉽게도 승부차기에서 패배합니다.',
          'high'
        );
        this.shootoutRound = 1;
        this.shootoutHomeResults = [];
        this.shootoutAwayResults = [];
        this.homeScore = 0;
        this.awayScore = 0;
      }
      this.enterPenaltySetup('HOME');
    }
  }

  private advanceFreeKickChallenge(scored: boolean): void {
    if (scored) {
      // Calculate bonus based on corner proximity
      const distCorner = Math.hypot(Math.abs(this.ball.position.z) - 3.8, this.ball.position.y - 2.5);
      const pts = distCorner < 1.6 ? 250 : 120;
      this.fkChallengeScore += pts;
      this.fkChallengeBest = Math.max(this.fkChallengeBest, this.fkChallengeScore);
      this.showBanner(
        `🎯 CHALLENGE HIT! +${pts} PTS!`,
        `누적 점수: ${this.fkChallengeScore} PT (최고 기록: ${this.fkChallengeBest} PT)`,
        'banner-goal',
        2.2
      );
    } else {
      this.showBanner(
        `💨 프리킥 실패 (+0 PT)`,
        `다음 스테이지로 이동합니다! (현재: ${this.fkChallengeScore} PT)`,
        'banner-foul',
        1.8
      );
    }

    this.fkChallengeStage = (this.fkChallengeStage % 5) + 1;
    if (this.fkChallengeStage === 1) {
      this.fkChallengeScore = 0;
    }
    this.setupNextFreeKickChallengeStage();
  }

  public advanceTournamentStage(): void {
    if (this.tournamentRound === 1) {
      this.tournamentRound = 2;
      this.awayTeam = TEAMS[this.tournamentOpponents[1]] || TEAMS.FRA;
      this.homeScore = 0;
      this.awayScore = 0;
      this.spawnTeams(this.teamSize);
      this.setupKickoff('HOME');
      this.showBanner('🏆 월드컵 4강(준결승) 진출!', `${this.homeTeam.name} vs ${this.awayTeam.name}`, 'banner-goal', 3.0);
      this.commentary.announce(`4강 준결승전에 진출합니다! 상대는 강호 ${this.awayTeam.name}입니다!`, 'high');
    } else if (this.tournamentRound === 2) {
      this.tournamentRound = 3;
      this.awayTeam = TEAMS[this.tournamentOpponents[2]] || TEAMS.ARG;
      this.homeScore = 0;
      this.awayScore = 0;
      this.spawnTeams(this.teamSize);
      this.setupKickoff('HOME');
      this.showBanner('🏆 대망의 월드컵 결승전 (FINAL)!', `${this.homeTeam.name} vs ${this.awayTeam.name}`, 'banner-goal', 3.2);
      this.commentary.announce(`대망의 월드컵 결승전입니다! 우승 트로피를 놓고 마지막 승부가 펼쳐집니다!`, 'high');
    } else {
      // Won the World Cup Final -> Trophy Celebration!
      this.matchState = 'TROPHY_CELEBRATION';
      this.stateTimer = 8.0;
      this.stadium.trophyGroup.visible = true;
      this.stadium.triggerGoalCrowdCelebration();
      this.audio.playGoalCheer();

      // Gather Home team around the Golden World Cup Trophy at center circle
      this.homePlayers.forEach((p, idx) => {
        const angle = (idx / this.homePlayers.length) * Math.PI * 2;
        p.position.set(Math.cos(angle) * 4.5, 0, Math.sin(angle) * 4.5);
        p.facingAngle = Math.atan2(-p.position.x, -p.position.z);
        p.celebrationTimer = 8.0;
        p.group.position.copy(p.position);
      });

      this.showBanner(
        `🏆 WORLD CUP CHAMPIONS!! (${this.homeTeam.name})`,
        `결승전 승리로 황금빛 월드컵 트로피를 들어 올립니다!! 🎉`,
        'banner-goal',
        6.0
      );
      this.commentary.announce(
        `축하합니다! ${this.homeTeam.name} 대표팀이 결승전을 제압하고 월드컵 챔피언에 등극합니다!`,
        'high'
      );
    }
    this.updateScoreboardHUD();
    this.updateModeSpecificHUD();
  }

  private updateOpenPlay(dt: number): void {
    // Record frame for Instant Replay
    this.replay.recordStep(dt, this.ball, this.players, this.referee);

    // Handle Free Kick / Penalty Shootout flight timeout if ball stops or goes far out
    if (this.matchState === 'PENALTY_PLAY' || (this.gameMode === 'FREE_KICK_CHALLENGE' && this.matchState === 'FREE_KICK_PLAY')) {
      this.stateTimer += dt;
      if (this.stateTimer > 3.6 || (this.stateTimer > 1.2 && this.ball.velocity.length() < 1.5)) {
        this.stateTimer = 0;
        if (this.gameMode === 'PENALTY_SHOOTOUT') {
          this.advancePenaltyShootoutRound(false);
          return;
        } else if (this.gameMode === 'FREE_KICK_CHALLENGE') {
          this.advanceFreeKickChallenge(false);
          return;
        } else {
          this.matchState = 'PLAYING';
        }
      }
    }

    // Advance match clock in standard matches
    if (this.gameMode === 'EXHIBITION' || this.gameMode === 'TOURNAMENT') {
      this.matchClockSec += dt;
      if (this.half === 1 && this.matchClockSec >= this.halfDurationSec) {
        this.half = 2;
        this.matchClockSec = this.halfDurationSec;
        this.audio.playWhistle('double');
        this.showBanner('HALF TIME ⏱️', '후반전이 곧 시작됩니다 (2ND HALF)', 'banner-setpiece', 2.2);
        this.commentary.announce('전반전이 종료되었습니다. 잠시 후 후반전이 시작됩니다.', 'normal');
        this.setupKickoff('AWAY');
        this.updateScoreboardHUD();
        return;
      } else if (this.half === 2 && this.matchClockSec >= this.halfDurationSec * 2) {
        this.matchClockSec = 0;
        this.half = 1;
        this.audio.playWhistle('fulltime');
        if (this.gameMode === 'TOURNAMENT' && this.homeScore >= this.awayScore) {
          this.advanceTournamentStage();
          return;
        }
        this.showBanner(
          `FULL TIME 🏁 (${this.homeScore} : ${this.awayScore})`,
          '경기가 종료되었습니다! 새 킥오프로 이어서 진행합니다.',
          'banner-setpiece',
          3.0
        );
        this.setupKickoff('HOME');
        this.updateScoreboardHUD();
        return;
      }
      this.updateClockHUD();
    }

    if (this.controls.triggerSwitchPlayer) {
      this.controls.triggerSwitchPlayer = false;
      this.switchToNearestHomePlayer('P1');
    }
    if (this.isCoopActive && this.controls.p2.triggerSwitchPlayer) {
      this.controls.p2.triggerSwitchPlayer = false;
      this.switchToNearestHomePlayer('P2');
    }

    const currentOwner = this.players.find((p) => p.id === this.ball.ownerId);
    if (
      currentOwner &&
      currentOwner.team === 'HOME' &&
      currentOwner !== this.controlledPlayer &&
      currentOwner !== this.controlledPlayer2
    ) {
      if (this.isCoopActive && this.controlledPlayer && this.controlledPlayer2) {
        const d1 = this.controlledPlayer.position.distanceTo(currentOwner.position);
        const d2 = this.controlledPlayer2.position.distanceTo(currentOwner.position);
        if (d2 < d1 && currentOwner.role !== 'GK') {
          this.setControlledPlayer2(currentOwner);
        } else {
          this.setControlledPlayer(currentOwner);
        }
      } else {
        this.setControlledPlayer(currentOwner);
      }
    }

    this.syncCoopControllers();

    if (this.controlledPlayer) {
      this.updateControlledSlotInput('P1', this.controlledPlayer, this.controls, dt);
    }
    if (this.isCoopActive && this.controlledPlayer2) {
      this.updateControlledSlotInput('P2', this.controlledPlayer2, this.controls.p2, dt);
    }

    for (const p of this.players) {
      if (p.isSentOff) continue;
      const isP1 = p === this.controlledPlayer;
      const isP2 = this.isCoopActive && p === this.controlledPlayer2;
      if (!isP1 && !isP2) {
        this.updatePlayerAI(p, dt);
      }
      const sprinting =
        (isP1 && this.controls.isSprinting) || (isP2 && this.controls.p2.isSprinting);
      p.update(dt, sprinting);
    }

    this.checkSlideTacklesAndFouls();
    if (this.matchState === 'FOUL_CINEMATIC' || this.matchState === 'VAR_REVIEW') return;

    this.updateBallPossessionAndDribbling(dt);
    if (this.matchState === 'FREE_KICK_SETUP') return;

    this.ball.update(dt);
    this.checkGoalAndBoundaries();
    this.referee.updateFollowPlay(dt, this.ball.position, this.ball.velocity, this.players);
  }

  private updateControlledSlotInput(
    slot: 'P1' | 'P2',
    p: Player,
    input: PlayerInputState,
    dt: number
  ): void {
    if (!p || p.isSentOff || p.fallenTimer > 0) return;

    const move = input.moveVec;
    const speedMult = p.getEffectiveSpeedMultiplier(input.isSprinting);
    const baseSpeed = (input.isSprinting ? 14.8 : 8.8) * speedMult;

    let moveWorldX = move.x;
    let moveWorldZ = move.y;
    if (this.cameraMode === 'THIRD_PERSON') {
      moveWorldX = -move.y;
      moveWorldZ = move.x;
    }

    // Handle Skill Move (Marseille 360° Spin) or Tactical Stance Switch (#btn-skill / KeyE)
    if (input.triggerSkillOrTactics) {
      input.triggerSkillOrTactics = false;
      const owner = this.players.find((pl) => pl.id === this.ball.ownerId);
      if (owner && owner.team === 'AWAY') {
        this.cycleTacticalStance();
      } else if (p.triggerSkillMove()) {
        this.audio.playKick(0.35);
        this.commentary.announce(`${p.starName} 화려한 마르세유 턴 개인기로 수비를 벗겨냅니다!`, 'low');
        for (const opp of this.awayPlayers) {
          if (!opp.isSentOff && opp.position.distanceTo(p.position) < 2.5) {
            opp.triggerFallDown(0.95);
          }
        }
      }
    }

    if (p.slideTimer <= 0) {
      if (move.lengthSq() > 0.02) {
        const lerpFactor = input.isSprinting ? dt * 18 : dt * 12;
        p.velocity.x = THREE.MathUtils.lerp(p.velocity.x, moveWorldX * baseSpeed, lerpFactor);
        p.velocity.z = THREE.MathUtils.lerp(p.velocity.z, moveWorldZ * baseSpeed, lerpFactor);
      } else if (input.isPressingDefense && this.ball.ownerId !== p.id) {
        const toBall = this.ball.position.clone().sub(p.position);
        toBall.y = 0;
        if (toBall.length() > 0.8) {
          toBall.normalize();
          p.velocity.x = toBall.x * 9.6;
          p.velocity.z = toBall.z * 9.6;
        }
      } else {
        p.velocity.multiplyScalar(0.72);
      }
    }

    if (input.triggerSlideTackle) {
      input.triggerSlideTackle = false;
      const tackleDir =
        move.lengthSq() > 0.05
          ? new THREE.Vector3(moveWorldX, 0, moveWorldZ).normalize()
          : this.ball.position.clone().sub(p.position).setY(0).normalize();
      p.triggerSlideTackle(tackleDir);
    }

    const distToBall = p.position.distanceTo(this.ball.position);
    const canKickBall = this.ball.ownerId === p.id || (this.ball.ownerId === null && distToBall < 1.85);

    if (canKickBall) {
      // 1) Shoot
      if (input.triggerShootWithPower !== null) {
        const power = input.triggerShootWithPower;
        input.triggerShootWithPower = null;

        const goalTarget = new THREE.Vector3(
          Stadium.HALF_LENGTH,
          0,
          THREE.MathUtils.clamp(moveWorldZ * 4.8, -Stadium.GOAL_HALF_WIDTH + 0.6, Stadium.GOAL_HALF_WIDTH - 0.6)
        );
        const shootDir = goalTarget.sub(p.position).normalize();
        const speed = (20.5 + power * 15.5) * p.shootStat;
        const loft = 2.8 + power * 6.8;

        // If shooting with straight aim (near zero lateral steer) and solid power, trigger a Knuckleball Power Shot!
        const isKnuckleAim = Math.abs(moveWorldZ) < 0.22 && power >= 0.62;
        const curveSpin = isKnuckleAim ? 0 : -moveWorldZ * 1.15 * p.curveStat;

        p.kickAnimTimer = 0.28;
        this.pendingOffsideReceiverId = null;
        this.ball.kick(shootDir, speed, loft, curveSpin, p.id, 'HOME');
        this.ball.isShot = true;
        this.ball.isKnuckleShot = isKnuckleAim;

        this.audio.playKick(power);
        if (isKnuckleAim) {
          this.commentary.announce(`${p.starName} 흔들리는 무회전 강슛(KNUCKLEBALL) 작렬!!`, 'high');
          this.showBanner('🌀 KNUCKLEBALL SHOT!', `${p.starName} 회전 없이 요동치는 무회전 슛!`, 'banner-setpiece', 1.8);
        } else {
          this.commentary.announce(`${p.starName} 강력한 슈팅!!`, 'normal');
        }
      }

      // 2) Short Ground Pass (Prioritizes Co-op Partner if aiming toward them!)
      if (input.triggerPass) {
        input.triggerPass = false;
        const passTarget = this.findBestTeammateForPass(p, new THREE.Vector3(moveWorldX, 0, moveWorldZ), false);
        const passDir = passTarget
          ? passTarget.position.clone().sub(p.position).normalize()
          : new THREE.Vector3(Math.sin(p.facingAngle), 0, Math.cos(p.facingAngle));

        if (passTarget) {
          this.checkPassForOffside(p, passTarget);
        }
        p.kickAnimTimer = 0.22;
        this.ball.kick(passDir, 18.8, 1.15, 0, p.id, 'HOME');
        this.ball.isShot = false;
        this.ball.isKnuckleShot = false;
        this.audio.playKick(0.5);

        if (passTarget) {
          const isPartnerAlreadyControlling =
            this.isCoopActive &&
            ((slot === 'P1' && passTarget === this.controlledPlayer2) ||
              (slot === 'P2' && passTarget === this.controlledPlayer));
          if (!isPartnerAlreadyControlling) {
            if (slot === 'P2') this.setControlledPlayer2(passTarget);
            else this.setControlledPlayer(passTarget);
          } else {
            this.commentary.announce(
              `${p.starName} 선수가 파트너 ${passTarget.starName} 선수에게 패스를 연결합니다!`,
              'low'
            );
          }
        }
      }

      // 3) Through Pass / Lofted Ball
      if (input.triggerThrough) {
        input.triggerThrough = false;
        const targetMate = this.findBestTeammateForPass(p, new THREE.Vector3(moveWorldX, 0, moveWorldZ), true);
        let dir = new THREE.Vector3(1, 0, moveWorldZ * 0.5).normalize();
        if (targetMate) {
          this.checkPassForOffside(p, targetMate);
          const leadSpot = targetMate.position.clone().add(new THREE.Vector3(7.5, 0, 0));
          dir = leadSpot.sub(p.position).normalize();

          const isPartnerAlreadyControlling =
            this.isCoopActive &&
            ((slot === 'P1' && targetMate === this.controlledPlayer2) ||
              (slot === 'P2' && targetMate === this.controlledPlayer));
          if (!isPartnerAlreadyControlling) {
            if (slot === 'P2') this.setControlledPlayer2(targetMate);
            else this.setControlledPlayer(targetMate);
          }
        }
        p.kickAnimTimer = 0.25;
        this.ball.kick(dir, 22.0, 4.2, 0.35 * p.curveStat, p.id, 'HOME');
        this.ball.isShot = false;
        this.ball.isKnuckleShot = false;
        this.audio.playKick(0.75);
        this.commentary.announce(`${p.starName} 날카로운 스루패스를 찔러줍니다!`, 'low');
      }
    } else {
      input.triggerShootWithPower = null;
      input.triggerPass = false;
      input.triggerThrough = false;
    }
  }

  private checkPassForOffside(passer: Player, receiver: Player): void {
    this.pendingOffsideReceiverId = null;
    if (passer.team === 'HOME') {
      const offLine = this.northLinesman.offsideLineX;
      if (receiver.position.x > 3.0 && receiver.position.x > passer.position.x + 1.5 && receiver.position.x > offLine + 2.2) {
        this.pendingOffsideReceiverId = receiver.id;
        this.pendingOffsideLineX = offLine;
      }
    }
  }

  private findBestTeammateForPass(
    passer: Player,
    inputDir: THREE.Vector3,
    isThrough: boolean
  ): Player | null {
    const mates = (passer.team === 'HOME' ? this.homePlayers : this.awayPlayers).filter(
      (m) => m !== passer && !m.isSentOff && m.role !== 'GK'
    );
    if (mates.length === 0) return null;

    const desiredDir =
      inputDir.lengthSq() > 0.04
        ? inputDir.clone().normalize()
        : new THREE.Vector3(passer.team === 'HOME' ? 1 : -1, 0, 0);

    let best: Player = mates[0];
    let bestScore = -Infinity;

    for (const m of mates) {
      const toMate = m.position.clone().sub(passer.position);
      const dist = toMate.length();
      if (dist < 2 || dist > 44) continue;
      toMate.normalize();
      const align = toMate.dot(desiredDir);
      const forwardBonus = isThrough ? (passer.team === 'HOME' ? m.position.x : -m.position.x) * 0.03 : 0;
      const isHumanPartner =
        this.isCoopActive &&
        passer.team === 'HOME' &&
        (m === this.controlledPlayer || m === this.controlledPlayer2);
      const partnerBonus = isHumanPartner && align > 0.12 ? 0.78 : 0;
      const score = align * 2.2 - dist * 0.03 + forwardBonus + partnerBonus;
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }
    return best;
  }

  private updatePlayerAI(p: Player, dt: number): void {
    if (p.slideTimer > 0 || p.fallenTimer > 0 || p.diveTimer > 0 || p.celebrationTimer > 0) return;

    const isAway = p.team === 'AWAY';
    const diff = DIFFICULTY_PROFILES[this.difficulty];

    // 1. Goalkeeper AI
    if (p.role === 'GK') {
      const goalX = p.team === 'HOME' ? -Stadium.HALF_LENGTH + 1.4 : Stadium.HALF_LENGTH - 1.4;
      const trackRatio = isAway ? 0.36 * Math.min(1.25, diff.aiGkSpeedMult) : 0.36;
      const targetZ = THREE.MathUtils.clamp(this.ball.position.z * trackRatio, -4.6, 4.6);
      const gkTarget = new THREE.Vector3(goalX, 0, targetZ);

      const ballSpeedX = p.team === 'HOME' ? -this.ball.velocity.x : this.ball.velocity.x;
      const distToGoalX = Math.abs(this.ball.position.x - goalX);
      const diveTriggerSpeed = isAway ? 12.5 / diff.aiGkSpeedMult : 11;
      const diveDetectDist = isAway ? 14.5 * diff.aiGkSpeedMult : 15;
      if (ballSpeedX > diveTriggerSpeed && distToGoalX < diveDetectDist && Math.abs(this.ball.position.z) < 7.5) {
        const predictedZ = this.ball.position.z + this.ball.velocity.z * (distToGoalX / ballSpeedX);
        const diffZ = predictedZ - p.position.z;
        const diveThreshold = isAway ? 1.55 / diff.aiGkSpeedMult : 1.35;
        if (Math.abs(diffZ) > diveThreshold) {
          p.triggerGKDive(Math.sign(diffZ));
          return;
        }
      }

      const gkSpd = isAway ? diff.aiGkSpeedMult : 1.0;
      const toTarget = gkTarget.sub(p.position);
      p.velocity.x = toTarget.x * 5.0 * gkSpd;
      p.velocity.z = toTarget.z * 5.5 * gkSpd;
      p.facingAngle = p.team === 'HOME' ? Math.PI / 2 : -Math.PI / 2;

      if (this.ball.ownerId === p.id) {
        const clearDir = new THREE.Vector3(p.team === 'HOME' ? 1 : -1, 0, (Math.random() - 0.5) * 0.5).normalize();
        p.kickAnimTimer = 0.25;
        this.ball.kick(clearDir, 24, 6.5, 0, p.id, p.team);
        this.audio.playKick(0.8);
      }
      return;
    }

    // 2. Outfield AI when THIS player has the ball
    if (this.ball.ownerId === p.id) {
      const attackGoalX = p.team === 'HOME' ? Stadium.HALF_LENGTH : -Stadium.HALF_LENGTH;
      const toGoal = new THREE.Vector3(attackGoalX - p.position.x, 0, -p.position.z);
      const distToGoal = toGoal.length();
      toGoal.normalize();

      const shootFreq = isAway ? 2.2 * diff.aiShootFreqMult : 2.2;
      const maxShootDist = isAway && (this.difficulty === 'HARD' || this.difficulty === 'LEGEND') ? 27 : 24;
      if (distToGoal < maxShootDist && Math.random() < dt * shootFreq) {
        // On HARD/LEGEND, AI aims deliberately toward corners; on EASY, wider scatter
        let aimZ = (Math.random() - 0.5) * (Stadium.GOAL_HALF_WIDTH * 1.5);
        if (isAway && (this.difficulty === 'HARD' || this.difficulty === 'LEGEND')) {
          aimZ = (Math.random() < 0.5 ? -1 : 1) * (2.2 + Math.random() * 1.4);
        } else if (isAway && this.difficulty === 'EASY') {
          aimZ = (Math.random() - 0.5) * (Stadium.GOAL_HALF_WIDTH * 2.2);
        }
        const shotDir = new THREE.Vector3(attackGoalX - p.position.x, 0, aimZ - p.position.z).normalize();
        p.kickAnimTimer = 0.26;
        const shotSpd = 25.0 * p.shootStat * (isAway ? diff.aiShootSpeedMult : 1.0);
        this.ball.kick(shotDir, shotSpd, 4.4, (Math.random() - 0.5) * 1.1, p.id, p.team);
        this.audio.playKick(0.85);
        this.commentary.announce(`${p.starName} 과감한 중거리 슈팅!`, 'normal');
        return;
      }

      const opponents = p.team === 'HOME' ? this.awayPlayers : this.homePlayers;
      const closestOpp = opponents.find(
        (opp) => !opp.isSentOff && opp.position.distanceTo(p.position) < 4.2
      );
      const passFreq = isAway ? 2.5 * diff.aiPassFreqMult : 2.5;
      if (closestOpp && Math.random() < dt * passFreq) {
        const mate = this.findBestTeammateForPass(p, toGoal, false);
        if (mate) {
          const passDir = mate.position.clone().sub(p.position).normalize();
          p.kickAnimTimer = 0.22;
          this.ball.kick(passDir, 18.5, 1.2, 0, p.id, p.team);
          this.audio.playKick(0.55);
          return;
        }
      }

      const dribbleSpd = 7.6 * p.speedStat * (isAway ? diff.aiSpeedMult : 1.0);
      p.velocity.set(toGoal.x * dribbleSpd, 0, toGoal.z * dribbleSpd);
      return;
    }

    // 3. Outfield AI without ball
    const teamPlayers = (p.team === 'HOME' ? this.homePlayers : this.awayPlayers).filter(
      (m) => !m.isSentOff && m.role !== 'GK'
    );

    let closestChaser = teamPlayers[0];
    let minBallDist = Infinity;
    for (const m of teamPlayers) {
      if (m.isControlled) continue;
      const d = m.position.distanceTo(this.ball.position);
      if (d < minBallDist) {
        minBallDist = d;
        closestChaser = m;
      }
    }

    if (p === closestChaser && (p.team === 'AWAY' || this.ball.ownerId === null)) {
      const toBall = this.ball.position.clone().sub(p.position);
      toBall.y = 0;
      const dist = toBall.length();
      if (dist > 0.5) {
        toBall.normalize();
        const chaseSpd = 7.6 * p.speedStat * (isAway ? diff.aiSpeedMult : 1.0);
        p.velocity.set(toBall.x * chaseSpd, 0, toBall.z * chaseSpd);
      }

      const ballOwner = this.players.find((pl) => pl.id === this.ball.ownerId);
      if (
        p.team === 'AWAY' &&
        ballOwner &&
        ballOwner.team === 'HOME' &&
        dist > 1.5 &&
        dist < 3.4 &&
        Math.random() < dt * 0.65 * diff.aiTackleFreqMult
      ) {
        p.triggerSlideTackle(toBall);
      }
      return;
    }

    // Tactical formation shift (Attack vs Balanced vs Defend)
    let stanceOffset = 0;
    if (p.team === 'HOME') {
      stanceOffset = this.tacticalStance === 'ATTACK' ? 9.5 : this.tacticalStance === 'DEFEND' ? -8.5 : 0;
    }

    const shiftX = this.ball.position.x * 0.42 + stanceOffset;
    const shiftZ = this.ball.position.z * 0.28;
    const targetX = THREE.MathUtils.clamp(p.homePosition.x + shiftX, -46, 46);
    const targetZ = THREE.MathUtils.clamp(p.homePosition.z + shiftZ, -30, 30);

    const toForm = new THREE.Vector3(targetX - p.position.x, 0, targetZ - p.position.z);
    const distForm = toForm.length();
    if (distForm > 1.2) {
      toForm.normalize();
      const spd = Math.min(6.8, distForm * 1.6) * (isAway ? diff.aiSpeedMult : 1.0);
      p.velocity.set(toForm.x * spd, 0, toForm.z * spd);
    } else {
      p.velocity.multiplyScalar(0.75);
    }
  }

  private checkSlideTacklesAndFouls(): void {
    for (const tackler of this.players) {
      if (tackler.isSentOff || tackler.slideTimer <= 0 || tackler.slideHasDealtContact) continue;

      const opponents = tackler.team === 'HOME' ? this.awayPlayers : this.homePlayers;
      const distToBall = tackler.position.distanceTo(this.ball.position);

      for (const victim of opponents) {
        if (victim.isSentOff || victim.fallenTimer > 0 || victim.skillTimer > 0) continue;

        const distToVictim = tackler.position.distanceTo(victim.position);
        if (distToVictim < 1.68) {
          tackler.slideHasDealtContact = true;

          const victimFacingVec = new THREE.Vector3(
            Math.sin(victim.facingAngle),
            0,
            Math.cos(victim.facingAngle)
          );
          const tackleApproachVec = victim.position.clone().sub(tackler.position).normalize();
          const isBackTackle = tackleApproachVec.dot(victimFacingVec) > 0.35;

          const wonBallCleanly =
            !isBackTackle &&
            distToBall < 1.35 &&
            distToBall < distToVictim - 0.12 &&
            Math.random() < 0.45;

          if (wonBallCleanly) {
            this.ball.ownerId = tackler.id;
            this.ball.lastTouchTeam = tackler.team;
            victim.triggerFallDown(0.7);
            this.audio.playTackleHit(false);
            this.showBanner('CLEAN TACKLE! 🛡️', '공을 먼저 정확하게 건드린 정당한 태클!', 'banner-clean', 1.4);
            this.commentary.announce(`${tackler.starName} 깔끔한 슬라이딩 태클로 공만 쏙 빼냅니다!`, 'low');
            return;
          }

          const foulPos = victim.position.clone();
          const defendingSideX = tackler.team === 'HOME' ? -1 : 1;
          const inDefendingPenaltyBox =
            foulPos.x * defendingSideX > Stadium.HALF_LENGTH - Stadium.PENALTY_BOX_DEPTH &&
            Math.abs(foulPos.z) < Stadium.PENALTY_BOX_HALF_WIDTH;

          let cardType: CardType = 'YELLOW';
          let reasonKo = '상대 다리를 가격한 거친 슬라이딩 태클 반칙!';

          if (tackler.yellowCards >= 1) {
            cardType = 'SECOND_YELLOW_RED';
            reasonKo = '경고 2회 누적(옐로카드 2장)으로 인한 레드카드 퇴장!';
          } else if (isBackTackle && (inDefendingPenaltyBox || Math.random() < 0.55)) {
            cardType = 'DIRECT_RED';
            reasonKo = '위험한 후방 백태클 반칙으로 다이렉트 레드카드!';
          } else if (inDefendingPenaltyBox) {
            cardType = 'YELLOW';
            reasonKo = '페널티 박스 안쪽 깊은 태클 반칙!';
          }

          this.commitFoul({
            offenderId: tackler.id,
            offenderTeam: tackler.team,
            victimId: victim.id,
            foulPosition: foulPos,
            isPenaltyBox: inDefendingPenaltyBox,
            cardType,
            reasonKo,
            severity: isBackTackle ? 0.95 : 0.7,
            useVarCheck: inDefendingPenaltyBox && Math.random() < 0.45
          });
          return;
        }
      }
    }
  }

  private updateFoulCinematic(dt: number): void {
    this.stateTimer -= dt;
    this.ball.update(dt);

    const offender = this.players.find((p) => p.id === this.activeFoul?.offenderId);
    for (const p of this.players) {
      p.update(dt);
    }

    if (offender) {
      this.referee.updateFoulSequence(dt, offender);

      if (this.referee.isShowingCard && !this.cardSoundPlayed) {
        this.cardSoundPlayed = true;
        this.audio.playCardSound(this.activeFoul?.cardType === 'DIRECT_RED');
      }
      if (
        this.activeFoul?.cardType === 'SECOND_YELLOW_RED' &&
        this.stateTimer < 1.7 &&
        !this.secondCardSoundPlayed
      ) {
        this.secondCardSoundPlayed = true;
        this.audio.playCardSound(true);
      }
    }

    if (this.stateTimer <= 0 && this.activeFoul) {
      if (offender && offender.redCard) {
        offender.isSentOff = true;
        offender.group.visible = false;
        if (this.controlledPlayer === offender) {
          this.switchToNearestHomePlayer('P1');
        }
        if (this.controlledPlayer2 === offender) {
          this.switchToNearestHomePlayer('P2');
        }
      }

      const attackingTeam: 'HOME' | 'AWAY' =
        this.activeFoul.offenderTeam === 'HOME' ? 'AWAY' : 'HOME';

      if (this.activeFoul.isPenaltyBox) {
        this.enterPenaltySetup(attackingTeam);
      } else {
        this.enterFreeKickSetup(attackingTeam, this.activeFoul.foulPosition);
      }
    }
  }

  private updateSetPiecePartnerMovement(dt: number): void {
    if (!this.isCoopActive || !this.controlledPlayer2 || this.controlledPlayer2 === this.setPieceKicker) {
      return;
    }
    const p2 = this.controlledPlayer2;
    const mv = this.controls.p2.moveVec;
    if (mv.lengthSq() > 0.02) {
      const spd = 7.8 * p2.speedStat;
      p2.velocity.set(mv.x * spd, 0, mv.y * spd);
    } else {
      p2.velocity.multiplyScalar(0.75);
    }
    p2.update(dt, this.controls.p2.isSprinting);
  }

  private updateThrowInSetup(dt: number): void {
    const isUser = this.setPieceTeam === 'HOME';
    if (isUser) {
      this.setPieceAimYaw -= this.controls.moveVec.x * dt * 1.2;
      this.updateSetPiecePartnerMovement(dt);
    } else {
      this.aiSetPieceTimer -= dt;
    }

    if (this.setPieceKicker) {
      this.setPieceKicker.facingAngle = this.setPieceAimYaw;
      this.setPieceKicker.bodyGroup.rotation.y = this.setPieceAimYaw;
    }

    const shouldThrow =
      (isUser && (this.controls.triggerPass || this.controls.triggerShootWithPower !== null || this.controls.triggerThrough)) ||
      (!isUser && this.aiSetPieceTimer <= 0);

    if (shouldThrow && this.setPieceKicker) {
      this.controls.triggerPass = false;
      this.controls.triggerShootWithPower = null;
      this.controls.triggerThrough = false;
      this.setPieceKicker.isThrowInTaker = false;

      const dir = new THREE.Vector3(Math.sin(this.setPieceAimYaw), 0, Math.cos(this.setPieceAimYaw)).normalize();
      const mate = this.findBestTeammateForPass(this.setPieceKicker, dir, false);
      const throwDir = mate ? mate.position.clone().sub(this.setPieceKicker.position).normalize() : dir;

      this.ball.position.set(this.setPieceKicker.position.x, 1.4, this.setPieceKicker.position.z);
      this.ball.kick(throwDir, 15.5, 2.8, 0, this.setPieceKicker.id, this.setPieceTeam);
      this.audio.playKick(0.45);
      if (mate && isUser) this.setControlledPlayer(mate);
      this.matchState = 'PLAYING';
    }
  }

  private updateFreeKickSetup(dt: number): void {
    const isUserKicker = this.setPieceTeam === 'HOME';
    const goalX = this.setPieceTeam === 'HOME' ? Stadium.HALF_LENGTH : -Stadium.HALF_LENGTH;

    if (isUserKicker) {
      this.setPieceAimYaw -= this.controls.moveVec.x * dt * 0.65;
      if (Math.abs(this.controls.moveVec.y) > 0.1) {
        this.controls.setPieceElevation = THREE.MathUtils.clamp(
          this.controls.setPieceElevation - this.controls.moveVec.y * dt * 0.6,
          0.25,
          1.0
        );
      }
      this.updateSetPiecePartnerMovement(dt);
    } else {
      this.aiSetPieceTimer -= dt;
    }

    const dir = new THREE.Vector3(Math.sin(this.setPieceAimYaw), 0, Math.cos(this.setPieceAimYaw)).normalize();
    const previewPower = this.controls.isChargingShot ? this.controls.shotPower : 0.72;
    const speed = 22.0 + previewPower * 10.5;
    const loft = 4.2 + this.controls.setPieceElevation * 5.8;
    const spin = this.controls.setPieceSpin * 1.45;

    if (this.setPieceKicker) {
      this.setPieceKicker.position.set(
        this.ball.position.x - dir.x * 1.65,
        0,
        this.ball.position.z - dir.z * 1.65
      );
      this.setPieceKicker.facingAngle = this.setPieceAimYaw;
      this.setPieceKicker.group.position.copy(this.setPieceKicker.position);
      this.setPieceKicker.bodyGroup.rotation.y = this.setPieceAimYaw;
    }

    this.ball.updateTrajectoryGuide(this.ball.position, dir, speed, loft, spin, true);

    const shouldFireShot =
      (isUserKicker &&
        (this.controls.triggerShootWithPower !== null ||
          this.controls.triggerThrough ||
          this.controls.triggerSkillOrTactics ||
          this.controls.p2.triggerShootWithPower !== null ||
          this.controls.p2.triggerThrough ||
          this.controls.p2.triggerSkillOrTactics)) ||
      (!isUserKicker && this.aiSetPieceTimer <= 0);

    if (shouldFireShot) {
      const p1Power = this.controls.triggerShootWithPower;
      const p2Power = this.controls.p2.triggerShootWithPower;
      const power = p1Power ?? p2Power ?? 0.78;
      const isKnuckle =
        this.controls.triggerThrough ||
        this.controls.p2.triggerThrough ||
        Math.abs(this.controls.setPieceSpin) < 0.18;
      const isChip = this.controls.triggerSkillOrTactics || this.controls.p2.triggerSkillOrTactics;
      this.controls.triggerShootWithPower = null;
      this.controls.triggerThrough = false;
      this.controls.triggerSkillOrTactics = false;
      this.controls.p2.triggerShootWithPower = null;
      this.controls.p2.triggerThrough = false;
      this.controls.p2.triggerSkillOrTactics = false;

      const finalSpeed = isChip ? 18.5 : isKnuckle ? 29.5 : 22.5 + power * 11.5;
      const finalLoft = isChip ? 8.8 : isKnuckle ? 3.8 + this.controls.setPieceElevation * 3.2 : 4.5 + this.controls.setPieceElevation * 5.6;
      const finalSpin = isKnuckle ? 0 : this.controls.setPieceSpin * 1.55;

      if (this.setPieceKicker) {
        this.setPieceKicker.kickAnimTimer = 0.3;
      }

      for (const p of this.players) {
        if (p.inDefensiveWall) {
          p.triggerWallJump();
        }
      }

      this.ball.updateTrajectoryGuide(this.ball.position, dir, 0, 0, 0, false);
      this.ball.kick(dir, finalSpeed, finalLoft, finalSpin, this.setPieceKicker?.id || null, this.setPieceTeam);
      this.ball.isShot = true;
      this.ball.isKnuckleShot = isKnuckle;
      this.audio.playKick(0.95);

      if (isKnuckle) {
        this.commentary.announce(`${this.setPieceKicker?.starName || '키커'} 전광석화 같은 무회전 프리킥 강슛(KNUCKLEBALL)!!`, 'high');
        this.showBanner('🌀 KNUCKLEBALL FREE KICK!', '회전 없는 공포의 낙차 궤적 무회전 슛!', 'banner-setpiece', 2.0);
      } else {
        this.commentary.announce(`${this.setPieceKicker?.starName || '키커'} 직접 감아차기 프리킥 슛!!`, 'normal');
      }
      this.hideSetPiecePanel();
      this.stateTimer = 0;
      this.matchState = 'FREE_KICK_PLAY';
      return;
    }

    const p1Pass = this.controls.triggerPass;
    const p2Pass = this.controls.p2.triggerPass;
    if (isUserKicker && (p1Pass || p2Pass) && this.setPieceKicker) {
      this.controls.triggerPass = false;
      this.controls.p2.triggerPass = false;
      const mate = this.findBestTeammateForPass(this.setPieceKicker, dir, false);
      const passDir = mate ? mate.position.clone().sub(this.ball.position).normalize() : dir;
      this.ball.updateTrajectoryGuide(this.ball.position, dir, 0, 0, 0, false);
      this.ball.kick(passDir, 18.0, 1.0, 0, this.setPieceKicker.id, this.setPieceTeam);
      this.ball.isShot = false;
      this.ball.isKnuckleShot = false;
      this.audio.playKick(0.55);
      if (mate) this.setControlledPlayer(mate);
      this.hideSetPiecePanel();
      this.matchState = 'PLAYING';
    }
  }

  private updatePenaltySetup(dt: number): void {
    const isUserKicker = this.setPieceTeam === 'HOME';
    const goalX = this.setPieceTeam === 'HOME' ? Stadium.HALF_LENGTH : -Stadium.HALF_LENGTH;

    if (isUserKicker) {
      this.setPieceAimZ = THREE.MathUtils.clamp(
        this.setPieceAimZ + this.controls.moveVec.x * dt * 7.5,
        -Stadium.GOAL_HALF_WIDTH + 0.65,
        Stadium.GOAL_HALF_WIDTH - 0.65
      );
      this.setPieceAimY = THREE.MathUtils.clamp(
        this.setPieceAimY - this.controls.moveVec.y * dt * 4.5,
        0.55,
        Stadium.GOAL_HEIGHT - 0.45
      );
    } else {
      if (Math.abs(this.controls.moveVec.x) > 0.25) {
        this.userPenaltyDiveChoice = Math.sign(this.controls.moveVec.x);
      }
      this.aiSetPieceTimer -= dt;
    }

    const toTarget = new THREE.Vector3(
      goalX - this.ball.position.x,
      0,
      this.setPieceAimZ - this.ball.position.z
    ).normalize();
    const spin = isUserKicker ? this.controls.setPieceSpin * 1.1 : (Math.random() - 0.5) * 0.8;
    const loft = 1.6 + this.setPieceAimY * 2.35;

    this.ball.updateTrajectoryGuide(this.ball.position, toTarget, 26.5, loft, spin, isUserKicker);
    if (isUserKicker) {
      this.ball.targetReticle.position.set(goalX, this.setPieceAimY, this.setPieceAimZ);
    }

    const shouldShootPK =
      (isUserKicker &&
        (this.controls.triggerShootWithPower !== null ||
          this.controls.triggerPass ||
          this.controls.triggerThrough ||
          this.controls.triggerSkillOrTactics ||
          this.controls.p2.triggerShootWithPower !== null ||
          this.controls.p2.triggerPass ||
          this.controls.p2.triggerThrough ||
          this.controls.p2.triggerSkillOrTactics)) ||
      (!isUserKicker && this.aiSetPieceTimer <= 0);

    if (shouldShootPK) {
      const p1Power = this.controls.triggerShootWithPower;
      const p2Power = this.controls.p2.triggerShootWithPower;
      const power = p1Power ?? p2Power ?? 0.82;
      const isKnuckle =
        this.controls.triggerThrough ||
        this.controls.p2.triggerThrough ||
        Math.abs(this.controls.setPieceSpin) < 0.18;
      const isPanenkaChip =
        this.controls.triggerPass ||
        this.controls.triggerSkillOrTactics ||
        this.controls.p2.triggerPass ||
        this.controls.p2.triggerSkillOrTactics;

      this.controls.triggerShootWithPower = null;
      this.controls.triggerPass = false;
      this.controls.triggerThrough = false;
      this.controls.triggerSkillOrTactics = false;
      this.controls.p2.triggerShootWithPower = null;
      this.controls.p2.triggerPass = false;
      this.controls.p2.triggerThrough = false;
      this.controls.p2.triggerSkillOrTactics = false;

      if (!isUserKicker) {
        this.setPieceAimZ = (Math.random() < 0.5 ? -1 : 1) * (2.2 + Math.random() * 2.5);
        this.setPieceAimY = 0.8 + Math.random() * 1.8;
      }

      const shotDir = new THREE.Vector3(
        goalX - this.ball.position.x,
        0,
        this.setPieceAimZ - this.ball.position.z
      ).normalize();

      const pkSpeed = isPanenkaChip ? 16.5 : isKnuckle ? 29.0 : 24.5 + power * 9.5;
      const pkLoft = isPanenkaChip ? 8.2 : isKnuckle ? 1.6 + this.setPieceAimY * 1.8 : 1.5 + this.setPieceAimY * 2.3;
      const pkSpin = isKnuckle ? 0 : spin;

      if (this.setPieceKicker) {
        this.setPieceKicker.kickAnimTimer = 0.3;
      }

      const defendingGK = (this.setPieceTeam === 'HOME' ? this.awayPlayers : this.homePlayers).find(
        (p) => p.role === 'GK'
      );
      if (defendingGK) {
        if (isUserKicker) {
          const diveAcc = DIFFICULTY_PROFILES[this.difficulty].aiGkDiveAccuracy;
          const aiDiveDir =
            Math.random() < diveAcc
              ? Math.sign(this.setPieceAimZ)
              : Math.random() < 0.5
              ? -1
              : 1;
          defendingGK.triggerGKDive(aiDiveDir);
        } else {
          defendingGK.triggerGKDive(this.userPenaltyDiveChoice);
        }
      }

      this.ball.updateTrajectoryGuide(this.ball.position, shotDir, 0, 0, 0, false);
      this.ball.kick(shotDir, pkSpeed, pkLoft, pkSpin, this.setPieceKicker?.id || null, this.setPieceTeam);
      this.ball.isShot = true;
      this.ball.isKnuckleShot = isKnuckle;
      this.audio.playKick(0.95);
      if (isPanenkaChip) {
        this.commentary.announce('아! 대담한 파넨카 칩슛을 시도합니다!!', 'high');
      } else if (isKnuckle) {
        this.commentary.announce('골키퍼를 얼어붙게 만드는 강력한 무회전 페널티킥!!', 'high');
      }
      this.hideSetPiecePanel();
      this.stateTimer = 0;
      this.matchState = 'PENALTY_PLAY';
    }
  }

  public setUserPenaltyDive(dir: -1 | 0 | 1): void {
    this.userPenaltyDiveChoice = dir;
  }

  public applySetPieceCornerPreset(corner: 'TL' | 'BL' | 'TR' | 'BR'): void {
    const goalX = this.setPieceTeam === 'HOME' ? Stadium.HALF_LENGTH : -Stadium.HALF_LENGTH;
    const targetZ =
      corner === 'TL' || corner === 'BL'
        ? -(Stadium.GOAL_HALF_WIDTH - 1.1)
        : Stadium.GOAL_HALF_WIDTH - 1.1;
    const isTop = corner === 'TL' || corner === 'TR';

    this.setPieceAimZ = targetZ;
    this.setPieceAimY = isTop ? 2.75 : 0.85;
    this.controls.setPieceElevation = isTop ? 0.82 : 0.35;

    this.setPieceAimYaw = Math.atan2(
      goalX - this.ball.position.x,
      targetZ - this.ball.position.z
    );
  }

  private updateBallPossessionAndDribbling(dt: number): void {
    if (this.ball.ownerId === null && this.ball.velocity.lengthSq() > 25) {
      for (const p of this.players) {
        if (p.isSentOff || p.id === this.ball.lastKickerId) continue;
        const horizDist = Math.hypot(
          p.position.x - this.ball.position.x,
          p.position.z - this.ball.position.z
        );
        const playerTopY = p.jumpTimer > 0 ? 3.1 : p.diveTimer > 0 ? 2.4 : 2.15;

        if (horizDist < 0.88 && this.ball.position.y < playerTopY) {
          if (p.role === 'GK' && p.gkSaveCooldown <= 0) {
            p.gkSaveCooldown = 0.6;
            const deflectZ = p.position.z >= 0 ? 1 : -1;
            this.ball.velocity.x = -this.ball.velocity.x * 0.48;
            this.ball.velocity.z = deflectZ * 9.5;
            this.ball.velocity.y = 3.2;
            this.ball.lastTouchTeam = p.team;
            this.audio.playKick(0.75);
            this.showBanner('SUPER SAVE! 🧤', `${p.nameLabel} 환상적인 슈퍼 세이브!`, 'banner-clean', 1.7);
            this.commentary.announce(`골키퍼 ${p.starName} 동물적인 감각으로 쳐냅니다! 슈퍼 세이브!!`, 'high');
            return;
          } else if (p.inDefensiveWall) {
            this.ball.velocity.x = -this.ball.velocity.x * 0.42;
            this.ball.velocity.y = Math.max(3.5, this.ball.velocity.y * 0.6);
            this.ball.lastTouchTeam = p.team;
            this.audio.playKick(0.6);
            this.commentary.announce('점프한 수비벽에 공이 맞고 굴절됩니다!', 'low');
            return;
          }
        }
      }
    }

    if (this.ball.position.y < 1.65) {
      for (const p of this.players) {
        if (p.isSentOff || p.fallenTimer > 0) continue;
        if (p.id === this.ball.lastKickerId && this.ball.velocity.length() > 12) continue;

        const dist = Math.hypot(p.position.x - this.ball.position.x, p.position.z - this.ball.position.z);
        if (dist < 1.08) {
          // Check Offside Rule when the flagged receiver touches the ball!
          if (p.id === this.pendingOffsideReceiverId) {
            this.pendingOffsideReceiverId = null;
            this.audio.playWhistle('foul');
            this.northLinesman.raiseFlag('OFFSIDE!', 3.0);
            this.stadium.showOffsideLaser(this.pendingOffsideLineX, 3.0);
            this.showBanner('🚩 OFFSIDE! (오프사이드 반칙)', `${p.nameLabel} 최종 수비수보다 앞서 있었습니다!`, 'banner-yellow', 2.4);
            this.commentary.announce(`아, 선심의 깃발이 올라갑니다! ${p.starName} 선수의 오프사이드가 선언됩니다!`, 'high');
            this.enterFreeKickSetup('AWAY', p.position.clone());
            return;
          }

          if (this.ball.ownerId && this.ball.ownerId !== p.id) {
            const currentOwner = this.players.find((o) => o.id === this.ball.ownerId);
            const stealRate =
              p.team === 'AWAY' ? 3.8 * DIFFICULTY_PROFILES[this.difficulty].aiStealMult : 4.2;
            if (
              currentOwner &&
              currentOwner.team !== p.team &&
              currentOwner.skillTimer <= 0 &&
              Math.random() < dt * stealRate
            ) {
              this.ball.ownerId = p.id;
              this.ball.lastTouchTeam = p.team;
              this.pendingOffsideReceiverId = null;
              this.audio.playKick(0.3);
            }
          } else if (!this.ball.ownerId) {
            // Teammates should not trap high-speed shots mid-flight (prevents knuckleball/free kick shots from turning into accidental passes!)
            if (this.ball.isShot && this.ball.velocity.length() > 11.5 && p.team === this.ball.lastTouchTeam) {
              continue;
            }
            this.ball.ownerId = p.id;
            this.ball.lastTouchTeam = p.team;
            this.pendingOffsideReceiverId = null;
            if (this.matchState === 'FREE_KICK_PLAY') {
              this.matchState = 'PLAYING';
            }
          }
        }
      }
    }

    if (this.ball.ownerId) {
      const owner = this.players.find((p) => p.id === this.ball.ownerId);
      if (owner && !owner.isSentOff && owner.fallenTimer <= 0) {
        const isOwnerSprinting =
          (owner === this.controlledPlayer && this.controls.isSprinting) ||
          (owner === this.controlledPlayer2 && this.controls.p2.isSprinting);
        const dribbleOffset = isOwnerSprinting ? 1.08 : 0.86;
        const dribbleLerp = isOwnerSprinting ? dt * 26 : dt * 18;

        const targetX = owner.position.x + Math.sin(owner.facingAngle) * dribbleOffset;
        const targetZ = owner.position.z + Math.cos(owner.facingAngle) * dribbleOffset;
        this.ball.position.x = THREE.MathUtils.lerp(this.ball.position.x, targetX, dribbleLerp);
        this.ball.position.z = THREE.MathUtils.lerp(this.ball.position.z, targetZ, dribbleLerp);
        this.ball.position.y = this.ball.radius;
        this.ball.velocity.copy(owner.velocity);

        const spd = Math.hypot(owner.velocity.x, owner.velocity.z);
        if (spd > 0.2) {
          const rollAxis = new THREE.Vector3(owner.velocity.z, 0, -owner.velocity.x).normalize();
          this.ball.mesh.rotateOnWorldAxis(rollAxis, (spd / this.ball.radius) * dt);
        }
      } else {
        this.ball.ownerId = null;
      }
    }
  }

  private checkGoalAndBoundaries(): void {
    const bx = this.ball.position.x;
    const by = this.ball.position.y;
    const bz = this.ball.position.z;

    if (Math.abs(bx) >= Stadium.HALF_LENGTH && Math.abs(bx) <= Stadium.HALF_LENGTH + Stadium.GOAL_DEPTH + 1.5) {
      if (Math.abs(bz) < Stadium.GOAL_HALF_WIDTH && by < Stadium.GOAL_HEIGHT) {
        if (Math.abs(Math.abs(bz) - Stadium.GOAL_HALF_WIDTH) < 0.28 || Math.abs(by - Stadium.GOAL_HEIGHT) < 0.25) {
          this.ball.velocity.x = -this.ball.velocity.x * 0.65;
          this.audio.playPostHit();
          this.commentary.announce('아앗! 슈팅이 골대를 강타합니다!!', 'high');
          return;
        }

        // GOAL SCORED!
        const scoringTeam: 'HOME' | 'AWAY' = bx > 0 ? 'HOME' : 'AWAY';
        if (scoringTeam === 'HOME') this.homeScore++;
        else this.awayScore++;

        const scorer = this.players.find((p) => p.id === this.ball.lastKickerId);
        const scorerName = scorer ? `${scorer.teamConfig.flag} ${scorer.nameLabel}` : scoringTeam;

        // Trigger Goal Scorer Celebration!
        if (scorer) {
          scorer.triggerGoalCelebration(3.2);
          scorer.velocity.set(scoringTeam === 'HOME' ? -4 : 4, 0, 3);
        }

        this.matchState = 'GOAL_CELEBRATION';
        this.stateTimer = 2.8;
        this.ball.velocity.multiplyScalar(0.25);
        this.stadium.triggerGoalCrowdCelebration();
        this.audio.playGoalCheer();
        this.audio.playWhistle('long');

        this.showBanner(
          `⚽ GOAL!! (${this.homeScore} - ${this.awayScore})`,
          `${scorerName} 환상적인 월드컵 골 득점 & 세리머니!`,
          'banner-goal',
          2.8
        );
        this.commentary.announce(
          `골인!! ${scorer?.starName || ''} 선수의 환상적인 득점이 터집니다! 경기장이 열광의 도가니에 빠집니다!`,
          'high'
        );
        this.updateScoreboardHUD();
        return;
      }
    }

    // Out of bounds checks (only in open play)
    if (this.matchState === 'PLAYING' || this.matchState === 'FREE_KICK_PLAY') {
      // Sideline Throw-in
      if (Math.abs(bz) > Stadium.HALF_WIDTH + 0.55) {
        const throwTeam: 'HOME' | 'AWAY' = this.ball.lastTouchTeam === 'HOME' ? 'AWAY' : 'HOME';
        this.audio.playWhistle('short');
        this.enterThrowInSetup(throwTeam, bx, bz);
        return;
      }

      // Goal-line Corner Kick vs Bounce
      if (Math.abs(bx) > Stadium.HALF_LENGTH + 0.55 && (Math.abs(bz) >= Stadium.GOAL_HALF_WIDTH || by >= Stadium.GOAL_HEIGHT)) {
        if (bx > 0 && this.ball.lastTouchTeam === 'AWAY') {
          this.audio.playWhistle('short');
          this.enterCornerKickSetup('HOME', bz);
          return;
        } else if (bx < 0 && this.ball.lastTouchTeam === 'HOME') {
          this.audio.playWhistle('short');
          this.enterCornerKickSetup('AWAY', bz);
          return;
        }
        this.ball.position.x = Math.sign(bx) * (Stadium.HALF_LENGTH - 0.8);
        this.ball.velocity.x = -this.ball.velocity.x * 0.5;
      }
    }
  }

  private updateCamera(dt: number): void {
    if (this.matchState === 'REPLAY_PLAYBACK') {
      // Dramatic Reverse Goal-Line Slow-Mo Replay Camera!
      const goalSide = this.ball.position.x >= 0 ? 1 : -1;
      this.camPosTarget.set(goalSide * (Stadium.HALF_LENGTH + 6.5), 4.5, 9.5);
      this.camLookTarget.set(this.ball.position.x, 1.4, this.ball.position.z);
    } else if (this.matchState === 'TROPHY_CELEBRATION') {
      const t = performance.now() * 0.0008;
      this.camPosTarget.set(Math.cos(t) * 14, 5.5, Math.sin(t) * 14);
      this.camLookTarget.set(0, 1.8, 0);
    } else if (this.matchState === 'VAR_REVIEW') {
      this.camPosTarget.set(this.referee.position.x, 3.2, this.referee.position.z + 5.5);
      this.camLookTarget.set(this.referee.position.x, 1.8, this.referee.position.z);
    } else if (this.matchState === 'FOUL_CINEMATIC' && this.activeFoul) {
      const focus = this.activeFoul.foulPosition;
      this.camPosTarget.set(focus.x - 4.5, 6.2, focus.z + 10.5);
      this.camLookTarget.set(
        (focus.x + this.referee.position.x) * 0.5,
        1.5,
        (focus.z + this.referee.position.z) * 0.5
      );
    } else if (this.matchState === 'FREE_KICK_SETUP' || this.matchState === 'CORNER_KICK_SETUP') {
      const dir = new THREE.Vector3(Math.sin(this.setPieceAimYaw), 0, Math.cos(this.setPieceAimYaw));
      this.camPosTarget.set(
        this.ball.position.x - dir.x * 8.2,
        3.9,
        this.ball.position.z - dir.z * 8.2
      );
      const goalX = this.setPieceTeam === 'HOME' ? Stadium.HALF_LENGTH : -Stadium.HALF_LENGTH;
      this.camLookTarget.set(goalX, 2.2, 0);
    } else if (this.matchState === 'PENALTY_SETUP' || this.matchState === 'PENALTY_PLAY') {
      const dirX = this.setPieceTeam === 'HOME' ? 1 : -1;
      this.camPosTarget.set(this.ball.position.x - dirX * 9.2, 3.6, 0);
      this.camLookTarget.set(this.ball.position.x + dirX * 12, 1.8, this.setPieceAimZ * 0.35);
    } else if (this.cameraMode === 'THIRD_PERSON') {
      const targetPlayer =
        this.net.role === 'GUEST' && this.controlledPlayer2
          ? this.controlledPlayer2
          : this.controlledPlayer;
      if (targetPlayer) {
        const p = targetPlayer.position;
        this.camPosTarget.set(p.x - 14, 9.5, p.z * 0.75);
        this.camLookTarget.set(this.ball.position.x + 8, 1.2, this.ball.position.z);
      }
    } else if (this.cameraMode === 'WIDE') {
      this.camPosTarget.set(this.ball.position.x * 0.35, 38, 52);
      this.camLookTarget.set(this.ball.position.x * 0.45, 0, this.ball.position.z * 0.35);
    } else {
      let bx = this.ball.position.x;
      let bz = this.ball.position.z;
      let zoomHeight = 23.5;
      let zoomDist = 34.5;
      if (this.coopMode === 'LOCAL_COOP' && this.controlledPlayer && this.controlledPlayer2) {
        const midX = (this.controlledPlayer.position.x + this.controlledPlayer2.position.x) * 0.5;
        const midZ = (this.controlledPlayer.position.z + this.controlledPlayer2.position.z) * 0.5;
        bx = bx * 0.7 + midX * 0.3;
        bz = bz * 0.7 + midZ * 0.3;
        const spread = this.controlledPlayer.position.distanceTo(this.controlledPlayer2.position);
        if (spread > 18) {
          const extra = Math.min(7.5, (spread - 18) * 0.25);
          zoomHeight += extra * 0.85;
          zoomDist += extra;
        }
      }
      this.camPosTarget.set(bx * 0.68, zoomHeight, zoomDist + bz * 0.42);
      this.camLookTarget.set(bx * 0.78, 0.8, bz * 0.52);
    }

    this.camera.position.lerp(this.camPosTarget, Math.min(1, dt * 6.5));
    this.currentCamLook.lerp(this.camLookTarget, Math.min(1, dt * 8.5));
    this.camera.lookAt(this.currentCamLook);
  }

  public cycleCameraMode(): CameraMode {
    if (this.cameraMode === 'BROADCAST') this.cameraMode = 'THIRD_PERSON';
    else if (this.cameraMode === 'THIRD_PERSON') this.cameraMode = 'WIDE';
    else this.cameraMode = 'BROADCAST';
    return this.cameraMode;
  }

  private renderRadarMinimap(): void {
    const ctx = this.radarCtx;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(15, 42, 28, 0.62)';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
    ctx.lineWidth = 1;
    ctx.strokeRect(3, 3, w - 6, h - 6);

    ctx.beginPath();
    ctx.moveTo(w / 2, 3);
    ctx.lineTo(w / 2, h - 3);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 7.5, 0, Math.PI * 2);
    ctx.stroke();

    const mapX = (x: number) => ((x + Stadium.HALF_LENGTH) / (Stadium.HALF_LENGTH * 2)) * (w - 6) + 3;
    const mapZ = (z: number) => ((z + Stadium.HALF_WIDTH) / (Stadium.HALF_WIDTH * 2)) * (h - 6) + 3;

    // Draw Offside Line on Radar
    const offX = mapX(this.northLinesman.offsideLineX);
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.32)';
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(offX, 3);
    ctx.lineTo(offX, h - 3);
    ctx.stroke();
    ctx.setLineDash([]);

    for (const p of this.players) {
      if (p.isSentOff) continue;
      const px = mapX(p.position.x);
      const pz = mapZ(p.position.z);

      ctx.beginPath();
      ctx.arc(px, pz, p.controllerSlot !== 'NONE' ? 3.4 : 2.3, 0, Math.PI * 2);
      ctx.fillStyle = p.team === 'HOME' ? this.homeTeam.uiHex : this.awayTeam.uiHex;
      ctx.fill();

      if (p.controllerSlot === 'P1') {
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      } else if (p.controllerSlot === 'P2') {
        ctx.strokeStyle = '#00e676';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      } else if (p.yellowCards > 0) {
        ctx.strokeStyle = '#ffea00';
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }
    }

    // Draw Referee on Radar
    const rx = mapX(this.referee.position.x);
    const rz = mapZ(this.referee.position.z);
    ctx.fillStyle = '#d4ff00';
    ctx.fillRect(rx - 2, rz - 2, 4, 4);

    // Draw North & South Assistant Referees (Linesmen) on Radar
    ctx.fillStyle = '#ff9100';
    ctx.fillRect(mapX(this.northLinesman.position.x) - 2, 1, 4, 3);
    ctx.fillRect(mapX(this.southLinesman.position.x) - 2, h - 4, 4, 3);

    // Draw World Cup Ball
    const bx = mapX(this.ball.position.x);
    const bz = mapZ(this.ball.position.z);
    ctx.beginPath();
    ctx.arc(bx, bz, 2.7, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private showSetPiecePanel(isUserAttacking: boolean, mode: 'FREE_KICK' | 'PENALTY_KICK'): void {
    const panel = document.getElementById('setpiece-panel');
    const pkDivePanel = document.getElementById('pk-dive-panel');
    const titleEl = document.getElementById('setpiece-panel-title');

    if (isUserAttacking) {
      if (panel) panel.classList.remove('hidden');
      if (pkDivePanel) pkDivePanel.classList.add('hidden');
      if (titleEl) {
        titleEl.textContent =
          mode === 'FREE_KICK'
            ? '🎯 세트피스 궤적 & 감아차기 설정 (조이스틱으로 방향 조준)'
            : '🥅 페널티킥 코너 조준 (조이스틱/코너 버튼으로 타겟 이동 후 슛!)';
      }
    } else {
      if (panel) panel.classList.add('hidden');
      if (pkDivePanel && mode === 'PENALTY_KICK') {
        pkDivePanel.classList.remove('hidden');
      }
    }
  }

  private hideSetPiecePanel(): void {
    document.getElementById('setpiece-panel')?.classList.add('hidden');
    document.getElementById('pk-dive-panel')?.classList.add('hidden');
  }

  public showBanner(
    title: string,
    subtitle: string,
    styleClass: string,
    durationSec: number,
    fromNetwork: boolean = false
  ): void {
    const banner = document.getElementById('broadcast-banner');
    const titleEl = document.getElementById('banner-title');
    const subEl = document.getElementById('banner-sub');
    if (!banner || !titleEl || !subEl) return;

    banner.className = `broadcast-banner ${styleClass}`;
    titleEl.textContent = title;
    subEl.textContent = subtitle;

    window.clearTimeout((banner as unknown as { _hideTimer?: number })._hideTimer);
    (banner as unknown as { _hideTimer?: number })._hideTimer = window.setTimeout(() => {
      banner.classList.add('hidden');
    }, durationSec * 1000);

    if (!fromNetwork && this.net.role === 'HOST' && this.net.isConnected) {
      this.net.send({
        t: 'banner',
        title,
        sub: subtitle,
        cls: styleClass,
        dur: durationSec
      });
    }
  }

  private broadcastNetworkSnapshot(dt: number): void {
    this.netSnapTimer += dt;
    if (this.netSnapTimer < 0.033) return; // ~30Hz snapshot broadcast
    this.netSnapTimer = 0;

    const snap: CoopStateSnapshot = {
      state: this.matchState,
      half: this.half,
      clock: Number(this.matchClockSec.toFixed(2)),
      hScore: this.homeScore,
      aScore: this.awayScore,
      hYC: this.homeYellows,
      aYC: this.awayYellows,
      hRC: this.homeReds,
      aRC: this.awayReds,
      stance: this.tacticalStance,
      diff: this.difficulty,
      ballId: this.ball.currentBallId,
      bx: Number(this.ball.position.x.toFixed(2)),
      by: Number(this.ball.position.y.toFixed(2)),
      bz: Number(this.ball.position.z.toFixed(2)),
      bvx: Number(this.ball.velocity.x.toFixed(2)),
      bvy: Number(this.ball.velocity.y.toFixed(2)),
      bvz: Number(this.ball.velocity.z.toFixed(2)),
      ownerId: this.ball.ownerId,
      refX: Number(this.referee.position.x.toFixed(2)),
      refZ: Number(this.referee.position.z.toFixed(2)),
      refF: Number(this.referee.facingAngle.toFixed(2)),
      players: this.players.map((p) => ({
        id: p.id,
        x: Number(p.position.x.toFixed(2)),
        y: Number(p.position.y.toFixed(2)),
        z: Number(p.position.z.toFixed(2)),
        vx: Number(p.velocity.x.toFixed(2)),
        vz: Number(p.velocity.z.toFixed(2)),
        facing: Number(p.facingAngle.toFixed(2)),
        slot: p.controllerSlot,
        stam: Math.round(p.stamina),
        yc: p.yellowCards,
        rc: p.redCard,
        sentOff: p.isSentOff,
        kickT: Number(p.kickAnimTimer.toFixed(2)),
        slideT: Number(p.slideTimer.toFixed(2)),
        fallT: Number(p.fallenTimer.toFixed(2)),
        diveT: Number(p.diveTimer.toFixed(2)),
        diveZ: p.diveDirZ,
        skillT: Number(p.skillTimer.toFixed(2)),
        celebT: Number(p.celebrationTimer.toFixed(2)),
        num: p.shirtNumber,
        name: p.starName
      }))
    };

    this.net.send({ t: 'snap', snap });
  }

  private applyNetworkSnapshot(snap: CoopStateSnapshot): void {
    this.matchState = snap.state;
    this.half = snap.half;
    this.matchClockSec = snap.clock;

    const scoreChanged =
      this.homeScore !== snap.hScore ||
      this.awayScore !== snap.aScore ||
      this.homeYellows !== snap.hYC ||
      this.awayYellows !== snap.aYC ||
      this.homeReds !== snap.hRC ||
      this.awayReds !== snap.aRC;

    this.homeScore = snap.hScore;
    this.awayScore = snap.aScore;
    this.homeYellows = snap.hYC;
    this.awayYellows = snap.aYC;
    this.homeReds = snap.hRC;
    this.awayReds = snap.aRC;

    if (this.ball.currentBallId !== snap.ballId) {
      this.ball.setBallStyle(snap.ballId);
      this.updateScoreboardHUD();
    }
    if (scoreChanged) {
      this.updateScoreboardHUD();
    }

    if (this.tacticalStance !== snap.stance || this.difficulty !== snap.diff) {
      this.tacticalStance = snap.stance;
      this.difficulty = snap.diff;
      this.updateModeSpecificHUD();
    }

    this.updateClockHUD();

    this.ball.position.set(snap.bx, snap.by, snap.bz);
    this.ball.velocity.set(snap.bvx, snap.bvy, snap.bvz);
    this.ball.ownerId = snap.ownerId;
    this.ball.syncMesh();

    this.referee.position.set(snap.refX, 0, snap.refZ);
    this.referee.facingAngle = snap.refF;
    this.referee.group.position.copy(this.referee.position);
    this.referee.group.rotation.y = snap.refF;

    for (const ps of snap.players) {
      const p = this.players.find((pl) => pl.id === ps.id);
      if (!p) continue;
      p.position.set(ps.x, ps.y, ps.z);
      p.velocity.set(ps.vx, 0, ps.vz);
      p.facingAngle = ps.facing;
      p.controllerSlot = ps.slot;
      p.stamina = ps.stam;
      p.yellowCards = ps.yc;
      p.redCard = ps.rc;
      p.isSentOff = ps.sentOff;
      p.kickAnimTimer = ps.kickT;
      p.slideTimer = ps.slideT;
      p.fallenTimer = ps.fallT;
      p.diveTimer = ps.diveT;
      p.diveDirZ = ps.diveZ;
      p.skillTimer = ps.skillT;
      p.celebrationTimer = ps.celebT;
      if (ps.slot === 'P1') this.controlledPlayer = p;
      if (ps.slot === 'P2') this.controlledPlayer2 = p;
    }
  }

  private updateGuestVisuals(dt: number): void {
    this.ball.update(dt);
    for (const p of this.players) {
      p.update(dt, p.controllerSlot === 'P2' && this.controls.isSprinting);
    }
    this.northLinesman.update(dt, this.awayPlayers, this.ball.position);
    this.southLinesman.update(dt, this.homePlayers, this.ball.position);
  }

  public updateScoreboardHUD(): void {
    const hName = document.getElementById('hud-home-name');
    const aName = document.getElementById('hud-away-name');
    const hScore = document.getElementById('hud-home-score');
    const aScore = document.getElementById('hud-away-score');
    const hColor = document.getElementById('hud-home-color');
    const aColor = document.getElementById('hud-away-color');
    const hCards = document.getElementById('hud-home-cards');
    const aCards = document.getElementById('hud-away-cards');
    const ballBadge = document.getElementById('hud-ball-name');

    if (hName) hName.textContent = `${this.homeTeam.flag} ${this.homeTeam.shortName}`;
    if (aName) aName.textContent = `${this.awayTeam.shortName} ${this.awayTeam.flag}`;
    if (hScore) hScore.textContent = String(this.homeScore);
    if (aScore) aScore.textContent = String(this.awayScore);
    if (hColor) hColor.style.background = this.homeTeam.uiHex;
    if (aColor) aColor.style.background = this.awayTeam.uiHex;

    if (hCards) {
      hCards.innerHTML =
        '🟨'.repeat(this.homeYellows) + (this.homeReds > 0 ? ' ' + '🟥'.repeat(this.homeReds) : '');
    }
    if (aCards) {
      aCards.innerHTML =
        '🟨'.repeat(this.awayYellows) + (this.awayReds > 0 ? ' ' + '🟥'.repeat(this.awayReds) : '');
    }

    if (ballBadge) {
      const cfg = WORLD_CUP_BALLS[this.ball.currentBallId];
      ballBadge.textContent = `⚽ ${cfg.name}`;
    }
  }

  public updateModeSpecificHUD(): void {
    const modeEl = document.getElementById('hud-mode-status');
    const diffEl = document.getElementById('hud-diff-status');
    const nextRoundBtn = document.getElementById('btn-quick-next-round');

    if (diffEl) {
      const prof = DIFFICULTY_PROFILES[this.difficulty];
      diffEl.textContent = `🎚️ 난이도: ${prof.shortKo}`;
    }

    if (!modeEl) return;

    if (this.gameMode === 'TOURNAMENT') {
      const roundLabel =
        this.tournamentRound === 1 ? '8강전(QF)' : this.tournamentRound === 2 ? '4강전(SF)' : '🏆 결승전(FINAL)';
      modeEl.textContent = `🏆 토너먼트: ${roundLabel}`;
      nextRoundBtn?.classList.remove('hidden');
    } else if (this.gameMode === 'PENALTY_SHOOTOUT') {
      const hMarks = this.shootoutHomeResults.map((r) => (r === 'O' ? '🟢' : '🔴')).join('') || '⚪';
      const aMarks = this.shootoutAwayResults.map((r) => (r === 'O' ? '🟢' : '🔴')).join('') || '⚪';
      modeEl.textContent = `🥅 승부차기 R${this.shootoutRound} | ${this.homeTeam.shortName}:${hMarks} vs ${this.awayTeam.shortName}:${aMarks}`;
      nextRoundBtn?.classList.add('hidden');
    } else if (this.gameMode === 'FREE_KICK_CHALLENGE') {
      modeEl.textContent = `🎯 프리킥 챌린지 S${this.fkChallengeStage}/5 | 점수: ${this.fkChallengeScore} PT (최고: ${this.fkChallengeBest})`;
      nextRoundBtn?.classList.add('hidden');
    } else {
      const stanceKo =
        this.tacticalStance === 'ATTACK' ? '🔥총공격' : this.tacticalStance === 'DEFEND' ? '🛡️철벽수비' : '⚖️밸런스';
      modeEl.textContent = `📋 전술: ${stanceKo}`;
      nextRoundBtn?.classList.add('hidden');
    }
  }

  private updateClockHUD(): void {
    const clockEl = document.getElementById('hud-clock');
    const halfEl = document.getElementById('hud-half');
    if (!clockEl || !halfEl) return;

    const scaledMinutes = Math.min(90, Math.floor((this.matchClockSec / (this.halfDurationSec * 2)) * 90));
    const scaledSecs = Math.floor(((this.matchClockSec / (this.halfDurationSec * 2)) * 5400) % 60);
    clockEl.textContent = `${String(scaledMinutes).padStart(2, '0')}:${String(scaledSecs).padStart(2, '0')}`;
    halfEl.textContent = this.half === 1 ? '1ST' : '2ND';
  }

  private updateRefereeStatusHUD(): void {
    const refEl = document.getElementById('hud-ref-status');
    if (!refEl) return;

    if (this.matchState === 'VAR_REVIEW') {
      refEl.textContent = `📺 주심 VAR 온필드 리뷰 판독 중`;
    } else if (this.matchState === 'FOUL_CINEMATIC') {
      refEl.textContent = `👨‍⚖️ 심판 파울 선언 중 (${this.activeFoul?.cardType || 'FOUL'})`;
    } else if (this.matchState === 'FREE_KICK_SETUP') {
      refEl.textContent = `👨‍⚖️ 심판 배니싱 스프레이 9.15m 관리 중`;
    } else if (this.matchState === 'PENALTY_SETUP') {
      refEl.textContent = `👨‍⚖️ 심판 페널티킥 라인 주시 중`;
    } else {
      refEl.textContent = `👨‍⚖️ 주심 ${this.referee.currentDistanceToBall.toFixed(1)}m • 🚩 부심 오프사이드 감시 중`;
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
