import * as THREE from 'three';

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
  private leftGoalNet!: THREE.Mesh;
  private rightGoalNet!: THREE.Mesh;
  private crowdMesh!: THREE.InstancedMesh;
  private crowdBaseMatrices: THREE.Matrix4[] = [];
  private goalExcitementTimer: number = 0;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.buildPitch();
    this.buildGoals();
    this.buildCornerFlags();
    this.buildAdBoardsAndStands();
    this.buildFloodlights();
    scene.add(this.group);
  }

  public triggerGoalCrowdCelebration(): void {
    this.goalExcitementTimer = 3.5;
  }

  public update(dt: number): void {
    if (this.goalExcitementTimer > 0) {
      this.goalExcitementTimer = Math.max(0, this.goalExcitementTimer - dt);
      const t = performance.now() * 0.015;

      // Net ripple
      const scalePulse = 1 + Math.sin(t * 2.5) * 0.04 * (this.goalExcitementTimer / 3.5);
      this.leftGoalNet.scale.set(scalePulse, 1, scalePulse);
      this.rightGoalNet.scale.set(scalePulse, 1, scalePulse);

      // Crowd jumping animation
      const dummy = new THREE.Matrix4();
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      const scl = new THREE.Vector3();

      for (let i = 0; i < this.crowdBaseMatrices.length; i++) {
        dummy.copy(this.crowdBaseMatrices[i]);
        dummy.decompose(pos, quat, scl);
        pos.y += Math.abs(Math.sin(t + i * 0.7)) * 0.65;
        dummy.compose(pos, quat, scl);
        this.crowdMesh.setMatrixAt(i, dummy);
      }
      this.crowdMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private buildPitch(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1360;
    const ctx = canvas.getContext('2d')!;

    const w = canvas.width;
    const h = canvas.height;

    // Outer turf apron
    ctx.fillStyle = '#1b5e20';
    ctx.fillRect(0, 0, w, h);

    // Pitch rect inside canvas (margin for sidelines)
    const marginX = 140;
    const marginY = 120;
    const pw = w - marginX * 2;
    const ph = h - marginY * 2;

    // Alternating mowed grass stripes (18 stripes)
    const stripeCount = 18;
    const stripeW = pw / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#2e7d32' : '#256929';
      ctx.fillRect(marginX + i * stripeW, marginY, stripeW + 1, ph);
    }

    // Subtle horizontal grass cut sheen
    for (let j = 0; j < 10; j++) {
      ctx.fillStyle = j % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';
      ctx.fillRect(marginX, marginY + (j * ph) / 10, pw, ph / 10);
    }

    // Crisp White Pitch Markings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.lineWidth = 7;

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
    ctx.arc(midX, midY, 10, 0, Math.PI * 2);
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
    ctx.arc(marginX + pSpotOffset, midY, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(marginX + pSpotOffset, midY, 9.15 * scaleX, -0.92, 0.92);
    ctx.stroke();

    // Right Penalty Box
    ctx.strokeRect(marginX + pw - pBoxW, midY - pBoxH / 2, pBoxW, pBoxH);
    ctx.strokeRect(marginX + pw - gBoxW, midY - gBoxH / 2, gBoxW, gBoxH);
    ctx.beginPath();
    ctx.arc(marginX + pw - pSpotOffset, midY, 9, 0, Math.PI * 2);
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

    const pitchTex = new THREE.CanvasTexture(canvas);
    pitchTex.anisotropy = 8;

    const totalLength = (Stadium.HALF_LENGTH * 2) / (pw / w);
    const totalWidth = (Stadium.HALF_WIDTH * 2) / (ph / h);

    const pitchGeo = new THREE.PlaneGeometry(totalLength, totalWidth);
    pitchGeo.rotateX(-Math.PI / 2);
    const pitchMat = new THREE.MeshStandardMaterial({
      map: pitchTex,
      roughness: 0.85,
      metalness: 0.05
    });
    const pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
    pitchMesh.receiveShadow = true;
    this.group.add(pitchMesh);
  }

  private buildGoals(): void {
    const postMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.45
    });

    const netMat = new THREE.MeshBasicMaterial({
      color: 0xe2e8f0,
      wireframe: true,
      transparent: true,
      opacity: 0.42
    });

    const createGoal = (side: -1 | 1): THREE.Mesh => {
      const goalGroup = new THREE.Group();
      const xGoal = side * Stadium.HALF_LENGTH;
      const hw = Stadium.GOAL_HALF_WIDTH;
      const h = Stadium.GOAL_HEIGHT;
      const depth = Stadium.GOAL_DEPTH * side;

      const postGeo = new THREE.CylinderGeometry(0.14, 0.14, h, 14);
      const leftPost = new THREE.Mesh(postGeo, postMat);
      leftPost.position.set(xGoal, h / 2, -hw);
      leftPost.castShadow = true;

      const rightPost = new THREE.Mesh(postGeo, postMat);
      rightPost.position.set(xGoal, h / 2, hw);
      rightPost.castShadow = true;

      const crossbarGeo = new THREE.CylinderGeometry(0.14, 0.14, hw * 2 + 0.28, 14);
      crossbarGeo.rotateX(Math.PI / 2);
      const crossbar = new THREE.Mesh(crossbarGeo, postMat);
      crossbar.position.set(xGoal, h, 0);
      crossbar.castShadow = true;

      // Net box behind goal line
      const netGeo = new THREE.BoxGeometry(Math.abs(depth), h, hw * 2, 6, 6, 12);
      const netMesh = new THREE.Mesh(netGeo, netMat);
      netMesh.position.set(xGoal + depth / 2, h / 2, 0);

      goalGroup.add(leftPost, rightPost, crossbar, netMesh);
      this.group.add(goalGroup);
      return netMesh;
    };

    this.leftGoalNet = createGoal(-1);
    this.rightGoalNet = createGoal(1);
  }

  private buildCornerFlags(): void {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xfacc15 });
    const flagMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide
    });

    const corners = [
      [-Stadium.HALF_LENGTH, -Stadium.HALF_WIDTH],
      [Stadium.HALF_LENGTH, -Stadium.HALF_WIDTH],
      [Stadium.HALF_LENGTH, Stadium.HALF_WIDTH],
      [-Stadium.HALF_LENGTH, Stadium.HALF_WIDTH]
    ];

    corners.forEach(([x, z]) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 8), poleMat);
      pole.position.set(x, 0.8, z);

      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.38), flagMat);
      flag.position.set(x + 0.27, 1.4, z);
      this.group.add(pole, flag);
    });
  }

  private buildAdBoardsAndStands(): void {
    // Create vibrant LED Adboard texture
    const adCanvas = document.createElement('canvas');
    adCanvas.width = 1024;
    adCanvas.height = 128;
    const ctx = adCanvas.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 1024, 0);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.25, '#1e3a8a');
    grad.addColorStop(0.5, '#0284c7');
    grad.addColorStop(0.75, '#4f46e5');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 128);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 1016, 120);

    ctx.fillStyle = '#facc15';
    ctx.font = '900 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚽ FIFA WORLD CUP 3D  •  FAIR PLAY  •  OFFICIAL MATCH ⚽', 512, 78);

    const adTex = new THREE.CanvasTexture(adCanvas);
    adTex.wrapS = THREE.RepeatWrapping;
    adTex.repeat.set(3, 1);

    const adMat = new THREE.MeshStandardMaterial({
      map: adTex,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.18
    });

    // North & South Adboards
    const longBoardGeo = new THREE.BoxGeometry(110, 1.3, 0.4);
    const northBoard = new THREE.Mesh(longBoardGeo, adMat);
    northBoard.position.set(0, 0.65, -Stadium.HALF_WIDTH - 3.6);
    const southBoard = new THREE.Mesh(longBoardGeo, adMat);
    southBoard.position.set(0, 0.65, Stadium.HALF_WIDTH + 3.6);
    this.group.add(northBoard, southBoard);

    // Stadium Concrete Tiers (Stands)
    const standMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.9
    });

    const buildStand = (x: number, z: number, w: number, d: number, rotY: number) => {
      const standGroup = new THREE.Group();
      for (let tier = 0; tier < 4; tier++) {
        const tierMesh = new THREE.Mesh(new THREE.BoxGeometry(w, 2.2, d / 4), standMat);
        tierMesh.position.set(0, 1.1 + tier * 2.0, (tier - 1.5) * (d / 4));
        standGroup.add(tierMesh);
      }
      standGroup.position.set(x, 0, z);
      standGroup.rotation.y = rotY;
      this.group.add(standGroup);
    };

    buildStand(0, -Stadium.HALF_WIDTH - 14, 118, 14, 0);
    buildStand(0, Stadium.HALF_WIDTH + 14, 118, 14, Math.PI);
    buildStand(-Stadium.HALF_LENGTH - 15, 0, 76, 14, Math.PI / 2);
    buildStand(Stadium.HALF_LENGTH + 15, 0, 76, 14, -Math.PI / 2);

    // Instanced Crowd Spectators
    const crowdCount = 420;
    const spectatorGeo = new THREE.BoxGeometry(0.65, 1.1, 0.65);
    const spectatorMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.crowdMesh = new THREE.InstancedMesh(spectatorGeo, spectatorMat, crowdCount);

    const palette = [0xef4444, 0xfacc15, 0x3b82f6, 0x10b981, 0xf97316, 0xffffff, 0xa855f7];
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < crowdCount; i++) {
      const side = i % 4;
      const tier = Math.floor(Math.random() * 4);
      const y = 2.5 + tier * 2.0;

      if (side === 0) {
        dummy.position.set((Math.random() - 0.5) * 108, y, -Stadium.HALF_WIDTH - 9.5 - tier * 3.2);
      } else if (side === 1) {
        dummy.position.set((Math.random() - 0.5) * 108, y, Stadium.HALF_WIDTH + 9.5 + tier * 3.2);
      } else if (side === 2) {
        dummy.position.set(-Stadium.HALF_LENGTH - 10.5 - tier * 3.2, y, (Math.random() - 0.5) * 68);
      } else {
        dummy.position.set(Stadium.HALF_LENGTH + 10.5 + tier * 3.2, y, (Math.random() - 0.5) * 68);
      }
      dummy.updateMatrix();
      this.crowdBaseMatrices.push(dummy.matrix.clone());
      this.crowdMesh.setMatrixAt(i, dummy.matrix);
      color.setHex(palette[i % palette.length]);
      this.crowdMesh.setColorAt(i, color);
    }

    this.crowdMesh.instanceMatrix.needsUpdate = true;
    if (this.crowdMesh.instanceColor) this.crowdMesh.instanceColor.needsUpdate = true;
    this.group.add(this.crowdMesh);
  }

  private buildFloodlights(): void {
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6 });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    const corners = [
      [-62, -46],
      [62, -46],
      [62, 46],
      [-62, 46]
    ];

    corners.forEach(([x, z]) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.9, 28, 8), towerMat);
      pole.position.set(x, 14, z);

      const head = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.2, 1.2), lampMat);
      head.position.set(x, 28, z);
      head.lookAt(0, 0, 0);

      this.group.add(pole, head);
    });
  }
}
