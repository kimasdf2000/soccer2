import * as THREE from 'three';
import { Player } from './Player';
import { Stadium } from './Stadium';

export class Linesman {
  public side: 'NORTH' | 'SOUTH';
  public group: THREE.Group;
  public bodyGroup: THREE.Group;
  private leftLeg: THREE.Group;
  private rightLeg: THREE.Group;
  private leftArm: THREE.Group;
  private rightArm: THREE.Group;
  private flagGroup: THREE.Group;
  private overheadSprite: THREE.Sprite;
  private spriteCanvas: HTMLCanvasElement;
  private spriteTexture: THREE.CanvasTexture;
  private lastBadgeKey: string = '';

  public position: THREE.Vector3 = new THREE.Vector3();
  public offsideLineX: number = 0;
  public flagTimer: number = 0;
  public flagReason: string = '';
  private animPhase: number = Math.random() * Math.PI * 2;

  constructor(scene: THREE.Scene, side: 'NORTH' | 'SOUTH') {
    this.side = side;
    const zPos = side === 'NORTH' ? -Stadium.HALF_WIDTH - 1.35 : Stadium.HALF_WIDTH + 1.35;
    const xPos = side === 'NORTH' ? 18 : -18;
    this.position.set(xPos, 0, zPos);

    this.group = new THREE.Group();
    this.bodyGroup = new THREE.Group();
    this.group.add(this.bodyGroup);

    // Assistant Referee Black & Neon Yellow Trim Kit
    const torsoMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.88, 0.38), torsoMat);
    torso.position.y = 1.35;
    torso.castShadow = true;
    this.bodyGroup.add(torso);

    const trimStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.14, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xd4ff00 })
    );
    trimStripe.position.y = 1.68;
    this.bodyGroup.add(trimStripe);

    const shorts = new THREE.Mesh(
      new THREE.BoxGeometry(0.66, 0.34, 0.36),
      new THREE.MeshStandardMaterial({ color: 0x09090b })
    );
    shorts.position.y = 0.82;
    this.bodyGroup.add(shorts);

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe5b887, roughness: 0.6 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 14), skinMat);
    head.position.y = 2.1;
    this.bodyGroup.add(head);

    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.44, 1.72, 0);
    const lArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.65, 0.16), skinMat);
    lArmMesh.position.y = -0.32;
    this.leftArm.add(lArmMesh);

    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.44, 1.72, 0);
    const rArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.65, 0.16), skinMat);
    rArmMesh.position.y = -0.32;
    this.rightArm.add(rArmMesh);

    // 3D Checkered Assistant Referee Flag held in Right Hand
    this.flagGroup = new THREE.Group();
    const stick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.95, 8),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc })
    );
    stick.position.y = -0.45;
    this.flagGroup.add(stick);

    const flagTex = this.createCheckeredFlagTexture();
    const cloth = new THREE.Mesh(
      new THREE.PlaneGeometry(0.52, 0.38),
      new THREE.MeshBasicMaterial({ map: flagTex, side: THREE.DoubleSide })
    );
    cloth.position.set(0.26, -0.72, 0);
    this.flagGroup.add(cloth);
    this.flagGroup.position.set(0, -0.62, 0.05);
    this.rightArm.add(this.flagGroup);

    this.bodyGroup.add(this.leftArm, this.rightArm);

    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.18, 0.7, 0);
    const lLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.66, 0.18), torsoMat);
    lLegMesh.position.y = -0.33;
    this.leftLeg.add(lLegMesh);

    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.18, 0.7, 0);
    const rLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.66, 0.18), torsoMat);
    rLegMesh.position.y = -0.33;
    this.rightLeg.add(rLegMesh);

    this.bodyGroup.add(this.leftLeg, this.rightLeg);

    // Overhead Sprite Badge (🚩 부심 / 🚩 OFFSIDE! / 🚩 CORNER!)
    this.spriteCanvas = document.createElement('canvas');
    this.spriteCanvas.width = 256;
    this.spriteCanvas.height = 64;
    this.spriteTexture = new THREE.CanvasTexture(this.spriteCanvas);
    this.overheadSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.spriteTexture, transparent: true, depthTest: false })
    );
    this.overheadSprite.scale.set(2.5, 0.62, 1);
    this.overheadSprite.position.set(0, 2.75, 0);
    this.group.add(this.overheadSprite);
    this.setBadge('🚩 AR (선심)', 'rgba(15, 23, 42, 0.8)', '#facc15');

    this.group.position.copy(this.position);
    scene.add(this.group);
  }

  private createCheckeredFlagTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 96;
    const ctx = c.getContext('2d')!;
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 3; y++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#ff3d00' : '#ffea00';
        ctx.fillRect(x * 32, y * 32, 32, 32);
      }
    }
    return new THREE.CanvasTexture(c);
  }

  private setBadge(text: string, bg: string, fg: string): void {
    const key = `${text}|${bg}`;
    if (this.lastBadgeKey === key) return;
    this.lastBadgeKey = key;

    const ctx = this.spriteCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(22, 10, 212, 44, 22);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = fg;
    ctx.font = '900 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 33);
    this.spriteTexture.needsUpdate = true;
  }

  public raiseFlag(reason: string, duration: number = 2.6): void {
    this.flagTimer = duration;
    this.flagReason = reason;
    this.setBadge(`🚩 ${reason}`, '#ff3d00', '#ffffff');
  }

  public update(dt: number, defenders: Player[], ballPos: THREE.Vector3): void {
    // Compute the offside line X (last outfield defender of the half this linesman patrols)
    const outfieldDefs = defenders.filter((d) => !d.isSentOff && d.role !== 'GK');
    if (this.side === 'NORTH') {
      // Patrols Right half (X: 0 to +52, where HOME attacks AWAY)
      let maxDefX = 12;
      for (const d of outfieldDefs) {
        if (d.position.x > maxDefX) maxDefX = d.position.x;
      }
      this.offsideLineX = THREE.MathUtils.clamp(Math.max(maxDefX, ballPos.x), 0, Stadium.HALF_LENGTH - 1);
    } else {
      // Patrols Left half (X: -52 to 0, where AWAY attacks HOME)
      let minDefX = -12;
      for (const d of outfieldDefs) {
        if (d.position.x < minDefX) minDefX = d.position.x;
      }
      this.offsideLineX = THREE.MathUtils.clamp(Math.min(minDefX, ballPos.x), -Stadium.HALF_LENGTH + 1, 0);
    }

    if (this.flagTimer > 0) {
      this.flagTimer = Math.max(0, this.flagTimer - dt);
      // Raise right arm straight up holding the checkered flag!
      this.rightArm.rotation.x = -Math.PI * 0.92;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      if (this.flagTimer <= 0) {
        this.setBadge('🚩 AR (선심)', 'rgba(15, 23, 42, 0.8)', '#facc15');
      }
    } else {
      this.rightArm.rotation.x = -0.25;
      const diffX = this.offsideLineX - this.position.x;
      if (Math.abs(diffX) > 0.35) {
        const moveX = THREE.MathUtils.clamp(diffX * 4.5, -8.5, 8.5);
        this.position.x += moveX * dt;
        this.animPhase += dt * (4 + Math.abs(moveX));
        const swing = Math.sin(this.animPhase) * 0.55;
        this.leftLeg.rotation.x = swing;
        this.rightLeg.rotation.x = -swing;
      } else {
        this.leftLeg.rotation.x *= 0.8;
        this.rightLeg.rotation.x *= 0.8;
      }
    }

    // Always face inward toward the pitch
    this.bodyGroup.rotation.y = this.side === 'NORTH' ? 0 : Math.PI;
    this.group.position.copy(this.position);
  }
}
