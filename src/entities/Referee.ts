import * as THREE from 'three';
import { CardType } from '../types';
import { Player } from './Player';
import { Stadium } from './Stadium';

export class Referee {
  public group: THREE.Group;
  public bodyGroup: THREE.Group;
  private leftLeg: THREE.Group;
  private rightLeg: THREE.Group;
  private leftArm: THREE.Group;
  private rightArm: THREE.Group;
  private handCardMesh: THREE.Mesh;
  private whistleWaveRing: THREE.Mesh;
  private refRing: THREE.Mesh;
  private overheadSprite: THREE.Sprite;
  private spriteCanvas: HTMLCanvasElement;
  private spriteTexture: THREE.CanvasTexture;
  private lastBadgeText: string = '';

  public position: THREE.Vector3 = new THREE.Vector3(0, 0, -10.5);
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public facingAngle: number = 0;
  public currentDistanceToBall: number = 10.5;

  private animPhase: number = 0;
  private whistlePulseTimer: number = 0;

  // Card / Foul Presentation State
  public isRunningToFoul: boolean = false;
  public isShowingCard: boolean = false;
  public activeCardType: CardType = 'NONE';
  private cardSequenceElapsed: number = 0;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.bodyGroup = new THREE.Group();
    this.group.add(this.bodyGroup);

