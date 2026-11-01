import Phaser from "phaser";

import { addCrispText } from "../../utils/text";

export interface VerticalSliderOptions {
  defaultCenterX: number;
  defaultCenterY: number;
  halfLength: number; // 上下に伸びる半分の長さ (例: 160px)
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
      .setAlpha(0.6);

    // 1. トラックグラフィックス
    this.trackGraphics = this.scene.add.graphics();
    this.container.add(this.trackGraphics);

    // 2. 中央基準線グラフィックス
    this.centerLineGraphics = this.scene.add.graphics();
    this.container.add(this.centerLineGraphics);

    // 3. ラベル（上: RIGHT, 下: LEFT, 中央: CENTER）
    const halfL = options.halfLength;
    this.topLabel = addCrispText(this.scene, 0, -halfL - 22, "▲ RIGHT", {
      fontSize: "14px",
      fontFamily: "monospace",
      fontStyle: "bold",
      color: "#38bdf8",
    }).setOrigin(0.5);

    this.bottomLabel = addCrispText(this.scene, 0, halfL + 22, "▼ LEFT", {
      fontSize: "14px",
      fontFamily: "monospace",
      fontStyle: "bold",
      color: "#38bdf8",
    }).setOrigin(0.5);

    this.centerLabel = addCrispText(this.scene, 42, 0, "◄ CENTER", {
      fontSize: "12px",
      fontFamily: "monospace",
      color: "#64748b",
    }).setOrigin(0, 0.5);

    this.container.add([this.topLabel, this.bottomLabel, this.centerLabel]);

    // 4. ノブ（スライダーのつまみ）
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

    // 背景帯
    g.fillStyle(0x0f172a, 0.85);
    g.fillRoundedRect(-halfW, -halfLength, trackWidth, halfLength * 2, 8);

    // 外枠
    g.lineStyle(2, 0x1e293b, 1.0);
    g.strokeRoundedRect(-halfW, -halfLength, trackWidth, halfLength * 2, 8);

    // 縦の中心ガイドライン
    g.lineStyle(1.5, 0x0284c7, 0.4);
    g.beginPath();
    g.moveTo(0, -halfLength + 6);
    g.lineTo(0, halfLength - 6);
    g.strokePath();

    // 目盛り（Ticks）
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const y = -halfLength + (halfLength * 2 * i) / steps;
      const isCenter = i === steps / 2;
      g.lineStyle(isCenter ? 2 : 1, isCenter ? 0x38bdf8 : 0x475569, isCenter ? 0.9 : 0.5);
      g.beginPath();
      g.moveTo(-halfW + 3, y);
      g.lineTo(halfW - 3, y);
      g.strokePath();
    }
  }

  private drawCenterLine(): void {
    const g = this.centerLineGraphics;
    g.clear();

    // 中央基準線の強調表示
    g.lineStyle(2, 0x38bdf8, 0.8);
    g.beginPath();
    g.moveTo(-28, 0);
    g.lineTo(28, 0);
    g.strokePath();

    g.fillStyle(0x38bdf8, 1);
    g.fillCircle(0, 0, 4);
  }

  private drawKnob(isHot: boolean): void {
    const g = this.knobGraphics;
    g.clear();

    const w = isHot ? 54 : 46;
    const h = isHot ? 20 : 16;

    // 外側グロー
    g.fillStyle(0x38bdf8, isHot ? 0.4 : 0.2);
    g.fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 6);

    // メインボディ
    g.fillStyle(isHot ? 0x0284c7 : 0x1e293b, 1.0);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 4);

    // 枠線
    g.lineStyle(2, isHot ? 0x38bdf8 : 0x0284c7, 1.0);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 4);

    // グリップライン
    g.fillStyle(0xffffff, isHot ? 1.0 : 0.8);
    g.fillRect(-10, -2, 20, 4);
  }

  private updateKnobPosition(): void {
    const { halfLength } = this.options;
    // ratio: 0.0 (下端 +halfLength) 〜 0.5 (中央 0) 〜 1.0 (上端 -halfLength)
    const localY = (0.5 - this.ratio) * (halfLength * 2);
    this.knobContainer.setPosition(0, localY);
  }

  /**
   * 画面下部エリアのタッチ判定
   */
  public handlePointerDown(pointer: Phaser.Input.Pointer): boolean {
    if (this.activePointerId !== null) return false;

    // 操作領域判定（y > 1030 の下部コントロール領域全体で受け付ける）
    if (pointer.y <= 1030) {
      return false;
    }

    this.activePointerId = pointer.id;
    this.isDragging = true;

    // ★ タッチした位置をスライダーの中央（基準点）にする
    this.startY = pointer.y;
    this.currentCenterX = pointer.x;
    this.currentCenterY = pointer.y;

    // 画面外にはみ出さないよう微調整
    const marginY = this.options.halfLength + 30;
    this.currentCenterY = Phaser.Math.Clamp(this.currentCenterY, 1040 + marginY, 1600 - marginY);
    this.currentCenterX = Phaser.Math.Clamp(this.currentCenterX, 80, 820);

    this.container.setPosition(this.currentCenterX, this.currentCenterY);
    this.container.setAlpha(1.0);

    // ★ 次にタップした時はその位置が基準となるため、銃が中央（ratio = 0.5）に戻る！
    this.ratio = 0.5;
    this.drawKnob(true);
    this.updateKnobPosition();

    return true;
  }

  public handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) return;

    const { halfLength } = this.options;
    // 上へドラッグ（pointer.y < startY） -> deltaY < 0 -> ratio > 0.5 (右向き)
    // 下へドラッグ（pointer.y > startY） -> deltaY > 0 -> ratio < 0.5 (左向き)
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
    this.container.setAlpha(0.7);

    // ★ 指を離しても銃の角度（ratio）はそのまま維持される！
  }

  public update(deltaSeconds: number): void {
    // キーボード操作サポート (A / D, 左右・上下矢印)
    let keyInput = 0;
    if (this.cursors && this.adKeys) {
      if (this.cursors.left.isDown || this.adKeys.A.isDown || this.cursors.down.isDown)
        keyInput -= 1;
      if (this.cursors.right.isDown || this.adKeys.D.isDown || this.cursors.up.isDown)
        keyInput += 1;
    }

    if (keyInput !== 0 && !this.isDragging) {
      const speed = 0.72; // 感度20%減少 (0.9 -> 0.72)
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
