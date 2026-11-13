import * as THREE from 'three';

export interface PlayerInputState {
  moveVec: THREE.Vector2;
  isSprinting: boolean;
  isChargingShot: boolean;
  shotPower: number; // 0.0 to 1.0
  triggerShootWithPower: number | null;
  triggerPass: boolean;
  triggerThrough: boolean;
  triggerSlideTackle: boolean;
  triggerSwitchPlayer: boolean;
  triggerSkillOrTactics: boolean;
  isPressingDefense: boolean;
}

export interface SerializedGuestInput {
  mx: number;
  my: number;
  sprint: boolean;
  charging: boolean;
  shotPower: number;
  shootPower: number | null;
  pass: boolean;
  through: boolean;
  tackle: boolean;
  switchPlayer: boolean;
  skill: boolean;
  press: boolean;
}

export class TouchController implements PlayerInputState {
  // 1P Input State (also used as local device input in Solo / Online Guest)
  public moveVec: THREE.Vector2 = new THREE.Vector2(0, 0);
  public isSprinting: boolean = false;
  public isChargingShot: boolean = false;
  public shotPower: number = 0; // 0.0 to 1.0

  // One-shot action triggers consumed by Game loop (1P)
  public triggerShootWithPower: number | null = null;
  public triggerPass: boolean = false;
  public triggerThrough: boolean = false;
  public triggerSlideTackle: boolean = false;
  public triggerSwitchPlayer: boolean = false;
  public triggerSkillOrTactics: boolean = false;
  public isPressingDefense: boolean = false;

  // 2P Independent Input State (for Same-Team Co-op: Local 2P or Online 2P Guest)
  public p2: PlayerInputState = {
    moveVec: new THREE.Vector2(0, 0),
    isSprinting: false,
    isChargingShot: false,
    shotPower: 0,
    triggerShootWithPower: null,
    triggerPass: false,
    triggerThrough: false,
    triggerSlideTackle: false,
    triggerSwitchPlayer: false,
    triggerSkillOrTactics: false,
    isPressingDefense: false
  };

  public isLocalCoop: boolean = false;
  public isOnlineCoopHost: boolean = false;

  // Set-piece specific controls (Free Kick & Penalty Kick)
  public setPieceSpin: number = 0; // -1.5 (Left Curve) to +1.5 (Right Curve)
  public setPieceElevation: number = 0.55; // 0.2 (Low Driven) to 1.0 (High Loft/Top Corner)

  private keys: Set<string> = new Set();

  // 1P Joystick state
  private joyTouchId: number | null = null;
  private joyPointerDown: boolean = false;
  private joyCenter: { x: number; y: number } = { x: 0, y: 0 };
  private maxJoyRadius: number = 58;

  private joystickZone: HTMLElement;
  private joystickBase: HTMLElement;
  private joystickStick: HTMLElement;

  // 2P Joystick state (for Local 2P Tablet Co-op)
  private p2JoyTouchId: number | null = null;
  private p2JoyPointerDown: boolean = false;
  private p2JoyCenter: { x: number; y: number } = { x: 0, y: 0 };
  private p2JoystickZone: HTMLElement | null = null;
  private p2JoystickBase: HTMLElement | null = null;
  private p2JoystickStick: HTMLElement | null = null;

  private isDefenseContext: boolean = false;
  private isSetPieceContext: boolean = false;
  private prevGamepadButtons: Record<number, boolean[]> = {};

  constructor() {
    this.joystickZone = document.getElementById('joystick-zone')!;
    this.joystickBase = document.getElementById('joystick-base')!;
    this.joystickStick = document.getElementById('joystick-stick')!;

    this.p2JoystickZone = document.getElementById('p2-joystick-zone');
    this.p2JoystickBase = document.getElementById('p2-joystick-base');
    this.p2JoystickStick = document.getElementById('p2-joystick-stick');

    this.bindJoystickEvents();
    this.bindP2JoystickEvents();
    this.bindActionButtons();
    this.bindP2ActionButtons();
    this.bindSetPieceControls();
    this.bindKeyboardEvents();
  }

  public getSlotInput(slot: 'P1' | 'P2'): PlayerInputState {
    return slot === 'P2' ? this.p2 : this;
  }

