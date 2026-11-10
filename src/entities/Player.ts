import * as THREE from 'three';
import { TeamConfig } from '../types';

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
    uiHex: '#e11d48'
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
    uiHex: '#eab308'
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
    uiHex: '#0284c7'
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
    uiHex: '#1d4ed8'
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
    uiHex: '#64748b'
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
    uiHex: '#334155'
  }
};

export type PlayerRole = 'GK' | 'DF' | 'MF' | 'FW';

export class Player {
  public id: string;
  public team: 'HOME' | 'AWAY';
  public teamConfig: TeamConfig;
  public role: PlayerRole;
  public shirtNumber: number;
  public nameLabel: string;

  public group: THREE.Group;
  public bodyGroup: THREE.Group;
  private leftLeg: THREE.Group;
  private rightLeg: THREE.Group;
  private leftArm: THREE.Group;
  private rightArm: THREE.Group;
  private activeRing: THREE.Mesh;
  private overheadArrow: THREE.Mesh;
  private yellowCardBadge: THREE.Mesh;

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

  public isControlled: boolean = false;
  public inDefensiveWall: boolean = false;

  private animPhase: number = Math.random() * Math.PI * 2;

  constructor(
    scene: THREE.Scene,
    id: string,
    team: 'HOME' | 'AWAY',
    teamConfig: TeamConfig,
    role: PlayerRole,
    shirtNumber: number,
    homeX: number,
    homeZ: number
  ) {
    this.id = id;
    this.team = team;
    this.teamConfig = teamConfig;
    this.role = role;
    this.shirtNumber = shirtNumber;
    this.nameLabel = `${teamConfig.shortName} #${shirtNumber}`;

    this.homePosition.set(homeX, 0, homeZ);
    this.position.set(homeX, 0, homeZ);
    this.facingAngle = team === 'HOME' ? Math.PI / 2 : -Math.PI / 2;

    this.group = new THREE.Group();
    this.bodyGroup = new THREE.Group();
    this.group.add(this.bodyGroup);

    // Build Articulated Humanoid Mesh
    const isGK = role === 'GK';
    const jerseyColor = isGK ? teamConfig.gkColor : teamConfig.primaryColor;
    const trimColor = teamConfig.secondaryColor;
    const shortsHex = isGK ? 0x111827 : teamConfig.shortsColor;

    // Torso with Jersey Number Texture
    const jerseyTex = this.createJerseyTexture(jerseyColor, trimColor, shirtNumber);
    const torsoMat = new THREE.MeshStandardMaterial({
      map: jerseyTex,
      roughness: 0.65
    });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.92, 0.42), torsoMat);
    torso.position.y = 1.38;
    torso.castShadow = true;
    this.bodyGroup.add(torso);

    // Shorts
    const shortsMat = new THREE.MeshStandardMaterial({ color: shortsHex, roughness: 0.7 });
    const shorts = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.36, 0.4), shortsMat);
    shorts.position.y = 0.82;
    shorts.castShadow = true;
    this.bodyGroup.add(shorts);

    // Head & Hair
    const skinTones = [0xf1c27d, 0xe0ac69, 0xc68642, 0xffdbac, 0x8d5524];
    const skinMat = new THREE.MeshStandardMaterial({
      color: skinTones[shirtNumber % skinTones.length],
      roughness: 0.6
    });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), skinMat);
    head.position.y = 2.15;
    head.castShadow = true;
    this.bodyGroup.add(head);

    const hairMat = new THREE.MeshStandardMaterial({
      color: shirtNumber % 3 === 0 ? 0x27272a : shirtNumber % 3 === 1 ? 0x451a03 : 0x111827
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

    // Legs
    this.leftLeg = this.createLeg(jerseyColor, skinMat);
    this.leftLeg.position.set(-0.2, 0.72, 0);
    this.rightLeg = this.createLeg(jerseyColor, skinMat);
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
    const arrowGeo = new THREE.ConeGeometry(0.24, 0.42, 4);
    arrowGeo.rotateX(Math.PI);
    const arrowMat = new THREE.MeshBasicMaterial({
      color: team === 'HOME' ? 0x00e5ff : 0xff4081
    });
    this.overheadArrow = new THREE.Mesh(arrowGeo, arrowMat);
    this.overheadArrow.position.y = 2.95;
    this.overheadArrow.visible = false;
    this.group.add(this.overheadArrow);

    // Overhead Yellow Card Warning Indicator (visible when player has 1 yellow card)
    const ycGeo = new THREE.PlaneGeometry(0.28, 0.38);
    const ycMat = new THREE.MeshBasicMaterial({
      color: 0xffea00,
      side: THREE.DoubleSide
    });
    this.yellowCardBadge = new THREE.Mesh(ycGeo, ycMat);
    this.yellowCardBadge.position.set(0.45, 2.75, 0);
    this.yellowCardBadge.visible = false;
    this.group.add(this.yellowCardBadge);

    this.group.position.copy(this.position);
    scene.add(this.group);
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

    // Trim stripes
    ctx.fillStyle = sColor;
    ctx.fillRect(0, 0, 256, 28);
    ctx.fillRect(0, 224, 256, 32);

    // High-contrast Shirt Number
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

  private createLeg(sockHex: number, skinMat: THREE.Material): THREE.Group {
    const g = new THREE.Group();
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.34, 0.22), skinMat);
    thigh.position.y = -0.17;
    g.add(thigh);

    const sockMat = new THREE.MeshStandardMaterial({ color: sockHex, roughness: 0.7 });
    const sock = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.32, 0.2), sockMat);
    sock.position.y = -0.48;
    g.add(sock);

    const bootMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4 });
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.34), bootMat);
    boot.position.set(0, -0.65, 0.05);
    g.add(boot);

    return g;
  }

  public triggerSlideTackle(dir: THREE.Vector3): boolean {
    if (this.slideTimer > 0 || this.slideCooldown > 0 || this.fallenTimer > 0 || this.isSentOff) {
      return false;
    }
    this.slideTimer = 0.48;
    this.slideCooldown = 1.15;
    this.slideHasDealtContact = false;

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

  public update(dt: number): void {
    if (this.isSentOff) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;

    if (this.slideCooldown > 0) this.slideCooldown = Math.max(0, this.slideCooldown - dt);
    if (this.kickAnimTimer > 0) this.kickAnimTimer = Math.max(0, this.kickAnimTimer - dt);
    if (this.gkSaveCooldown > 0) this.gkSaveCooldown = Math.max(0, this.gkSaveCooldown - dt);

    // Handle Fallen (Fouled) State
    if (this.fallenTimer > 0) {
      this.fallenTimer = Math.max(0, this.fallenTimer - dt);
      this.bodyGroup.rotation.x = Math.PI * 0.46;
      this.bodyGroup.position.y = 0.25;
      this.syncIndicators();
      return;
    }

    // Handle GK Horizontal Dive
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

    // Handle Slide Tackle Lunging
    if (this.slideTimer > 0) {
      this.slideTimer = Math.max(0, this.slideTimer - dt);
      const slideSpeed = 13.8 * (0.4 + (this.slideTimer / 0.48) * 0.6);
      this.velocity.set(this.slideDir.x * slideSpeed, 0, this.slideDir.z * slideSpeed);
      this.position.addScaledVector(this.velocity, dt);

      // Pitch body backward into classic slide tackle pose
      this.bodyGroup.rotation.x = -Math.PI * 0.38;
      this.bodyGroup.position.y = 0.18;
      this.rightLeg.rotation.x = -0.75;
      this.leftLeg.rotation.x = 0.45;
    } else {
      // Normal upright posture
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
        this.leftArm.rotation.x = -swing * 0.75;
        this.rightArm.rotation.x = swing * 0.75;
      } else {
        this.leftLeg.rotation.x *= 0.85;
        this.rightLeg.rotation.x *= 0.85;
        this.leftArm.rotation.x *= 0.85;
        this.rightArm.rotation.x *= 0.85;
      }

      if (this.kickAnimTimer > 0) {
        this.rightLeg.rotation.x = -1.15 * (this.kickAnimTimer / 0.25);
      }
    }

    // Clamp to outer stadium apron
    this.position.x = THREE.MathUtils.clamp(this.position.x, -56, 56);
    this.position.z = THREE.MathUtils.clamp(this.position.z, -38, 38);

    this.group.position.copy(this.position);
    this.bodyGroup.rotation.y = this.facingAngle;
    this.syncIndicators();
  }

  private syncIndicators(): void {
    this.activeRing.visible = this.isControlled;
    this.overheadArrow.visible = this.isControlled;
    if (this.isControlled) {
      this.overheadArrow.position.y = 2.95 + Math.sin(performance.now() * 0.008) * 0.14;
      this.overheadArrow.rotation.y += 0.04;
    }

    this.yellowCardBadge.visible = this.yellowCards === 1 && !this.redCard;
    if (this.yellowCardBadge.visible) {
      this.yellowCardBadge.rotation.y += 0.03;
    }
  }
}
