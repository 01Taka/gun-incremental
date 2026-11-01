import type Phaser from "phaser";

import { useGameSettings } from "../../stores/useGameSettings";
import { addCrispText } from "../../utils/text";
import type { StickState } from "./types";

export interface VirtualJoystickOptions {
  originX: number;
  originY: number;
  baseRadius: number;
  knobRadius: number;
  maxRadius: number;
  deadZone: number;
  baseColor: number;
  borderColor: number;
  knobColor: number;
  label: string;
}

export class VirtualJoystick {
  private scene: Phaser.Scene;
  private options: VirtualJoystickOptions;

  public container: Phaser.GameObjects.Container;
  private baseBg: Phaser.GameObjects.Graphics;
  public label?: Phaser.GameObjects.Text;
  private knob: Phaser.GameObjects.Container;
  private knobGraphics: Phaser.GameObjects.Graphics;

  public pointerId: number | null = null;
  public baseX: number;
  public baseY: number;

  public readonly state: StickState = {
    x: 0,
    y: 0,
    active: false,
    angle: 0,
    force: 0,
  };

  constructor(scene: Phaser.Scene, options: VirtualJoystickOptions) {
    this.scene = scene;
    this.options = options;
    this.baseX = options.originX;
    this.baseY = options.originY;

    this.container = this.scene.add.container(options.originX, options.originY);
    this.baseBg = this.scene.add.graphics();
    this.container.add(this.baseBg);

    this.label = addCrispText(this.scene, 0, 0, options.label, {
      fontSize: "20px",
      fontFamily: "monospace",
      fontStyle: "bold",
      color: "#94a3b8",
    }).setOrigin(0.5);
    this.container.add(this.label);

    this.knob = this.scene.add.container(0, 0);
    this.knobGraphics = this.scene.add.graphics();
    this.knob.add(this.knobGraphics);
    this.container.add(this.knob);

    this.drawGraphics();
  }

  public drawGraphics(): void {
    if (this.label) {
      this.label.setVisible(true);
    }

    const { baseRadius, knobRadius, baseColor, borderColor, knobColor } = this.options;

    this.baseBg.clear();
    this.baseBg.fillStyle(baseColor, 0.55);
    this.baseBg.fillCircle(0, 0, baseRadius);
    this.baseBg.lineStyle(4, borderColor, 0.85);
    this.baseBg.strokeCircle(0, 0, baseRadius);
    this.baseBg.lineStyle(2, borderColor, 0.35);
    this.baseBg.strokeCircle(0, 0, baseRadius * 0.5);
    this.baseBg.lineStyle(1.5, borderColor, 0.3);
    this.baseBg.lineBetween(-baseRadius * 0.75, 0, baseRadius * 0.75, 0);
    this.baseBg.lineBetween(0, -baseRadius * 0.75, 0, baseRadius * 0.75);

    this.knobGraphics.clear();
    this.knobGraphics.fillStyle(knobColor, 0.9);
    this.knobGraphics.fillCircle(0, 0, knobRadius);
    this.knobGraphics.lineStyle(3.5, 0xffffff, 0.95);
    this.knobGraphics.strokeCircle(0, 0, knobRadius);
    this.knobGraphics.fillStyle(0xffffff, 0.85);
    this.knobGraphics.fillCircle(0, 0, 7);
  }

  public handlePointerDown(pointer: Phaser.Input.Pointer): boolean {
    if (this.pointerId !== null) return false;

    // 操作領域判定（y > 1180）
    if (pointer.y <= 1180) return false;

    this.pointerId = pointer.id;
    const isDynamic = useGameSettings.getState().joystickType === "dynamic";

    if (isDynamic) {
      this.scene.tweens.killTweensOf(this.container);
      this.baseX = pointer.x;
      this.baseY = pointer.y;
      this.container.setPosition(pointer.x, pointer.y);
    } else {
      this.baseX = this.options.originX;
      this.baseY = this.options.originY;
      this.container.setPosition(this.options.originX, this.options.originY);
    }

    this.container.setAlpha(1.0);
    this.handlePointerMove(pointer);
    return true;
  }

  public handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.pointerId) return;

    let dx = pointer.x - this.baseX;
    let dy = pointer.y - this.baseY;
    let distance = Math.hypot(dx, dy);
    let angle = Math.atan2(dy, dx);

    const isDynamic = useGameSettings.getState().joystickType === "dynamic";

    if (isDynamic && distance > this.options.maxRadius) {
      const excess = distance - this.options.maxRadius;
      this.baseX += Math.cos(angle) * excess;
      this.baseY += Math.sin(angle) * excess;
      this.container.setPosition(this.baseX, this.baseY);

      dx = pointer.x - this.baseX;
      dy = pointer.y - this.baseY;
      distance = Math.hypot(dx, dy);
      angle = Math.atan2(dy, dx);
    }

    const clampedDist = Math.min(distance, this.options.maxRadius);
    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    this.knob.setPosition(knobX, knobY);

    if (distance > this.options.deadZone) {
      const force = Math.min(distance / this.options.maxRadius, 1.0);
      this.state.x = Math.cos(angle) * force;
      this.state.y = Math.sin(angle) * force;
      this.state.active = true;
      this.state.angle = angle;
      this.state.force = force;
    } else {
      this.state.x = 0;
      this.state.y = 0;
      this.state.active = false;
      this.state.force = 0;
    }
  }

  public handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.pointerId) return;

    this.pointerId = null;
    this.state.x = 0;
    this.state.y = 0;
    this.state.active = false;
    this.state.force = 0;

    this.scene.tweens.killTweensOf(this.knob);
    this.scene.tweens.add({
      targets: this.knob,
      x: 0,
      y: 0,
      duration: 100,
      ease: "Sine.easeOut",
    });

    const isDynamic = useGameSettings.getState().joystickType === "dynamic";
    if (isDynamic) {
      this.scene.tweens.killTweensOf(this.container);
      this.scene.tweens.add({
        targets: this.container,
        x: this.options.originX,
        y: this.options.originY,
        alpha: 0.85,
        duration: 200,
        ease: "Sine.easeOut",
        onComplete: () => {
          this.baseX = this.options.originX;
          this.baseY = this.options.originY;
        },
      });
    } else {
      this.container.setAlpha(0.85);
    }
  }

  public destroy(): void {
    this.container.destroy();
  }
}