    // Referee Shirt Texture (Neon Volt Yellow + Black Referee Pockets & Badge)
    const shirtTex = this.createRefereeShirtTexture();
    const torsoMat = new THREE.MeshStandardMaterial({
      map: shirtTex,
      roughness: 0.55
    });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.92, 0.42), torsoMat);
    torso.position.y = 1.38;
    torso.castShadow = true;
    this.bodyGroup.add(torso);

    // Black Referee Shorts
    const shortsMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
    const shorts = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.36, 0.4), shortsMat);
    shorts.position.y = 0.82;
    shorts.castShadow = true;
    this.bodyGroup.add(shorts);

    // Head & Hair
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe8b88a, roughness: 0.6 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), skinMat);
    head.position.y = 2.15;
    head.castShadow = true;
    this.bodyGroup.add(head);

    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.29, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: 0x1e293b })
    );
    hair.position.y = 2.18;
    hair.rotation.x = -0.15;
    this.bodyGroup.add(hair);

    // Silver Whistle on Chest
    const whistleMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.08, 0.14),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 })
    );
    whistleMesh.position.set(0, 1.75, 0.24);
    this.bodyGroup.add(whistleMesh);

    // Arms
    this.leftArm = this.createRefArm(skinMat);
    this.leftArm.position.set(-0.47, 1.76, 0);
    this.rightArm = this.createRefArm(skinMat);
    this.rightArm.position.set(0.47, 1.76, 0);
    this.bodyGroup.add(this.leftArm, this.rightArm);

    // 3D Yellow / Red Card attached to Referee's Right Hand
    const cardGeo = new THREE.BoxGeometry(0.34, 0.48, 0.03);
    const cardMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
    this.handCardMesh = new THREE.Mesh(cardGeo, cardMat);
    // Positioned at the end of the right arm so when arm rotates up (-PI * 0.9), card is held high
    this.handCardMesh.position.set(0, -0.78, 0.08);
    this.handCardMesh.visible = false;
    this.rightArm.add(this.handCardMesh);

    // Legs (Black socks with neon yellow trim)
    this.leftLeg = this.createRefLeg(skinMat);
    this.leftLeg.position.set(-0.2, 0.72, 0);
    this.rightLeg = this.createRefLeg(skinMat);
    this.rightLeg.position.set(0.2, 0.72, 0);
    this.bodyGroup.add(this.leftLeg, this.rightLeg);

    // Subtle ground indicator ring for the Referee
    const ringGeo = new THREE.RingGeometry(0.62, 0.76, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xd4ff00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65
    });
    this.refRing = new THREE.Mesh(ringGeo, ringMat);
    this.refRing.position.y = 0.03;
    this.group.add(this.refRing);

    // Expanding Whistle Soundwave Ring above head
    const waveGeo = new THREE.RingGeometry(0.3, 0.42, 28);
    waveGeo.rotateX(-Math.PI / 2);
    const waveMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0
    });
    this.whistleWaveRing = new THREE.Mesh(waveGeo, waveMat);
    this.whistleWaveRing.position.y = 2.35;
    this.group.add(this.whistleWaveRing);

    // Floating 3D Overhead Referee Badge Sprite (👨‍⚖️ REF / 📢 FOUL! / 🟨 / 🟥)
    this.spriteCanvas = document.createElement('canvas');
    this.spriteCanvas.width = 256;
    this.spriteCanvas.height = 64;
    this.spriteTexture = new THREE.CanvasTexture(this.spriteCanvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: this.spriteTexture,
      transparent: true,
      depthTest: false
    });
    this.overheadSprite = new THREE.Sprite(spriteMat);
    this.overheadSprite.scale.set(2.8, 0.7, 1);
    this.overheadSprite.position.set(0, 2.85, 0);
    this.group.add(this.overheadSprite);
    this.updateOverheadBadge('👨‍⚖️ REF', '#d4ff00', '#0f172a');

    this.group.position.copy(this.position);
    scene.add(this.group);
  }

  private updateOverheadBadge(text: string, bgHex: string, textHex: string): void {
    const key = `${text}|${bgHex}`;
    if (this.lastBadgeText === key) return;
    this.lastBadgeText = key;

    const ctx = this.spriteCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 64);

    ctx.fillStyle = bgHex;
    ctx.beginPath();
    ctx.roundRect(18, 8, 220, 48, 24);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = textHex;
    ctx.font = '900 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 33);

    this.spriteTexture.needsUpdate = true;
  }

  private createRefereeShirtTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // High-visibility FIFA Referee Volt Yellow / Black Shirt
    ctx.fillStyle = '#d4ff00';
    ctx.fillRect(0, 0, 256, 256);

    // Black shoulders & collar
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 256, 36);

    // Referee Chest Pockets & FIFA Referee Badge
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(42, 62, 54, 62);
    ctx.fillRect(160, 62, 54, 62);

    // Yellow/Red Card peeks out of chest pocket
    ctx.fillStyle = '#ffea00';
    ctx.fillRect(54, 48, 30, 16);

    ctx.fillStyle = '#0f172a';
    ctx.font = '900 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('REF', 128, 195);

    return new THREE.CanvasTexture(canvas);
  }

  private createRefArm(skinMat: THREE.Material): THREE.Group {
    const g = new THREE.Group();
    const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.32, 0.18), sleeveMat);
    sleeve.position.y = -0.16;
    g.add(sleeve);

    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.15), skinMat);
    forearm.position.y = -0.5;
    g.add(forearm);
    return g;
  }

  private createRefLeg(skinMat: THREE.Material): THREE.Group {
    const g = new THREE.Group();
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.34, 0.21), skinMat);
    thigh.position.y = -0.17;
    g.add(thigh);

    const sockMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
    const sock = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.32, 0.19), sockMat);
    sock.position.y = -0.48;
    g.add(sock);

    const bootMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.4 });
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.14, 0.32), bootMat);
    boot.position.set(0, -0.65, 0.05);
    g.add(boot);
    return g;
  }

  public triggerWhistleVisual(): void {
    this.whistlePulseTimer = 0.75;
  }

  public resetPosition(x: number = 0, z: number = -11): void {
    this.position.set(x, 0, z);
    this.velocity.set(0, 0, 0);
    this.isRunningToFoul = false;
    this.isShowingCard = false;
    this.activeCardType = 'NONE';
    this.handCardMesh.visible = false;
    this.rightArm.rotation.set(0, 0, 0);
    this.group.position.copy(this.position);
  }

  /**
   * Distant Follow AI:
   * Keeps the referee ~10.5m - 13.5m away from the ball on a clear diagonal angle,
   * while actively avoiding collisions with all players and passing lanes.
   */
  public updateFollowPlay(dt: number, ballPos: THREE.Vector3, ballVel: THREE.Vector3, players: Player[]): void {
    this.isRunningToFoul = false;
    this.isShowingCard = false;
    this.handCardMesh.visible = false;
    this.rightArm.rotation.x *= 0.85;
    this.updateOverheadBadge('👨‍⚖️ REF (심판)', 'rgba(15, 23, 42, 0.85)', '#d4ff00');

    // Choose diagonal observation offset (~11.5m from ball)
    const offsetX = ballPos.x > 0 ? -8.5 : 8.5;
    const offsetZ = ballPos.z > 4 ? -9.5 : ballPos.z < -4 ? 9.5 : -10.5;

    const targetPos = new THREE.Vector3(
      THREE.MathUtils.clamp(ballPos.x + offsetX, -Stadium.HALF_LENGTH + 5, Stadium.HALF_LENGTH - 5),
      0,
      THREE.MathUtils.clamp(ballPos.z + offsetZ, -Stadium.HALF_WIDTH + 3, Stadium.HALF_WIDTH - 3)
    );

    // Repulsion from nearby players so the referee never blocks or crowds players
    const repulsion = new THREE.Vector3();
    for (const p of players) {
      if (p.isSentOff) continue;
      const dx = this.position.x - p.position.x;
      const dz = this.position.z - p.position.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < 30 && distSq > 0.01) {
        const dist = Math.sqrt(distSq);
        const push = ((5.5 - dist) / 5.5) * 7.5;
        repulsion.x += (dx / dist) * push;
        repulsion.z += (dz / dist) * push;
      }
    }

    // Also keep clear if the ball itself gets too close (< 7.5m)
    const bDx = this.position.x - ballPos.x;
    const bDz = this.position.z - ballPos.z;
    const bDist = Math.hypot(bDx, bDz);
    this.currentDistanceToBall = bDist;

    if (bDist < 7.8 && bDist > 0.01) {
      const pushBall = ((7.8 - bDist) / 7.8) * 11.0;
      repulsion.x += (bDx / bDist) * pushBall;
      repulsion.z += (bDz / bDist) * pushBall;
    }

    // Evade ball velocity path
    if (ballVel.lengthSq() > 4) {
      repulsion.x += -ballVel.z * 0.25;
      repulsion.z += ballVel.x * 0.25;
    }

    targetPos.add(repulsion);
    targetPos.x = THREE.MathUtils.clamp(targetPos.x, -Stadium.HALF_LENGTH + 4, Stadium.HALF_LENGTH - 4);
    targetPos.z = THREE.MathUtils.clamp(targetPos.z, -Stadium.HALF_WIDTH + 2.5, Stadium.HALF_WIDTH - 2.5);

    const toTarget = targetPos.sub(this.position);
    toTarget.y = 0;
    const distToTarget = toTarget.length();

    if (distToTarget > 0.6) {
      const moveSpeed = Math.min(8.6, distToTarget * 2.1);
      toTarget.normalize();
      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, toTarget.x * moveSpeed, dt * 6);
      this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, toTarget.z * moveSpeed, dt * 6);
    } else {
      this.velocity.multiplyScalar(0.8);
    }

    this.position.addScaledVector(this.velocity, dt);

    // Always face towards the ball while observing from afar
    const lookAngle = Math.atan2(ballPos.x - this.position.x, ballPos.z - this.position.z);
    this.facingAngle = lookAngle;

    this.animateLocomotion(dt);
    this.updateWhistleWave(dt);
    this.group.position.copy(this.position);
    this.bodyGroup.rotation.y = this.facingAngle;
  }

  /**
   * Foul & Card Sequence AI:
   * Sprints up to the offending player, blows the whistle, and raises the Yellow or Red Card high!
   */
  public startFoulSequence(cardType: CardType): void {
    this.activeCardType = cardType;
    this.isRunningToFoul = true;
    this.isShowingCard = false;
    this.cardSequenceElapsed = 0;
    this.triggerWhistleVisual();
  }

  public updateVarSignal(dt: number): void {
    this.velocity.set(0, 0, 0);
    this.handCardMesh.visible = false;
    this.updateOverheadBadge('📺 VAR REVIEW...', '#38bdf8', '#0f172a');

    // Referee draws the TV box with both arms in front of chest
    const t = performance.now() * 0.008;
    this.leftArm.rotation.x = -Math.PI * 0.52 + Math.sin(t) * 0.22;
    this.rightArm.rotation.x = -Math.PI * 0.52 + Math.cos(t) * 0.22;
    this.updateWhistleWave(dt);
    this.group.position.copy(this.position);
    this.bodyGroup.rotation.y = this.facingAngle;
  }

  public updateFoulSequence(dt: number, offender: Player): void {
    this.cardSequenceElapsed += dt;

    // Target spot 2.3m in front of the offending player
    const approachSpot = new THREE.Vector3(
      offender.position.x,
      0,
      offender.position.z + (this.position.z < offender.position.z ? -2.3 : 2.3)
    );

    const toSpot = approachSpot.clone().sub(this.position);
    toSpot.y = 0;
    const dist = toSpot.length();

    if (dist > 0.45 && this.cardSequenceElapsed < 1.35) {
      // Sprint to the foul scene
      this.isRunningToFoul = true;
      this.isShowingCard = false;
      toSpot.normalize();
      const sprintSpeed = Math.min(13.5, Math.max(7.5, dist * 4.5));
      this.velocity.set(toSpot.x * sprintSpeed, 0, toSpot.z * sprintSpeed);
      this.position.addScaledVector(this.velocity, dt);
      this.facingAngle = Math.atan2(toSpot.x, toSpot.z);
      this.animateLocomotion(dt);
      this.handCardMesh.visible = false;
      this.updateOverheadBadge('📢 WHISTLE! FOUL!', '#facc15', '#0f172a');
    } else {
      // Arrived in front of offender: stop, face offender, and brandish card!
      this.isRunningToFoul = false;
      this.velocity.set(0, 0, 0);
      this.facingAngle = Math.atan2(
        offender.position.x - this.position.x,
        offender.position.z - this.position.z
      );
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;

      if (this.activeCardType !== 'NONE') {
        this.isShowingCard = true;
        this.handCardMesh.visible = true;
        // Raise right arm straight above head holding the card
        this.rightArm.rotation.x = -Math.PI * 0.92;
        this.leftArm.rotation.x = -0.35;

        const mat = this.handCardMesh.material as THREE.MeshBasicMaterial;
        if (this.activeCardType === 'YELLOW') {
          mat.color.setHex(0xffea00);
          this.updateOverheadBadge('🟨 YELLOW CARD!', '#ffea00', '#0f172a');
        } else if (this.activeCardType === 'DIRECT_RED') {
          mat.color.setHex(0xff1744);
          this.updateOverheadBadge('🟥 RED CARD! (퇴장)', '#ff1744', '#ffffff');
        } else if (this.activeCardType === 'SECOND_YELLOW_RED') {
          // Show Yellow first, then switch to Red!
          if (this.cardSequenceElapsed < 1.65) {
            mat.color.setHex(0xffea00);
            this.updateOverheadBadge('🟨 2ND YELLOW...', '#ffea00', '#0f172a');
          } else {
            mat.color.setHex(0xff1744);
            this.updateOverheadBadge('🟨➡️🟥 RED CARD!', '#ff1744', '#ffffff');
          }
        }
      } else {
        // Verbal warning / pointing to free kick spot
        this.handCardMesh.visible = false;
        this.rightArm.rotation.x = -Math.PI * 0.5;
        this.updateOverheadBadge('📢 FREE KICK!', '#38bdf8', '#0f172a');
      }
    }

    this.updateWhistleWave(dt);
    this.group.position.copy(this.position);
    this.bodyGroup.rotation.y = this.facingAngle;
  }

  private animateLocomotion(dt: number): void {
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (speed > 0.25) {
      this.animPhase += dt * (4.5 + speed * 0.9);
      const swing = Math.sin(this.animPhase) * Math.min(0.75, speed * 0.08);
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
      this.leftArm.rotation.x = -swing * 0.7;
      this.rightArm.rotation.x = swing * 0.7;
    } else {
      this.leftLeg.rotation.x *= 0.82;
      this.rightLeg.rotation.x *= 0.82;
      this.leftArm.rotation.x *= 0.82;
      this.rightArm.rotation.x *= 0.82;
    }
  }

  private updateWhistleWave(dt: number): void {
    const mat = this.whistleWaveRing.material as THREE.MeshBasicMaterial;
    if (this.whistlePulseTimer > 0) {
      this.whistlePulseTimer = Math.max(0, this.whistlePulseTimer - dt);
      const progress = 1 - this.whistlePulseTimer / 0.75;
      const scale = 1 + progress * 4.5;
      this.whistleWaveRing.scale.set(scale, scale, scale);
      mat.opacity = (1 - progress) * 0.85;
    } else {
      mat.opacity = 0;
    }
  }
}
