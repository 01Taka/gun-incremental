import Phaser from "phaser";

import { addCrispText } from "../../utils/text";

export interface VerticalSliderOptions {
  defaultCenterX: number;
  defaultCenterY: number;
  halfLength: number; // 上下に伸びる半分の長さ (例: 188px)
  trackWidth: number; // トラック幅 (例: 20px)
}

export class VerticalSlider {
  private scene: Phaser.Scene;
  private options: VerticalSliderOptions;

  public container: Phaser.GameObjects.Container;
  private trackGraphics: Phaser.GameObjects.Graphics;
  private knobContainer: Phaser.GameObjects.Container;
  private knobGraphics: Phaser.GameObjects.Graphics;
  private centerLineGraphics: Phaser.GameObjects.Graphics;

  private topLabel!: Phaser.GameObjects.Text;
  private bottomLabel!: Phaser.GameObjects.Text;
  private centerLabel!: Phaser.GameObjects.Text;

  // 0.0 (下端・左向き) 〜 0.5 (中央・正面) 〜 1.0 (上端・右向き)
  public ratio: number = 0.5;
  public isDragging: boolean = false;
  private activePointerId: number | null = null;
  private startY: number = 0;

  // 現在のスライダー表示中心座標
  private currentCenterX: number;
  private currentCenterY: number;

  // キーボード
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private adKeys?: {
    A: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  constructor(scene: Phaser.Scene, options: VerticalSliderOptions) {
    this.scene = scene;
    this.options = options;
    this.currentCenterX = options.defaultCenterX;
    this.currentCenterY = options.defaultCenterY;
    this.startY = options.defaultCenterY;

    this.container = this.scene.add
      .container(this.currentCenterX, this.currentCenterY)
      .setDepth(85)
      .setAlpha(0.72);

    // 1. トラックグラフィックス
    this.trackGraphics = this.scene.add.graphics();
    this.container.add(this.trackGraphics);

    // 2. 中央基準線グラフィックス
    this.centerLineGraphics = this.scene.add.graphics();
    this.container.add(this.centerLineGraphics);

    // 3. ラベル（上: 右照準, 下: 左照準, 中央: 正面）
    const halfL = options.halfLength;
    this.topLabel = addCrispText(this.scene, 0, -halfL - 22, "▲ RIGHT", {
      fontSize: "14px",
      fontFamily: "monospace",
      fontStyle: "bold",
      color: "#fbbf24",
    }).setOrigin(0.5);

    this.bottomLabel = addCrispText(this.scene, 0, halfL + 22, "▼ LEFT", {
      fontSize: "14px",
      fontFamily: "monospace",
      fontStyle: "bold",
      color: "#fbbf24",
    }).setOrigin(0.5);

    this.centerLabel = addCrispText(this.scene, 42, 0, "◄ 正面", {
      fontSize: "13px",
      color: "#d6b384",
    }).setOrigin(0, 0.5);

    this.container.add([this.topLabel, this.bottomLabel, this.centerLabel]);

    // 4. ノブ（真鍮と革のレバーつまみ）
    this.knobContainer = this.scene.add.container(0, 0);
    this.knobGraphics = this.scene.add.graphics();
    this.knobContainer.add(this.knobGraphics);
    this.container.add(this.knobContainer);

    this.drawTrack();
    this.drawCenterLine();
    this.drawKnob(false);
    this.updateKnobPosition();

    // キーボード設定
    if (this.scene.input.keyboard) {
      this.cursors = this.scene.input.keyboard.createCursorKeys();
      this.adKeys = {
        A: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        D: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }
  }

  private drawTrack(): void {
    const { halfLength, trackWidth } = this.options;
    const g = this.trackGraphics;
    g.clear();

    const halfW = trackWidth / 2;

    // 革・木製レール帯
    g.fillStyle(0x211107, 0.9);
    g.fillRoundedRect(-halfW, -halfLength, trackWidth, halfLength * 2, 8);

    // 真鍮外枠
    g.lineStyle(2, 0x92400e, 1.0);
    g.strokeRoundedRect(-halfW, -halfLength, trackWidth, halfLength * 2, 8);

    // 縦の中心真鍮ガイド溝
    g.lineStyle(1.5, 0xd97706, 0.45);
    g.beginPath();
    g.moveTo(0, -halfLength + 6);
    g.lineTo(0, halfLength - 6);
    g.strokePath();

    // 目盛り（真鍮刻み）
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const y = -halfLength + (halfLength * 2 * i) / steps;
      const isCenter = i === steps / 2;
      g.lineStyle(isCenter ? 2 : 1, isCenter ? 0xfbbf24 : 0x78350f, isCenter ? 0.95 : 0.65);
      g.beginPath();
      g.moveTo(-halfW + 3, y);
      g.lineTo(halfW - 3, y);
      g.strokePath();
    }
  }

  private drawCenterLine(): void {
    const g = this.centerLineGraphics;
    g.clear();

    g.lineStyle(2, 0xd97706, 0.85);
    g.beginPath();
    g.moveTo(-28, 0);
    g.lineTo(28, 0);
    g.strokePath();

    g.fillStyle(0xfbbf24, 1);
    g.fillCircle(0, 0, 4);
  }

  private drawKnob(isHot: boolean): void {
    const g = this.knobGraphics;
    g.clear();

    const w = isHot ? 54 : 46;
    const h = isHot ? 20 : 16;

    // 外側アンバーグロー
    g.fillStyle(0xf59e0b, isHot ? 0.35 : 0.16);
    g.fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 6);

    // メインボディ（サドルレザー＆真鍮プレート）
    g.fillStyle(isHot ? 0xb45309 : 0x3b1d0c, 1.0);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 4);

