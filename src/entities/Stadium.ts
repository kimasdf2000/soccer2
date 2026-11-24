import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

interface CrowdMemberData {
  x: number;
  y: number;
  z: number;
  yaw: number;
  scale: number;
  phase: number;
}

interface StadiumParticle {
  active: boolean;
  life: number;
  maxLife: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  gravity: number;
  scale: number;
}

export class Stadium {
  public static readonly HALF_LENGTH = 52; // X: -52 to +52 (104m length)
  public static readonly HALF_WIDTH = 34;  // Z: -34 to +34 (68m width)
  public static readonly GOAL_HALF_WIDTH = 5.6; // Z: -5.6 to +5.6 (11.2m wide for fun 3D scoring)
  public static readonly GOAL_HEIGHT = 3.45;
  public static readonly GOAL_DEPTH = 3.2;
  public static readonly PENALTY_BOX_DEPTH = 16.5; // X from 35.5 to 52
  public static readonly PENALTY_BOX_HALF_WIDTH = 18.5; // Z: -18.5 to +18.5
  public static readonly PENALTY_SPOT_X = 41.0; // 11m from goal line

  public group: THREE.Group;
  private leftGoalNet!: THREE.Group;
  private rightGoalNet!: THREE.Group;
  private adTexture!: THREE.CanvasTexture;
  private crowdTorsoMesh!: THREE.InstancedMesh;
  private crowdHeadMesh!: THREE.InstancedMesh;
  private crowdHairMesh!: THREE.InstancedMesh;
  private crowdArmsMesh!: THREE.InstancedMesh;
  private crowdData: CrowdMemberData[] = [];
  private crowdWasExcited: boolean = false;
  private goalExcitementTimer: number = 0;

  // Pooled 3D Turf / Spark / Confetti Particle System
  private particleMesh!: THREE.InstancedMesh;
  private particles: StadiumParticle[] = [];
  private particleCursor: number = 0;
  private dummyParticleObj: THREE.Object3D = new THREE.Object3D();

  // Vanishing Spray, Offside Laser Line, Free Kick Challenge Target Rings & World Cup Trophy
  private sprayGroup: THREE.Group;
  private sprayBallRing: THREE.Mesh;
  private sprayWallLine: THREE.Mesh;
  private sprayTimer: number = 0;

  private offsideLineMesh: THREE.Mesh;
  private offsideTimer: number = 0;

  public challengeRingsGroup: THREE.Group;
  public trophyGroup: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.sprayGroup = new THREE.Group();
    this.challengeRingsGroup = new THREE.Group();
    this.trophyGroup = new THREE.Group();

    this.buildSkyDome();
    this.buildPitch();
    this.buildGoals();
    this.buildCornerFlags();
    this.buildAdBoardsAndStands();
    this.buildFloodlights();
    this.initParticleSystem();

