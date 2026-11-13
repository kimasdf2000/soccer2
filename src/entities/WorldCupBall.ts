import * as THREE from 'three';
import { WorldCupBallConfig, WorldCupBallId } from '../types';

export const WORLD_CUP_BALLS: Record<WorldCupBallId, WorldCupBallConfig> = {
  trionda_26: {
    id: 'trionda_26',
    name: '트리온다 (Trionda)',
    year: 2026,
    host: '북중미(미·캐·멕) 월드컵 공인구',
    subtitle: '4패널 트라이웨이브(La Ola) · 성조기별·단풍잎·독수리 & 초정밀 궤적',
    curveFactor: 1.28,
    speedFactor: 1.14,
    knuckleFactor: 1.08,
    accentColor: '#38bdf8'
  },
  al_rihla: {
    id: 'al_rihla',
    name: '알 리흘라 (Al Rihla)',
    year: 2022,
    host: '카타르 월드컵 공인구',
    subtitle: '스피드쉘 20패널 · 다우선 부메랑 그라데이션 & 칼날 궤적',
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
    subtitle: '6패널 메탈릭 픽셀 모자이크 · 정교한 패스 & 안정적 바운스',
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
    subtitle: '6패널 프로펠러 소원팔찌 리본 · 극강의 프리킥 감아차기 특화',
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
    subtitle: '그립앤그루브 8패널 & 11색 트라이앵글 링 · 공포의 무회전 낙차',
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
    subtitle: '32패널 샴페인 골드 & 레드 트라이곤 수리검 · 폭발적 중거리 파워',
    curveFactor: 1.18,
    speedFactor: 1.18,
    knuckleFactor: 1.15,
    accentColor: '#ff1744'
  }
};

interface SphericalFrame {
  nx: number;
  ny: number;
  nz: number;
  ux: number;
  uy: number;
  uz: number;
  vx: number;
  vy: number;
  vz: number;
  isPentagon?: boolean;
}

interface BallSurfaceSample {
  r: number;
  g: number;
  b: number;
  bump: number; // -1..1 height perturbation
}

const SAMPLE_OUT: BallSurfaceSample = { r: 248, g: 250, b: 252, bump: 0 };

function rotateVec3(
  x: number,
  y: number,
  z: number,
  rx: number,
  ry: number,
  rz: number
): [number, number, number] {
  // Rotate around X
  const cx = Math.cos(rx);
  const sx = Math.sin(rx);
  const y1 = y * cx - z * sx;
  const z1 = y * sx + z * cx;
  // Rotate around Y
  const cy = Math.cos(ry);
  const sy = Math.sin(ry);
  const x2 = x * cy + z1 * sy;
  const z2 = -x * sy + z1 * cy;
  // Rotate around Z
  const cz = Math.cos(rz);
  const sz = Math.sin(rz);
  const x3 = x2 * cz - y1 * sz;
  const y3 = x2 * sz + y1 * cz;
  const len = Math.hypot(x3, y3, z2) || 1;
  return [x3 / len, y3 / len, z2 / len];
}

function buildTangentFrame(
  nx: number,
  ny: number,
  nz: number,
  refX: number,
  refY: number,
  refZ: number,
  isPentagon: boolean = false
): SphericalFrame {
  const dot = refX * nx + refY * ny + refZ * nz;
  let ux = refX - dot * nx;
  let uy = refY - dot * ny;
  let uz = refZ - dot * nz;
  let uLen = Math.hypot(ux, uy, uz);
  if (uLen < 1e-5) {
    ux = Math.abs(ny) < 0.9 ? -nz : 1;
    uy = 0;
    uz = Math.abs(ny) < 0.9 ? nx : 0;
    uLen = Math.hypot(ux, uy, uz);
  }
  ux /= uLen;
  uy /= uLen;
  uz /= uLen;
  const vx = ny * uz - nz * uy;
  const vy = nz * ux - nx * uz;
  const vz = nx * uy - ny * ux;
  return { nx, ny, nz, ux, uy, uz, vx, vy, vz, isPentagon };
}

// 1. Precompute 4 Regular Tetrahedral Frames (used by Trionda 2026, Jabulani 2010, Fevernova 2002)
const TETRA_FRAMES: SphericalFrame[] = (() => {
  const raw: [number, number, number][] = [
    [0, 0, 1],
    [(2 * Math.SQRT2) / 3, 0, -1 / 3],
    [-Math.SQRT2 / 3, Math.sqrt(6) / 3, -1 / 3],
    [-Math.SQRT2 / 3, -Math.sqrt(6) / 3, -1 / 3]
  ];
  const rot = raw.map(([x, y, z]) => rotateVec3(x, y, z, -0.22, 0.26, 0.12));
  return rot.map((v, idx) => {
    const nb = rot[(idx + 1) % 4];
    return buildTangentFrame(v[0], v[1], v[2], nb[0], nb[1], nb[2]);
  });
})();

// 2. Precompute 32-Panel Truncated Icosahedron Frames (12 Pentagons + 20 Hexagons)
const TRUNC_ICOSA_FRAMES: SphericalFrame[] = (() => {
  const phi = (1 + Math.sqrt(5)) / 2;
  const invPhi = 1 / phi;
  const rawPent: [number, number, number][] = [
    [0, 1, phi],
    [0, 1, -phi],
    [0, -1, phi],
    [0, -1, -phi],
    [1, phi, 0],
    [1, -phi, 0],
    [-1, phi, 0],
    [-1, -phi, 0],
    [phi, 0, 1],
    [phi, 0, -1],
    [-phi, 0, 1],
    [-phi, 0, -1]
  ];
  const rawHex: [number, number, number][] = [
    [1, 1, 1],
    [1, 1, -1],
    [1, -1, 1],
    [1, -1, -1],
    [-1, 1, 1],
    [-1, 1, -1],
    [-1, -1, 1],
    [-1, -1, -1],
    [0, invPhi, phi],
    [0, invPhi, -phi],
    [0, -invPhi, phi],
    [0, -invPhi, -phi],
    [invPhi, phi, 0],
    [invPhi, -phi, 0],
    [-invPhi, phi, 0],
    [-invPhi, -phi, 0],
    [phi, 0, invPhi],
    [phi, 0, -invPhi],
    [-phi, 0, invPhi],
    [-phi, 0, -invPhi]
  ];

  const allPts: { v: [number, number, number]; isPent: boolean }[] = [
    ...rawPent.map((p) => ({ v: rotateVec3(p[0], p[1], p[2], 0.18, -0.24, 0.08), isPent: true })),
    ...rawHex.map((p) => ({ v: rotateVec3(p[0], p[1], p[2], 0.18, -0.24, 0.08), isPent: false }))
  ];

  return allPts.map((item, idx) => {
    // Orient local U toward nearest neighbor for consistent panel alignment
    let bestDot = -2;
    let bestNb = allPts[(idx + 1) % allPts.length].v;
    for (let j = 0; j < allPts.length; j++) {
      if (j === idx) continue;
      const nb = allPts[j].v;
      const d = item.v[0] * nb[0] + item.v[1] * nb[1] + item.v[2] * nb[2];
      if (d > bestDot) {
        bestDot = d;
        bestNb = nb;
      }
    }
    return buildTangentFrame(
      item.v[0],
      item.v[1],
      item.v[2],
      bestNb[0],
      bestNb[1],
      bestNb[2],
      item.isPent
    );
  });
})();

// 3. Precompute 6 Cube / Propeller Frames (for Brazuca & Telstar 18) + 8 Octahedral Frames (for Jabulani)
const CUBE_6_FRAMES: SphericalFrame[] = (() => {
  const raw: [number, number, number][] = [
    [0, 0, 1],
    [0, 0, -1],
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0]
  ];
  const rot = raw.map(([x, y, z]) => rotateVec3(x, y, z, 0.25, -0.32, 0.15));
  return rot.map((v, idx) => {
    const nb = rot[idx < 2 ? 2 : 0];
    return buildTangentFrame(v[0], v[1], v[2], nb[0], nb[1], nb[2]);
  });
})();

