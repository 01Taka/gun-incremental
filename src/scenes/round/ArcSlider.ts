import Phaser from "phaser";

import { addCrispText } from "../../utils/text";

export interface ArcSliderOptions {
  centerX: number;
  centerY: number;
  radius: number;
  trackWidth: number;
  startAngleDeg: number; // 例: 185度 (左下)
  endAngleDeg: number; // 例: 265度 (右上)
  initialRatio?: number; // 0.0 〜 1.0 (デフォルト 0.5)
}

export class ArcSlider {
  private scene: Phaser.Scene;
  private options: ArcSliderOptions;

  public container: Phaser.GameObjects.Container;
  private trackGraphics: Phaser.GameObjects.Graphics;
  private knobContainer: Phaser.GameObjects.Container;
  private knobGraphics: Phaser.GameObjects.Graphics;
  private labelText?: Phaser.GameObjects.Text;

  // 0.0 (左端) 〜 1.0 (右端)
  public ratio: number = 0.5;
  public isDragging: boolean = false;
  private activePointerId: number | null = null;

  // キーボード対応
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private adKeys?: {
    A: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  constructor(scene: Phaser.Scene, options: ArcSliderOptions) {
    this.scene = scene;
    this.options = options;
    this.ratio = options.initialRatio ?? 0.5;

    this.container = this.scene.add.container(0, 0).setDepth(85);

    // トラックグラフィックス
    this.trackGraphics = this.scene.add.graphics();
    this.container.add(this.trackGraphics);

    // ノブ（つまみ）
    this.knobContainer = this.scene.add.container(0, 0);
    this.knobGraphics = this.scene.add.graphics();
    this.knobContainer.add(this.knobGraphics);
    this.container.add(this.knobContainer);

    // スライダーラベル
    const labelAngleDeg = (this.options.startAngleDeg + this.options.endAngleDeg) / 2;
    const labelRad = Phaser.Math.DegToRad(labelAngleDeg);
    const labelDist = this.options.radius - 42;
    const lx = this.options.centerX + Math.cos(labelRad) * labelDist;
    const ly = this.options.centerY + Math.sin(labelRad) * labelDist;

    this.labelText = addCrispText(this.scene, lx, ly, "AIM METER", {
      fontSize: "14px",
      fontFamily: "monospace",
      fontStyle: "bold",
      color: "#38bdf8",
    }).setOrigin(0.5);
    this.container.add(this.labelText);

    this.drawTrack();
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
    const { centerX, centerY, radius, trackWidth, startAngleDeg, endAngleDeg } = this.options;
    const g = this.trackGraphics;
    g.clear();

    const startRad = Phaser.Math.DegToRad(startAngleDeg);
    const endRad = Phaser.Math.DegToRad(endAngleDeg);

    // 1. 背景の帯（太い円弧）
    g.lineStyle(trackWidth, 0x0f172a, 0.9);
    g.beginPath();
    g.arc(centerX, centerY, radius, startRad, endRad, false);
    g.strokePath();

    // 2. 外側・内側のネオン枠線
    const halfW = trackWidth / 2;
    g.lineStyle(2, 0x1e293b, 1.0);
    g.beginPath();
    g.arc(centerX, centerY, radius - halfW, startRad, endRad, false);
    g.strokePath();

    g.lineStyle(2, 0x1e293b, 1.0);
    g.beginPath();
    g.arc(centerX, centerY, radius + halfW, startRad, endRad, false);
    g.strokePath();

    // 3. アクティブなネオンガイドライン（弧の中央線）
    g.lineStyle(2, 0x0284c7, 0.45);
    g.beginPath();
    g.arc(centerX, centerY, radius, startRad, endRad, false);
    g.strokePath();

    // 4. 目盛りドット・ラインの描画 (5分割)
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      const stepRatio = i / steps;
      const deg = startAngleDeg + (endAngleDeg - startAngleDeg) * stepRatio;
      const rad = Phaser.Math.DegToRad(deg);

      const rInner = radius - halfW + 3;
      const rOuter = radius + halfW - 3;
      const x1 = centerX + Math.cos(rad) * rInner;
      const y1 = centerY + Math.sin(rad) * rInner;
      const x2 = centerX + Math.cos(rad) * rOuter;
      const y2 = centerY + Math.sin(rad) * rOuter;

      const isMajor = i === 0 || i === steps / 2 || i === steps;
      g.lineStyle(isMajor ? 2.5 : 1.5, isMajor ? 0x38bdf8 : 0x475569, isMajor ? 0.9 : 0.6);
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.strokePath();
    }
  }

