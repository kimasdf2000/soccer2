import * as THREE from 'three';

export class TouchController {
  public moveVec: THREE.Vector2 = new THREE.Vector2(0, 0);
  public isSprinting: boolean = false;
  public isChargingShot: boolean = false;
  public shotPower: number = 0; // 0.0 to 1.0

  // One-shot action triggers consumed by Game loop
  public triggerShootWithPower: number | null = null;
  public triggerPass: boolean = false;
  public triggerThrough: boolean = false;
  public triggerSlideTackle: boolean = false;
  public triggerSwitchPlayer: boolean = false;
  public isPressingDefense: boolean = false;

  // Set-piece specific controls (Free Kick & Penalty Kick)
  public setPieceSpin: number = 0; // -1.5 (Left Curve) to +1.5 (Right Curve)
  public setPieceElevation: number = 0.55; // 0.2 (Low Driven) to 1.0 (High Loft/Top Corner)

  private keys: Set<string> = new Set();
  private joyTouchId: number | null = null;
  private joyPointerDown: boolean = false;
  private joyCenter: { x: number; y: number } = { x: 0, y: 0 };
  private maxJoyRadius: number = 58;

  private joystickZone: HTMLElement;
  private joystickBase: HTMLElement;
  private joystickStick: HTMLElement;

  private isDefenseContext: boolean = false;

  constructor() {
    this.joystickZone = document.getElementById('joystick-zone')!;
    this.joystickBase = document.getElementById('joystick-base')!;
    this.joystickStick = document.getElementById('joystick-stick')!;

    this.bindJoystickEvents();
    this.bindActionButtons();
    this.bindSetPieceControls();
    this.bindKeyboardEvents();
  }

  public setContextMode(isDefense: boolean, isSetPiece: boolean): void {
    if (this.isDefenseContext === isDefense && !isSetPiece) return;
    this.isDefenseContext = isDefense;

    const btnShoot = document.getElementById('btn-shoot')!;
    const btnPass = document.getElementById('btn-pass')!;
    const btnThrough = document.getElementById('btn-through')!;

    if (isSetPiece) {
      btnShoot.innerHTML = `<span class="btn-icon">🎯</span><span class="btn-title">감아차기 슛</span><span class="btn-sub">HOLD 게이지</span>`;
      btnShoot.className = 'action-btn btn-shoot setpiece-glow';
      btnPass.innerHTML = `<span class="btn-icon">👟</span><span class="btn-title">짧은 패스</span><span class="btn-sub">전술 세트피스</span>`;
      btnPass.className = 'action-btn btn-pass';
      btnThrough.innerHTML = `<span class="btn-icon">🌀</span><span class="btn-title">무회전 강슛</span><span class="btn-sub">KNUCKLE</span>`;
      btnThrough.className = 'action-btn btn-through';
    } else if (isDefense) {
      btnShoot.innerHTML = `<span class="btn-icon">💥</span><span class="btn-title">슬라이딩 태클</span><span class="btn-sub">파울/카드 주의</span>`;
      btnShoot.className = 'action-btn btn-tackle';
      btnPass.innerHTML = `<span class="btn-icon">🛡️</span><span class="btn-title">압박 / 견제</span><span class="btn-sub">안전 수비</span>`;
      btnPass.className = 'action-btn btn-press';
      btnThrough.innerHTML = `<span class="btn-icon">🔄</span><span class="btn-title">선수 전환</span><span class="btn-sub">SWITCH</span>`;
      btnThrough.className = 'action-btn btn-switch';
    } else {
      btnShoot.innerHTML = `<span class="btn-icon">⚽</span><span class="btn-title">슛 (SHOOT)</span><span class="btn-sub">길게 눌러 파워</span>`;
      btnShoot.className = 'action-btn btn-shoot';
      btnPass.innerHTML = `<span class="btn-icon">👟</span><span class="btn-title">패스 (PASS)</span><span class="btn-sub">짧은 연결</span>`;
      btnPass.className = 'action-btn btn-pass';
      btnThrough.innerHTML = `<span class="btn-icon">⚡</span><span class="btn-title">스루 패스</span><span class="btn-sub">공간 침투</span>`;
      btnThrough.className = 'action-btn btn-through';
    }
  }

