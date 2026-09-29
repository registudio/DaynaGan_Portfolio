import type { Action } from './store.ts';

/** Unified keyboard / mouse / gamepad / touch input. Poll once per frame. */
export class Input {
  keys: Record<Action, string[]>;
  private down = new Set<string>();
  private pressed = new Set<Action>();
  private held = new Set<Action>();
  /** Virtual joystick from touch UI, -1..1. */
  stick = { x: 0, y: 0 };
  /** Mouse position in normalised device coords, or null if the mouse hasn't moved. */
  pointer: { x: number; y: number } | null = null;
  usingPointer = false;
  /** Whether the latest attack came from a mouse button (aim at cursor) or a key/pad/touch (auto-aim). */
  attackFromMouse = false;
  private prevPad = new Set<string>();
  private el: HTMLElement;
  enabled = true;
  /** Most recently used input device (drives on-screen glyphs). */
  device: 'keyboard' | 'gamepad' | 'touch' = 'keyboard';

  constructor(el: HTMLElement, keys: Record<Action, string[]>) {
    this.el = el;
    this.keys = keys;
    addEventListener('keydown', this.onKeyDown);
    addEventListener('keyup', this.onKeyUp);
    addEventListener('blur', this.onBlur);
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('contextmenu', this.prevent);
  }

  dispose() {
    removeEventListener('keydown', this.onKeyDown);
    removeEventListener('keyup', this.onKeyUp);
    removeEventListener('blur', this.onBlur);
    this.el.removeEventListener('pointermove', this.onPointerMove);
    this.el.removeEventListener('pointerdown', this.onPointerDown);
    this.el.removeEventListener('pointerup', this.onPointerUp);
    this.el.removeEventListener('contextmenu', this.prevent);
  }

  private prevent = (e: Event) => e.preventDefault();

  private actionFor(code: string): Action | null {
    for (const [action, codes] of Object.entries(this.keys) as [Action, string[]][])
      if (codes.includes(code)) return action;
    return null;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
    const action = this.actionFor(e.code);
    if (!action) return;
    if (action !== 'pause' && !this.enabled) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    this.device = 'keyboard';
    if (!this.down.has(e.code)) this.pressed.add(action);
    if (action === 'melee' || action === 'zap') this.attackFromMouse = false;
    this.down.add(e.code);
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.down.delete(e.code);
  };
  private onBlur = () => {
    this.down.clear();
    this.held.clear();
  };
  private onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const r = this.el.getBoundingClientRect();
    this.pointer = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 };
    this.usingPointer = true;
  };
  private onPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || !this.enabled) return;
    this.onPointerMove(e);
    const action: Action = e.button === 2 ? 'zap' : 'melee';
    this.attackFromMouse = true;
    this.pressed.add(action);
    this.held.add(action);
  };
  private onPointerUp = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    this.held.delete(e.button === 2 ? 'zap' : 'melee');
  };

  /** Called by the touch UI. */
  press(action: Action) {
    this.pressed.add(action);
    if (this.stick.x || this.stick.y || matchMedia('(pointer: coarse)').matches) this.device = 'touch';
  }
  hold(action: Action, on: boolean) {
    this.device = 'touch';
    if (action === 'melee' || action === 'zap') this.attackFromMouse = false;
    if (on) {
      this.pressed.add(action);
      this.held.add(action);
    } else this.held.delete(action);
  }

  isDown(action: Action) {
    return this.keys[action].some((c) => this.down.has(c)) || this.held.has(action);
  }

  /** Movement vector in screen space (x right, y up), length ≤ 1. */
  move(): { x: number; y: number } {
    let x = (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0);
    let y = (this.isDown('up') ? 1 : 0) - (this.isDown('down') ? 1 : 0);
    x += this.stick.x;
    y += this.stick.y;
    const pad = this.gamepad();
    if (pad) {
      const [ax = 0, ay = 0] = pad.axes;
      if (Math.hypot(ax, ay) > 0.18) {
        this.device = 'gamepad';
        x += ax;
        y -= ay;
      }
    }
    const len = Math.hypot(x, y);
    return len > 1 ? { x: x / len, y: y / len } : { x, y };
  }

  private gamepad(): Gamepad | null {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
    for (const p of navigator.getGamepads()) if (p && p.connected) return p;
    return null;
  }

  /** Actions pressed since the last call (edge-triggered). */
  consume(): Set<Action> {
    const pad = this.gamepad();
    if (pad) {
      const map: [number, Action][] = [
        [0, 'interact'],
        [2, 'melee'],
        [1, 'zap'],
        [7, 'zap'],
        [4, 'dash'],
        [5, 'dash'],
        [9, 'pause'],
        [12, 'artifact1'],
        [15, 'artifact2'],
        [13, 'artifact3'],
        [14, 'artifact4'],
      ];
      const now = new Set<string>();
      for (const [i, action] of map) {
        if (pad.buttons[i]?.pressed) {
          now.add(`${i}`);
          this.device = 'gamepad';
          if (!this.prevPad.has(`${i}`) && (this.enabled || action === 'pause')) this.pressed.add(action);
        }
      }
      this.prevPad = now;
    }
    const out = new Set(this.pressed);
    this.pressed.clear();
    return out;
  }
}
