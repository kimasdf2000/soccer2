import * as THREE from 'three';
import {
  CameraMode,
  CardType,
  FoulDecision,
  MatchSettings,
  MatchState,
  TeamConfig,
  WorldCupBallId
} from './types';
import { AudioSystem } from './systems/AudioSystem';
import { TouchController } from './systems/TouchController';
import { WorldCupBall, WORLD_CUP_BALLS } from './entities/WorldCupBall';
import { Stadium } from './entities/Stadium';
import { Player, PlayerRole, TEAMS } from './entities/Player';
import { Referee } from './entities/Referee';

export class Game {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  public audio: AudioSystem;
  public controls: TouchController;
  public stadium: Stadium;
  public ball: WorldCupBall;
  public referee: Referee;

  public players: Player[] = [];
  public homePlayers: Player[] = [];
  public awayPlayers: Player[] = [];
  public controlledPlayer: Player | null = null;

  public homeTeam: TeamConfig = TEAMS.KOR;
  public awayTeam: TeamConfig = TEAMS.BRA;
  public teamSize: 5 | 7 | 11 = 7;

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
  public halfDurationSec: number = 180; // 3 minutes real time = 45 FIFA mins

  // Set-piece & Foul state
  public activeFoul: FoulDecision | null = null;
  private stateTimer: number = 0;
  private cardSoundPlayed: boolean = false;
  private secondCardSoundPlayed: boolean = false;

  private setPieceKicker: Player | null = null;
  private setPieceTeam: 'HOME' | 'AWAY' = 'HOME';
  private setPieceAimYaw: number = 0; // Horizontal angle offset
  private setPieceAimY: number = 1.8; // Target height at goal
  private setPieceAimZ: number = 0;   // Target Z on goal line
  private aiSetPieceTimer: number = 0;
  private userPenaltyDiveChoice: number = 0; // -1 left, 0 center, 1 right

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
    this.ball = new WorldCupBall(this.scene, 'al_rihla');
    this.referee = new Referee(this.scene);

    this.radarCanvas = document.getElementById('radar-canvas') as HTMLCanvasElement;
    this.radarCtx = this.radarCanvas.getContext('2d')!;

    window.addEventListener('resize', () => this.onResize());

    // Build default teams so the 3D stadium is alive behind the lobby
    this.startNewMatch({
      homeTeamId: 'KOR',
      awayTeamId: 'BRA',
      teamSize: 7,
      ballId: 'al_rihla',
      halfDurationSec: 180
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

  public startNewMatch(settings: MatchSettings): void {
    this.homeTeam = TEAMS[settings.homeTeamId] || TEAMS.KOR;
    this.awayTeam = TEAMS[settings.awayTeamId] || TEAMS.BRA;
    this.teamSize = settings.teamSize;
    this.halfDurationSec = settings.halfDurationSec;

    this.ball.setBallStyle(settings.ballId);

    this.homeScore = 0;
    this.awayScore = 0;
    this.homeYellows = 0;
    this.awayYellows = 0;
    this.homeReds = 0;
    this.awayReds = 0;
    this.half = 1;
    this.matchClockSec = 0;

    this.spawnTeams(this.teamSize);
    this.setupKickoff('HOME');
    this.updateScoreboardHUD();
  }

  private spawnTeams(size: 5 | 7 | 11): void {
    // Clear existing player meshes
    for (const p of this.players) {
      this.scene.remove(p.group);
    }
    this.players = [];
    this.homePlayers = [];
    this.awayPlayers = [];

    const formations: Record<5 | 7 | 11, { role: PlayerRole; x: number; z: number; num: number }[]> = {
      5: [
        { role: 'GK', x: -49.5, z: 0, num: 1 },
        { role: 'DF', x: -30, z: -10, num: 4 },
        { role: 'DF', x: -30, z: 10, num: 5 },
        { role: 'MF', x: -16, z: 0, num: 10 },
        { role: 'FW', x: -6, z: 0, num: 7 }
      ],
      7: [
        { role: 'GK', x: -49.5, z: 0, num: 1 },
        { role: 'DF', x: -34, z: -12, num: 3 },
        { role: 'DF', x: -34, z: 12, num: 4 },
        { role: 'MF', x: -20, z: -15, num: 8 },
        { role: 'MF', x: -19, z: 0, num: 10 },
        { role: 'MF', x: -20, z: 15, num: 11 },
        { role: 'FW', x: -7, z: 0, num: 7 }
      ],
      11: [
        { role: 'GK', x: -49.5, z: 0, num: 1 },
        { role: 'DF', x: -36, z: -20, num: 2 },
        { role: 'DF', x: -38, z: -7, num: 4 },
        { role: 'DF', x: -38, z: 7, num: 5 },
        { role: 'DF', x: -36, z: 20, num: 3 },
        { role: 'MF', x: -22, z: -16, num: 6 },
        { role: 'MF', x: -21, z: 0, num: 8 },
        { role: 'MF', x: -22, z: 16, num: 10 },
        { role: 'FW', x: -10, z: -18, num: 11 },
        { role: 'FW', x: -7, z: 0, num: 9 },
        { role: 'FW', x: -10, z: 18, num: 7 }
      ]
    };

    const template = formations[size];

    // Spawn HOME Team (Left side attacking Right +X)
    template.forEach((slot, idx) => {
      const p = new Player(
        this.scene,
        `HOME_${idx}`,
        'HOME',
        this.homeTeam,
        slot.role,
        slot.num,
        slot.x,
        slot.z
      );
      this.players.push(p);
      this.homePlayers.push(p);
    });

    // Spawn AWAY Team (Right side attacking Left -X)
    template.forEach((slot, idx) => {
      const p = new Player(
        this.scene,
        `AWAY_${idx}`,
        'AWAY',
        this.awayTeam,
        slot.role,
        slot.num,
        -slot.x,
        -slot.z
      );
      this.players.push(p);
      this.awayPlayers.push(p);
    });

    // Select forward as initial controlled player
    const initialCtrl = this.homePlayers[this.homePlayers.length - 1];
    this.setControlledPlayer(initialCtrl);
  }

  public setControlledPlayer(player: Player): void {
    if (player.isSentOff) return;
    for (const p of this.homePlayers) {
      p.isControlled = p === player;
    }
    this.controlledPlayer = player;
  }

  private switchToNearestHomePlayer(): void {
    const candidates = this.homePlayers.filter((p) => !p.isSentOff && p.role !== 'GK');
    if (candidates.length === 0) return;

    let best: Player = candidates[0];
    let bestScore = Infinity;
    for (const p of candidates) {
      if (p === this.controlledPlayer && candidates.length > 1) continue;
      const d = p.position.distanceTo(this.ball.position);
      if (d < bestScore) {
        bestScore = d;
        best = p;
      }
    }
    this.setControlledPlayer(best);
  }

  public setupKickoff(kickoffTeam: 'HOME' | 'AWAY'): void {
    this.matchState = 'KICKOFF';
    this.stateTimer = 0.85;
    this.ball.resetToCenter();
    this.ball.updateTrajectoryGuide(this.ball.position, new THREE.Vector3(1, 0, 0), 0, 0, 0, false);
    this.hideSetPiecePanel();

    for (const p of this.players) {
      if (p.isSentOff) continue;
      p.inDefensiveWall = false;
      p.setPieceTarget = null;
      p.fallenTimer = 0;
      p.slideTimer = 0;
      p.velocity.set(0, 0, 0);
      p.position.copy(p.homePosition);
      p.facingAngle = p.team === 'HOME' ? Math.PI / 2 : -Math.PI / 2;
      p.group.position.copy(p.position);
    }

    // Put kickoff striker right next to center ball
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

  /**
   * Quick Director Trigger: Instant Free Kick outside the opponent's penalty box
   */
  public triggerInstantFreeKick(spotX: number = 28, spotZ: number = 7.5): void {
    this.audio.playWhistle('foul');
    this.showBanner(
      'FREE KICK 🎯',
      '프리킥 세트피스 모드 (조이스틱 조준 + 커브 조절 후 슛!)',
      'banner-setpiece',
      2.2
    );
    this.enterFreeKickSetup('HOME', new THREE.Vector3(spotX, 0, spotZ));
  }

  /**
   * Quick Director Trigger: Instant Penalty Kick 1v1 showdown
   */
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
    this.enterPenaltySetup(attackingTeam);
  }

  /**
   * Quick Director Trigger: Instant Foul + Referee Sprinting + Yellow/Red Card Presentation
   */
  public triggerInstantFoulCardDemo(forceRed: boolean = false): void {
    const activeAway = this.awayPlayers.filter((p) => !p.isSentOff && p.role !== 'GK');
    const activeHome = this.homePlayers.filter((p) => !p.isSentOff && p.role !== 'GK');
    if (activeAway.length === 0 || activeHome.length === 0) return;

    const offender = activeAway[0];
    const victim = this.controlledPlayer && !this.controlledPlayer.isSentOff ? this.controlledPlayer : activeHome[0];

    // Place action in an exciting dangerous zone (either just outside box or inside box)
    const isInsideBox = Math.random() < 0.38;
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
      severity: forceRed ? 0.95 : 0.65
    });
  }

