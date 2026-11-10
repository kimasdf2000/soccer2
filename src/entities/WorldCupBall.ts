import * as THREE from 'three';
import { WorldCupBallConfig, WorldCupBallId } from '../types';

export const WORLD_CUP_BALLS: Record<WorldCupBallId, WorldCupBallConfig> = {
  al_rihla: {
    id: 'al_rihla',
    name: '알 리흘라 (Al Rihla)',
    year: 2022,
    host: '카타르 월드컵 공인구',
    subtitle: '스피드쉘 20패널 · 올라운드 밸런스 & 칼날 궤적',
    curveFactor: 1.15,
    speedFactor: 1.08,
    knuckleFactor: 1.0,
    accentColor: '#00e5ff'
  },
  telstar_18: {
    id: 'telstar_18',
    name: '텔스타 18 (Telstar 18)',
    year: 2018,
    host: '러시아 월드컵 공인구',
    subtitle: '블랙&골드 메탈릭 픽셀 · 정교한 패스 & 안정적 바운스',
    curveFactor: 1.05,
    speedFactor: 1.04,
    knuckleFactor: 0.9,
    accentColor: '#ffd700'
  },
  brazuca: {
    id: 'brazuca',
    name: '브라주카 (Brazuca)',
    year: 2014,
    host: '브라질 월드컵 공인구',
    subtitle: '6패널 리본 곡선 · 극강의 프리킥 감아차기(커브) 특화',
    curveFactor: 1.38,
    speedFactor: 1.05,
    knuckleFactor: 1.05,
    accentColor: '#00e676'
  },
  jabulani: {
    id: 'jabulani',
    name: '자불라니 (Jabulani)',
    year: 2010,
    host: '남아공 월드컵 공인구',
    subtitle: '그립앤그루브 8패널 · 골키퍼가 두려워하는 무회전 & 급격한 낙차',
    curveFactor: 1.25,
    speedFactor: 1.12,
    knuckleFactor: 1.65,
    accentColor: '#ffab00'
  },
  fevernova: {
    id: 'fevernova',
    name: '피버노바 (Fevernova)',
    year: 2002,
    host: '한·일 월드컵 공인구',
    subtitle: '샴페인 골드 & 레드 트라이앵글 · 폭발적인 중거리 슛 파워',
    curveFactor: 1.18,
    speedFactor: 1.18,
    knuckleFactor: 1.15,
    accentColor: '#ff1744'
  }
};

export class WorldCupBall {
  public mesh: THREE.Mesh;
  public shadowDisc: THREE.Mesh;
  public trailLine: THREE.Line;
  public trajectoryLine: THREE.Line;
  public targetReticle: THREE.Group;

  public position: THREE.Vector3 = new THREE.Vector3(0, 0.42, 0);
  public velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public spin: THREE.Vector3 = new THREE.Vector3(0, 0, 0); // Angular velocity (rad/s)
  public windForce: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public radius: number = 0.42;

  public currentBallId: WorldCupBallId = 'al_rihla';
  public lastTouchTeam: 'HOME' | 'AWAY' = 'HOME';
  public lastKickerId: string | null = null;
  public ownerId: string | null = null;

  private trailPositions: THREE.Vector3[] = [];
  private material: THREE.MeshStandardMaterial;
  private textureCache: Map<WorldCupBallId, THREE.CanvasTexture> = new Map();

  constructor(scene: THREE.Scene, initialBallId: WorldCupBallId = 'al_rihla') {
    this.currentBallId = initialBallId;

    const geo = new THREE.SphereGeometry(this.radius, 36, 36);
    const tex = this.getOrCreateTexture(initialBallId);

    this.material = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.24,
      metalness: 0.12
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);