  private drawKnob(isHot: boolean): void {
    const g = this.knobGraphics;
    g.clear();

    const knobRadius = isHot ? 24 : 20;

    // 外側の光彩
    g.fillStyle(0x38bdf8, isHot ? 0.4 : 0.2);
    g.fillCircle(0, 0, knobRadius + 6);

    // メインボディ
    g.fillStyle(isHot ? 0x0284c7 : 0x0f172a, 1.0);
    g.fillCircle(0, 0, knobRadius);

    // ボーダー
    g.lineStyle(3, isHot ? 0x38bdf8 : 0x38bdf8, 1.0);
    g.strokeCircle(0, 0, knobRadius);

    // 中心のドット
    g.fillStyle(0xffffff, isHot ? 1.0 : 0.85);
    g.fillCircle(0, 0, 7);
  }

  public updateKnobPosition(): void {
    const { centerX, centerY, radius, startAngleDeg, endAngleDeg } = this.options;
    const currentDeg = startAngleDeg + (endAngleDeg - startAngleDeg) * this.ratio;
    const rad = Phaser.Math.DegToRad(currentDeg);

    const kx = centerX + Math.cos(rad) * radius;
    const ky = centerY + Math.sin(rad) * radius;

    this.knobContainer.setPosition(kx, ky);
  }

  public handlePointerDown(pointer: Phaser.Input.Pointer): boolean {
    if (this.activePointerId !== null) return false;

    const { centerX, centerY, radius, trackWidth } = this.options;
    const dx = pointer.x - centerX;
    const dy = pointer.y - centerY;
    const dist = Math.hypot(dx, dy);

    // 半径方向のタッチ許容範囲（トラック幅 + 余裕マージン）
    const tolerance = trackWidth + 50;
    if (Math.abs(dist - radius) > tolerance) {
      return false;
    }

    // 角度の計算
    const hitRatio = this.calculateRatioFromPosition(pointer.x, pointer.y);
    if (hitRatio === null) {
      return false;
    }

    this.activePointerId = pointer.id;
    this.isDragging = true;
    this.ratio = hitRatio;
    this.drawKnob(true);
    this.updateKnobPosition();
    return true;
  }

  public handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) return;

    const hitRatio = this.calculateRatioFromPosition(pointer.x, pointer.y);
    if (hitRatio !== null) {
      this.ratio = hitRatio;
      this.updateKnobPosition();
    }
  }

  public handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) return;

    this.activePointerId = null;
    this.isDragging = false;
    this.drawKnob(false);
  }

  private calculateRatioFromPosition(px: number, py: number): number | null {
    const { centerX, centerY, startAngleDeg, endAngleDeg } = this.options;
    const dx = px - centerX;
    const dy = py - centerY;

    const rad = Math.atan2(dy, dx);
    let deg = Phaser.Math.RadToDeg(rad);
    if (deg < 0) {
      deg += 360;
    }

    // 許容角度マージン
    const margin = 20;
    const minDeg = Math.min(startAngleDeg, endAngleDeg) - margin;
    const maxDeg = Math.max(startAngleDeg, endAngleDeg) + margin;

    if (deg < minDeg || deg > maxDeg) {
      return null;
    }

    const clampedDeg = Phaser.Math.Clamp(deg, startAngleDeg, endAngleDeg);
    return (clampedDeg - startAngleDeg) / (endAngleDeg - startAngleDeg);
  }

  public update(deltaSeconds: number): void {
    // キーボード操作での微調整サポート (A / D, 左右矢印)
    let keyInput = 0;
    if (this.cursors && this.adKeys) {
      if (this.cursors.left.isDown || this.adKeys.A.isDown) keyInput -= 1;
      if (this.cursors.right.isDown || this.adKeys.D.isDown) keyInput += 1;
    }

    if (keyInput !== 0 && !this.isDragging) {
      const speed = 0.8; // 1秒間で0.8移動
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