  /**
   * Core Foul & Card Adjudication Logic
   */
  private commitFoul(decision: FoulDecision): void {
    this.activeFoul = decision;
    this.matchState = 'FOUL_CINEMATIC';
    this.stateTimer = 3.5;
    this.cardSoundPlayed = false;
    this.secondCardSoundPlayed = false;

    this.ball.ownerId = null;
    this.ball.velocity.multiplyScalar(0.15);

    const offender = this.players.find((p) => p.id === decision.offenderId);
    const victim = this.players.find((p) => p.id === decision.victimId);

    if (victim) {
      victim.triggerFallDown(3.1);
    }
    if (offender) {
      offender.slideTimer = 0;
      offender.velocity.set(0, 0, 0);
    }

    // Apply Yellow / Red Card rules to the offender
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

    this.audio.playWhistle('foul');
    this.audio.playTackleHit(true);
    this.referee.startFoulSequence(decision.cardType);

    // Build Broadcast Foul & Card Banner text
    const offenderLabel = offender ? `${offender.teamConfig.flag} ${offender.nameLabel}` : decision.offenderId;
    const nextSetPieceText = decision.isPenaltyBox ? '➡️ 페널티킥(PK) 선언!' : '➡️ 프리킥(FK) 선언!';

    let title = `📢 파울 선언! (FOUL)`;
    let bannerClass = 'banner-foul';
    if (decision.cardType === 'YELLOW') {
      title = `🟨 옐로카드 경고! (${offenderLabel})`;
      bannerClass = 'banner-yellow';
    } else if (decision.cardType === 'SECOND_YELLOW_RED') {
      title = `🟨🟥 경고 누적 퇴장! (${offenderLabel})`;
      bannerClass = 'banner-red';
    } else if (decision.cardType === 'DIRECT_RED') {
      title = `🟥 다이렉트 레드카드 퇴장! (${offenderLabel})`;
      bannerClass = 'banner-red';
    }

    this.showBanner(title, `${decision.reasonKo}  •  ${nextSetPieceText}`, bannerClass, 3.3);
    this.updateScoreboardHUD();
  }

  /**
   * Free Kick Setup:
   * Places the ball at the foul spot, positions the kicker behind the ball,
   * and forms a 3-4 player Defensive Wall 9.15m toward the defending goal.
   */
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

    // Reset wall flags
    for (const p of this.players) {
      p.inDefensiveWall = false;
      p.fallenTimer = 0;
      p.slideTimer = 0;
      p.velocity.set(0, 0, 0);
    }

