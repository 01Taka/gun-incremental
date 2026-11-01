import Phaser from "phaser";

import type { ArenaBounds, StickState } from "./types";

export class ReticleManager {
  private scene: Phaser.Scene;
  private bounds: ArenaBounds;

  public x: number;
  public y: number;
  public readonly radius: number = 28;
  public readonly speed: number = 850; // px/s

  private container: Phaser.GameObjects.Container;
  private innerRing: Phaser.GameObjects.Graphics;

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  constructor(scene: Phaser.Scene, bounds: ArenaBounds, initialX: number, initialY: number) {
    this.scene = scene;
    this.bounds = bounds;
    this.x = initialX;
    this.y = initialY;

    this.container = this.scene.add.container(initialX, initialY).setDepth(100);

    const outerRing = this.scene.add.image(0, 0, "reticle");
    this.innerRing = this.scene.add.graphics();
    this.updateVisual(false);

    this.container.add([outerRing, this.innerRing]);

    if (this.scene.input.keyboard) {
      this.cursors = this.scene.input.keyboard.createCursorKeys();
      this.wasdKeys = {
        W: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }
  }

  public updateVisual(isLocked: boolean): void {
    this.innerRing.clear();
    if (isLocked) {
      this.innerRing.lineStyle(2, 0xef4444, 0.9);
      this.innerRing.strokeCircle(0, 0, this.radius + 4);

      this.innerRing.lineStyle(3, 0xfacc15, 1);
      const b = 18;
      this.innerRing.strokeRect(-b, -b, b * 2, b * 2);
    } else {
      this.innerRing.lineStyle(1.5, 0x38bdf8, 0.4);
      this.innerRing.strokeCircle(0, 0, this.radius);
    }
  }

  public update(
    deltaSeconds: number,
    stickState: StickState,
    autoAimTargetPos?: { x: number; y: number } | null,
  ): void {
    let moveX = stickState.x;
    let moveY = stickState.y;

    if (this.cursors && this.wasdKeys) {
      if (this.cursors.left.isDown || this.wasdKeys.A.isDown) moveX -= 1;
      if (this.cursors.right.isDown || this.wasdKeys.D.isDown) moveX += 1;
      if (this.cursors.up.isDown || this.wasdKeys.W.isDown) moveY -= 1;
      if (this.cursors.down.isDown || this.wasdKeys.S.isDown) moveY += 1;
    }

    // オートエイム（スティック・キーボード無入力時）
    if (autoAimTargetPos && moveX === 0 && moveY === 0) {
      const angle = Phaser.Math.Angle.Between(
        this.x,
        this.y,
        autoAimTargetPos.x,
        autoAimTargetPos.y,
      );
      moveX = Math.cos(angle) * 0.95;
      moveY = Math.sin(angle) * 0.95;
    }

    const inputMagnitude = Math.hypot(moveX, moveY);
    if (inputMagnitude > 1.0) {
      moveX /= inputMagnitude;
      moveY /= inputMagnitude;
    }

    if (inputMagnitude > 0.05) {
      this.x += moveX * this.speed * deltaSeconds;
      this.y += moveY * this.speed * deltaSeconds;

      this.x = Phaser.Math.Clamp(this.x, this.bounds.left + 15, this.bounds.right - 15);
      this.y = Phaser.Math.Clamp(this.y, this.bounds.top + 15, this.bounds.bottom - 15);
    }

    this.container.setPosition(this.x, this.y);
  }

  public destroy(): void {
    this.container.destroy();
  }
}