  public update(dt: number): void {
    // Combine keyboard movement if joystick is not actively touched
    if (this.joyTouchId === null && !this.joyPointerDown) {
      let kx = 0;
      let ky = 0;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) kx -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) kx += 1;
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) ky -= 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) ky += 1;

      if (kx !== 0 || ky !== 0) {
        const len = Math.hypot(kx, ky);
        this.moveVec.set(kx / len, ky / len);
        this.joystickStick.style.transform = `translate(${(kx / len) * 36}px, ${(ky / len) * 36}px)`;
      } else {
        this.moveVec.set(0, 0);
        this.joystickStick.style.transform = `translate(0px, 0px)`;
      }
    }

    // Charge shot power while holding Shoot
    if (this.isChargingShot) {
      this.shotPower = Math.min(1.0, this.shotPower + dt * 1.45);
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

    // Multi-touch events for Tablet
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

    // Mouse / Pointer fallback for Desktop testing
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

  private bindActionButtons(): void {
    const btnShoot = document.getElementById('btn-shoot')!;
    const btnPass = document.getElementById('btn-pass')!;
    const btnThrough = document.getElementById('btn-through')!;
    const btnSprint = document.getElementById('btn-sprint')!;

    const startShootOrTackle = (e: Event) => {
      e.preventDefault();
      if (this.isDefenseContext) {
        this.triggerSlideTackle = true;
      } else {
        this.isChargingShot = true;
        this.shotPower = 0.25;
      }
    };

    const endShootOrTackle = (e: Event) => {
      e.preventDefault();
      if (this.isChargingShot) {
        this.triggerShootWithPower = Math.max(0.3, this.shotPower);
        this.isChargingShot = false;
        this.shotPower = 0;
      }
    };

    btnShoot.addEventListener('touchstart', startShootOrTackle, { passive: false });
    btnShoot.addEventListener('touchend', endShootOrTackle, { passive: false });
    btnShoot.addEventListener('mousedown', startShootOrTackle);
    btnShoot.addEventListener('mouseup', endShootOrTackle);

    const startPassOrPress = (e: Event) => {
      e.preventDefault();
      if (this.isDefenseContext) {
        this.isPressingDefense = true;
      } else {
        this.triggerPass = true;
      }
    };
    const endPassOrPress = (e: Event) => {
      e.preventDefault();
      this.isPressingDefense = false;
    };

    btnPass.addEventListener('touchstart', startPassOrPress, { passive: false });
    btnPass.addEventListener('touchend', endPassOrPress, { passive: false });
    btnPass.addEventListener('mousedown', startPassOrPress);
    btnPass.addEventListener('mouseup', endPassOrPress);

    const onThroughOrSwitch = (e: Event) => {
      e.preventDefault();
      if (this.isDefenseContext) {
        this.triggerSwitchPlayer = true;
      } else {
        this.triggerThrough = true;
      }
    };
    btnThrough.addEventListener('touchstart', onThroughOrSwitch, { passive: false });
    btnThrough.addEventListener('mousedown', onThroughOrSwitch);

    const startSprint = (e: Event) => {
      e.preventDefault();
      this.isSprinting = true;
      btnSprint.classList.add('pressed');
    };
    const endSprint = (e: Event) => {
      e.preventDefault();
      this.isSprinting = false;
      btnSprint.classList.remove('pressed');
    };

    btnSprint.addEventListener('touchstart', startSprint, { passive: false });
    btnSprint.addEventListener('touchend', endSprint, { passive: false });
    btnSprint.addEventListener('mousedown', startSprint);
    btnSprint.addEventListener('mouseup', endSprint);
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
      if (e.repeat) return;
      this.keys.add(e.code);

      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
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
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.keys.delete(e.code);

      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
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
    });
  }
}