const OCTA_8_FRAMES: SphericalFrame[] = (() => {
  const raw: [number, number, number][] = [
    [1, 1, 1],
    [1, 1, -1],
    [1, -1, 1],
    [1, -1, -1],
    [-1, 1, 1],
    [-1, 1, -1],
    [-1, -1, 1],
    [-1, -1, -1]
  ];
  const rot = raw.map(([x, y, z]) => rotateVec3(x, y, z, -0.22, 0.26, 0.12));
  return rot.map((v, idx) => {
    const nb = rot[(idx + 1) % 8];
    return buildTangentFrame(v[0], v[1], v[2], nb[0], nb[1], nb[2]);
  });
})();

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function mixRGB(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
  t: number
): void {
  const k = clamp01(t);
  SAMPLE_OUT.r = r1 + (r2 - r1) * k;
  SAMPLE_OUT.g = g1 + (g2 - g1) * k;
  SAMPLE_OUT.b = b1 + (b2 - b1) * k;
}

function wrapAngle(a: number): number {
  let r = (a + Math.PI) % (Math.PI * 2);
  if (r < 0) r += Math.PI * 2;
  return r - Math.PI;
}

function wrapMod(val: number, period: number): number {
  let r = val % period;
  if (r < 0) r += period;
  return r;
}

/**
 * Evaluates a 5-pointed star signed mask in local 2D coordinates (dx, dy)
 */
function evalStarMask(dx: number, dy: number, size: number): number {
  const rho = Math.hypot(dx, dy);
  if (rho > size * 1.15) return -1;
  const ang = Math.atan2(dy, dx) + Math.PI * 0.5;
  const sector = (Math.PI * 2) / 5;
  const localA = Math.abs(wrapMod(ang + sector * 0.5, sector) - sector * 0.5);
  const starEdge = (size * 0.42) / (Math.cos(localA * 1.48) + 0.62 * Math.sin(localA * 1.48));
  return starEdge - rho;
}

/**
 * Evaluates a stylized Canadian Maple Leaf mask in local 2D coordinates (dx, dy)
 */
function evalMapleLeafMask(dx: number, dy: number, size: number): number {
  const rho = Math.hypot(dx, dy);
  if (rho > size * 1.2) return -1;
  // Stem at bottom
  if (dy < -size * 0.18 && dy > -size * 0.92 && Math.abs(dx) < size * 0.085) {
    return size * 0.085 - Math.abs(dx);
  }
  const ang = Math.atan2(dx, dy); // 0 = top peak
  const absA = Math.abs(ang);
  if (absA > 2.25) return -1;
  // 3 main lobes (0, +1.05 rad, -1.05 rad) + pointed sub-peaks
  const mainLobes =
    0.58 * Math.exp(-absA * absA * 5.2) +
    0.52 * Math.exp(-Math.pow(absA - 1.05, 2) * 5.8) +
    0.26 * Math.exp(-Math.pow(absA - 1.85, 2) * 8.5);
  const serration = 1 + 0.14 * Math.cos(absA * 12);
  const leafEdge = size * mainLobes * serration;
  return leafEdge - rho;
}

/**
 * Evaluates a stylized Mexican Eagle (spread wings + crest) mask in local 2D coordinates (dx, dy)
 */