    // 1. Vanishing Spray Foam Meshes
    const foamMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92
    });
    const ringGeo = new THREE.RingGeometry(0.65, 0.85, 24);
    ringGeo.rotateX(-Math.PI / 2);
    this.sprayBallRing = new THREE.Mesh(ringGeo, foamMat);
    this.sprayBallRing.position.y = 0.04;

    const wallLineGeo = new THREE.PlaneGeometry(4.2, 0.24);
    wallLineGeo.rotateX(-Math.PI / 2);
    this.sprayWallLine = new THREE.Mesh(wallLineGeo, foamMat);
    this.sprayWallLine.position.y = 0.04;

    this.sprayGroup.add(this.sprayBallRing, this.sprayWallLine);
    this.sprayGroup.visible = false;
    this.group.add(this.sprayGroup);

    // 2. Broadcast Offside Laser Line
    const offGeo = new THREE.PlaneGeometry(0.32, Stadium.HALF_WIDTH * 2);
    offGeo.rotateX(-Math.PI / 2);
    const offMat = new THREE.MeshBasicMaterial({
      color: 0xff1744,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    this.offsideLineMesh = new THREE.Mesh(offGeo, offMat);
    this.offsideLineMesh.position.y = 0.05;
    this.offsideLineMesh.visible = false;
    this.group.add(this.offsideLineMesh);

    // 3. Free Kick Challenge Bonus Target Rings inside Right Goal (+X = 52)
    const createTargetRing = (z: number, y: number, colorHex: number, radius: number) => {
      const rMesh = new THREE.Mesh(
        new THREE.RingGeometry(radius * 0.72, radius, 28),
        new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide })
      );
      rMesh.rotation.y = Math.PI / 2;
      rMesh.position.set(Stadium.HALF_LENGTH - 0.1, y, z);
      this.challengeRingsGroup.add(rMesh);
    };
    createTargetRing(-3.8, 2.55, 0xffea00, 1.05); // Top Left (+250 PT)
    createTargetRing(3.8, 2.55, 0xffea00, 1.05);  // Top Right (+250 PT)
    createTargetRing(-3.8, 1.0, 0x00e5ff, 0.95);  // Bottom Left (+150 PT)
    createTargetRing(3.8, 1.0, 0x00e5ff, 0.95);   // Bottom Right (+150 PT)
    this.challengeRingsGroup.visible = false;
    this.group.add(this.challengeRingsGroup);

    // 4. 3D Golden FIFA World Cup Trophy Podium at Center Circle
    const podium = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.6, 0.5, 24),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5 })
    );
    podium.position.y = 0.25;
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.85,
      roughness: 0.18
    });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.65, 1.2, 16), goldMat);
    base.position.y = 1.1;
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 24), goldMat);
    globe.position.y = 2.05;
    this.trophyGroup.add(podium, base, globe);
    this.trophyGroup.visible = false;
    this.group.add(this.trophyGroup);

    scene.add(this.group);
  }

  public showVanishingSpray(ballPos: THREE.Vector3, wallCenter: THREE.Vector3, yawAngle: number): void {
    this.sprayGroup.visible = true;
    this.sprayTimer = 14.0;
    this.sprayBallRing.position.set(ballPos.x, 0.04, ballPos.z);
    this.sprayWallLine.position.set(wallCenter.x, 0.04, wallCenter.z);
    this.sprayWallLine.rotation.z = yawAngle;
  }

  public clearVanishingSpray(): void {
    this.sprayGroup.visible = false;
    this.sprayTimer = 0;
  }

  public showOffsideLaser(xPos: number, duration: number = 3.0): void {
    this.offsideLineMesh.position.set(xPos, 0.05, 0);
    this.offsideLineMesh.visible = true;
    this.offsideTimer = duration;
  }

  public triggerGoalCrowdCelebration(goalX: number = 0): void {
    this.goalExcitementTimer = 3.5;
    if (goalX !== 0) {
      this.spawnParticles(new THREE.Vector3(goalX * 0.94, 2.2, -3.5), 'GOAL', 28);
      this.spawnParticles(new THREE.Vector3(goalX * 0.94, 2.2, 3.5), 'GOAL', 28);
    }
  }

  public spawnParticles(
    origin: THREE.Vector3,
    kind: 'GRASS' | 'LOFT' | 'HEADER' | 'GOAL',
    count: number = 14
  ): void {
    if (!this.particleMesh) return;
    const color = new THREE.Color();
    const goalPalette = [0xfacc15, 0x00e5ff, 0xff1744, 0x00e676, 0xa855f7, 0xffffff];

    for (let i = 0; i < count; i++) {
      const idx = this.particleCursor;
      this.particleCursor = (this.particleCursor + 1) % this.particles.length;
      const p = this.particles[idx];
      p.active = true;
      p.x = origin.x + (Math.random() - 0.5) * 0.45;
      p.y = Math.max(0.08, origin.y + (Math.random() - 0.5) * 0.25);
      p.z = origin.z + (Math.random() - 0.5) * 0.45;

      const ang = Math.random() * Math.PI * 2;
      if (kind === 'HEADER') {
        const spd = 2.8 + Math.random() * 5.8;
        p.vx = Math.cos(ang) * spd;
        p.vy = 1.8 + Math.random() * 4.5;
        p.vz = Math.sin(ang) * spd;
        p.gravity = 12.0;
        p.maxLife = 0.42 + Math.random() * 0.25;
        p.scale = 0.95 + Math.random() * 0.55;
        color.setHex(i % 2 === 0 ? 0xfacc15 : 0x38bdf8);
      } else if (kind === 'LOFT') {
        const spd = 1.8 + Math.random() * 3.6;
        p.vx = Math.cos(ang) * spd;
        p.vy = 2.2 + Math.random() * 3.2;
        p.vz = Math.sin(ang) * spd;
        p.gravity = 9.5;
        p.maxLife = 0.45 + Math.random() * 0.2;
        p.scale = 0.78 + Math.random() * 0.4;
        color.setHex(i % 2 === 0 ? 0x38bdf8 : 0xfef08a);
      } else if (kind === 'GOAL') {
        const spd = 3.5 + Math.random() * 8.5;
        p.vx = Math.cos(ang) * spd;
        p.vy = 5.5 + Math.random() * 8.5;
        p.vz = Math.sin(ang) * spd;
        p.gravity = 8.5;
        p.maxLife = 1.35 + Math.random() * 0.8;
        p.scale = 1.15 + Math.random() * 0.65;
        color.setHex(goalPalette[i % goalPalette.length]);
      } else {
        // GRASS / TURF kick & slide blades
        const spd = 1.4 + Math.random() * 3.4;
        p.vx = Math.cos(ang) * spd;
        p.vy = 1.6 + Math.random() * 3.0;
        p.vz = Math.sin(ang) * spd;
        p.gravity = 15.0;
        p.maxLife = 0.35 + Math.random() * 0.22;
        p.scale = 0.68 + Math.random() * 0.38;
        color.setHex(i % 3 === 0 ? 0xdcfce7 : 0x22c55e);
      }
      p.life = p.maxLife;
      this.particleMesh.setColorAt(idx, color);
    }
    if (this.particleMesh.instanceColor) {
      this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  public update(dt: number): void {
    if (this.adTexture) {
      this.adTexture.offset.x = (this.adTexture.offset.x + dt * 0.032) % 1;
    }
    this.updateParticles(dt);

    if (this.sprayTimer > 0) {
      this.sprayTimer = Math.max(0, this.sprayTimer - dt);
      if (this.sprayTimer <= 0) this.sprayGroup.visible = false;
    }
    if (this.offsideTimer > 0) {
      this.offsideTimer = Math.max(0, this.offsideTimer - dt);
      if (this.offsideTimer <= 0) this.offsideLineMesh.visible = false;
    }
    if (this.trophyGroup.visible) {
      this.trophyGroup.rotation.y += dt * 1.2;
    }

    if (this.goalExcitementTimer > 0) {
      this.goalExcitementTimer = Math.max(0, this.goalExcitementTimer - dt);
      this.crowdWasExcited = true;
      const t = performance.now() * 0.014;

      // Net ripple
      const scalePulse = 1 + Math.sin(t * 2.5) * 0.045 * (this.goalExcitementTimer / 3.5);
      this.leftGoalNet.scale.set(scalePulse, 1, scalePulse);
      this.rightGoalNet.scale.set(scalePulse, 1, scalePulse);

      this.updateCrowdPose(t, true);
    } else {
      if (this.crowdWasExcited) {
        this.leftGoalNet.scale.set(1, 1, 1);
        this.rightGoalNet.scale.set(1, 1, 1);
        this.crowdWasExcited = false;
      }
      // Subtle stadium breathing / ambient fan sway
      this.updateCrowdPose(performance.now() * 0.0022, false);
    }
  }

  private updateCrowdPose(t: number, isGoalExcited: boolean): void {
    const obj = new THREE.Object3D();
    const armObj = new THREE.Object3D();

    for (let i = 0; i < this.crowdData.length; i++) {
      const c = this.crowdData[i];
      const jumpY = isGoalExcited
        ? Math.abs(Math.sin(t + c.phase)) * 0.72
        : Math.max(0, Math.sin(t + c.phase * 1.7)) * 0.06;
      const swayZ = isGoalExcited
        ? Math.sin(t * 1.3 + c.phase) * 0.08
        : Math.sin(t * 0.8 + c.phase) * 0.03;

      obj.position.set(c.x, c.y + jumpY, c.z);
      obj.rotation.set(0, c.yaw, swayZ);
      obj.scale.setScalar(c.scale);
      obj.updateMatrix();

      this.crowdTorsoMesh.setMatrixAt(i, obj.matrix);
      this.crowdHeadMesh.setMatrixAt(i, obj.matrix);
      this.crowdHairMesh.setMatrixAt(i, obj.matrix);

      // Arms pivot at shoulder height (y + 0.80 * scale) and swing overhead when cheering!
      armObj.position.set(c.x, c.y + jumpY + 0.80 * c.scale, c.z);
      const armWaveX = isGoalExcited
        ? -2.35 - Math.abs(Math.sin(t * 1.6 + c.phase)) * 0.6
        : -0.15 - Math.max(0, Math.sin(t * 1.4 + c.phase)) * 0.28;
      armObj.rotation.set(0, c.yaw, swayZ);
      armObj.rotateX(armWaveX);
      armObj.scale.setScalar(c.scale);
      armObj.updateMatrix();
      this.crowdArmsMesh.setMatrixAt(i, armObj.matrix);
    }

    this.crowdTorsoMesh.instanceMatrix.needsUpdate = true;
    this.crowdHeadMesh.instanceMatrix.needsUpdate = true;
    this.crowdHairMesh.instanceMatrix.needsUpdate = true;
    this.crowdArmsMesh.instanceMatrix.needsUpdate = true;
  }

  private buildSkyDome(): void {
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 512;
    skyCanvas.height = 256;
    const ctx = skyCanvas.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#030712');
    grad.addColorStop(0.45, '#09152b');
    grad.addColorStop(0.75, '#132a4f');
    grad.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Subtle crisp night stars in upper hemisphere
    for (let i = 0; i < 140; i++) {
      const sx = Math.random() * 512;
      const sy = Math.random() * 125;
      const r = 0.6 + Math.random() * 1.1;
      ctx.fillStyle = `rgba(240, 249, 255, ${0.35 + Math.random() * 0.55})`;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const skyTex = new THREE.CanvasTexture(skyCanvas);
    const skyMesh = new THREE.Mesh(
      new THREE.SphereGeometry(215, 28, 18),
      new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false })
    );
    this.group.add(skyMesh);
  }

  private buildPitch(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1360;
    const ctx = canvas.getContext('2d')!;

    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = 512;
    roughCanvas.height = 340;
    const rCtx = roughCanvas.getContext('2d')!;

    const w = canvas.width;
    const h = canvas.height;

    // Outer stadium track / synthetic turf apron
    ctx.fillStyle = '#144522';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 4;
    ctx.strokeRect(36, 32, w - 72, h - 64);

    rCtx.fillStyle = '#d4d4d8';
    rCtx.fillRect(0, 0, 512, 340);

    // Pitch rect inside canvas (margin for sidelines)
    const marginX = 140;
    const marginY = 120;
    const pw = w - marginX * 2;
    const ph = h - marginY * 2;

    const rMarginX = (marginX / w) * 512;
    const rMarginY = (marginY / h) * 340;
    const rPw = (pw / w) * 512;
    const rPh = (ph / h) * 340;

    // Lush alternating mowed grass stripes (18 vertical stripes) + roughness sheen contrast
    const stripeCount = 18;
    const stripeW = pw / stripeCount;
    const rStripeW = rPw / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#2b8a3e' : '#216e31';
      ctx.fillRect(marginX + i * stripeW, marginY, stripeW + 1, ph);

      rCtx.fillStyle = i % 2 === 0 ? '#a8a8b2' : '#d6d6dc';
      rCtx.fillRect(rMarginX + i * rStripeW, rMarginY, rStripeW + 0.5, rPh);
    }

    // Subtle horizontal cross-mowed checkerboard sheen
    const hStripes = 12;
    for (let j = 0; j < hStripes; j++) {
      ctx.fillStyle = j % 2 === 0 ? 'rgba(255,255,255,0.032)' : 'rgba(0,0,0,0.028)';
      ctx.fillRect(marginX, marginY + (j * ph) / hStripes, pw, ph / hStripes);
    }

    // Micro grass blade grain & subtle goalmouth wear for broadcast realism
    for (let n = 0; n < 3600; n++) {
      const gx = marginX + Math.random() * pw;
      const gy = marginY + Math.random() * ph;
      ctx.fillStyle = n % 2 === 0 ? 'rgba(187, 247, 208, 0.06)' : 'rgba(5, 46, 22, 0.07)';
      ctx.fillRect(gx, gy, 3, 2);
    }

    // Crisp White Pitch Markings with subtle chalk glow
    ctx.save();
    ctx.shadowColor = 'rgba(255, 255, 255, 0.35)';
    ctx.shadowBlur = 4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 7.5;

    // Outer boundary
    ctx.strokeRect(marginX, marginY, pw, ph);

    // Halfway line
    const midX = w / 2;
    const midY = h / 2;
    ctx.beginPath();
    ctx.moveTo(midX, marginY);
    ctx.lineTo(midX, marginY + ph);
    ctx.stroke();

    // Center Circle & Spot
    const scaleX = pw / (Stadium.HALF_LENGTH * 2);
    const scaleY = ph / (Stadium.HALF_WIDTH * 2);
    ctx.beginPath();
    ctx.arc(midX, midY, 9.15 * scaleX, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(midX, midY, 10.5, 0, Math.PI * 2);
    ctx.fill();

    // Left & Right Penalty Boxes + Goal Areas + Penalty Spots + Penalty Arcs
    const pBoxW = Stadium.PENALTY_BOX_DEPTH * scaleX;
    const pBoxH = Stadium.PENALTY_BOX_HALF_WIDTH * 2 * scaleY;
    const gBoxW = 5.5 * scaleX;
    const gBoxH = 18.0 * scaleY;
    const pSpotOffset = (Stadium.HALF_LENGTH - Stadium.PENALTY_SPOT_X) * scaleX;

    // Left Penalty Box
    ctx.strokeRect(marginX, midY - pBoxH / 2, pBoxW, pBoxH);
    ctx.strokeRect(marginX, midY - gBoxH / 2, gBoxW, gBoxH);
    ctx.beginPath();
    ctx.arc(marginX + pSpotOffset, midY, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(marginX + pSpotOffset, midY, 9.15 * scaleX, -0.92, 0.92);
    ctx.stroke();

    // Right Penalty Box
    ctx.strokeRect(marginX + pw - pBoxW, midY - pBoxH / 2, pBoxW, pBoxH);
    ctx.strokeRect(marginX + pw - gBoxW, midY - gBoxH / 2, gBoxW, gBoxH);
    ctx.beginPath();
    ctx.arc(marginX + pw - pSpotOffset, midY, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(marginX + pw - pSpotOffset, midY, 9.15 * scaleX, Math.PI - 0.92, Math.PI + 0.92);
    ctx.stroke();

    // Corner Arcs
    const cRadius = 1.5 * scaleX;
    const corners: [number, number, number, number][] = [
      [marginX, marginY, 0, Math.PI / 2],
      [marginX + pw, marginY, Math.PI / 2, Math.PI],
      [marginX + pw, marginY + ph, Math.PI, Math.PI * 1.5],
      [marginX, marginY + ph, Math.PI * 1.5, Math.PI * 2]
    ];
    corners.forEach(([cx, cy, sAngle, eAngle]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, cRadius, sAngle, eAngle);
      ctx.stroke();
    });

    // Technical area dashed boxes on South touchline
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.strokeRect(midX - 24 * scaleX, marginY + ph + 10, 16 * scaleX, 56);
    ctx.strokeRect(midX + 8 * scaleX, marginY + ph + 10, 16 * scaleX, 56);
    ctx.restore();

    const pitchTex = new THREE.CanvasTexture(canvas);
    pitchTex.anisotropy = 8;
    const roughTex = new THREE.CanvasTexture(roughCanvas);

    const totalLength = (Stadium.HALF_LENGTH * 2) / (pw / w);
    const totalWidth = (Stadium.HALF_WIDTH * 2) / (ph / h);

    const pitchGeo = new THREE.PlaneGeometry(totalLength, totalWidth);
    pitchGeo.rotateX(-Math.PI / 2);
    const pitchMat = new THREE.MeshStandardMaterial({
      map: pitchTex,
      roughnessMap: roughTex,
      roughness: 0.92,
      metalness: 0.04
    });
    const pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
    pitchMesh.receiveShadow = true;
    this.group.add(pitchMesh);
  }

  private createHexNetTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, 128, 128);
    ctx.strokeStyle = 'rgba(241, 245, 249, 0.78)';
    ctx.lineWidth = 2.4;

    const step = 16;
    for (let y = -step; y <= 128 + step; y += step) {
      for (let x = -step; x <= 128 + step; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + step * 0.5, y + step * 0.5);
        ctx.lineTo(x + step, y);
        ctx.moveTo(x + step * 0.5, y + step * 0.5);
        ctx.lineTo(x + step * 0.5, y + step);
        ctx.stroke();
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    return tex;
  }

  private buildGoals(): void {
    const postMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.16,
      metalness: 0.48
    });
    const stanchionMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.4,
      metalness: 0.65
    });

    const makeNetMat = (repX: number, repY: number) => {
      const tex = this.createHexNetTexture();
      tex.repeat.set(repX, repY);
      return new THREE.MeshBasicMaterial({
        map: tex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.86,
        depthWrite: false
      });
    };

    const backNetMat = makeNetMat(11, 4);
    const topNetMat = makeNetMat(11, 3.5);
    const sideNetMat = makeNetMat(3.5, 4);

    const createGoal = (side: -1 | 1): THREE.Group => {
      const goalGroup = new THREE.Group();
      const xGoal = side * Stadium.HALF_LENGTH;
      const hw = Stadium.GOAL_HALF_WIDTH;
      const h = Stadium.GOAL_HEIGHT;
      const absDepth = Stadium.GOAL_DEPTH;
      const depth = absDepth * side;

      const postGeo = new THREE.CylinderGeometry(0.135, 0.135, h, 16);
      const leftPost = new THREE.Mesh(postGeo, postMat);
      leftPost.position.set(xGoal, h / 2, -hw);
      leftPost.castShadow = true;

      const rightPost = new THREE.Mesh(postGeo, postMat);
      rightPost.position.set(xGoal, h / 2, hw);
      rightPost.castShadow = true;

      const crossbarGeo = new THREE.CylinderGeometry(0.135, 0.135, hw * 2 + 0.27, 16);
      crossbarGeo.rotateX(Math.PI / 2);
      const crossbar = new THREE.Mesh(crossbarGeo, postMat);
      crossbar.position.set(xGoal, h, 0);
      crossbar.castShadow = true;

      // Rear World Cup Stanchion Support Frame & Bottom Net Bar
      [-hw, hw].forEach((zSide) => {
        const rearPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, h, 10), stanchionMat);
        rearPole.position.set(xGoal + depth, h / 2, zSide);
        const topSupport = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.05, absDepth, 8),
          stanchionMat
        );
        topSupport.rotation.z = Math.PI / 2;
        topSupport.position.set(xGoal + depth / 2, h - 0.04, zSide);

        const botSupport = new THREE.Mesh(
          new THREE.CylinderGeometry(0.055, 0.055, absDepth, 8),
          postMat
        );
        botSupport.rotation.z = Math.PI / 2;
        botSupport.position.set(xGoal + depth / 2, 0.05, zSide);
        goalGroup.add(rearPole, topSupport, botSupport);
      });
      const rearGroundBar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, hw * 2, 10),
        postMat
      );
      rearGroundBar.rotation.x = Math.PI / 2;
      rearGroundBar.position.set(xGoal + depth, 0.05, 0);
      goalGroup.add(rearGroundBar);

      // Woven Hexagonal Net Panels (pivoted around goal center for goal ripple animation)
      const netRoot = new THREE.Group();
      netRoot.position.set(xGoal + depth / 2, h / 2, 0);

      const backPanel = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2, h), backNetMat);
      backPanel.rotation.y = Math.PI / 2;
      backPanel.position.set(depth / 2, 0, 0);

      const topPanel = new THREE.Mesh(new THREE.PlaneGeometry(absDepth, hw * 2), topNetMat);
      topPanel.rotation.x = Math.PI / 2;
      topPanel.position.set(0, h / 2, 0);

      const leftSidePanel = new THREE.Mesh(new THREE.PlaneGeometry(absDepth, h), sideNetMat);
      leftSidePanel.position.set(0, 0, -hw);

      const rightSidePanel = new THREE.Mesh(new THREE.PlaneGeometry(absDepth, h), sideNetMat);
      rightSidePanel.position.set(0, 0, hw);

      netRoot.add(backPanel, topPanel, leftSidePanel, rightSidePanel);
      goalGroup.add(leftPost, rightPost, crossbar, netRoot);
      this.group.add(goalGroup);
      return netRoot;
    };

    this.leftGoalNet = createGoal(-1);
    this.rightGoalNet = createGoal(1);
  }

  private buildCornerFlags(): void {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 });
    const flagMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      roughness: 0.5
    });

    const corners = [
      [-Stadium.HALF_LENGTH, -Stadium.HALF_WIDTH],
      [Stadium.HALF_LENGTH, -Stadium.HALF_WIDTH],
      [Stadium.HALF_LENGTH, Stadium.HALF_WIDTH],
      [-Stadium.HALF_LENGTH, Stadium.HALF_WIDTH]
    ];

    corners.forEach(([x, z]) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.65, 8), poleMat);
      pole.position.set(x, 0.82, z);

      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.4), flagMat);
      flag.position.set(x + 0.28, 1.42, z);
      this.group.add(pole, flag);
    });
  }

  private buildAdBoardsAndStands(): void {
    // Create vibrant scrolling LED Adboard texture
    const adCanvas = document.createElement('canvas');
    adCanvas.width = 1024;
    adCanvas.height = 128;
    const ctx = adCanvas.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 1024, 0);
    grad.addColorStop(0, '#091224');
    grad.addColorStop(0.25, '#1e3a8a');
    grad.addColorStop(0.5, '#0284c7');
    grad.addColorStop(0.75, '#4338ca');
    grad.addColorStop(1, '#091224');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 128);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 1016, 120);

    ctx.fillStyle = '#facc15';
    ctx.font = '900 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚽ FIFA WORLD CUP 3D  •  GROUND & LOB PASS  •  POWER HEADER ⚽', 512, 78);

    const adTex = new THREE.CanvasTexture(adCanvas);
    adTex.wrapS = THREE.RepeatWrapping;
    adTex.repeat.set(3, 1);
    this.adTexture = adTex;

    const adMat = new THREE.MeshStandardMaterial({
      map: adTex,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.26,
      roughness: 0.35
    });

    // North & South Perimeter LED Adboards
    const longBoardGeo = new THREE.BoxGeometry(110, 1.32, 0.42);
    const northBoard = new THREE.Mesh(longBoardGeo, adMat);
    northBoard.position.set(0, 0.66, -Stadium.HALF_WIDTH - 3.6);
    const southBoard = new THREE.Mesh(longBoardGeo, adMat);
    southBoard.position.set(0, 0.66, Stadium.HALF_WIDTH + 3.6);
    this.group.add(northBoard, southBoard);

    // East & West Flanking LED Adboards behind goal lines (split around goal nets)
    const sideBoardGeo = new THREE.BoxGeometry(0.42, 1.32, 23);
    [-1, 1].forEach((xSign) => {
      [-21, 21].forEach((zMid) => {
        const sb = new THREE.Mesh(sideBoardGeo, adMat);
        sb.position.set(xSign * (Stadium.HALF_LENGTH + 4.4), 0.66, zMid);
        this.group.add(sb);
      });
    });

    // South Touchline Team Dugouts (Manager / Substitute Benches)
    const dugoutMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.5,
      roughness: 0.35
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.32,
      roughness: 0.1
    });
    [-16, 16].forEach((bx, idx) => {
      const benchGroup = new THREE.Group();
      const roof = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.18, 2.1), dugoutMat);
      roof.position.set(0, 2.25, 0);
      const backGlass = new THREE.Mesh(new THREE.BoxGeometry(9.4, 2.2, 0.12), glassMat);
      backGlass.position.set(0, 1.1, 0.95);
      const seatBar = new THREE.Mesh(
        new THREE.BoxGeometry(8.8, 0.45, 0.7),
        new THREE.MeshStandardMaterial({ color: idx === 0 ? 0xe11d48 : 0x2563eb, roughness: 0.5 })
      );
      seatBar.position.set(0, 0.45, 0.35);
      benchGroup.add(roof, backGlass, seatBar);
      benchGroup.position.set(bx, 0, Stadium.HALF_WIDTH + 5.6);
      this.group.add(benchGroup);
    });

    // Stadium Concrete Tiers + Modern Cantilever Roof Canopy + LED Rim Strip
    const standMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.55,
      roughness: 0.38
    });
    const rimLightMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc });

    const buildStand = (x: number, z: number, w: number, d: number, rotY: number) => {
      const standGroup = new THREE.Group();
      for (let tier = 0; tier < 4; tier++) {
        const tierMesh = new THREE.Mesh(new THREE.BoxGeometry(w, 2.2, d / 4), standMat);
        tierMesh.position.set(0, 1.1 + tier * 2.0, (1.5 - tier) * (d / 4));
        tierMesh.receiveShadow = true;
        standGroup.add(tierMesh);
      }

      // Back stadium facade wall & cantilevered roof canopy
      const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, 12.5, 1.2), roofMat);
      backWall.position.set(0, 7.8, -d * 0.52);
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(w + 2, 0.55, d * 1.15), roofMat);
      canopy.position.set(0, 14.2, -0.4);
      canopy.rotation.x = 0.08;
      const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, 0.22), rimLightMat);
      ledStrip.position.set(0, 13.7, d * 0.52);

      standGroup.add(backWall, canopy, ledStrip);
      standGroup.position.set(x, 0, z);
      standGroup.rotation.y = rotY;
      this.group.add(standGroup);
    };

    buildStand(0, -Stadium.HALF_WIDTH - 14, 120, 14, 0);
    buildStand(0, Stadium.HALF_WIDTH + 14, 120, 14, Math.PI);
    buildStand(-Stadium.HALF_LENGTH - 15, 0, 78, 14, Math.PI / 2);
    buildStand(Stadium.HALF_LENGTH + 15, 0, 78, 14, -Math.PI / 2);

    // 3D Giant Stadium Jumbotron Screen mounted above North Stand Roof
    const jumboCanvas = document.createElement('canvas');
    jumboCanvas.width = 512;
    jumboCanvas.height = 160;
    const jCtx = jumboCanvas.getContext('2d')!;
    const jGrad = jCtx.createLinearGradient(0, 0, 512, 160);
    jGrad.addColorStop(0, '#020617');
    jGrad.addColorStop(0.5, '#0f172a');
    jGrad.addColorStop(1, '#1e3a8a');
    jCtx.fillStyle = jGrad;
    jCtx.fillRect(0, 0, 512, 160);
    jCtx.strokeStyle = '#facc15';
    jCtx.lineWidth = 6;
    jCtx.strokeRect(4, 4, 504, 152);
    jCtx.fillStyle = '#38bdf8';
    jCtx.font = '900 24px sans-serif';
    jCtx.textAlign = 'center';
    jCtx.fillText('FIFA WORLD CUP 3D STADIUM', 256, 54);
    jCtx.fillStyle = '#ffffff';
    jCtx.font = '900 40px sans-serif';
    jCtx.fillText('⚽ LIVE BROADCAST HD', 256, 112);

    const jumboScreen = new THREE.Mesh(
      new THREE.BoxGeometry(24, 6.8, 0.8),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(jumboCanvas) })
    );
    jumboScreen.position.set(0, 18.2, -Stadium.HALF_WIDTH - 18.5);
    this.group.add(jumboScreen);

    // Humanoid Instanced Crowd Spectators (Head + Hair/Cap + Rounded Torso/Shoulders/Legs + Animated Cheering Arms)
    const lowerBodyGeo = new THREE.CylinderGeometry(0.18, 0.16, 0.36, 10);
    lowerBodyGeo.translate(0, 0.18, 0);
    const chestGeo = new THREE.CylinderGeometry(0.24, 0.17, 0.50, 10);
    chestGeo.translate(0, 0.60, 0);
    const shouldersGeo = new THREE.CapsuleGeometry(0.105, 0.34, 4, 8);
    shouldersGeo.rotateZ(Math.PI / 2);
    shouldersGeo.translate(0, 0.80, 0);
    const neckGeo = new THREE.CylinderGeometry(0.065, 0.08, 0.12, 8);
    neckGeo.translate(0, 0.91, 0);
    const torsoGeo = mergeGeometries([lowerBodyGeo, chestGeo, shouldersGeo, neckGeo], false)!;

    const headGeo = new THREE.SphereGeometry(0.165, 12, 10);
    headGeo.scale(0.95, 1.08, 1.0);
    headGeo.translate(0, 1.11, 0);

    const hairGeo = new THREE.SphereGeometry(0.176, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.56);
    hairGeo.scale(0.97, 1.06, 1.02);
    hairGeo.rotateX(-0.18);
    hairGeo.translate(0, 1.13, -0.01);

    const leftArmGeo = new THREE.CapsuleGeometry(0.062, 0.36, 4, 6);
    leftArmGeo.rotateZ(-0.16);
    leftArmGeo.translate(-0.27, -0.20, 0.02);
    const rightArmGeo = new THREE.CapsuleGeometry(0.062, 0.36, 4, 6);
    rightArmGeo.rotateZ(0.16);
    rightArmGeo.translate(0.27, -0.20, 0.02);
    const armsGeo = mergeGeometries([leftArmGeo, rightArmGeo], false)!;

    const crowdMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const crowdCount = 540;

    this.crowdTorsoMesh = new THREE.InstancedMesh(torsoGeo, crowdMat, crowdCount);
    this.crowdHeadMesh = new THREE.InstancedMesh(headGeo, crowdMat, crowdCount);
    this.crowdHairMesh = new THREE.InstancedMesh(hairGeo, crowdMat, crowdCount);
    this.crowdArmsMesh = new THREE.InstancedMesh(armsGeo, crowdMat, crowdCount);

    const jerseyPalette = [0xef4444, 0xfacc15, 0x3b82f6, 0x10b981, 0xf97316, 0xf8fafc, 0xa855f7, 0x06b6d4];
    const skinPalette = [0xf1c27d, 0xe0ac69, 0xc68642, 0xffdbac, 0x8d5524];
    const hairPalette = [0x111827, 0x27272a, 0x451a03, 0x78350f, 0x92400e, 0xef4444, 0x2563eb];
    const color = new THREE.Color();

    for (let i = 0; i < crowdCount; i++) {
      const side = i % 4;
      const tier = Math.floor((i / 4) % 4);
      const y = 2.18 + tier * 2.0;
      const tierDepthOffset = (1.5 - tier) * 3.5;
      const jitter = (Math.random() - 0.5) * 0.9;

      let px = 0;
      let pz = 0;
      if (side === 0) {
        // North Stand
        px = (Math.random() - 0.5) * 108;
        pz = -Stadium.HALF_WIDTH - 14 + tierDepthOffset + jitter;
      } else if (side === 1) {
        // South Stand
        px = (Math.random() - 0.5) * 108;
        pz = Stadium.HALF_WIDTH + 14 - tierDepthOffset + jitter;
      } else if (side === 2) {
        // West Stand
        px = -Stadium.HALF_LENGTH - 15 + tierDepthOffset + jitter;
        pz = (Math.random() - 0.5) * 68;
      } else {
        // East Stand
        px = Stadium.HALF_LENGTH + 15 - tierDepthOffset + jitter;
        pz = (Math.random() - 0.5) * 68;
      }

      const yaw = Math.atan2(-px, -pz) + (Math.random() - 0.5) * 0.25;
      this.crowdData.push({
        x: px,
        y,
        z: pz,
        yaw,
        scale: 0.9 + Math.random() * 0.22,
        phase: Math.random() * Math.PI * 2
      });

      const jHex = jerseyPalette[i % jerseyPalette.length];
      color.setHex(jHex);
      this.crowdTorsoMesh.setColorAt(i, color);
      this.crowdArmsMesh.setColorAt(i, color);

      color.setHex(skinPalette[i % skinPalette.length]);
      this.crowdHeadMesh.setColorAt(i, color);

      color.setHex(hairPalette[(i * 3) % hairPalette.length]);
      this.crowdHairMesh.setColorAt(i, color);
    }

    this.updateCrowdPose(0, false);

    [this.crowdTorsoMesh, this.crowdHeadMesh, this.crowdHairMesh, this.crowdArmsMesh].forEach((m) => {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      this.group.add(m);
    });
  }

  private buildFloodlights(): void {
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.65, roughness: 0.35 });
    const housingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.5 });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfef9c3 });

    // Volumetric Floodlight Beam Alpha Gradient Texture
    const beamCanvas = document.createElement('canvas');
    beamCanvas.width = 64;
    beamCanvas.height = 128;
    const bCtx = beamCanvas.getContext('2d')!;
    const bGrad = bCtx.createLinearGradient(0, 0, 0, 128);
    bGrad.addColorStop(0, 'rgba(254, 249, 195, 0.26)');
    bGrad.addColorStop(0.5, 'rgba(186, 230, 253, 0.08)');
    bGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
    bCtx.fillStyle = bGrad;
    bCtx.fillRect(0, 0, 64, 128);
    const beamTex = new THREE.CanvasTexture(beamCanvas);

    const beamMat = new THREE.MeshBasicMaterial({
      map: beamTex,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const corners = [
      [-62, -46],
      [62, -46],
      [62, 46],
      [-62, 46]
    ];

    corners.forEach(([x, z]) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.05, 32, 10), towerMat);
      pole.position.set(x, 16, z);

      const headGroup = new THREE.Group();
      headGroup.position.set(x, 32, z);
      const housing = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.8, 1.1), housingMat);
      const lampFace = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 3.2), lampMat);
      lampFace.position.z = 0.58;
      headGroup.add(housing, lampFace);
      headGroup.lookAt(x * 0.2, 0, z * 0.2);

      // Volumetric light cone aimed toward center pitch
      const coneGeo = new THREE.ConeGeometry(16, 46, 18, 1, true);
      coneGeo.translate(0, -23, 0);
      coneGeo.rotateX(-Math.PI / 2);
      const beamCone = new THREE.Mesh(coneGeo, beamMat);
      beamCone.position.set(x, 32, z);
      beamCone.lookAt(x * 0.18, 0, z * 0.18);

      this.group.add(pole, headGroup, beamCone);
    });
  }

  private initParticleSystem(): void {
    const count = 120;
    const pGeo = new THREE.BoxGeometry(0.16, 0.08, 0.16);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, count);
    this.particleMesh.frustumCulled = false;

    const zeroObj = new THREE.Object3D();
    zeroObj.scale.setScalar(0);
    zeroObj.updateMatrix();
    const white = new THREE.Color(0xffffff);

    for (let i = 0; i < count; i++) {
      this.particles.push({
        active: false,
        life: 0,
        maxLife: 1,
        x: 0,
        y: -10,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        gravity: 12,
        scale: 1
      });
      this.particleMesh.setMatrixAt(i, zeroObj.matrix);
      this.particleMesh.setColorAt(i, white);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    this.group.add(this.particleMesh);
  }

  private updateParticles(dt: number): void {
    if (!this.particleMesh) return;
    let dirty = false;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      dirty = true;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        this.dummyParticleObj.position.set(0, -10, 0);
        this.dummyParticleObj.scale.setScalar(0);
        this.dummyParticleObj.updateMatrix();
        this.particleMesh.setMatrixAt(i, this.dummyParticleObj.matrix);
        continue;
      }

      p.vy -= p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.y < 0.04) {
        p.y = 0.04;
        p.vy = -p.vy * 0.3;
        p.vx *= 0.7;
        p.vz *= 0.7;
      }

      const lifeRatio = Math.max(0, p.life / p.maxLife);
      this.dummyParticleObj.position.set(p.x, p.y, p.z);
      this.dummyParticleObj.rotation.set(p.life * 6, p.life * 4, 0);
      this.dummyParticleObj.scale.setScalar(p.scale * lifeRatio);
      this.dummyParticleObj.updateMatrix();
      this.particleMesh.setMatrixAt(i, this.dummyParticleObj.matrix);
    }

    if (dirty) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
    }
  }
}