  public resetP2State(): void {
    this.p2.moveVec.set(0, 0);
    this.p2.isSprinting = false;
    this.p2.isChargingShot = false;
    this.p2.shotPower = 0;
    this.p2.triggerShootWithPower = null;
    this.p2.triggerPass = false;
    this.p2.triggerThrough = false;
    this.p2.triggerSlideTackle = false;
    this.p2.triggerSwitchPlayer = false;
    this.p2.triggerSkillOrTactics = false;
    this.p2.isPressingDefense = false;
  }

  public applyRemoteGuestInput(pkt: SerializedGuestInput): void {
    this.p2.moveVec.set(
      THREE.MathUtils.clamp(pkt.mx || 0, -1, 1),
      THREE.MathUtils.clamp(pkt.my || 0, -1, 1)
    );
    this.p2.isSprinting = !!pkt.sprint;
    this.p2.isChargingShot = !!pkt.charging;
    this.p2.shotPower = THREE.MathUtils.clamp(pkt.shotPower || 0, 0, 1);
    if (pkt.shootPower !== null && pkt.shootPower !== undefined) {
      this.p2.triggerShootWithPower = THREE.MathUtils.clamp(pkt.shootPower, 0.3, 1.0);
    }
    if (pkt.pass) this.p2.triggerPass = true;
    if (pkt.through) this.p2.triggerThrough = true;
    if (pkt.tackle) this.p2.triggerSlideTackle = true;
    if (pkt.switchPlayer) this.p2.triggerSwitchPlayer = true;
    if (pkt.skill) this.p2.triggerSkillOrTactics = true;
    this.p2.isPressingDefense = !!pkt.press;
  }

  public consumeLocalAsGuestPacket(): SerializedGuestInput {
    const pkt: SerializedGuestInput = {
      mx: Number(this.moveVec.x.toFixed(3)),
      my: Number(this.moveVec.y.toFixed(3)),
      sprint: this.isSprinting,
      charging: this.isChargingShot,
      shotPower: Number(this.shotPower.toFixed(2)),
      shootPower: this.triggerShootWithPower,
      pass: this.triggerPass,
      through: this.triggerThrough,
      tackle: this.triggerSlideTackle,
      switchPlayer: this.triggerSwitchPlayer,
      skill: this.triggerSkillOrTactics,
      press: this.isPressingDefense
    };
    this.triggerShootWithPower = null;
    this.triggerPass = false;
    this.triggerThrough = false;
    this.triggerSlideTackle = false;
    this.triggerSwitchPlayer = false;
    this.triggerSkillOrTactics = false;
    return pkt;
  }