function evalEagleMask(dx: number, dy: number, size: number): number {
  const ax = Math.abs(dx) / size;
  const ny = dy / size;
  if (ax > 1.05 || Math.abs(ny) > 0.95) return -1;
  // Swept V-wings
  const wingTop = 0.55 * ax + 0.18 * Math.sin(ax * 4.5);
  const wingBot = -0.25 + 0.48 * ax + 0.06 * Math.cos(ax * 18);
  const inWings = ax > 0.12 && ax < 0.96 && ny < wingTop && ny > wingBot;
  // Central head & tail fan
  const inBody = ax <= 0.22 && ny > -0.58 && ny < 0.42 - ax * 0.8;
  if (inWings || inBody) {
    return 0.02 * size;
  }
  return -1;
}

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

  public currentBallId: WorldCupBallId = 'trionda_26';
  public lastTouchTeam: 'HOME' | 'AWAY' = 'HOME';
  public lastKickerId: string | null = null;
  public ownerId: string | null = null;
  public isShot: boolean = false;
  public isKnuckleShot: boolean = false;

  private trailPositions: THREE.Vector3[] = [];
  private material: THREE.MeshStandardMaterial;
  private textureCache: Map<WorldCupBallId, THREE.CanvasTexture> = new Map();
  private bumpCache: Map<WorldCupBallId, THREE.CanvasTexture> = new Map();
  private static previewCache: Map<string, ImageData> = new Map();

  constructor(scene: THREE.Scene, initialBallId: WorldCupBallId = 'trionda_26') {
    this.currentBallId = initialBallId;

    const geo = new THREE.SphereGeometry(this.radius, 48, 48);
    const { colorTex, bumpTex } = this.getOrCreateTextures(initialBallId);

    this.material = new THREE.MeshStandardMaterial({
      map: colorTex,
      bumpMap: bumpTex,
      bumpScale: 0.016,
      roughness: initialBallId === 'fevernova' ? 0.22 : 0.25,
      metalness: initialBallId === 'fevernova' ? 0.22 : 0.12
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
      color: WORLD_CUP_BALLS[initialBallId].accentColor,
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
    const { colorTex, bumpTex } = this.getOrCreateTextures(ballId);
    this.material.map = colorTex;
    this.material.bumpMap = bumpTex;
    this.material.roughness = ballId === 'fevernova' ? 0.22 : 0.25;
    this.material.metalness = ballId === 'fevernova' ? 0.22 : ballId === 'telstar_18' ? 0.16 : 0.12;
    this.material.needsUpdate = true;

    const cfg = WORLD_CUP_BALLS[ballId];
    (this.trailLine.material as THREE.LineBasicMaterial).color.set(cfg.accentColor);
  }

  public getConfig(): WorldCupBallConfig {
    return WORLD_CUP_BALLS[this.currentBallId];
  }

  private getOrCreateTextures(ballId: WorldCupBallId): {
    colorTex: THREE.CanvasTexture;
    bumpTex: THREE.CanvasTexture;
  } {
    const cachedColor = this.textureCache.get(ballId);
    const cachedBump = this.bumpCache.get(ballId);
    if (cachedColor && cachedBump) {
      return { colorTex: cachedColor, bumpTex: cachedBump };
    }

    const w = 1024;
    const h = 512;

    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = w;
    colorCanvas.height = h;
    const colorCtx = colorCanvas.getContext('2d')!;

    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = w;
    bumpCanvas.height = h;
    const bumpCtx = bumpCanvas.getContext('2d')!;

    WorldCupBall.renderEquirectangularMaps(colorCtx, bumpCtx, w, h, ballId);

    const colorTex = new THREE.CanvasTexture(colorCanvas);
    colorTex.anisotropy = 4;
    colorTex.needsUpdate = true;

    const bumpTex = new THREE.CanvasTexture(bumpCanvas);
    bumpTex.anisotropy = 4;
    bumpTex.needsUpdate = true;

    this.textureCache.set(ballId, colorTex);
    this.bumpCache.set(ballId, bumpTex);
    return { colorTex, bumpTex };
  }

  /**
   *Evaluates the exact 3D spherical surface color & bump height at unit sphere normal (nx, ny, nz)
   */
  private static sampleSpherePoint(
    nx: number,
    ny: number,
    nz: number,
    ballId: WorldCupBallId
  ): void {
    if (ballId === 'trionda_26') {
      WorldCupBall.sampleTrionda26(nx, ny, nz);
    } else if (ballId === 'al_rihla') {
      WorldCupBall.sampleAlRihla22(nx, ny, nz);
    } else if (ballId === 'telstar_18') {
      WorldCupBall.sampleTelstar18(nx, ny, nz);
    } else if (ballId === 'brazuca') {
      WorldCupBall.sampleBrazuca14(nx, ny, nz);
    } else if (ballId === 'jabulani') {
      WorldCupBall.sampleJabulani10(nx, ny, nz);
    } else {
      WorldCupBall.sampleFevernova02(nx, ny, nz);
    }
  }

  /**
   * 2026 North America (USA, Canada, Mexico) - Adidas Trionda
   * - 4-panel fluid wave ("La Ola") geometry with central equilateral triangle union motif
   * - Vibrant tricolor wave arms: Solar Blue (USA Star), Hi-Res Red (Canada Maple Leaf), Flash Green (Mexico Eagle)
   * - Gold metallic trophy outlines & debossed grip ripples
   */
  private static sampleTrionda26(nx: number, ny: number, nz: number): void {
    // Crisp pearlescent white base + micro-wave debossing
    let r = 248;
    let g = 250;
    let b = 253;
    let bump = 0.08 * Math.sin((nx * 18 + ny * 14 - nz * 16) * 2.2);

    // Find nearest and second-nearest swirled tetrahedral centers for 4-panel wave seam
    let bestSwirl1 = -2;
    let bestSwirl2 = -2;

    for (let k = 0; k < 4; k++) {
      const f = TETRA_FRAMES[k];
      const dot = clamp01((nx * f.nx + ny * f.ny + nz * f.nz + 1) * 0.5) * 2 - 1;
      const rad = Math.acos(Math.max(-1, Math.min(1, dot)));
      const u = nx * f.ux + ny * f.uy + nz * f.uz;
      const v = nx * f.vx + ny * f.vy + nz * f.vz;
      const ang = Math.atan2(v, u);

      // Swirl score for 4-panel "La Ola" S-wave seam
      const swirlScore = dot + 0.14 * Math.sin(rad * 3.2) * Math.cos(3 * ang + rad * 2.6);
      if (swirlScore > bestSwirl1) {
        bestSwirl2 = bestSwirl1;
        bestSwirl1 = swirlScore;
      } else if (swirlScore > bestSwirl2) {
        bestSwirl2 = swirlScore;
      }
    }

    // 4-panel thermal-bonded wave seam groove
    const seamDist = bestSwirl1 - bestSwirl2;
    if (seamDist < 0.022) {
      const s = 1 - seamDist / 0.022;
      r -= s * 42;
      g -= s * 38;
      b -= s * 30;
      bump -= s * 0.85;
    }

    // Evaluate each of the 4 tetrahedral "Tri-Onda" (3-Wave) triads
    for (let k = 0; k < 4; k++) {
      const f = TETRA_FRAMES[k];
      const dot = Math.max(-1, Math.min(1, nx * f.nx + ny * f.ny + nz * f.nz));
      const rad = Math.acos(dot);
      if (rad > 0.92) continue;

      const u = nx * f.ux + ny * f.uy + nz * f.uz;
      const v = nx * f.vx + ny * f.vy + nz * f.vz;
      const ang = Math.atan2(v, u);

      // 1. Central Equilateral Triangle Union Motif (3 host nations uniting)
      const triSector = (Math.PI * 2) / 3;
      const triAng = wrapMod(ang + Math.PI / 3, triSector) - Math.PI / 3;
      const triDist = rad * Math.cos(triAng);

      if (triDist < 0.115 && rad < 0.21) {
        if (triDist > 0.094) {
          // Outer Metallic Gold Trophy Triangle Border
          r = 234;
          g = 179;
          b = 8;
          bump = 0.28;
        } else if (triDist > 0.078) {
          // Deep Navy Contrast Inner Triangle Border
          r = 15;
          g = 23;
          b = 42;
          bump = 0.18;
        } else {
          // White Unity Triangle Center with subtle gold mini-triangle emblem
          r = 250;
          g = 252;
          b = 255;
          if (triDist > 0.028 && triDist < 0.042) {
            r = 212;
            g = 175;
            b = 55;
          }
        }
      }

      // 2. Three Sweeping "La Ola" Host Wave Ribbons (0: USA Blue, 1: Canada Red, 2: Mexico Green)
      if (rad >= 0.082 && rad <= 0.84) {
        for (let arm = 0; arm < 3; arm++) {
          const baseAng = arm * ((Math.PI * 2) / 3);
          const normR = (rad - 0.082) / 0.758; // 0..1 along wave length
          // S-wave spine curving like "la ola" stadium wave
          const spineAng =
            baseAng + 0.64 * (rad - 0.09) + 0.13 * Math.sin(normR * Math.PI * 2.1);
          const dAng = wrapAngle(ang - spineAng);
          const perpDist = rad * dAng;
          const halfWidth = 0.215 * Math.pow(Math.sin(clamp01(normR) * Math.PI), 0.78);

          if (Math.abs(perpDist) < halfWidth && halfWidth > 0.004) {
            const t = perpDist / halfWidth; // -1..1 across wave width
            const absT = Math.abs(t);

            // Outer Gold Trophy Trim
            if (absT > 0.87) {
              r = 234;
              g = 179;
              b = 8;
              bump = 0.32;
            } else if (absT > 0.80) {
              // Crisp dark navy inner outline
              r = 12;
              g = 20;
              b = 38;
              bump = 0.2;
            } else {
              // Internal multi-wave contour stripes ("Onda" ripples)
              const waveRipple = 0.5 + 0.5 * Math.sin(t * 12.5 - normR * 9.0);
              const brightBand = absT > 0.32 && absT < 0.48 ? 1 : 0;

              // Local coordinates around the middle of the wave arm for Host Iconography
              const iconDx = rad - 0.39;
              const iconDy = perpDist * 0.95;
              const iconRipple = Math.sin(Math.hypot(iconDx, iconDy) * 75);

              if (arm === 0) {
                // USA Wave: Solar Blue + Deep Navy + Sky Cyan + 5-Pointed Star
                r = Math.round(6 + 18 * waveRipple + brightBand * 45);
                g = Math.round(78 + 75 * waveRipple + brightBand * 95);
                b = Math.round(195 + 52 * waveRipple + brightBand * 25);
                bump = 0.15 + 0.12 * iconRipple;

                const starMask = evalStarMask(iconDx, iconDy, 0.095);
                if (starMask > -0.012) {
                  if (starMask > 0.004) {
                    r = 255;
                    g = 255;
                    b = 255;
                    bump = 0.38;
                  } else {
                    r = 250;
                    g = 204;
                    b = 21;
                    bump = 0.3;
                  }
                }
              } else if (arm === 1) {
                // Canada Wave: Hi-Res Red + Crimson + Coral + Maple Leaf
                r = Math.round(185 + 62 * waveRipple + brightBand * 20);
                g = Math.round(8 + 26 * waveRipple + brightBand * 65);
                b = Math.round(32 + 35 * waveRipple + brightBand * 60);
                bump = 0.15 + 0.12 * iconRipple;

                const leafMask = evalMapleLeafMask(iconDx, iconDy, 0.092);
                if (leafMask > -0.011) {
                  if (leafMask > 0.003) {
                    r = 255;
                    g = 255;
                    b = 255;
                    bump = 0.38;
                  } else {
                    r = 250;
                    g = 204;
                    b = 21;
                    bump = 0.3;
                  }
                }
              } else {
                // Mexico Wave: Flash Lime/Green + Forest Green + Eagle Crest
                r = Math.round(4 + 42 * waveRipple + brightBand * 85);
                g = Math.round(135 + 88 * waveRipple + brightBand * 35);
                b = Math.round(48 + 38 * waveRipple + brightBand * 35);
                bump = 0.15 + 0.12 * iconRipple;

                const eagleMask = evalEagleMask(iconDx, iconDy, 0.095);
                if (eagleMask > 0) {
                  r = 255;
                  g = 250;
                  b = 225;
                  bump = 0.38;
                }
              }
            }
          }
        }
      }
    }

    SAMPLE_OUT.r = clamp01(r / 255) * 255;
    SAMPLE_OUT.g = clamp01(g / 255) * 255;
    SAMPLE_OUT.b = clamp01(b / 255) * 255;
    SAMPLE_OUT.bump = Math.max(-1, Math.min(1, bump));
  }

  /**
   * 2022 Qatar - Adidas Al Rihla
   * - Pearlescent white 20-panel Speedshell skin with diamond debossed channels
   * - Swept dhow-sail boomerang blades with Qatari maroon/magenta/red-orange/gold & cyan/royal-blue/violet gradients + speed lines
   */
  private static sampleAlRihla22(nx: number, ny: number, nz: number): void {
    // Pearlescent white base with subtle warm-cool iridescence
    let r = 247 + 4 * ny;
    let g = 249 + 2 * nx;
    let b = 253 - 2 * ny;
    let bump = 0;

    // 20-panel Speedshell debossed seams from truncated icosahedron Voronoi
    let d1 = -2;
    let d2 = -2;
    for (let i = 0; i < TRUNC_ICOSA_FRAMES.length; i++) {
      const f = TRUNC_ICOSA_FRAMES[i];
      const dot = nx * f.nx + ny * f.ny + nz * f.nz;
      if (dot > d1) {
        d2 = d1;
        d1 = dot;
      } else if (dot > d2) {
        d2 = dot;
      }
    }
    const seam = d1 - d2;
    if (seam < 0.016) {
      const s = 1 - seam / 0.016;
      r -= s * 28;
      g -= s * 24;
      b -= s * 18;
      bump -= s * 0.78;
    } else if (seam > 0.032 && seam < 0.042) {
      // Speedshell secondary debossed airflow groove
      bump -= 0.25;
      r -= 6;
      g -= 5;
      b -= 4;
    }

    // 12 Swept Dhow-Sail Speedshell Boomerang Petals (placed at the 12 pentagon frames)
    for (let i = 0; i < 12; i++) {
      const f = TRUNC_ICOSA_FRAMES[i];
      const dot = nx * f.nx + ny * f.ny + nz * f.nz;
      if (dot < 0.72) continue;

      const lx = nx * f.ux + ny * f.uy + nz * f.uz;
      const ly = nx * f.vx + ny * f.vy + nz * f.vz;

      // Elongated swept spindle / dhow sail coordinates
      const u = lx / 0.36; // -1..1 along blade length
      if (Math.abs(u) >= 1) continue;

      const sweepCurve = 0.042 * Math.sin(u * Math.PI);
      const wy = ly - sweepCurve;
      const absY = Math.abs(wy);

      const outerEdge = 0.165 * Math.pow(1 - u * u, 1.12);
      const innerSplit = 0.016 * (1 - u * u * 0.7);

      if (absY >= innerSplit && absY <= outerEdge && outerEdge > innerSplit) {
        const tu = (u + 1) * 0.5; // 0..1 along blade
        const ty = (absY - innerSplit) / (outerEdge - innerSplit); // 0..1 across wing

        // Outer metallic gold & navy speed border
        if (ty > 0.90) {
          r = 250;
          g = 204;
          b = 21;
          bump = 0.25;
        } else {
          // Fine longitudinal speed stripes + Qatari geometric lattice
          const speedStripe = 0.5 + 0.5 * Math.sin(ty * 34 + u * 8);
          const lattice = Math.sin((u * 18 + wy * 45) * Math.PI) * Math.sin((u * 18 - wy * 45) * Math.PI);

          if (wy > 0) {
            // Upper Wing: Qatari Maroon -> Neon Magenta -> Fiery Red-Orange -> Solar Gold
            if (tu < 0.35) {
              const k = tu / 0.35;
              mixRGB(130, 18, 56, 236, 27, 96, k);
            } else if (tu < 0.72) {
              const k = (tu - 0.35) / 0.37;
              mixRGB(236, 27, 96, 255, 61, 0, k);
            } else {
              const k = (tu - 0.72) / 0.28;
              mixRGB(255, 61, 0, 255, 196, 0, k);
            }
          } else {
            // Lower Wing: Deep Violet -> Royal Blue -> Electric Cyan -> Gold Tip
            if (tu < 0.35) {
              const k = tu / 0.35;
              mixRGB(74, 20, 140, 29, 78, 216, k);
            } else if (tu < 0.75) {
              const k = (tu - 0.35) / 0.40;
              mixRGB(29, 78, 216, 0, 229, 255, k);
            } else {
              const k = (tu - 0.75) / 0.25;
              mixRGB(0, 229, 255, 255, 214, 0, k);
            }
          }

          // Apply speed-line brightness modulation
          const boost = (speedStripe - 0.5) * 32 + (lattice > 0.45 ? 28 : 0);
          r = SAMPLE_OUT.r + boost;
          g = SAMPLE_OUT.g + boost;
          b = SAMPLE_OUT.b + boost;
          bump = 0.16 + 0.08 * speedStripe;
        }
      }
    }

    SAMPLE_OUT.r = clamp01(r / 255) * 255;
    SAMPLE_OUT.g = clamp01(g / 255) * 255;
    SAMPLE_OUT.b = clamp01(b / 255) * 255;
    SAMPLE_OUT.bump = Math.max(-1, Math.min(1, bump));
  }

  /**
   * 2018 Russia - Adidas Telstar 18
   * - Crisp white 6-panel stepped seam surface with 3D micro-pixel grip texture
   * - 12 digital pixelated metallic gradient arms (jet black -> charcoal -> gunmetal -> silver halftone pixels) + gold accents
   */
  private static sampleTelstar18(nx: number, ny: number, nz: number): void {
    // Crisp white base + fine 3D micro-pixel grip texture
    const microGrid =
      Math.sin(nx * 150) * Math.sin(ny * 150) * Math.sin(nz * 150) > 0 ? 0.08 : -0.08;
    let r = 248;
    let g = 250;
    let b = 252;
    let bump = microGrid;

    // 6-panel stepped interlocking thermal-bonded seam
    let c1 = -2;
    let c2 = -2;
    for (let k = 0; k < 6; k++) {
      const f = CUBE_6_FRAMES[k];
      const dot = nx * f.nx + ny * f.ny + nz * f.nz;
      const u = nx * f.ux + ny * f.uy + nz * f.uz;
      const v = nx * f.vx + ny * f.vy + nz * f.vz;
      // Stepped rectangular modulation
      const stepMod = 0.08 * Math.sign(Math.sin(u * 9) * Math.sin(v * 9));
      const score = dot + stepMod;
      if (score > c1) {
        c2 = c1;
        c1 = score;
      } else if (score > c2) {
        c2 = score;
      }
    }
    if (c1 - c2 < 0.015) {
      const s = 1 - (c1 - c2) / 0.015;
      r -= s * 36;
      g -= s * 34;
      b -= s * 30;
      bump -= s * 0.82;
    }

    // 12 Digital Pixelated Metallic Gradient Clusters (at the 12 classic Telstar pentagon zones)
    for (let i = 0; i < 12; i++) {
      const f = TRUNC_ICOSA_FRAMES[i];
      const dot = nx * f.nx + ny * f.ny + nz * f.nz;
      if (dot < 0.74) continue;

      const lx = nx * f.ux + ny * f.uy + nz * f.uz;
      const ly = nx * f.vx + ny * f.vy + nz * f.vz;

      // Quantize local tangent plane into rectangular digital pixel cells
      const cellW = 0.038;
      const cellH = 0.028;
      const qx = Math.floor(lx / cellW);
      const qy = Math.floor(ly / cellH);
      const cellCenterX = (qx + 0.5) * cellW;
      const cellCenterY = (qy + 0.5) * cellH;

      // Distance to a 3-armed stepped Telstar chevron skeleton
      const rad = Math.hypot(cellCenterX, cellCenterY);
      const ang = Math.atan2(cellCenterY, cellCenterX);
      const armAng = wrapMod(ang + Math.PI / 3, (Math.PI * 2) / 3) - Math.PI / 3;
      const armPerp = rad * Math.abs(Math.sin(armAng));
      const armAlong = rad * Math.cos(armAng);

      if (armAlong < 0.34 && armPerp < 0.145) {
        // Deterministic pseudo-random hash per pixel cell
        const hash = Math.abs(Math.sin(qx * 12.9898 + qy * 78.233 + i * 5.17) * 43758.5453) % 1;
        const normalizedDist = armPerp / 0.135 + Math.max(0, armAlong - 0.16) * 2.1;

        if (normalizedDist < 1.05 - hash * 0.38) {
          // Thin gap between pixel blocks for authentic digital mosaic look
          const inCellX = Math.abs(lx / cellW - (qx + 0.5));
          const inCellY = Math.abs(ly / cellH - (qy + 0.5));
          const isMortar = inCellX > 0.45 || inCellY > 0.45;

          if (!isMortar) {
            // Diagonal metallic sheen inside pixel
            const sheen = 0.5 + 0.5 * Math.sin((lx + ly) * 55);
            if (normalizedDist < 0.38) {
              // Core: Jet Black & Deep Anthracite
              const v = Math.round(14 + sheen * 18 + hash * 12);
              r = v;
              g = v + 2;
              b = v + 6;
              bump = 0.24;
            } else if (normalizedDist < 0.68) {
              // Mid: Gunmetal & Metallic Charcoal with occasional gold accent pixel
              if (hash > 0.91) {
                r = 212;
                g = 175;
                b = 55;
              } else {
                const v = Math.round(48 + sheen * 28 + hash * 32);
                r = v;
                g = v + 4;
                b = v + 10;
              }
              bump = 0.22;
            } else {
              // Outer Halftone Dither: Metallic Silver & Cool Grey pixels
              const v = Math.round(115 + sheen * 35 + hash * 45);
              r = v;
              g = v + 4;
              b = v + 9;
              bump = 0.18;
            }
          }
        }
      }
    }

    SAMPLE_OUT.r = clamp01(r / 255) * 255;
    SAMPLE_OUT.g = clamp01(g / 255) * 255;
    SAMPLE_OUT.b = clamp01(b / 255) * 255;
    SAMPLE_OUT.bump = Math.max(-1, Math.min(1, bump));
  }

  /**
   * 2014 Brazil - Adidas Brazuca
   * - White pebbled-dimple surface with 6 interlocking 4-armed propeller panels
   * - Swirling Brazilian wish-bracelet (Fita do Senhor do Bonfim) ribbons in Orange-Red, Bahian Green, Carioca Sky Blue & Navy/Black with Golden Stars
   */
  private static sampleBrazuca14(nx: number, ny: number, nz: number): void {
    // White base with signature Brazuca micro-pimple grip dimples
    const dimple = Math.sin(nx * 120) * Math.cos(ny * 120) * Math.sin(nz * 120);
    let r = 248;
    let g = 250;
    let b = 252;
    let bump = dimple * 0.14;

    // Evaluate the 6 interlocking 4-armed propeller panels
    let s1 = -2;
    let s2 = -2;
    let id1 = 0;
    let ang1 = 0;

    for (let k = 0; k < 6; k++) {
      const f = CUBE_6_FRAMES[k];
      const dot = Math.max(-1, Math.min(1, nx * f.nx + ny * f.ny + nz * f.nz));
      const rad = Math.acos(dot);
      const u = nx * f.ux + ny * f.uy + nz * f.uz;
      const v = nx * f.vx + ny * f.vy + nz * f.vz;
      const ang = Math.atan2(v, u);

      // 4-armed curved propeller modulation
      const propMod = 0.21 * Math.sin(rad) * Math.sin(rad) * Math.cos(4 * (ang + 0.72 * rad));
      const score = dot + propMod;
      if (score > s1) {
        s2 = s1;
        s1 = score;
        id1 = k;
        ang1 = ang;
      } else if (score > s2) {
        s2 = score;
      }
    }

    const propEdge = s1 - s2;

    // 1. Deep thermally bonded 6-panel propeller seam right at the boundary
    if (propEdge < 0.011) {
      const k = 1 - propEdge / 0.011;
      r = 15;
      g = 23;
      b = 42;
      bump = -0.88 * k;
    } else if (propEdge >= 0.011 && propEdge < 0.205) {
      // 2. Swirling Brazilian Wish-Bracelet Multi-Ribbon Band following the propeller arms
      const t = (propEdge - 0.011) / 0.194; // 0..1 across the ribbon band

      if (t < 0.14 || t > 0.86) {
        // Outer & Inner Deep Midnight Navy/Black Ribbon Border
        r = 15;
        g = 23;
        b = 42;
        bump = 0.22;

        // Sparkling Silver & Gold Southern Cross micro-stars inside the dark band
        const starPhase = Math.sin(ang1 * 12 + id1 * 2.1);
        if (starPhase > 0.92 && t > 0.03 && t < 0.11) {
          r = 250;
          g = 204;
          b = 21;
          bump = 0.35;
        }
      } else {
        // 3 Parallel Colorful Wish-Bracelet Tracks separated by dark navy pinstripes
        const trackPos = (t - 0.14) / 0.72; // 0..1
        const isSeparator =
          (trackPos > 0.31 && trackPos < 0.36) || (trackPos > 0.64 && trackPos < 0.69);

        if (isSeparator) {
          r = 15;
          g = 23;
          b = 42;
          bump = 0.12;
        } else {
          const trackIdx = trackPos <= 0.31 ? 0 : trackPos <= 0.64 ? 1 : 2;
          const colorVariant = (trackIdx + id1) % 3;

          if (colorVariant === 0) {
            // Solar Orange-Red
            r = 255;
            g = 61;
            b = 0;
          } else if (colorVariant === 1) {
            // Bahian Emerald Green
            r = 0;
            g = 210;
            b = 88;
          } else {
            // Carioca Sky Blue
            r = 0;
            g = 155;
            b = 245;
          }
          bump = 0.25;

          // Golden 5-pointed star accents at ribbon intersections
          const sectorA = wrapMod(ang1, Math.PI / 2) - Math.PI / 4;
          const starD = evalStarMask(sectorA * 0.35, (trackPos - 0.5) * 0.22, 0.042);
          if (trackIdx === 1 && starD > 0) {
            r = 255;
            g = 215;
            b = 0;
            bump = 0.38;
          }
        }
      }
    }

    SAMPLE_OUT.r = clamp01(r / 255) * 255;
    SAMPLE_OUT.g = clamp01(g / 255) * 255;
    SAMPLE_OUT.b = clamp01(b / 255) * 255;
    SAMPLE_OUT.bump = Math.max(-1, Math.min(1, bump));
  }

  /**
   * 2010 South Africa - Adidas Jabulani
   * - White 8-panel spherically molded surface with Grip 'n' Groove concentric aerodynamic ridges
   * - 4 "Soccer City Stadium" rounded-triangular rings in 11 South African colors (Gold with African tribal triangles, Black, Red, Green, Blue)
   */
  private static sampleJabulani10(nx: number, ny: number, nz: number): void {
    let r = 248;
    let g = 250;
    let b = 252;
    let bump = 0;

    // 8-panel spherical seam + Grip 'n' Groove concentric aero-grooves
    let o1 = -2;
    let o2 = -2;
    for (let k = 0; k < 8; k++) {
      const f = OCTA_8_FRAMES[k];
      const dot = nx * f.nx + ny * f.ny + nz * f.nz;
      if (dot > o1) {
        o2 = o1;
        o1 = dot;
      } else if (dot > o2) {
        o2 = dot;
      }
    }
    const octaSeam = o1 - o2;
    const octRad = Math.acos(Math.max(-1, Math.min(1, o1)));

    // Famous Jabulani "Grip 'n' Groove" concentric aerodynamic ridges on the white panels
    const aeroGroove = Math.sin(octRad * 85);
    if (aeroGroove > 0.72) {
      bump -= 0.22;
      r -= 5;
      g -= 4;
      b -= 3;
    }
    if (octaSeam < 0.014) {
      const s = 1 - octaSeam / 0.014;
      r -= s * 32;
      g -= s * 30;
      b -= s * 25;
      bump -= s * 0.8;
    }

    // 4 Tetrahedral "Soccer City Stadium" Triangular Rings
    for (let k = 0; k < 4; k++) {
      const f = TETRA_FRAMES[k];
      const dot = Math.max(-1, Math.min(1, nx * f.nx + ny * f.ny + nz * f.nz));
      const rad = Math.acos(dot);
      if (rad > 0.72) continue;

      const u = nx * f.ux + ny * f.uy + nz * f.uz;
      const v = nx * f.vx + ny * f.vy + nz * f.vz;
      const ang = Math.atan2(v, u);

      // Rounded-triangular ring contour R(ang)
      const ringRadius = 0.41 + 0.056 * Math.cos(3 * ang);
      const dRing = rad - ringRadius;

      // 3 sweeping arch segments forming the triangular ring
      const sector = (Math.PI * 2) / 3;
      const localA = wrapMod(ang + Math.PI / 3, sector) - Math.PI / 3;
      const ua = localA / (Math.PI / 3); // -1..1 along one arch blade
      const archHalfWidth = 0.132 * (1 - 0.46 * ua * ua);

      if (Math.abs(dRing) < archHalfWidth && archHalfWidth > 0.01) {
        const t = dRing / archHalfWidth; // -1 (inner) .. +1 (outer)

        if (t > 0.74) {
          // Outer Sweeping Rim: Jet Black & Emerald Green
          if (ua > 0.15) {
            r = 21;
            g = 128;
            b = 61;
          } else {
            r = 17;
            g = 24;
            b = 39;
          }
          bump = 0.24;
        } else if (t > 0.44) {
          // Upper-Mid Crescent: Vibrant South African Red & Cobalt Blue + White pinstripe
          if (t > 0.68) {
            r = 255;
            g = 255;
            b = 255;
          } else if (ua < -0.1) {
            r = 29;
            g = 78;
            b = 216;
          } else {
            r = 220;
            g = 38;
            b = 38;
          }
          bump = 0.22;
        } else if (t > -0.52) {
          // Main Central Band: South African Gold with African Tribal Geometric Triangles
          const triGridA = Math.sin((ang * 24 + rad * 55) * Math.PI);
          const triGridB = Math.sin((ang * 24 - rad * 55) * Math.PI);
          const tribal = triGridA * triGridB;

          if (tribal > 0.35) {
            // Ochre / Warm Bronze Triangle Tessellation
            r = 161;
            g = 98;
            b = 7;
          } else if (tribal < -0.35) {
            // Bright Sun Gold Triangle
            r = 253;
            g = 224;
            b = 71;
          } else {
            // Rich Metallic Gold
            r = 234;
            g = 179;
            b = 8;
          }
          bump = 0.26;
        } else if (t > -0.76) {
          // Inner White & Emerald Accent Stripe
          if (ua > 0) {
            r = 22;
            g = 163;
            b = 74;
          } else {
            r = 255;
            g = 255;
            b = 255;
          }
          bump = 0.2;
        } else {
          // Innermost Black & Gold Contour
          r = 17;
          g = 24;
          b = 39;
          bump = 0.24;
        }
      }
    }

    SAMPLE_OUT.r = clamp01(r / 255) * 255;
    SAMPLE_OUT.g = clamp01(g / 255) * 255;
    SAMPLE_OUT.b = clamp01(b / 255) * 255;
    SAMPLE_OUT.bump = Math.max(-1, Math.min(1, bump));
  }

  /**
   * 2002 Korea/Japan - Adidas Fevernova
   * - Authentic 32-panel (12 pentagons + 20 hexagons) stitched Champagne Gold / Metallic Pearl Honey skin
   * - 4 Tetrahedral 3-Bladed "Trigon" Shuriken Turbines (dark green/black brush-feathered blades, metallic gold bevels, fiery red swirling flame core)
   */
  private static sampleFevernova02(nx: number, ny: number, nz: number): void {
    // 1. Authentic Champagne Gold / Pearl Honey-Ivory base with syntactic-foam micro-hexagonal shimmer
    const hexShimmer = Math.sin(nx * 95) * Math.sin(ny * 95) * Math.sin(nz * 95);
    let r = 241 + hexShimmer * 4;
    let g = 226 + hexShimmer * 4;
    let b = 182 + hexShimmer * 3;
    let bump = hexShimmer * 0.06;

    // 2. Exact 32-Panel Truncated Icosahedron (12 Pentagons + 20 Hexagons) Hand-Stitched Seams
    let d1 = -2;
    let d2 = -2;
    for (let i = 0; i < TRUNC_ICOSA_FRAMES.length; i++) {
      const f = TRUNC_ICOSA_FRAMES[i];
      const dot = nx * f.nx + ny * f.ny + nz * f.nz;
      if (dot > d1) {
        d2 = d1;
        d1 = dot;
      } else if (dot > d2) {
        d2 = dot;
      }
    }
    const seam32 = d1 - d2;
    if (seam32 < 0.015) {
      const s = 1 - seam32 / 0.015;
      // Recessed stitched seam shadow
      r -= s * 72;
      g -= s * 68;
      b -= s * 58;
      bump -= s * 0.92;
    } else if (seam32 < 0.026) {
      // Slight raised cushion pillowing right beside the 32-panel stitch line
      const lip = 1 - (seam32 - 0.015) / 0.011;
      r += lip * 8;
      g += lip * 7;
      b += lip * 6;
      bump += lip * 0.16;
    }

    // 3. Four Tetrahedral 3-Bladed "Trigon" Shuriken Turbines
    for (let k = 0; k < 4; k++) {
      const f = TETRA_FRAMES[k];
      const dot = Math.max(-1, Math.min(1, nx * f.nx + ny * f.ny + nz * f.nz));
      const rad = Math.acos(dot);
      if (rad > 0.74) continue;

      const u = nx * f.ux + ny * f.uy + nz * f.uz;
      const v = nx * f.vx + ny * f.vy + nz * f.vz;
      const ang = Math.atan2(v, u);

      const sector = (Math.PI * 2) / 3;
      const triAng = wrapMod(ang + Math.PI / 3, sector) - Math.PI / 3;
      // Slight aerodynamic turbine curve on the 3 trigon blades
      const curvedAng = triAng - 0.15 * rad * Math.sin(rad * 2.4);
      const absA = Math.abs(curvedAng);

      // A. Outer 3 Concave Trigon Blades (extending to rad = 0.69)
      if (rad >= 0.10 && rad <= 0.69) {
        const bladeHalfWidth = 0.34 * Math.pow(1 - rad / 0.69, 1.42);
        if (absA < bladeHalfWidth && bladeHalfWidth > 0.003) {
          const t = absA / bladeHalfWidth; // 0 = spine, 1 = sharp outer edge

          // Calligraphy brush-stroke feathering near the blade tips
          const tipFeather = rad > 0.44 ? Math.sin(curvedAng * 110) * ((rad - 0.44) / 0.25) : 0;

          if (t > 0.56 + tipFeather * 0.12) {
            // Outer Blade Frame: Deep Asian Pine Green & Charcoal Black
            const isGreenBand = t > 0.68 && t < 0.86;
            if (isGreenBand) {
              r = 20;
              g = 62;
              b = 42;
            } else {
              r = 18;
              g = 24;
              b = 32;
            }
            bump += 0.18;
          } else if (t > 0.24) {
            // Middle Metallic Gold Bevel with longitudinal turbine ribs
            const goldRib = 0.5 + 0.5 * Math.sin(t * 28);
            r = Math.round(202 + goldRib * 38);
            g = Math.round(158 + goldRib * 36);
            b = Math.round(42 + goldRib * 24);
            bump += 0.22;
          } else {
            // Inner Spine: Red-Orange & Burnished Gold Flame Tongue
            if (rad < 0.44) {
              const flame = 1 - rad / 0.44;
              r = Math.round(195 + flame * 55);
              g = Math.round(35 + (1 - flame) * 85);
              b = 24;
            } else {
              r = 161;
              g = 98;
              b = 7;
            }
            bump += 0.2;
          }
        }
      }

      // B. Inner Fiery Red Swirling Flame Triangle Core (rad < 0.26)
      const triRadius = 0.215 / (Math.cos(triAng) + 0.34 * Math.sin(Math.abs(triAng)));
      const uTri = rad / triRadius;

      if (uTri < 1.04) {
        if (uTri > 0.36) {
          // Fiery Crimson / Scarlet / Flame-Orange Swirling Turbine Ring
          const swirl = 0.5 + 0.5 * Math.sin(3 * ang - rad * 18);
          if (uTri > 0.90) {
            // Gold outer rim around the red triangle core
            r = 212;
            g = 175;
            b = 55;
          } else {
            r = Math.round(185 + swirl * 68);
            g = Math.round(20 + swirl * 58);
            b = Math.round(18 + swirl * 12);
          }
          bump += 0.25;
        } else if (uTri > 0.27) {
          // Dark green/black inner triangle border
          r = 18;
          g = 42;
          b = 30;
          bump += 0.2;
        } else {
          // Inner Champagne Gold Center Triangle
          r = 244;
          g = 230;
          b = 186;
          bump += 0.15;
        }
      }
    }

    SAMPLE_OUT.r = clamp01(r / 255) * 255;
    SAMPLE_OUT.g = clamp01(g / 255) * 255;
    SAMPLE_OUT.b = clamp01(b / 255) * 255;
    SAMPLE_OUT.bump = Math.max(-1, Math.min(1, bump));
  }

  /**
   * Renders both the 1024x512 Equirectangular Color Texture and Bump Map for the 3D Sphere
   */
  private static renderEquirectangularMaps(
    colorCtx: CanvasRenderingContext2D,
    bumpCtx: CanvasRenderingContext2D,
    w: number,
    h: number,
    ballId: WorldCupBallId
  ): void {
    const colorImg = colorCtx.createImageData(w, h);
    const bumpImg = bumpCtx.createImageData(w, h);
    const cData = colorImg.data;
    const bData = bumpImg.data;

    for (let y = 0; y < h; y++) {
      const lat = (0.5 - (y + 0.5) / h) * Math.PI;
      const cosLat = Math.cos(lat);
      const ny = Math.sin(lat);

      for (let x = 0; x < w; x++) {
        const lon = ((x + 0.5) / w - 0.5) * Math.PI * 2;
        const nx = cosLat * Math.cos(lon);
        const nz = cosLat * Math.sin(lon);

        WorldCupBall.sampleSpherePoint(nx, ny, nz, ballId);

        const idx = (y * w + x) * 4;
        cData[idx] = SAMPLE_OUT.r;
        cData[idx + 1] = SAMPLE_OUT.g;
        cData[idx + 2] = SAMPLE_OUT.b;
        cData[idx + 3] = 255;

        const bVal = Math.round(clamp01((SAMPLE_OUT.bump + 1) * 0.5) * 255);
        bData[idx] = bVal;
        bData[idx + 1] = bVal;
        bData[idx + 2] = bVal;
        bData[idx + 3] = 255;
      }
    }

    colorCtx.putImageData(colorImg, 0, 0);
    bumpCtx.putImageData(bumpImg, 0, 0);

    // Stamp authentic Adidas 3-Bars & Official Ball Typography on the equirectangular map
    WorldCupBall.stampOfficialBranding(colorCtx, w, h, ballId, false);
  }

  /**
   * Draws crisp Adidas 3-Bars logo, Official Ball Name & FIFA World Cup Year badge
   */
  private static stampOfficialBranding(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    ballId: WorldCupBallId,
    isPreviewSphere: boolean
  ): void {
    const labelMap: Record<
      WorldCupBallId,
      { title: string; sub: string; color: string; accent: string }
    > = {
      trionda_26: {
        title: 'TRIONDA',
        sub: 'FIFA WORLD CUP 2026™',
        color: '#0f172a',
        accent: '#d4af37'
      },
      al_rihla: {
        title: 'AL RIHLA',
        sub: 'QATAR 2022™',
        color: '#0f172a',
        accent: '#8a1538'
      },
      telstar_18: {
        title: 'TELSTAR 18',
        sub: 'RUSSIA 2018™',
        color: '#b48a1e',
        accent: '#111827'
      },
      brazuca: {
        title: 'BRAZUCA',
        sub: 'BRASIL 2014™',
        color: '#0f172a',
        accent: '#00c853'
      },
      jabulani: {
        title: 'JABULANI',
        sub: 'SOUTH AFRICA 2010™',
        color: '#0f172a',
        accent: '#d97706'
      },
      fevernova: {
        title: 'FEVERNOVA',
        sub: 'KOREA JAPAN 2002™',
        color: '#1f2937',
        accent: '#b91c1c'
      }
    };

    const meta = labelMap[ballId];

    if (isPreviewSphere) {
      // Subtle, crisp miniature Adidas 3-bars & ball name near upper-center of the 2D sphere preview
      const cx = w * 0.5;
      const cy = h * 0.25;
      const scale = w / 140;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);

      // Soft pill backing for legibility
      ctx.fillStyle =
        ballId === 'fevernova' ? 'rgba(243, 229, 182, 0.82)' : 'rgba(248, 250, 252, 0.82)';
      ctx.beginPath();
      ctx.roundRect(-24, -10, 48, 17, 5);
      ctx.fill();

      ctx.fillStyle = meta.color;
      ctx.font = '900 7.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(meta.title, 0, -1);
      ctx.restore();
      return;
    }

    // Full equirectangular stamps at two opposing longitudes
    const stampPositions = [
      [w * 0.5, h * 0.5],
      [w * 0.0, h * 0.5],
      [w * 1.0, h * 0.5]
    ];

    stampPositions.forEach(([sx, sy]) => {
      ctx.save();
      ctx.translate(sx, sy);

      // Backing badge
      ctx.fillStyle =
        ballId === 'fevernova' ? 'rgba(242, 227, 182, 0.88)' : 'rgba(248, 250, 252, 0.88)';
      ctx.strokeStyle = meta.accent;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-74, -28, 148, 56, 12);
      ctx.fill();
      ctx.stroke();

      // Adidas 3-Bars icon
      ctx.fillStyle = meta.color;
      for (let bIdx = 0; bIdx < 3; bIdx++) {
        const bx = -12 + bIdx * 9;
        const bh = 7 + bIdx * 4.5;
        ctx.save();
        ctx.translate(bx, -7);
        ctx.rotate(-0.32);
        ctx.fillRect(-2.5, -bh, 5, bh);
        ctx.restore();
      }

      // Official Ball Name
      ctx.fillStyle = meta.color;
      ctx.font = '900 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(meta.title, 0, 10);

      // Tournament Subtitle
      ctx.fillStyle = meta.accent;
      ctx.font = '700 9.5px sans-serif';
      ctx.fillText(meta.sub, 0, 22);

      ctx.restore();
    });
  }

  /**
   * Renders either:
   * - A true 3D raycasted sphere preview with studio lighting & bump normals when w === h (for UI cards)
   * - Or the full 2:1 equirectangular texture map when w !== h
   */
  public static paintTexturePattern(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    ballId: WorldCupBallId
  ): void {
    if (Math.abs(w - h) <= 4) {
      WorldCupBall.renderSphericalPreview(ctx, w, h, ballId);
      return;
    }

    const dummyBump = document.createElement('canvas');
    dummyBump.width = w;
    dummyBump.height = h;
    const bumpCtx = dummyBump.getContext('2d')!;
    WorldCupBall.renderEquirectangularMaps(ctx, bumpCtx, w, h, ballId);
  }

  /**
   * True 3D Raycasted Sphere Preview for UI Cards (with 3D bump normals, specular highlight & rim lighting)
   */
  private static renderSphericalPreview(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    ballId: WorldCupBallId
  ): void {
    const cacheKey = `${ballId}_${w}x${h}`;
    const cached = WorldCupBall.previewCache.get(cacheKey);
    if (cached) {
      ctx.putImageData(cached, 0, 0);
      WorldCupBall.stampOfficialBranding(ctx, w, h, ballId, true);
      return;
    }

    const img = ctx.createImageData(w, h);
    const data = img.data;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const radius = Math.min(w, h) * 0.485;

    // Normalized studio key light direction (-0.42, 0.52, 0.74)
    const lx = -0.42;
    const ly = 0.52;
    const lz = 0.74;

    // Halfway vector H between Light L and View V=(0,0,1)
    const hx = lx;
    const hy = ly;
    const hz = lz + 1.0;
    const hLen = Math.hypot(hx, hy, hz);
    const nhx = hx / hLen;
    const nhy = hy / hLen;
    const nhz = hz / hLen;

    const eps = 0.012;

    for (let py = 0; py < h; py++) {
      const dy = cy - (py + 0.5);
      for (let px = 0; px < w; px++) {
        const dx = px + 0.5 - cx;
        const dist = Math.hypot(dx, dy);
        const idx = (py * w + px) * 4;

        if (dist > radius + 1.0) {
          data[idx + 3] = 0;
          continue;
        }

        // Smooth anti-aliased silhouette edge
        const edgeAlpha = clamp01(radius + 0.6 - dist);
        const ux = dx / radius;
        const uy = dy / radius;
        const rSq = ux * ux + uy * uy;
        const uz = rSq < 1 ? Math.sqrt(1 - rSq) : 0.001;
        const invLen = 1 / Math.hypot(ux, uy, uz);
        const nx = ux * invLen;
        const ny = uy * invLen;
        const nz = uz * invLen;

        // Sample center point and finite-difference neighbors for 3D bump shading
        WorldCupBall.sampleSpherePoint(nx, ny, nz, ballId);
        const baseR = SAMPLE_OUT.r;
        const baseG = SAMPLE_OUT.g;
        const baseB = SAMPLE_OUT.b;
        const h0 = SAMPLE_OUT.bump;

        WorldCupBall.sampleSpherePoint(nx + eps, ny, nz, ballId);
        const hxBump = SAMPLE_OUT.bump - h0;

        WorldCupBall.sampleSpherePoint(nx, ny + eps, nz, ballId);
        const hyBump = SAMPLE_OUT.bump - h0;

        // Perturbed normal
        let pnx = nx - hxBump * 1.45;
        let pny = ny - hyBump * 1.45;
        let pnz = nz;
        const pLen = Math.hypot(pnx, pny, pnz) || 1;
        pnx /= pLen;
        pny /= pLen;
        pnz /= pLen;

        // Diffuse + Ambient + Rim + Specular
        const ndotl = Math.max(0, pnx * lx + pny * ly + pnz * lz);
        const fill = Math.max(0, pnx * 0.45 - pny * 0.35 + pnz * 0.5) * 0.22;
        const limb = 0.52 + 0.48 * Math.pow(nz, 0.42);
        const diffuse = (0.34 + 0.72 * ndotl + fill) * limb;

        const ndoth = Math.max(0, pnx * nhx + pny * nhy + pnz * nhz);
        const spec = Math.pow(ndoth, 38) * 58 * (h0 > -0.3 ? 1 : 0.15);

        data[idx] = Math.min(255, Math.max(0, Math.round(baseR * diffuse + spec)));
        data[idx + 1] = Math.min(255, Math.max(0, Math.round(baseG * diffuse + spec)));
        data[idx + 2] = Math.min(255, Math.max(0, Math.round(baseB * diffuse + spec)));
        data[idx + 3] = Math.round(edgeAlpha * 255);
      }
    }

    WorldCupBall.previewCache.set(cacheKey, img);
    ctx.putImageData(img, 0, 0);
    WorldCupBall.stampOfficialBranding(ctx, w, h, ballId, true);
  }

  public resetToCenter(): void {
    this.position.set(0, this.radius, 0);
    this.velocity.set(0, 0, 0);
    this.spin.set(0, 0, 0);
    this.ownerId = null;
    this.isShot = false;
    this.isKnuckleShot = false;
    this.trailPositions = [];
    this.syncMesh();
  }

  public placeAt(x: number, z: number): void {
    this.position.set(x, this.radius, z);
    this.velocity.set(0, 0, 0);
    this.spin.set(0, 0, 0);
    this.ownerId = null;
    this.isShot = false;
    this.isKnuckleShot = false;
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
    this.isShot = false;
    this.isKnuckleShot = false;
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
        if (Math.abs(this.spin.y) > 0.08 && !this.isKnuckleShot) {
          const magnusAccelX = -this.spin.y * this.velocity.z * 0.085;
          const magnusAccelZ = this.spin.y * this.velocity.x * 0.085;
          this.velocity.x += magnusAccelX * dt;
          this.velocity.z += magnusAccelZ * dt;
        } else if (
          this.isKnuckleShot ||
          (this.velocity.length() > 16 && Math.abs(this.spin.y) <= 0.08 && cfg.knuckleFactor > 1.0)
        ) {
          // Authentic Knuckleball (무회전 슛) S-swerve lateral wobble + sudden late dip
          const horizLen = Math.hypot(this.velocity.x, this.velocity.z);
          if (horizLen > 8) {
            const perpX = -this.velocity.z / horizLen;
            const perpZ = this.velocity.x / horizLen;
            const tNow = performance.now() * 0.025;
            const swerve = (Math.sin(tNow) + 0.45 * Math.cos(tNow * 1.9)) * 7.8 * cfg.knuckleFactor;
            this.velocity.x += perpX * swerve * dt;
            this.velocity.z += perpZ * swerve * dt;
            // Sudden downward dip (뚝 떨어지는 낙차) once past apex
            if (this.velocity.y < 3.5) {
              this.velocity.y -= 5.4 * cfg.knuckleFactor * dt;
            }
          }
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

        if (this.velocity.length() < 9.5) {
          this.isShot = false;
          this.isKnuckleShot = false;
        }
      } else {
        // Air drag (slightly lower drag on knuckleball so power carries to the net)
        const airDrag = Math.pow(this.isKnuckleShot ? 0.88 : 0.82, dt);
        this.velocity.x *= airDrag;
        this.velocity.z *= airDrag;
      }

      // Spin decay
      this.spin.multiplyScalar(Math.pow(0.55, dt));

      // Visual rolling rotation of the World Cup ball mesh (suppressed in mid-air during a zero-spin knuckleball!)
      const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
      const isAirborneKnuckle = this.isKnuckleShot && this.position.y > this.radius + 0.08;
      if (horizSpeed > 0.05 && !isAirborneKnuckle) {
        const rollAxis = new THREE.Vector3(this.velocity.z, 0, -this.velocity.x).normalize();
        this.mesh.rotateOnWorldAxis(rollAxis, (horizSpeed / this.radius) * dt);
      }
      if (Math.abs(this.spin.y) > 0.1 && !isAirborneKnuckle) {
        this.mesh.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), this.spin.y * dt * 2.5);
      }
    } else {
      this.isShot = false;
      this.isKnuckleShot = false;
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