    // Select Kicker
    if (attackers.length > 0) {
      const kicker = attackers[attackers.length - 1];
      this.setPieceKicker = kicker;
      kicker.position.set(clampedX - toGoal.x * 1.75, 0, clampedZ - toGoal.z * 1.75);
      kicker.facingAngle = this.setPieceAimYaw;
      kicker.group.position.copy(kicker.position);
      if (attackingTeam === 'HOME') {
        this.setControlledPlayer(kicker);
      }

      // Arrange other attackers in support / box positions
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
        // Guard the penalty area
        const guardX = attackingTeam === 'HOME' ? 42 : -42;
        const guardZ = (idx - wallCount - 1) * 6;
        d.position.set(guardX, 0, THREE.MathUtils.clamp(guardZ, -16, 16));
        d.facingAngle = Math.atan2(-toGoal.x, -toGoal.z);
      }
      d.group.position.copy(d.position);
    });

    // Position Referee observing the Free Kick & Wall from the side
    this.referee.resetPosition(clampedX + toGoal.x * 4.5, clampedZ + (clampedZ > 0 ? -8.5 : 8.5));
    this.referee.facingAngle = Math.atan2(clampedX - this.referee.position.x, clampedZ - this.referee.position.z);

    this.showSetPiecePanel(attackingTeam === 'HOME', 'FREE_KICK');
  }

  /**
   * Penalty Kick Setup:
   * Places the ball on the 11m Penalty Spot (x = ±41, z = 0),
   * puts the Kicker vs Goalkeeper 1v1, and moves all other players outside the box.
   */
  public enterPenaltySetup(attackingTeam: 'HOME' | 'AWAY'): void {
    this.matchState = 'PENALTY_SETUP';
    this.setPieceTeam = attackingTeam;
    this.aiSetPieceTimer = 2.1;
    this.userPenaltyDiveChoice = 0;

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

    // Line up all other outfield players outside the penalty box arc (x = ±32)
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

    // Position Referee inside the box to the side of the penalty spot watching the line
    this.referee.resetPosition(spotX + (attackingTeam === 'HOME' ? 2.5 : -2.5), -9.5);
    this.referee.facingAngle = Math.atan2(spotX - this.referee.position.x, -this.referee.position.z);

    this.showSetPiecePanel(attackingTeam === 'HOME', 'PENALTY_KICK');
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;

    this.update(dt);
    this.renderer.render(this.scene, this.camera);
    this.renderRadarMinimap();
  };

  private update(dt: number): void {
    this.controls.update(dt);
    this.stadium.update(dt);

    // Update Touch Controller context labels (Attack vs Defense vs Set Piece)
    const isSetPiece =
      this.matchState === 'FREE_KICK_SETUP' || this.matchState === 'PENALTY_SETUP';
    const ownerPlayer = this.players.find((p) => p.id === this.ball.ownerId);
    const isDefense = !isSetPiece && ownerPlayer !== undefined && ownerPlayer.team === 'AWAY';
    this.controls.setContextMode(isDefense, isSetPiece);

    // Update Shot Power HUD Bar
    const powerBarWrap = document.getElementById('shot-power-wrap');
    const powerBarFill = document.getElementById('shot-power-fill');
    if (powerBarWrap && powerBarFill) {
      if (this.controls.isChargingShot) {
        powerBarWrap.classList.remove('hidden');
        powerBarFill.style.width = `${Math.round(this.controls.shotPower * 100)}%`;
      } else {
        powerBarWrap.classList.add('hidden');
      }
    }

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

      case 'FOUL_CINEMATIC':
        this.updateFoulCinematic(dt);
        this.updateCamera(dt);
        break;

      case 'FREE_KICK_SETUP':
        this.updateFreeKickSetup(dt);
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
          this.setupKickoff(this.ball.position.x > 0 ? 'AWAY' : 'HOME');
        }
        break;

      default:
        this.updateCamera(dt);
        break;
    }

    this.updateRefereeStatusHUD();
  }

  private updateOpenPlay(dt: number): void {
    // Advance match clock
    this.matchClockSec += dt;
    if (this.half === 1 && this.matchClockSec >= this.halfDurationSec) {
      this.half = 2;
      this.matchClockSec = this.halfDurationSec;
      this.audio.playWhistle('double');
      this.showBanner('HALF TIME ⏱️', '후반전이 곧 시작됩니다 (2ND HALF)', 'banner-setpiece', 2.2);
      this.setupKickoff('AWAY');
      this.updateScoreboardHUD();
      return;
    } else if (this.half === 2 && this.matchClockSec >= this.halfDurationSec * 2) {
      this.matchClockSec = 0;
      this.half = 1;
      this.audio.playWhistle('fulltime');
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

    // Handle player switching request
    if (this.controls.triggerSwitchPlayer) {
      this.controls.triggerSwitchPlayer = false;
      this.switchToNearestHomePlayer();
    }

    // Auto-switch controlled player if an unselected HOME player claims the ball
    const currentOwner = this.players.find((p) => p.id === this.ball.ownerId);
    if (currentOwner && currentOwner.team === 'HOME' && currentOwner !== this.controlledPlayer) {
      this.setControlledPlayer(currentOwner);
    }

    // 1. Update User Controlled Player
    this.updateControlledPlayerInput(dt);

    // 2. Update AI for all other players
    for (const p of this.players) {
      if (p.isSentOff) continue;
      if (p !== this.controlledPlayer) {
        this.updatePlayerAI(p, dt);
      }
      p.update(dt);
    }

    // 3. Check Slide Tackle Collisions -> Clean Tackle vs Foul & Yellow/Red Card!
    this.checkSlideTacklesAndFouls();
    if (this.matchState === 'FOUL_CINEMATIC') return;

    // 4. Check Ball Ownership & Dribbling attachment
    this.updateBallPossessionAndDribbling(dt);

    // 5. Update World Cup Ball Physics
    this.ball.update(dt);

    // 6. Check Goalposts, Crossbar, Goalkeeper Saves, Goals, and Out-of-Bounds
    this.checkGoalAndBoundaries();

    // 7. Update Referee Distant Follow AI
    this.referee.updateFollowPlay(dt, this.ball.position, this.ball.velocity, this.players);
  }

  private updateControlledPlayerInput(dt: number): void {
    const p = this.controlledPlayer;
    if (!p || p.isSentOff || p.fallenTimer > 0) return;

    const move = this.controls.moveVec;
    const baseSpeed = this.controls.isSprinting ? 10.6 : 7.8;

    // Convert screen input according to current camera mode
    let moveWorldX = move.x;
    let moveWorldZ = move.y;
    if (this.cameraMode === 'THIRD_PERSON') {
      // In Third-Person mode (looking toward +X), up is +X and right is +Z
      moveWorldX = -move.y;
      moveWorldZ = move.x;
    }

    if (p.slideTimer <= 0) {
      if (move.lengthSq() > 0.02) {
        p.velocity.x = THREE.MathUtils.lerp(p.velocity.x, moveWorldX * baseSpeed, dt * 10);
        p.velocity.z = THREE.MathUtils.lerp(p.velocity.z, moveWorldZ * baseSpeed, dt * 10);
      } else if (this.controls.isPressingDefense && this.ball.ownerId !== p.id) {
        // Automatic Defensive Press toward the ball carrier
        const toBall = this.ball.position.clone().sub(p.position);
        toBall.y = 0;
        if (toBall.length() > 0.8) {
          toBall.normalize();
          p.velocity.x = toBall.x * 8.4;
          p.velocity.z = toBall.z * 8.4;
        }
      } else {
        p.velocity.multiplyScalar(0.75);
      }
    }

    // Handle Slide Tackle Trigger
    if (this.controls.triggerSlideTackle) {
      this.controls.triggerSlideTackle = false;
      const tackleDir =
        move.lengthSq() > 0.05
          ? new THREE.Vector3(moveWorldX, 0, moveWorldZ).normalize()
          : this.ball.position.clone().sub(p.position).setY(0).normalize();
      p.triggerSlideTackle(tackleDir);
    }

    // Handle Offensive Actions when owning the ball (or very close to loose ball)
    const distToBall = p.position.distanceTo(this.ball.position);
    const canKickBall = this.ball.ownerId === p.id || (this.ball.ownerId === null && distToBall < 1.85);

    if (canKickBall) {
      // 1) Shoot (with charged power + optional curve from joystick)
      if (this.controls.triggerShootWithPower !== null) {
        const power = this.controls.triggerShootWithPower;
        this.controls.triggerShootWithPower = null;

        const goalTarget = new THREE.Vector3(
          Stadium.HALF_LENGTH,
          0,
          THREE.MathUtils.clamp(moveWorldZ * 4.8, -Stadium.GOAL_HALF_WIDTH + 0.6, Stadium.GOAL_HALF_WIDTH - 0.6)
        );
        const shootDir = goalTarget.sub(p.position).normalize();
        const speed = 19.5 + power * 14.5;
        const loft = 2.8 + power * 6.8;
        const curveSpin = -moveWorldZ * 1.15;

        p.kickAnimTimer = 0.28;
        this.ball.kick(shootDir, speed, loft, curveSpin, p.id, 'HOME');
        this.audio.playKick(power);
      }

      // 2) Short Ground Pass
      if (this.controls.triggerPass) {
        this.controls.triggerPass = false;
        const passTarget = this.findBestTeammateForPass(p, new THREE.Vector3(moveWorldX, 0, moveWorldZ), false);
        const passDir = passTarget
          ? passTarget.position.clone().sub(p.position).normalize()
          : new THREE.Vector3(Math.sin(p.facingAngle), 0, Math.cos(p.facingAngle));

        p.kickAnimTimer = 0.22;
        this.ball.kick(passDir, 18.5, 1.2, 0, p.id, 'HOME');
        this.audio.playKick(0.5);
        if (passTarget) {
          this.setControlledPlayer(passTarget);
        }
      }

      // 3) Through Pass / Lofted Ball
      if (this.controls.triggerThrough) {
        this.controls.triggerThrough = false;
        const targetMate = this.findBestTeammateForPass(p, new THREE.Vector3(moveWorldX, 0, moveWorldZ), true);
        let dir = new THREE.Vector3(1, 0, moveWorldZ * 0.5).normalize();
        if (targetMate) {
          const leadSpot = targetMate.position.clone().add(new THREE.Vector3(7.5, 0, 0));
          dir = leadSpot.sub(p.position).normalize();
          this.setControlledPlayer(targetMate);
        }
        p.kickAnimTimer = 0.25;
        this.ball.kick(dir, 22.0, 4.2, 0.35, p.id, 'HOME');
        this.audio.playKick(0.75);
      }
    } else {
      // Clear unused offensive triggers when not near ball
      this.controls.triggerShootWithPower = null;
      this.controls.triggerPass = false;
      this.controls.triggerThrough = false;
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
      if (dist < 2 || dist > 42) continue;
      toMate.normalize();
      const align = toMate.dot(desiredDir);
      const forwardBonus = isThrough ? (passer.team === 'HOME' ? m.position.x : -m.position.x) * 0.03 : 0;
      const score = align * 2.2 - dist * 0.03 + forwardBonus;
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }
    return best;
  }

  private updatePlayerAI(p: Player, dt: number): void {
    if (p.slideTimer > 0 || p.fallenTimer > 0 || p.diveTimer > 0) return;

    // 1. Goalkeeper AI
    if (p.role === 'GK') {
      const goalX = p.team === 'HOME' ? -Stadium.HALF_LENGTH + 1.4 : Stadium.HALF_LENGTH - 1.4;
      const targetZ = THREE.MathUtils.clamp(this.ball.position.z * 0.36, -4.6, 4.6);
      const gkTarget = new THREE.Vector3(goalX, 0, targetZ);

      // Dive for fast incoming shots!
      const ballSpeedX = p.team === 'HOME' ? -this.ball.velocity.x : this.ball.velocity.x;
      const distToGoalX = Math.abs(this.ball.position.x - goalX);
      if (ballSpeedX > 11 && distToGoalX < 15 && Math.abs(this.ball.position.z) < 7.5) {
        const predictedZ = this.ball.position.z + this.ball.velocity.z * (distToGoalX / ballSpeedX);
        const diffZ = predictedZ - p.position.z;
        if (Math.abs(diffZ) > 1.35) {
          p.triggerGKDive(Math.sign(diffZ));
          return;
        }
      }

      const toTarget = gkTarget.sub(p.position);
      p.velocity.x = toTarget.x * 5.0;
      p.velocity.z = toTarget.z * 5.5;
      p.facingAngle = p.team === 'HOME' ? Math.PI / 2 : -Math.PI / 2;

      // If GK owns the ball, immediately clear/pass it upfield
      if (this.ball.ownerId === p.id) {
        const clearDir = new THREE.Vector3(p.team === 'HOME' ? 1 : -1, 0, (Math.random() - 0.5) * 0.5).normalize();
        p.kickAnimTimer = 0.25;
        this.ball.kick(clearDir, 24, 6.5, 0, p.id, p.team);
        this.audio.playKick(0.8);
      }
      return;
    }

    // 2. Outfield AI when THIS player has the ball (Away AI ball carrier)
    if (this.ball.ownerId === p.id) {
      const attackGoalX = p.team === 'HOME' ? Stadium.HALF_LENGTH : -Stadium.HALF_LENGTH;
      const toGoal = new THREE.Vector3(attackGoalX - p.position.x, 0, -p.position.z);
      const distToGoal = toGoal.length();
      toGoal.normalize();

      // Shoot if inside 24m of goal
      if (distToGoal < 24 && Math.random() < dt * 2.2) {
        const aimZ = (Math.random() - 0.5) * (Stadium.GOAL_HALF_WIDTH * 1.5);
        const shotDir = new THREE.Vector3(attackGoalX - p.position.x, 0, aimZ - p.position.z).normalize();
        p.kickAnimTimer = 0.26;
        this.ball.kick(shotDir, 25.5, 4.4, (Math.random() - 0.5) * 1.1, p.id, p.team);
        this.audio.playKick(0.85);
        return;
      }

      // Pass if pressed closely by defender
      const opponents = p.team === 'HOME' ? this.awayPlayers : this.homePlayers;
      const closestOpp = opponents.find(
        (opp) => !opp.isSentOff && opp.position.distanceTo(p.position) < 4.2
      );
      if (closestOpp && Math.random() < dt * 2.5) {
        const mate = this.findBestTeammateForPass(p, toGoal, false);
        if (mate) {
          const passDir = mate.position.clone().sub(p.position).normalize();
          p.kickAnimTimer = 0.22;
          this.ball.kick(passDir, 18.5, 1.2, 0, p.id, p.team);
          this.audio.playKick(0.55);
          return;
        }
      }

      // Otherwise dribble toward opponent goal
      p.velocity.set(toGoal.x * 7.6, 0, toGoal.z * 7.6);
      return;
    }

    // 3. Outfield AI without ball
    const teamPlayers = (p.team === 'HOME' ? this.homePlayers : this.awayPlayers).filter(
      (m) => !m.isSentOff && m.role !== 'GK'
    );

    // Closest AI player on team chases the ball
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
        p.velocity.set(toBall.x * 7.6, 0, toBall.z * 7.6);
      }

      // Away defender occasionally attempts a slide tackle (which can cause a foul -> User Free Kick or Penalty!)
      const ballOwner = this.players.find((pl) => pl.id === this.ball.ownerId);
      if (
        p.team === 'AWAY' &&
        ballOwner &&
        ballOwner.team === 'HOME' &&
        dist > 1.5 &&
        dist < 3.4 &&
        Math.random() < dt * 0.65
      ) {
        p.triggerSlideTackle(toBall);
      }
      return;
    }

    // Dynamic tactical formation positioning shifted by ball position
    const shiftX = this.ball.position.x * 0.42;
    const shiftZ = this.ball.position.z * 0.28;
    const targetX = THREE.MathUtils.clamp(p.homePosition.x + shiftX, -46, 46);
    const targetZ = THREE.MathUtils.clamp(p.homePosition.z + shiftZ, -30, 30);

    const toForm = new THREE.Vector3(targetX - p.position.x, 0, targetZ - p.position.z);
    const distForm = toForm.length();
    if (distForm > 1.2) {
      toForm.normalize();
      const spd = Math.min(6.8, distForm * 1.6);
      p.velocity.set(toForm.x * spd, 0, toForm.z * spd);
    } else {
      p.velocity.multiplyScalar(0.75);
    }
  }

  /**
   * Evaluates active Slide Tackles against opponent players & the ball:
   * - If tackler hits the ball cleanly first -> Clean Tackle!
   * - If tackler hits an opponent's legs/body before winning the ball -> Foul + Card Decision!
   */
  private checkSlideTacklesAndFouls(): void {
    for (const tackler of this.players) {
      if (tackler.isSentOff || tackler.slideTimer <= 0 || tackler.slideHasDealtContact) continue;

      const opponents = tackler.team === 'HOME' ? this.awayPlayers : this.homePlayers;
      const distToBall = tackler.position.distanceTo(this.ball.position);

      for (const victim of opponents) {
        if (victim.isSentOff || victim.fallenTimer > 0) continue;

        const distToVictim = tackler.position.distanceTo(victim.position);
        if (distToVictim < 1.68) {
          tackler.slideHasDealtContact = true;

          // Did the tackler clearly win the ball first from the front?
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
            // Clean Tackle!
            this.ball.ownerId = tackler.id;
            this.ball.lastTouchTeam = tackler.team;
            victim.triggerFallDown(0.7);
            this.audio.playTackleHit(false);
            this.showBanner('CLEAN TACKLE! 🛡️', '공을 먼저 정확하게 건드린 정당한 태클!', 'banner-clean', 1.4);
            return;
          }

          // Otherwise: FOUL COMMITTED!
          const foulPos = victim.position.clone();
          const defendingSideX = tackler.team === 'HOME' ? -1 : 1; // HOME defends -X, AWAY defends +X
          const inDefendingPenaltyBox =
            foulPos.x * defendingSideX > Stadium.HALF_LENGTH - Stadium.PENALTY_BOX_DEPTH &&
            Math.abs(foulPos.z) < Stadium.PENALTY_BOX_HALF_WIDTH;

          // Determine Card Severity (Yellow vs 2nd Yellow Red vs Direct Red)
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
            severity: isBackTackle ? 0.95 : 0.7
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
      // If player received a Red Card, remove them from the pitch now!
      if (offender && offender.redCard) {
        offender.isSentOff = true;
        offender.group.visible = false;
        if (this.controlledPlayer === offender) {
          this.switchToNearestHomePlayer();
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

  private updateFreeKickSetup(dt: number): void {
    const isUserKicker = this.setPieceTeam === 'HOME';
    const goalX = this.setPieceTeam === 'HOME' ? Stadium.HALF_LENGTH : -Stadium.HALF_LENGTH;

    if (isUserKicker) {
      // Adjust aim horizontally and vertically with tablet joystick
      this.setPieceAimYaw -= this.controls.moveVec.x * dt * 0.65;
      const baseAngle = Math.atan2(goalX - this.ball.position.x, -this.ball.position.z);
      this.setPieceAimYaw = THREE.MathUtils.clamp(
        this.setPieceAimYaw,
        baseAngle - 0.65,
        baseAngle + 0.65
      );

      if (Math.abs(this.controls.moveVec.y) > 0.1) {
        this.controls.setPieceElevation = THREE.MathUtils.clamp(
          this.controls.setPieceElevation - this.controls.moveVec.y * dt * 0.6,
          0.25,
          1.0
        );
      }
    } else {
      this.aiSetPieceTimer -= dt;
    }

    const dir = new THREE.Vector3(Math.sin(this.setPieceAimYaw), 0, Math.cos(this.setPieceAimYaw)).normalize();
    const previewPower = this.controls.isChargingShot ? this.controls.shotPower : 0.72;
    const speed = 22.0 + previewPower * 10.5;
    const loft = 4.2 + this.controls.setPieceElevation * 5.8;
    const spin = this.controls.setPieceSpin * 1.45;

    // Position kicker behind ball along current aim line
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

    // Update live 3D Trajectory Guide Arc
    this.ball.updateTrajectoryGuide(this.ball.position, dir, speed, loft, spin, true);

    // Fire Free Kick when User releases Shoot / presses Pass / or AI timer finishes
    const shouldFireShot =
      (isUserKicker && (this.controls.triggerShootWithPower !== null || this.controls.triggerThrough)) ||
      (!isUserKicker && this.aiSetPieceTimer <= 0);

    if (shouldFireShot) {
      const power = this.controls.triggerShootWithPower ?? 0.78;
      const isKnuckle = this.controls.triggerThrough;
      this.controls.triggerShootWithPower = null;
      this.controls.triggerThrough = false;

      const finalSpeed = 22.5 + power * 11.5;
      const finalLoft = 4.5 + this.controls.setPieceElevation * 5.6;
      const finalSpin = isKnuckle ? 0 : this.controls.setPieceSpin * 1.55;

      if (this.setPieceKicker) {
        this.setPieceKicker.kickAnimTimer = 0.3;
      }

      // Defensive Wall jumps when the Free Kick is struck!
      for (const p of this.players) {
        if (p.inDefensiveWall) {
          p.triggerWallJump();
        }
      }

      this.ball.updateTrajectoryGuide(this.ball.position, dir, 0, 0, 0, false);
      this.ball.kick(dir, finalSpeed, finalLoft, finalSpin, this.setPieceKicker?.id || null, this.setPieceTeam);
      this.audio.playKick(0.95);
      this.hideSetPiecePanel();
      this.matchState = 'FREE_KICK_PLAY';
      return;
    }

    // Or play a short tactical Free Kick Pass
    if (isUserKicker && this.controls.triggerPass && this.setPieceKicker) {
      this.controls.triggerPass = false;
      const mate = this.findBestTeammateForPass(this.setPieceKicker, dir, false);
      const passDir = mate ? mate.position.clone().sub(this.ball.position).normalize() : dir;
      this.ball.updateTrajectoryGuide(this.ball.position, dir, 0, 0, 0, false);
      this.ball.kick(passDir, 18.0, 1.0, 0, this.setPieceKicker.id, this.setPieceTeam);
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
      // Move target reticle inside goal frame using tablet joystick
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
      // User is defending GK: joystick left/right chooses dive direction
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
      (isUserKicker && (this.controls.triggerShootWithPower !== null || this.controls.triggerPass || this.controls.triggerThrough)) ||
      (!isUserKicker && this.aiSetPieceTimer <= 0);

    if (shouldShootPK) {
      const power = this.controls.triggerShootWithPower ?? 0.82;
      const isPanenkaChip = this.controls.triggerPass;
      this.controls.triggerShootWithPower = null;
      this.controls.triggerPass = false;
      this.controls.triggerThrough = false;

      if (!isUserKicker) {
        // AI chooses a corner
        this.setPieceAimZ = (Math.random() < 0.5 ? -1 : 1) * (2.2 + Math.random() * 2.5);
        this.setPieceAimY = 0.8 + Math.random() * 1.8;
      }

      const shotDir = new THREE.Vector3(
        goalX - this.ball.position.x,
        0,
        this.setPieceAimZ - this.ball.position.z
      ).normalize();

      const pkSpeed = isPanenkaChip ? 16.5 : 24.5 + power * 9.5;
      const pkLoft = isPanenkaChip ? 8.2 : 1.5 + this.setPieceAimY * 2.3;

      if (this.setPieceKicker) {
        this.setPieceKicker.kickAnimTimer = 0.3;
      }

      // Trigger Goalkeeper Dive!
      const defendingGK = (this.setPieceTeam === 'HOME' ? this.awayPlayers : this.homePlayers).find(
        (p) => p.role === 'GK'
      );
      if (defendingGK) {
        if (isUserKicker) {
          // AI GK guesses direction (65% random, 35% reads corner)
          const aiDiveDir =
            Math.random() < 0.38
              ? Math.sign(this.setPieceAimZ)
              : Math.random() < 0.5
              ? -1
              : 1;
          defendingGK.triggerGKDive(aiDiveDir);
        } else {
          // User GK dives according to chosen button or joystick direction
          defendingGK.triggerGKDive(this.userPenaltyDiveChoice);
        }
      }

      this.ball.updateTrajectoryGuide(this.ball.position, shotDir, 0, 0, 0, false);
      this.ball.kick(shotDir, pkSpeed, pkLoft, spin, this.setPieceKicker?.id || null, this.setPieceTeam);
      this.audio.playKick(0.95);
      this.hideSetPiecePanel();
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

    // Also orient Free Kick yaw toward that goal corner
    this.setPieceAimYaw = Math.atan2(
      goalX - this.ball.position.x,
      targetZ - this.ball.position.z
    );
  }

  private updateBallPossessionAndDribbling(dt: number): void {
    // Defensive wall & player body collision with flying ball
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
            // Goalkeeper Save!
            const deflectZ = p.position.z >= 0 ? 1 : -1;
            this.ball.velocity.x = -this.ball.velocity.x * 0.48;
            this.ball.velocity.z = deflectZ * 9.5;
            this.ball.velocity.y = 3.2;
            this.audio.playKick(0.75);
            this.showBanner('SUPER SAVE! 🧤', `${p.nameLabel} 환상적인 슈퍼 세이브!`, 'banner-clean', 1.7);
            return;
          } else if (p.inDefensiveWall) {
            // Deflected off the Free Kick Wall!
            this.ball.velocity.x = -this.ball.velocity.x * 0.42;
            this.ball.velocity.y = Math.max(3.5, this.ball.velocity.y * 0.6);
            this.audio.playKick(0.6);
            return;
          }
        }
      }
    }

    // Claim loose ball when close and ball is low
    if (this.ball.position.y < 1.65) {
      for (const p of this.players) {
        if (p.isSentOff || p.fallenTimer > 0) continue;
        if (p.id === this.ball.lastKickerId && this.ball.velocity.length() > 12) continue;

        const dist = Math.hypot(p.position.x - this.ball.position.x, p.position.z - this.ball.position.z);
        if (dist < 1.08) {
          // If another player owns it, standing tackle contest
          if (this.ball.ownerId && this.ball.ownerId !== p.id) {
            const currentOwner = this.players.find((o) => o.id === this.ball.ownerId);
            if (currentOwner && currentOwner.team !== p.team && Math.random() < dt * 3.8) {
              this.ball.ownerId = p.id;
              this.ball.lastTouchTeam = p.team;
              this.audio.playKick(0.3);
            }
          } else if (!this.ball.ownerId) {
            this.ball.ownerId = p.id;
            this.ball.lastTouchTeam = p.team;
            if (this.matchState === 'FREE_KICK_PLAY' || this.matchState === 'PENALTY_PLAY') {
              this.matchState = 'PLAYING';
            }
          }
        }
      }
    }

    // Keep ball smoothly at the feet of the dribbling owner
    if (this.ball.ownerId) {
      const owner = this.players.find((p) => p.id === this.ball.ownerId);
      if (owner && !owner.isSentOff && owner.fallenTimer <= 0) {
        const dribbleOffset = 0.86;
        const targetX = owner.position.x + Math.sin(owner.facingAngle) * dribbleOffset;
        const targetZ = owner.position.z + Math.cos(owner.facingAngle) * dribbleOffset;
        this.ball.position.x = THREE.MathUtils.lerp(this.ball.position.x, targetX, dt * 18);
        this.ball.position.z = THREE.MathUtils.lerp(this.ball.position.z, targetZ, dt * 18);
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

    // Check Goal Scoring (Crossing goal line ±52 within Goal Width & Height)
    if (Math.abs(bx) >= Stadium.HALF_LENGTH && Math.abs(bx) <= Stadium.HALF_LENGTH + Stadium.GOAL_DEPTH + 1.5) {
      if (Math.abs(bz) < Stadium.GOAL_HALF_WIDTH && by < Stadium.GOAL_HEIGHT) {
        // Check crossbar / post hit near edges
        if (Math.abs( Math.abs(bz) - Stadium.GOAL_HALF_WIDTH ) < 0.28 || Math.abs(by - Stadium.GOAL_HEIGHT) < 0.25) {
          this.ball.velocity.x = -this.ball.velocity.x * 0.65;
          this.audio.playPostHit();
          return;
        }

        // GOAL SCORED!
        const scoringTeam: 'HOME' | 'AWAY' = bx > 0 ? 'HOME' : 'AWAY';
        if (scoringTeam === 'HOME') this.homeScore++;
        else this.awayScore++;

        const scorer = this.players.find((p) => p.id === this.ball.lastKickerId);
        const scorerName = scorer ? `${scorer.teamConfig.flag} ${scorer.nameLabel}` : scoringTeam;

        this.matchState = 'GOAL_CELEBRATION';
        this.stateTimer = 3.2;
        this.ball.velocity.multiplyScalar(0.25);
        this.stadium.triggerGoalCrowdCelebration();
        this.audio.playGoalCheer();
        this.audio.playWhistle('long');

        this.showBanner(
          `⚽ GOAL!! (${this.homeScore} - ${this.awayScore})`,
          `${scorerName} 환상적인 월드컵 골 득점!`,
          'banner-goal',
          3.0
        );
        this.updateScoreboardHUD();
        return;
      }
    }

    // Keep ball inside stadium or gently bounce/throw-in from sidelines
    if (Math.abs(bz) > Stadium.HALF_WIDTH + 0.4) {
      this.ball.position.z = Math.sign(bz) * (Stadium.HALF_WIDTH - 0.5);
      this.ball.velocity.z = -this.ball.velocity.z * 0.55;
    }
    if (Math.abs(bx) > Stadium.HALF_LENGTH + 0.4 && (Math.abs(bz) >= Stadium.GOAL_HALF_WIDTH || by >= Stadium.GOAL_HEIGHT)) {
      this.ball.position.x = Math.sign(bx) * (Stadium.HALF_LENGTH - 0.8);
      this.ball.velocity.x = -this.ball.velocity.x * 0.5;
    }
  }

  private updateCamera(dt: number): void {
    if (this.matchState === 'FOUL_CINEMATIC' && this.activeFoul) {
      // Dramatic Referee Card Close-up Camera
      const focus = this.activeFoul.foulPosition;
      this.camPosTarget.set(focus.x - 4.5, 6.2, focus.z + 10.5);
      this.camLookTarget.set(
        (focus.x + this.referee.position.x) * 0.5,
        1.5,
        (focus.z + this.referee.position.z) * 0.5
      );
    } else if (this.matchState === 'FREE_KICK_SETUP') {
      // Behind-the-kicker 3rd-Person Free Kick Camera looking past the defensive wall at the goal
      const dir = new THREE.Vector3(Math.sin(this.setPieceAimYaw), 0, Math.cos(this.setPieceAimYaw));
      this.camPosTarget.set(
        this.ball.position.x - dir.x * 8.2,
        3.8,
        this.ball.position.z - dir.z * 8.2
      );
      const goalX = this.setPieceTeam === 'HOME' ? Stadium.HALF_LENGTH : -Stadium.HALF_LENGTH;
      this.camLookTarget.set(goalX, 2.2, 0);
    } else if (this.matchState === 'PENALTY_SETUP' || this.matchState === 'PENALTY_PLAY') {
      // Iconic 1v1 Penalty Kick Camera behind the Penalty Spot
      const dirX = this.setPieceTeam === 'HOME' ? 1 : -1;
      this.camPosTarget.set(this.ball.position.x - dirX * 9.2, 3.6, 0);
      this.camLookTarget.set(this.ball.position.x + dirX * 12, 1.8, this.setPieceAimZ * 0.35);
    } else if (this.cameraMode === 'THIRD_PERSON' && this.controlledPlayer) {
      const p = this.controlledPlayer.position;
      this.camPosTarget.set(p.x - 14, 9.5, p.z * 0.75);
      this.camLookTarget.set(this.ball.position.x + 8, 1.2, this.ball.position.z);
    } else if (this.cameraMode === 'WIDE') {
      this.camPosTarget.set(this.ball.position.x * 0.35, 38, 52);
      this.camLookTarget.set(this.ball.position.x * 0.45, 0, this.ball.position.z * 0.35);
    } else {
      // Default FIFA TV Broadcast Dynamic Follow Camera
      const bx = this.ball.position.x;
      const bz = this.ball.position.z;
      this.camPosTarget.set(bx * 0.68, 23.5, 34.5 + bz * 0.42);
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

    // Pitch dark-green radar background
    ctx.fillStyle = 'rgba(15, 42, 28, 0.86)';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    // Midline & Center circle
    ctx.beginPath();
    ctx.moveTo(w / 2, 4);
    ctx.lineTo(w / 2, h - 4);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 12, 0, Math.PI * 2);
    ctx.stroke();

    const mapX = (x: number) => ((x + Stadium.HALF_LENGTH) / (Stadium.HALF_LENGTH * 2)) * (w - 8) + 4;
    const mapZ = (z: number) => ((z + Stadium.HALF_WIDTH) / (Stadium.HALF_WIDTH * 2)) * (h - 8) + 4;

    // Draw Players
    for (const p of this.players) {
      if (p.isSentOff) continue;
      const px = mapX(p.position.x);
      const pz = mapZ(p.position.z);

      ctx.beginPath();
      ctx.arc(px, pz, p.isControlled ? 4.8 : 3.6, 0, Math.PI * 2);
      ctx.fillStyle = p.team === 'HOME' ? this.homeTeam.uiHex : this.awayTeam.uiHex;
      ctx.fill();

      if (p.isControlled) {
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 1.8;
        ctx.stroke();
      } else if (p.yellowCards > 0) {
        ctx.strokeStyle = '#ffea00';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Draw Referee on Radar (Neon Yellow Diamond)
    const rx = mapX(this.referee.position.x);
    const rz = mapZ(this.referee.position.z);
    ctx.fillStyle = '#d4ff00';
    ctx.fillRect(rx - 3.5, rz - 3.5, 7, 7);

    // Draw World Cup Ball
    const bx = mapX(this.ball.position.x);
    const bz = mapZ(this.ball.position.z);
    ctx.beginPath();
    ctx.arc(bx, bz, 4.2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
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
            ? '🎯 프리킥 궤적 & 감아차기 설정 (조이스틱으로 방향 조준)'
            : '🥅 페널티킥 코너 조준 (조이스틱으로 골문 타겟 이동 후 슛!)';
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

  public showBanner(title: string, subtitle: string, styleClass: string, durationSec: number): void {
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

    if (this.matchState === 'FOUL_CINEMATIC') {
      refEl.textContent = `👨‍⚖️ 심판 파울 선언 중 (${this.activeFoul?.cardType || 'FOUL'})`;
    } else if (this.matchState === 'FREE_KICK_SETUP') {
      refEl.textContent = `👨‍⚖️ 심판 수비벽 9.15m 관리 중 (FREE KICK)`;
    } else if (this.matchState === 'PENALTY_SETUP') {
      refEl.textContent = `👨‍⚖️ 심판 페널티킥 라인 주시 중 (PENALTY)`;
    } else {
      refEl.textContent = `👨‍⚖️ 심판 추적 거리: ${this.referee.currentDistanceToBall.toFixed(1)}m`;
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