  public setContextMode(isDefense: boolean, isSetPiece: boolean): void {
    if (this.isDefenseContext === isDefense && this.isSetPieceContext === isSetPiece) return;
    this.isDefenseContext = isDefense;
    this.isSetPieceContext = isSetPiece;

    const updatePadButtons = (prefix: string) => {
      const btnShoot = document.getElementById(`${prefix}btn-shoot`);
      const btnPass = document.getElementById(`${prefix}btn-pass`);
      const btnThrough = document.getElementById(`${prefix}btn-through`);
      const btnSkill = document.getElementById(`${prefix}btn-skill`);
      if (!btnShoot || !btnPass || !btnThrough) return;

      if (isSetPiece) {
        btnShoot.innerHTML = `<span class="btn-icon">🎯</span><span class="btn-title">감아차기 슛</span><span class="btn-sub">HOLD 게이지</span>`;
        btnShoot.className = 'action-btn btn-shoot setpiece-glow';
        btnPass.innerHTML = `<span class="btn-icon">👟</span><span class="btn-title">짧은 패스</span><span class="btn-sub">전술 세트피스</span>`;
        btnPass.className = 'action-btn btn-pass';
        btnThrough.innerHTML = `<span class="btn-icon">🌀</span><span class="btn-title">무회전 강슛</span><span class="btn-sub">KNUCKLE</span>`;
        btnThrough.className = 'action-btn btn-through';
        if (btnSkill) {
          btnSkill.innerHTML = `<span class="btn-icon">🏔️</span><span class="btn-title">칩슛/로빙</span><span class="btn-sub">PANENKA</span>`;
        }
      } else if (isDefense) {
        btnShoot.innerHTML = `<span class="btn-icon">💥</span><span class="btn-title">슬라이딩 태클</span><span class="btn-sub">파울/카드 주의</span>`;
        btnShoot.className = 'action-btn btn-tackle';
        btnPass.innerHTML = `<span class="btn-icon">🛡️</span><span class="btn-title">압박 / 견제</span><span class="btn-sub">안전 수비</span>`;
        btnPass.className = 'action-btn btn-press';
        btnThrough.innerHTML = `<span class="btn-icon">🔄</span><span class="btn-title">선수 전환</span><span class="btn-sub">SWITCH</span>`;
        btnThrough.className = 'action-btn btn-switch';
        if (btnSkill) {
          btnSkill.innerHTML = `<span class="btn-icon">📋</span><span class="btn-title">전술 변경</span><span class="btn-sub">공격·수비</span>`;
        }
      } else {
        btnShoot.innerHTML = `<span class="btn-icon">⚽</span><span class="btn-title">슛 (SHOOT)</span><span class="btn-sub">길게 눌러 파워</span>`;
        btnShoot.className = 'action-btn btn-shoot';
        btnPass.innerHTML = `<span class="btn-icon">👟</span><span class="btn-title">패스 (PASS)</span><span class="btn-sub">파트너 연결</span>`;
        btnPass.className = 'action-btn btn-pass';
        btnThrough.innerHTML = `<span class="btn-icon">⚡</span><span class="btn-title">스루 패스</span><span class="btn-sub">공간 침투</span>`;
        btnThrough.className = 'action-btn btn-through';
        if (btnSkill) {
          btnSkill.innerHTML = `<span class="btn-icon">✨</span><span class="btn-title">개인기 턴</span><span class="btn-sub">마르세유 360°</span>`;
        }
      }
    };

    updatePadButtons('');
    updatePadButtons('p2-');
  }

  public update(dt: number): void {
    // 1. 1P Keyboard Movement (when 1P touch joystick is not active)
    if (this.joyTouchId === null && !this.joyPointerDown) {
      let kx = 0;
      let ky = 0;
      if (this.keys.has('KeyA') || (!this.isLocalCoop && this.keys.has('ArrowLeft'))) kx -= 1;
      if (this.keys.has('KeyD') || (!this.isLocalCoop && this.keys.has('ArrowRight'))) kx += 1;
      if (this.keys.has('KeyW') || (!this.isLocalCoop && this.keys.has('ArrowUp'))) ky -= 1;
      if (this.keys.has('KeyS') || (!this.isLocalCoop && this.keys.has('ArrowDown'))) ky += 1;

      if (kx !== 0 || ky !== 0) {
        const len = Math.hypot(kx, ky);
        this.moveVec.set(kx / len, ky / len);
        this.joystickStick.style.transform = `translate(${(kx / len) * 32}px, ${(ky / len) * 32}px)`;
      } else {
        this.moveVec.set(0, 0);
        this.joystickStick.style.transform = `translate(0px, 0px)`;
      }
    }

    // 2. 2P Keyboard Movement in Local Co-op (when 2P touch joystick is not active)
    if (this.isLocalCoop && !this.isOnlineCoopHost) {
      if (this.p2JoyTouchId === null && !this.p2JoyPointerDown) {
        let kx2 = 0;
        let ky2 = 0;
        if (this.keys.has('ArrowLeft')) kx2 -= 1;
        if (this.keys.has('ArrowRight')) kx2 += 1;
        if (this.keys.has('ArrowUp')) ky2 -= 1;
        if (this.keys.has('ArrowDown')) ky2 += 1;

        if (kx2 !== 0 || ky2 !== 0) {
          const len2 = Math.hypot(kx2, ky2);
          this.p2.moveVec.set(kx2 / len2, ky2 / len2);
          if (this.p2JoystickStick) {
            this.p2JoystickStick.style.transform = `translate(${(kx2 / len2) * 32}px, ${(ky2 / len2) * 32}px)`;
          }
        } else {
          this.p2.moveVec.set(0, 0);
          if (this.p2JoystickStick) {
            this.p2JoystickStick.style.transform = `translate(0px, 0px)`;
          }
        }
      }
    }

    // 3. Poll Gamepads if connected
    this.pollGamepads();

    // 4. Charge shot power while holding Shoot (1P & 2P)
    if (this.isChargingShot) {
      this.shotPower = Math.min(1.0, this.shotPower + dt * 1.45);
    }
    if (this.p2.isChargingShot) {
      this.p2.shotPower = Math.min(1.0, this.p2.shotPower + dt * 1.45);
    }
  }

