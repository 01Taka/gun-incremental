import Phaser from "phaser";

import type { ActiveTarget, ArenaBounds } from "./types";

export class GunTurret {
  private scene: Phaser.Scene;
  private bounds: ArenaBounds;

  // 銃の配置座標（アリーナ底辺の中央）
  public readonly x: number;
  public readonly y: number;

  // 銃の角度（ラジアン）: -PI/2 (真上) を基準
  public angle: number = -Math.PI / 2;

  // 角度の可動範囲（真上を中心に左右約75度: -165度 〜 -15度）
  public readonly minAngle: number = Phaser.Math.DegToRad(-165);
  public readonly maxAngle: number = Phaser.Math.DegToRad(-15);

  // バレルの長さ（銃口までのオフセット）
  public readonly barrelLength: number = 48;

  // コンポーネント
  public container: Phaser.GameObjects.Container;
  private barrelContainer: Phaser.GameObjects.Container;
  private barrelGraphics: Phaser.GameObjects.Graphics;
  private baseGraphics: Phaser.GameObjects.Graphics;
  private laserSight: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, bounds: ArenaBounds) {
    this.scene = scene;
    this.bounds = bounds;

    // アリーナ底辺の中央
    this.x = bounds.left + bounds.size / 2;
    this.y = bounds.bottom - 10;

    this.container = this.scene.add.container(this.x, this.y).setDepth(80);

    // 1. レーザーサイト（照準ガイド線）
    this.laserSight = this.scene.add.graphics().setDepth(70);

    // 2. 台座ベースグラフィックス（回転しない）
    this.baseGraphics = this.scene.add.graphics();
    this.drawBase();
    this.container.add(this.baseGraphics);

    // 3. 回転するバレルコンテナ
    this.barrelContainer = this.scene.add.container(0, 0);
    this.barrelGraphics = this.scene.add.graphics();
    this.drawBarrel();
    this.barrelContainer.add(this.barrelGraphics);
    this.container.add(this.barrelContainer);

    this.setAimRatio(0.5);
  }

  private drawBase(): void {
    this.baseGraphics.clear();

    // メタリックベースの外枠
    this.baseGraphics.fillStyle(0x0f172a, 1.0);
    this.baseGraphics.fillCircle(0, 0, 36);
    this.baseGraphics.lineStyle(3, 0x1e293b, 1.0);
    this.baseGraphics.strokeCircle(0, 0, 36);

    // ネオンリング
    this.baseGraphics.lineStyle(2, 0x0284c7, 0.8);
    this.baseGraphics.strokeCircle(0, 0, 26);

    // コアプレート
    this.baseGraphics.fillStyle(0x1e293b, 1.0);
    this.baseGraphics.fillCircle(0, 0, 16);
    this.baseGraphics.lineStyle(2, 0x38bdf8, 1.0);
    this.baseGraphics.strokeCircle(0, 0, 16);
  }

  private drawBarrel(): void {
    this.barrelGraphics.clear();

    // 銃身（バレル本体）: 長さ48px、幅16px
    this.barrelGraphics.fillStyle(0x1e293b, 1.0);
    this.barrelGraphics.fillRoundedRect(0, -9, 42, 18, 4);
    this.barrelGraphics.lineStyle(2, 0x38bdf8, 1.0);
    this.barrelGraphics.strokeRoundedRect(0, -9, 42, 18, 4);

    // マズル先端
    this.barrelGraphics.fillStyle(0x0284c7, 1.0);
    this.barrelGraphics.fillRoundedRect(38, -6, 10, 12, 3);
    this.barrelGraphics.lineStyle(1.5, 0x38bdf8, 1.0);
    this.barrelGraphics.strokeRoundedRect(38, -6, 10, 12, 3);

    // エネルギーコアライン
    this.barrelGraphics.fillStyle(0x38bdf8, 0.9);
    this.barrelGraphics.fillRect(8, -2, 28, 4);
  }

  /**
   * メーター（スライダー）の比率 (0.0 〜 1.0) で銃の角度を直接設定
   */
  public setAimRatio(ratio: number): void {
    const clampedRatio = Phaser.Math.Clamp(ratio, 0.0, 1.0);
    this.angle = this.minAngle + (this.maxAngle - this.minAngle) * clampedRatio;
    this.updateRotation();
  }

  /**
   * 任意の目標角度からスライダー比率 (0.0 〜 1.0) を計算
   */
  public getRatioForAngle(angleRad: number): number {
    const clamped = Phaser.Math.Clamp(angleRad, this.minAngle, this.maxAngle);
    return (clamped - this.minAngle) / (this.maxAngle - this.minAngle);
  }

  private updateRotation(): void {
    this.barrelContainer.setRotation(this.angle);
  }

  /**
   * 銃口から前方に伸びる射線と的（円）の交差判定
   * 射線と重なっている的の中で、銃から最も近いものを返す
   */
  public checkRayIntersection(targets: ActiveTarget[]): ActiveTarget | null {
    const muzzle = this.getMuzzlePosition();
    const dirX = Math.cos(this.angle);
    const dirY = Math.sin(this.angle);

    let closestTarget: ActiveTarget | null = null;
    let minT = Infinity;

    for (const target of targets) {
      const vx = target.x - muzzle.x;
      const vy = target.y - muzzle.y;

      // 射線方向への射影長 t
      const t = vx * dirX + vy * dirY;
      if (t < 0) {
        // 的が銃口より後方にある場合は除外
        continue;
      }

      // 射線から的中心への垂直距離の2乗
      const distSq = vx * vx + vy * vy - t * t;
      const radiusWithMargin = target.def.radius + 4; // 少し余裕を持たせた当たり判定

      if (distSq <= radiusWithMargin * radiusWithMargin) {
        if (t < minT) {
          minT = t;
          closestTarget = target;
        }
      }
    }

    return closestTarget;
  }

  /**
   * 銃口から前方に伸びる照準レーザーサイトを高視認性で描画
   * （エイムが合っている時の過剰なハイライト演出は廃止）
   */
  public drawLaserSight(): void {
    this.laserSight.clear();
    const muzzle = this.getMuzzlePosition();

    const rayLength = 950;
    const endX = muzzle.x + Math.cos(this.angle) * rayLength;
    const endY = muzzle.y + Math.sin(this.angle) * rayLength;

    // 1. 外側のネオングロー (太さ 6px, シアン)
    this.laserSight.lineStyle(6, 0x38bdf8, 0.35);
    this.laserSight.beginPath();
    this.laserSight.moveTo(muzzle.x, muzzle.y);
    this.laserSight.lineTo(endX, endY);
    this.laserSight.strokePath();

    // 2. メインのエネルギービーム (太さ 3px, ディープブルー)
    this.laserSight.lineStyle(3, 0x0284c7, 0.85);
    this.laserSight.beginPath();
    this.laserSight.moveTo(muzzle.x, muzzle.y);
    this.laserSight.lineTo(endX, endY);
    this.laserSight.strokePath();

    // 3. 中心のシャープな高輝度コアライン (太さ 1.5px, 白)
    this.laserSight.lineStyle(1.5, 0xffffff, 0.95);
    this.laserSight.beginPath();
    this.laserSight.moveTo(muzzle.x, muzzle.y);
    this.laserSight.lineTo(endX, endY);
    this.laserSight.strokePath();

    // 銃口のマズルグロー
    this.laserSight.fillStyle(0x38bdf8, 0.5);
    this.laserSight.fillCircle(muzzle.x, muzzle.y, 8);
    this.laserSight.fillStyle(0xffffff, 0.9);
    this.laserSight.fillCircle(muzzle.x, muzzle.y, 4);
  }

  /**
   * 発射反動（キックバック）演出
   */
  public playRecoilAnimation(): void {
    this.scene.tweens.killTweensOf(this.barrelContainer);
    const backDist = 7;
    const offsetX = -Math.cos(this.angle) * backDist;
    const offsetY = -Math.sin(this.angle) * backDist;

    this.barrelContainer.setPosition(offsetX, offsetY);
    this.scene.tweens.add({
      targets: this.barrelContainer,
      x: 0,
      y: 0,
      duration: 80,
      ease: "Quad.easeOut",
    });

    // マズルフラッシュの瞬間閃光
    const muzzle = this.getMuzzlePosition();
    const flash = this.scene.add.graphics().setDepth(95);
    flash.fillStyle(0xffffff, 0.95);
    flash.fillCircle(muzzle.x, muzzle.y, 10);
    flash.fillStyle(0x38bdf8, 0.8);
    flash.fillCircle(muzzle.x, muzzle.y, 16);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.5,
      duration: 60,
      onComplete: () => flash.destroy(),
    });
  }

  /**
   * 銃口の世界座標を取得
   */
  public getMuzzlePosition(): { x: number; y: number } {
    return {
      x: this.x + Math.cos(this.angle) * this.barrelLength,
      y: this.y + Math.sin(this.angle) * this.barrelLength,
    };
  }

  public destroy(): void {
    this.laserSight.destroy();
    this.container.destroy();
  }
}