    // Ground contact shadow + glow ring so the ball is always crisp on tablets
    const shadowGeo = new THREE.RingGeometry(0.01, this.radius * 1.25, 24);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });
    this.shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowDisc.position.set(0, 0.02, 0);
    scene.add(this.shadowDisc);

    // Spin / Power Flight Trail
    const trailGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(28 * 3);
    trailGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const trailMat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.65
    });
    this.trailLine = new THREE.Line(trailGeo, trailMat);
    this.trailLine.frustumCulled = false;
    scene.add(this.trailLine);

    // 3D Set-Piece Trajectory Prediction Arc (for Free Kicks & Penalty Kicks)
    const trajGeo = new THREE.BufferGeometry();
    const trajPts = new Float32Array(40 * 3);
    trajGeo.setAttribute('position', new THREE.BufferAttribute(trajPts, 3));
    const trajMat = new THREE.LineDashedMaterial({
      color: 0xffea00,
      dashSize: 0.9,
      gapSize: 0.45,
      transparent: true,
      opacity: 0.92
    });
    this.trajectoryLine = new THREE.Line(trajGeo, trajMat);
    this.trajectoryLine.frustumCulled = false;
    this.trajectoryLine.visible = false;
    scene.add(this.trajectoryLine);

    // 3D Goal Target Aim Reticle (used during Penalty Kick & Free Kick aiming)
    this.targetReticle = new THREE.Group();
    const outerRing = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.72, 28),
      new THREE.MeshBasicMaterial({ color: 0xffea00, side: THREE.DoubleSide })
    );
    const innerRing = new THREE.Mesh(
      new THREE.RingGeometry(0.15, 0.25, 24),
      new THREE.MeshBasicMaterial({ color: 0xff1744, side: THREE.DoubleSide })
    );
    this.targetReticle.add(outerRing, innerRing);
    this.targetReticle.visible = false;
    scene.add(this.targetReticle);
  }

  public setBallStyle(ballId: WorldCupBallId): void {
    this.currentBallId = ballId;
    const tex = this.getOrCreateTexture(ballId);
    this.material.map = tex;
    this.material.needsUpdate = true;

    const cfg = WORLD_CUP_BALLS[ballId];
    (this.trailLine.material as THREE.LineBasicMaterial).color.set(cfg.accentColor);
  }

  public getConfig(): WorldCupBallConfig {
    return WORLD_CUP_BALLS[this.currentBallId];
  }

  private getOrCreateTexture(ballId: WorldCupBallId): THREE.CanvasTexture {
    const cached = this.textureCache.get(ballId);
    if (cached) return cached;

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    WorldCupBall.paintTexturePattern(ctx, canvas.width, canvas.height, ballId);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    this.textureCache.set(ballId, texture);
    return texture;
  }

  public static paintTexturePattern(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    ballId: WorldCupBallId
  ): void {
    // Base coat
    if (ballId === 'fevernova') {
      const baseGrad = ctx.createLinearGradient(0, 0, 0, h);
      baseGrad.addColorStop(0, '#f9f1d2');
      baseGrad.addColorStop(0.5, '#efe0a8');
      baseGrad.addColorStop(1, '#f7ecc4');
      ctx.fillStyle = baseGrad;
    } else {
      ctx.fillStyle = '#f8fafc';
    }
    ctx.fillRect(0, 0, w, h);

    // Subtle hex/speedshell panel seams across sphere UV
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.22)';
    ctx.lineWidth = 3;
    const cols = 8;
    const rows = 4;
    for (let i = 0; i <= cols; i++) {
      const x = (i / cols) * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let j = 1; j < rows; j++) {
      const y = (j / rows) * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (ballId === 'al_rihla') {
      // 2022 Qatar Al Rihla: Speedshell triangular sweeping fins in cyan, magenta, orange & gold
      const centers = [
        [w * 0.18, h * 0.3],
        [w * 0.42, h * 0.68],
        [w * 0.68, h * 0.32],
        [w * 0.88, h * 0.68],
        [w * 0.5, h * 0.25],
        [w * 0.25, h * 0.75]
      ];
      centers.forEach(([cx, cy], idx) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((idx * Math.PI) / 3);

        const grad = ctx.createLinearGradient(-90, -50, 90, 50);
        grad.addColorStop(0, '#00b0ff');
        grad.addColorStop(0.38, '#651fff');
        grad.addColorStop(0.72, '#f50057');
        grad.addColorStop(1, '#ffab00');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(-88, 0);
        ctx.quadraticCurveTo(0, -68, 88, 0);
        ctx.quadraticCurveTo(0, 68, -88, 0);
        ctx.fill();

        // Gold metallic speed accent lines
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();
      });
    } else if (ballId === 'telstar_18') {
      // 2018 Russia Telstar 18: Iconic black & metallic grey pixelated blocks + gold trim
      const blockClusters = [
        [w * 0.15, h * 0.28],
        [w * 0.38, h * 0.65],
        [w * 0.62, h * 0.28],
        [w * 0.85, h * 0.65],
        [w * 0.5, h * 0.5]
      ];
      blockClusters.forEach(([cx, cy]) => {
        for (let bx = -3; bx <= 3; bx++) {
          for (let by = -2; by <= 2; by++) {
            if (Math.abs(bx) + Math.abs(by) > 3) continue;
            const shade = (bx + by) % 2 === 0 ? '#111827' : '#374151';
            ctx.fillStyle = shade;
            ctx.fillRect(cx + bx * 26, cy + by * 24, 23, 21);
          }
        }
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 4;
        ctx.strokeRect(cx - 78, cy - 48, 156, 96);
      });
    } else if (ballId === 'brazuca') {
      // 2014 Brazil Brazuca: Swooping colorful ribbons (blue, green, orange/red, black stars)
      const colors = ['#ff3d00', '#00e676', '#00b0ff', '#1e293b'];
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = colors[i];
        ctx.lineWidth = 24;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 16) {
          const y = h * 0.5 + Math.sin((x / w) * Math.PI * 4 + i * 0.85) * (h * 0.32);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    } else if (ballId === 'jabulani') {
      // 2010 South Africa Jabulani: 4 triangle rings in gold, black, red, green
      const rings = [
        [w * 0.22, h * 0.5],
        [w * 0.5, h * 0.32],
        [w * 0.5, h * 0.68],
        [w * 0.78, h * 0.5]
      ];
      rings.forEach(([cx, cy]) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 18;
        ctx.beginPath();
        ctx.arc(0, 0, 68, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(0, 0, 50, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, 0, 82, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });
    } else if (ballId === 'fevernova') {
      // 2002 Korea/Japan Fevernova: Iconic 4-pointed trigon turbine in red, gold, and dark green
      const trigons = [
        [w * 0.2, h * 0.5],
        [w * 0.5, h * 0.35],
        [w * 0.5, h * 0.68],
        [w * 0.8, h * 0.5]
      ];
      trigons.forEach(([cx, cy]) => {
        ctx.save();
        ctx.translate(cx, cy);
        for (let arm = 0; arm < 3; arm++) {
          ctx.rotate((Math.PI * 2) / 3);
          ctx.fillStyle = '#b91c1c';
          ctx.beginPath();
          ctx.moveTo(0, -18);
          ctx.quadraticCurveTo(45, -45, 92, 0);
          ctx.quadraticCurveTo(45, 18, 0, 18);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = '#15803d';
          ctx.lineWidth = 6;
          ctx.stroke();
        }
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    // World Cup Emblem Stamp
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FIFA WORLD CUP', w * 0.5, h * 0.52);
  }

  public resetToCenter(): void {
    this.position.set(0, this.radius, 0);
    this.velocity.set(0, 0, 0);
    this.spin.set(0, 0, 0);
    this.ownerId = null;
    this.trailPositions = [];
    this.syncMesh();
  }

  public placeAt(x: number, z: number): void {
    this.position.set(x, this.radius, z);
    this.velocity.set(0, 0, 0);
    this.spin.set(0, 0, 0);
    this.ownerId = null;
    this.trailPositions = [];
    this.syncMesh();
  }

  public kick(
    direction: THREE.Vector3,
    speed: number,
    loftY: number,
    spinY: number = 0,
    kickerId: string | null = null,
    team: 'HOME' | 'AWAY' = 'HOME'
  ): void {
    const cfg = this.getConfig();
    const dir = direction.clone();
    dir.y = 0;
    if (dir.lengthSq() > 0.0001) dir.normalize();

    const effectiveSpeed = speed * cfg.speedFactor;
    this.velocity.set(dir.x * effectiveSpeed, loftY, dir.z * effectiveSpeed);
    // Spin Y creates lateral Magnus curve; top/back spin on X/Z
    this.spin.set(0, spinY * cfg.curveFactor, 0);
    this.ownerId = null;
    this.lastKickerId = kickerId;
    this.lastTouchTeam = team;
  }

  public update(dt: number): void {
    const cfg = this.getConfig();

    if (!this.ownerId) {
      // Gravity
      const gravity = 21.5;
      if (this.position.y > this.radius || this.velocity.y > 0) {
        this.velocity.y -= gravity * dt;

        // Wind acceleration when airborne
        this.velocity.x += this.windForce.x * dt;
        this.velocity.z += this.windForce.z * dt;

        // Magnus Effect (Spin Curve in air: F_m = spin x velocity)
        if (Math.abs(this.spin.y) > 0.05) {
          const magnusAccelX = -this.spin.y * this.velocity.z * 0.085;
          const magnusAccelZ = this.spin.y * this.velocity.x * 0.085;
          this.velocity.x += magnusAccelX * dt;
          this.velocity.z += magnusAccelZ * dt;
        } else if (this.velocity.length() > 16 && cfg.knuckleFactor > 1.2) {
          // Knuckleball flutter for Jabulani / Fevernova on low-spin hard shots
          const flutter = Math.sin(performance.now() * 0.018) * 3.5 * cfg.knuckleFactor;
          this.velocity.x += flutter * dt;
        }
      }

      // Integrate position
      this.position.addScaledVector(this.velocity, dt);

      // Ground collision & bounce
      if (this.position.y <= this.radius) {
        this.position.y = this.radius;
        if (this.velocity.y < -1.8) {
          this.velocity.y = -this.velocity.y * 0.56;
          this.spin.multiplyScalar(0.8);
        } else {
          this.velocity.y = 0;
        }

        // Grass rolling friction
        const groundDrag = Math.pow(0.28, dt);
        this.velocity.x *= groundDrag;
        this.velocity.z *= groundDrag;
      } else {
        // Air drag
        const airDrag = Math.pow(0.82, dt);
        this.velocity.x *= airDrag;
        this.velocity.z *= airDrag;
      }

      // Spin decay
      this.spin.multiplyScalar(Math.pow(0.55, dt));

      // Visual rolling rotation of the World Cup ball mesh
      const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
      if (horizSpeed > 0.05) {
        const rollAxis = new THREE.Vector3(this.velocity.z, 0, -this.velocity.x).normalize();
        this.mesh.rotateOnWorldAxis(rollAxis, (horizSpeed / this.radius) * dt);
      }
      if (Math.abs(this.spin.y) > 0.1) {
        this.mesh.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), this.spin.y * dt * 2.5);
      }
    }

    this.syncMesh();
    this.updateTrail();
  }

  public syncMesh(): void {
    this.mesh.position.copy(this.position);
    this.shadowDisc.position.set(this.position.x, 0.03, this.position.z);
    const heightScale = Math.max(0.45, 1 - (this.position.y - this.radius) * 0.09);
    this.shadowDisc.scale.set(heightScale, heightScale, heightScale);
  }

  private updateTrail(): void {
    const speed = this.velocity.length();
    if (speed > 13.5 && !this.ownerId) {
      this.trailPositions.unshift(this.position.clone());
      if (this.trailPositions.length > 26) {
        this.trailPositions.pop();
      }
    } else if (this.trailPositions.length > 0) {
      this.trailPositions.pop();
    }

    const posAttr = this.trailLine.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < 28; i++) {
      const p = this.trailPositions[i] || this.position;
      posAttr.setXYZ(i, p.x, p.y, p.z);
    }
    posAttr.needsUpdate = true;
    this.trailLine.visible = this.trailPositions.length > 2;
  }

  /**
   * Computes and displays the 3D dashed trajectory arc for Free Kicks & Penalty Kicks
   */
  public updateTrajectoryGuide(
    startPos: THREE.Vector3,
    direction: THREE.Vector3,
    speed: number,
    loftY: number,
    spinY: number,
    visible: boolean
  ): THREE.Vector3 {
    this.trajectoryLine.visible = visible;
    this.targetReticle.visible = visible;
    if (!visible) return startPos.clone();

    const cfg = this.getConfig();
    const simPos = startPos.clone();
    const dir = direction.clone();
    dir.y = 0;
    if (dir.lengthSq() > 0.0001) dir.normalize();

    const effSpeed = speed * cfg.speedFactor;
    const simVel = new THREE.Vector3(dir.x * effSpeed, loftY, dir.z * effSpeed);
    const effSpinY = spinY * cfg.curveFactor;
    const dt = 0.038;
    const gravity = 21.5;

    const posAttr = this.trajectoryLine.geometry.getAttribute('position') as THREE.BufferAttribute;
    let landingPoint = simPos.clone();

    for (let i = 0; i < 40; i++) {
      posAttr.setXYZ(i, simPos.x, simPos.y, simPos.z);

      simVel.y -= gravity * dt;
      simVel.x += this.windForce.x * dt;
      simVel.z += this.windForce.z * dt;
      if (Math.abs(effSpinY) > 0.05) {
        simVel.x += -effSpinY * simVel.z * 0.085 * dt;
        simVel.z += effSpinY * simVel.x * 0.085 * dt;
      }
      simPos.addScaledVector(simVel, dt);
      if (simPos.y < this.radius) {
        simPos.y = this.radius;
        simVel.y = -simVel.y * 0.45;
      }
      if (Math.abs(simPos.x) <= 52.5) {
        landingPoint.copy(simPos);
      }
    }

    posAttr.needsUpdate = true;
    this.trajectoryLine.computeLineDistances();

    this.targetReticle.position.set(landingPoint.x, Math.max(0.8, landingPoint.y), landingPoint.z);
    this.targetReticle.lookAt(startPos.x, this.targetReticle.position.y, startPos.z);

    return landingPoint;
  }
}