    // 枠線
    g.lineStyle(2, isHot ? 0xfef08a : 0xd97706, 1.0);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 4);

    // 中央の真鍮リベット溝
    g.fillStyle(0xfef3c7, isHot ? 1.0 : 0.8);
    g.fillRect(-10, -2, 20, 4);
  }

  private updateKnobPosition(): void {
    const { halfLength } = this.options;
    const localY = (0.5 - this.ratio) * (halfLength * 2);
    this.knobContainer.setPosition(0, localY);
  }

  /**
   * 画面内の任意の位置でのタッチ判定
   */
  public handlePointerDown(pointer: Phaser.Input.Pointer): boolean {
    if (this.activePointerId !== null) return false;

    this.activePointerId = pointer.id;
    this.isDragging = true;

    this.startY = pointer.y;

    if (pointer.y >= 1040) {
      this.currentCenterX = pointer.x;
      this.currentCenterY = pointer.y;
      const marginY = this.options.halfLength + 30;
      this.currentCenterY = Phaser.Math.Clamp(this.currentCenterY, 1040 + marginY, 1600 - marginY);
      this.currentCenterX = Phaser.Math.Clamp(this.currentCenterX, 80, 820);
    } else {
      this.currentCenterX = this.options.defaultCenterX;
      this.currentCenterY = this.options.defaultCenterY;
    }

    this.container.setPosition(this.currentCenterX, this.currentCenterY);
    this.container.setAlpha(1.0);

    this.ratio = 0.5;
    this.drawKnob(true);
    this.updateKnobPosition();

    return true;
  }

  public handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) return;

    const { halfLength } = this.options;
    const deltaY = pointer.y - this.startY;
    const dragRatio = deltaY / (halfLength * 2);

    this.ratio = Phaser.Math.Clamp(0.5 - dragRatio, 0.0, 1.0);
    this.updateKnobPosition();
  }

  public handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) return;

    this.activePointerId = null;
    this.isDragging = false;
    this.drawKnob(false);
    this.container.setAlpha(0.75);
  }

  public update(deltaSeconds: number): void {
    let keyInput = 0;
    if (this.cursors && this.adKeys) {
      if (this.cursors.left.isDown || this.adKeys.A.isDown || this.cursors.down.isDown)
        keyInput -= 1;
      if (this.cursors.right.isDown || this.adKeys.D.isDown || this.cursors.up.isDown)
        keyInput += 1;
    }

    if (keyInput !== 0 && !this.isDragging) {
      const speed = 0.72;
      this.ratio = Phaser.Math.Clamp(this.ratio + keyInput * speed * deltaSeconds, 0, 1);
      this.updateKnobPosition();
    }
  }

  public setRatio(ratio: number): void {
    this.ratio = Phaser.Math.Clamp(ratio, 0, 1);
    this.updateKnobPosition();
  }

  public destroy(): void {
    this.container.destroy();
  }
}