  private pollGamepads(): void {
    if (!navigator.getGamepads) return;
    const pads = Array.from(navigator.getGamepads()).filter((g): g is Gamepad => g !== null && g.connected);
    if (pads.length === 0) return;

    const applyPadToState = (pad: Gamepad, target: PlayerInputState) => {
      const gx = Math.abs(pad.axes[0] || 0) > 0.18 ? pad.axes[0] : 0;
      const gy = Math.abs(pad.axes[1] || 0) > 0.18 ? pad.axes[1] : 0;
      if (gx !== 0 || gy !== 0) {
        const len = Math.min(1, Math.hypot(gx, gy));
        const ang = Math.atan2(gy, gx);
        target.moveVec.set(Math.cos(ang) * len, Math.sin(ang) * len);
      }

      const prev = this.prevGamepadButtons[pad.index] || [];
      const cur = pad.buttons.map((b) => b.pressed);
      const justPressed = (idx: number) => !!cur[idx] && !prev[idx];
      const justReleased = (idx: number) => !cur[idx] && !!prev[idx];

      // R2(7) or R1(5) Sprint
      if (cur[7] || cur[5]) {
        target.isSprinting = true;
      } else if (prev[7] || prev[5]) {
        target.isSprinting = false;
      }

      // B/Circle(1) or X/Square(2) Shoot / Tackle
      if (justPressed(1) || justPressed(2)) {
        if (this.isDefenseContext) {
          target.triggerSlideTackle = true;
        } else {
          target.isChargingShot = true;
          target.shotPower = 0.3;
        }
      }
      if (justReleased(1) || justReleased(2)) {
        if (target.isChargingShot) {
          target.triggerShootWithPower = Math.max(0.35, target.shotPower);
          target.isChargingShot = false;
          target.shotPower = 0;
        }
      }

      // A/Cross(0) Pass / Press
      if (justPressed(0)) {
        if (this.isDefenseContext) {
          target.isPressingDefense = true;
        } else {
          target.triggerPass = true;
        }
      }
      if (justReleased(0)) {
        target.isPressingDefense = false;
      }

      // Y/Triangle(3) or L1(4) Through / Switch
      if (justPressed(3) || justPressed(4)) {
        if (this.isDefenseContext) {
          target.triggerSwitchPlayer = true;
        } else {
          target.triggerThrough = true;
        }
      }

      // L2(6) Skill / Tactics
      if (justPressed(6)) {
        target.triggerSkillOrTactics = true;
      }

      this.prevGamepadButtons[pad.index] = cur;
    };

    if (this.isLocalCoop && pads.length === 1) {
      // If 1 gamepad is connected in Local 2P mode, let 2P use the gamepad while 1P uses touch/keyboard
      applyPadToState(pads[0], this.p2);
    } else {
      applyPadToState(pads[0], this);
      if (this.isLocalCoop && pads.length >= 2) {
        applyPadToState(pads[1], this.p2);
      }
    }
  }

  private bindJoystickEvents(): void {
    const updateStickFromPoint = (clientX: number, clientY: number) => {
      const dx = clientX - this.joyCenter.x;
      const dy = clientY - this.joyCenter.y;
      const dist = Math.hypot(dx, dy);
      const clampedDist = Math.min(this.maxJoyRadius, dist);
      const angle = Math.atan2(dy, dx);

      const sx = Math.cos(angle) * clampedDist;
      const sy = Math.sin(angle) * clampedDist;

      this.joystickStick.style.transform = `translate(${sx}px, ${sy}px)`;

      if (dist > 6) {
        this.moveVec.set(
          (Math.cos(angle) * clampedDist) / this.maxJoyRadius,
          (Math.sin(angle) * clampedDist) / this.maxJoyRadius
        );
      } else {
        this.moveVec.set(0, 0);
      }
    };

    const resetStick = () => {
      this.joyTouchId = null;
      this.joyPointerDown = false;
      this.moveVec.set(0, 0);
      this.joystickStick.style.transform = `translate(0px, 0px)`;
      this.joystickBase.classList.remove('active');
    };

    this.joystickZone.addEventListener(
      'touchstart',
      (e: TouchEvent) => {
        e.preventDefault();
        if (this.joyTouchId !== null) return;
        const touch = e.changedTouches[0];
        this.joyTouchId = touch.identifier;
        const rect = this.joystickBase.getBoundingClientRect();
        this.joyCenter = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
        this.joystickBase.classList.add('active');
        updateStickFromPoint(touch.clientX, touch.clientY);
      },
      { passive: false }
    );

    this.joystickZone.addEventListener(
      'touchmove',
      (e: TouchEvent) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === this.joyTouchId) {
            updateStickFromPoint(t.clientX, t.clientY);
            break;
          }
        }
      },
      { passive: false }
    );

    const onTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.joyTouchId) {
          resetStick();
          break;
        }
      }
    };
    this.joystickZone.addEventListener('touchend', onTouchEnd);
    this.joystickZone.addEventListener('touchcancel', onTouchEnd);

    this.joystickZone.addEventListener('mousedown', (e: MouseEvent) => {
      this.joyPointerDown = true;
      const rect = this.joystickBase.getBoundingClientRect();
      this.joyCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
      this.joystickBase.classList.add('active');
      updateStickFromPoint(e.clientX, e.clientY);
    });

    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.joyPointerDown) {
        updateStickFromPoint(e.clientX, e.clientY);
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.joyPointerDown) {
        resetStick();
      }
    });
  }

  private bindP2JoystickEvents(): void {
    const zone = this.p2JoystickZone;
    const base = this.p2JoystickBase;
    const stick = this.p2JoystickStick;
    if (!zone || !base || !stick) return;

    const maxR = 48;
    const updateStickFromPoint = (clientX: number, clientY: number) => {
      const dx = clientX - this.p2JoyCenter.x;
      const dy = clientY - this.p2JoyCenter.y;
      const dist = Math.hypot(dx, dy);
      const clampedDist = Math.min(maxR, dist);
      const angle = Math.atan2(dy, dx);

      const sx = Math.cos(angle) * clampedDist;
      const sy = Math.sin(angle) * clampedDist;

      stick.style.transform = `translate(${sx}px, ${sy}px)`;

      if (dist > 5) {
        this.p2.moveVec.set(
          (Math.cos(angle) * clampedDist) / maxR,
          (Math.sin(angle) * clampedDist) / maxR
        );
      } else {
        this.p2.moveVec.set(0, 0);
      }
    };

    const resetStick = () => {
      this.p2JoyTouchId = null;
      this.p2JoyPointerDown = false;
      this.p2.moveVec.set(0, 0);
      stick.style.transform = `translate(0px, 0px)`;
      base.classList.remove('active');
    };

    zone.addEventListener(
      'touchstart',
      (e: TouchEvent) => {
        e.preventDefault();
        if (this.p2JoyTouchId !== null) return;
        const touch = e.changedTouches[0];
        this.p2JoyTouchId = touch.identifier;
        const rect = base.getBoundingClientRect();
        this.p2JoyCenter = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
        base.classList.add('active');
        updateStickFromPoint(touch.clientX, touch.clientY);
      },
      { passive: false }
    );

    zone.addEventListener(
      'touchmove',
      (e: TouchEvent) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === this.p2JoyTouchId) {
            updateStickFromPoint(t.clientX, t.clientY);
            break;
          }
        }
      },
      { passive: false }
    );

    const onTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.p2JoyTouchId) {
          resetStick();
          break;
        }
      }
    };
    zone.addEventListener('touchend', onTouchEnd);
    zone.addEventListener('touchcancel', onTouchEnd);

    zone.addEventListener('mousedown', (e: MouseEvent) => {
      this.p2JoyPointerDown = true;
      const rect = base.getBoundingClientRect();
      this.p2JoyCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
      base.classList.add('active');
      updateStickFromPoint(e.clientX, e.clientY);
    });

    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.p2JoyPointerDown) {
        updateStickFromPoint(e.clientX, e.clientY);
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.p2JoyPointerDown) {
        resetStick();
      }
    });
  }

  private bindActionButtons(): void {
    this.wirePadButtons('', this);
  }

  private bindP2ActionButtons(): void {
    this.wirePadButtons('p2-', this.p2);
  }

  private wirePadButtons(prefix: string, state: PlayerInputState): void {
    const btnShoot = document.getElementById(`${prefix}btn-shoot`);
    const btnPass = document.getElementById(`${prefix}btn-pass`);
    const btnThrough = document.getElementById(`${prefix}btn-through`);
    const btnSprint = document.getElementById(`${prefix}btn-sprint`);
    const btnSkill = document.getElementById(`${prefix}btn-skill`);

    if (btnShoot) {
      const startShootOrTackle = (e: Event) => {
        e.preventDefault();
        if (this.isDefenseContext) {
          state.triggerSlideTackle = true;
        } else {
          state.isChargingShot = true;
          state.shotPower = 0.25;
        }
      };

      const endShootOrTackle = (e: Event) => {
        e.preventDefault();
        if (state.isChargingShot) {
          state.triggerShootWithPower = Math.max(0.3, state.shotPower);
          state.isChargingShot = false;
          state.shotPower = 0;
        }
      };

      btnShoot.addEventListener('touchstart', startShootOrTackle, { passive: false });
      btnShoot.addEventListener('touchend', endShootOrTackle, { passive: false });
      btnShoot.addEventListener('mousedown', startShootOrTackle);
      btnShoot.addEventListener('mouseup', endShootOrTackle);
    }

    if (btnPass) {
      const startPassOrPress = (e: Event) => {
        e.preventDefault();
        if (this.isDefenseContext) {
          state.isPressingDefense = true;
        } else {
          state.triggerPass = true;
        }
      };
      const endPassOrPress = (e: Event) => {
        e.preventDefault();
        state.isPressingDefense = false;
      };

      btnPass.addEventListener('touchstart', startPassOrPress, { passive: false });
      btnPass.addEventListener('touchend', endPassOrPress, { passive: false });
      btnPass.addEventListener('mousedown', startPassOrPress);
      btnPass.addEventListener('mouseup', endPassOrPress);
    }

    if (btnThrough) {
      const onThroughOrSwitch = (e: Event) => {
        e.preventDefault();
        if (this.isDefenseContext) {
          state.triggerSwitchPlayer = true;
        } else {
          state.triggerThrough = true;
        }
      };
      btnThrough.addEventListener('touchstart', onThroughOrSwitch, { passive: false });
      btnThrough.addEventListener('mousedown', onThroughOrSwitch);
    }

    if (btnSprint) {
      const startSprint = (e: Event) => {
        e.preventDefault();
        state.isSprinting = true;
        btnSprint.classList.add('pressed');
      };
      const endSprint = (e: Event) => {
        e.preventDefault();
        state.isSprinting = false;
        btnSprint.classList.remove('pressed');
      };

      btnSprint.addEventListener('touchstart', startSprint, { passive: false });
      btnSprint.addEventListener('touchend', endSprint, { passive: false });
      btnSprint.addEventListener('mousedown', startSprint);
      btnSprint.addEventListener('mouseup', endSprint);
    }

    if (btnSkill) {
      const onSkill = (e: Event) => {
        e.preventDefault();
        state.triggerSkillOrTactics = true;
      };
      btnSkill.addEventListener('touchstart', onSkill, { passive: false });
      btnSkill.addEventListener('mousedown', onSkill);
    }
  }

  private bindSetPieceControls(): void {
    const spinSlider = document.getElementById('setpiece-spin-slider') as HTMLInputElement | null;
    const spinVal = document.getElementById('setpiece-spin-val');
    if (spinSlider) {
      spinSlider.addEventListener('input', () => {
        this.setPieceSpin = parseFloat(spinSlider.value);
        if (spinVal) {
          if (Math.abs(this.setPieceSpin) < 0.15) {
            spinVal.textContent = '무회전 (Knuckle)';
          } else if (this.setPieceSpin < 0) {
            spinVal.textContent = `좌측 감아차기 (${Math.abs(this.setPieceSpin).toFixed(1)}x)`;
          } else {
            spinVal.textContent = `우측 감아차기 (${this.setPieceSpin.toFixed(1)}x)`;
          }
        }
      });
    }

    const loftSlider = document.getElementById('setpiece-loft-slider') as HTMLInputElement | null;
    if (loftSlider) {
      loftSlider.addEventListener('input', () => {
        this.setPieceElevation = parseFloat(loftSlider.value);
      });
    }
  }

  private bindKeyboardEvents(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // Ignore keyboard shortcuts when typing into an input field (e.g., room code input)
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.repeat) return;
      this.keys.add(e.code);

      // 1P Key Bindings (WASD + Space/J/K/L/LeftShift/E)
      if (e.code === 'ShiftLeft' || (!this.isLocalCoop && e.code === 'ShiftRight')) {
        this.isSprinting = true;
      }
      if (e.code === 'Space' || e.code === 'KeyJ') {
        if (this.isDefenseContext) {
          this.triggerSlideTackle = true;
        } else {
          this.isChargingShot = true;
          this.shotPower = 0.3;
        }
      }
      if (e.code === 'KeyK') {
        if (this.isDefenseContext) {
          this.isPressingDefense = true;
        } else {
          this.triggerPass = true;
        }
      }
      if (e.code === 'KeyL') {
        if (this.isDefenseContext) {
          this.triggerSwitchPlayer = true;
        } else {
          this.triggerThrough = true;
        }
      }
      if (e.code === 'KeyE') {
        this.triggerSkillOrTactics = true;
      }

      // 2P Key Bindings (when Local 2P Co-op is active: Arrow Keys + Enter/Numpad1/Slash shoot, Numpad2/Period/M pass, Numpad3/Comma/N through, RightShift sprint, Numpad0/Quote skill)
      if (this.isLocalCoop && !this.isOnlineCoopHost) {
        if (e.code === 'ShiftRight' || e.code === 'NumpadAdd') {
          this.p2.isSprinting = true;
        }
        if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Numpad1' || e.code === 'Slash') {
          e.preventDefault();
          if (this.isDefenseContext) {
            this.p2.triggerSlideTackle = true;
          } else {
            this.p2.isChargingShot = true;
            this.p2.shotPower = 0.3;
          }
        }
        if (e.code === 'Numpad2' || e.code === 'Period' || e.code === 'KeyM') {
          if (this.isDefenseContext) {
            this.p2.isPressingDefense = true;
          } else {
            this.p2.triggerPass = true;
          }
        }
        if (e.code === 'Numpad3' || e.code === 'Comma' || e.code === 'KeyN') {
          if (this.isDefenseContext) {
            this.p2.triggerSwitchPlayer = true;
          } else {
            this.p2.triggerThrough = true;
          }
        }
        if (e.code === 'Numpad0' || e.code === 'Quote') {
          this.p2.triggerSkillOrTactics = true;
        }
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.keys.delete(e.code);

      if (e.code === 'ShiftLeft' || (!this.isLocalCoop && e.code === 'ShiftRight')) {
        this.isSprinting = false;
      }
      if (e.code === 'Space' || e.code === 'KeyJ') {
        if (this.isChargingShot) {
          this.triggerShootWithPower = Math.max(0.35, this.shotPower);
          this.isChargingShot = false;
          this.shotPower = 0;
        }
      }
      if (e.code === 'KeyK') {
        this.isPressingDefense = false;
      }

      if (this.isLocalCoop && !this.isOnlineCoopHost) {
        if (e.code === 'ShiftRight' || e.code === 'NumpadAdd') {
          this.p2.isSprinting = false;
        }
        if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Numpad1' || e.code === 'Slash') {
          if (this.p2.isChargingShot) {
            this.p2.triggerShootWithPower = Math.max(0.35, this.p2.shotPower);
            this.p2.isChargingShot = false;
            this.p2.shotPower = 0;
          }
        }
        if (e.code === 'Numpad2' || e.code === 'Period' || e.code === 'KeyM') {
          this.p2.isPressingDefense = false;
        }
      }
    });
  }
}
