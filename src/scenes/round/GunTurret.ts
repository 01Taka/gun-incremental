import Phaser from "phaser";

import type { ActiveTarget, ArenaBounds } from "./types";

export class GunTurret {
  private scene: Phaser.Scene;

  // 銃の配置座標（アリーナ底辺の中央）
  public readonly x: number;
  public readonly y: number;

  // 銃の角度（ラジアン）: -PI/2 (真上) を基準
  public angle: number = -Math.PI / 2;

  // 角度の可動範囲（真上を中心に左右約75度: -165度 〜 -15度）
  public readonly minAngle: number = Phaser.Math.DegToRad(-165);
  public readonly maxAngle: number = Phaser.Math.DegToRad(-15);

  // バレルの長さ（銃口までのオフセット）
  public readonly barrelLength: number = 52;

  // コンポーネント
  public container: Phaser.GameObjects.Container;
  private barrelContainer: Phaser.GameObjects.Container;
  private barrelGraphics: Phaser.GameObjects.Graphics;
  private baseGraphics: Phaser.GameObjects.Graphics;
  private laserSight: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, bounds: ArenaBounds) {
    this.scene = scene;

    // アリーナ底辺の中央
    this.x = bounds.left + bounds.size / 2;
    this.y = bounds.bottom - 10;

    this.container = this.scene.add.container(this.x, this.y).setDepth(80);

    // 1. 射線ガイド（乾いた西部の照準線）
    this.laserSight = this.scene.add.graphics().setDepth(70);

    // 2. 台座ベース（サドルレザー＆保安官の真鍮スター台座）
    this.baseGraphics = this.scene.add.graphics();
    this.drawBase();
    this.container.add(this.baseGraphics);

    // 3. 回転するリボルバー銃身コンテナ
    this.barrelContainer = this.scene.add.container(0, 0);
    this.barrelGraphics = this.scene.add.graphics();
    this.drawBarrel();
    this.barrelContainer.add(this.barrelGraphics);
    this.container.add(this.barrelContainer);

    this.setAimRatio(0.5);
  }

  private drawBase(): void {
    const g = this.baseGraphics;
    g.clear();

    // 革製ホルスター台座（ダークサドルブラウン）
    g.fillStyle(0x261207, 1.0);
    g.fillCircle(0, 0, 38);
    g.lineStyle(3, 0x92400e, 1.0);
    g.strokeCircle(0, 0, 38);

    // 革のステッチ風ドット＆真鍮鋲（8方向）
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      const rx = Math.cos(a) * 30;
      const ry = Math.sin(a) * 30;
      g.fillStyle(0xd97706, 0.9);
      g.fillCircle(rx, ry, 2.5);
    }

    // 内側の真鍮リング
    g.fillStyle(0x3f200d, 1.0);
    g.fillCircle(0, 0, 21);
    g.lineStyle(2.5, 0xfbbf24, 0.95);
    g.strokeCircle(0, 0, 21);
  }

  private drawBarrel(): void {
    const g = this.barrelGraphics;
    g.clear();

    // ウォールナット木製グリップ後端
    g.fillStyle(0x5c2d12, 1.0);
    g.fillRoundedRect(-18, -8, 18, 16, 5);
    g.lineStyle(1.5, 0x291206, 1.0);
    g.strokeRoundedRect(-18, -8, 18, 16, 5);

    // 6連発シリンダー部の膨らみ（黒鉄＆真鍮フルート）
    g.fillStyle(0x3a322d, 1.0);
    g.fillRoundedRect(-2, -11, 20, 22, 4);
    g.lineStyle(2, 0xb45309, 0.95);
    g.strokeRoundedRect(-2, -11, 20, 22, 4);

    // 長銃身（ブルースチール / ガンメタル）
    g.fillStyle(0x4b423b, 1.0);
    g.fillRoundedRect(16, -6, 34, 12, 3);
    g.lineStyle(1.5, 0xd6b384, 0.75);
    g.strokeRoundedRect(16, -6, 34, 12, 3);

    // 銃身の上部リブ＆真鍮フロントサイト
    g.fillStyle(0xfbbf24, 1.0);
    g.fillRect(44, -2, 7, 4);

    // 撃鉄（ハンマー）の突起
    g.fillStyle(0xd97706, 1.0);
    g.fillCircle(-3, 0, 4);
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

      const t = vx * dirX + vy * dirY;
      if (t < 0) continue;

      const distSq = vx * vx + vy * vy - t * t;
      const radiusWithMargin = target.def.radius + 4;

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
   * 銃口から前方に伸びる西部劇風デッドアイ照準線を描画
   * 夕焼けの砂塵に映えるアンバーゴールド＆アイボリー系で視認性と世界観を両立
   */
  public drawLaserSight(isReloading: boolean = false): void {
    this.laserSight.clear();
    const muzzle = this.getMuzzlePosition();

    const rayLength = 950;
    const endX = muzzle.x + Math.cos(this.angle) * rayLength;
    const endY = muzzle.y + Math.sin(this.angle) * rayLength;

    if (isReloading) {
      // 再装填中: 赤錆・くすんだアンバーの細い破線調ライン
      this.laserSight.lineStyle(4, 0x991b1b, 0.22);
      this.laserSight.lineBetween(muzzle.x, muzzle.y, endX, endY);

      this.laserSight.lineStyle(1.8, 0xd97706, 0.48);
      this.laserSight.lineBetween(muzzle.x, muzzle.y, endX, endY);
    } else {
      // 射撃可能時: 夕陽の真鍮ゴールド＆灼熱アイボリーのシャープな弾道線
      this.laserSight.lineStyle(6, 0xea580c, 0.24);
      this.laserSight.lineBetween(muzzle.x, muzzle.y, endX, endY);

      this.laserSight.lineStyle(2.6, 0xf59e0b, 0.8);
      this.laserSight.lineBetween(muzzle.x, muzzle.y, endX, endY);

      this.laserSight.lineStyle(1.2, 0xfffbeb, 0.92);
      this.laserSight.lineBetween(muzzle.x, muzzle.y, endX, endY);

      // 銃口の火薬熱グロー
      this.laserSight.fillStyle(0xf59e0b, 0.42);
      this.laserSight.fillCircle(muzzle.x, muzzle.y, 7);
      this.laserSight.fillStyle(0xfffbeb, 0.9);
      this.laserSight.fillCircle(muzzle.x, muzzle.y, 3.2);
    }
  }

  /**
   * 発射反動（キックバック）＋ 派手なリボルバー黒色火薬の白煙＆薬莢排出演出！
   */
  public playRecoilAnimation(): void {
    this.scene.tweens.killTweensOf(this.barrelContainer);
    const backDist = 9;
    const offsetX = -Math.cos(this.angle) * backDist;
    const offsetY = -Math.sin(this.angle) * backDist;

    this.barrelContainer.setPosition(offsetX, offsetY);
    this.scene.tweens.add({
      targets: this.barrelContainer,
      x: 0,
      y: 0,
      duration: 95,
      ease: "Quad.easeOut",
    });

    const muzzle = this.getMuzzlePosition();

    // 1. オレンジ＆ゴールドの激しいマズルフラッシュ（銃口閃光）
    const flash = this.scene.add.graphics().setDepth(95);
    flash.fillStyle(0xea580c, 0.75);
    flash.fillCircle(muzzle.x, muzzle.y, 24);
    flash.fillStyle(0xfbbf24, 0.9);
    flash.fillCircle(muzzle.x, muzzle.y, 15);
    flash.fillStyle(0xfffbeb, 1.0);
    flash.fillCircle(muzzle.x, muzzle.y, 8);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.45,
      duration: 75,
      onComplete: () => flash.destroy(),
    });

    // 2. リボルバー発砲時の派手な白煙（複数レイヤーのもくもく煙が前方・上方へ広がる）
    if (this.scene.textures.exists("smoke_puff")) {
      const smokeCount = 8;
      for (let i = 0; i < smokeCount; i++) {
        const spread = Phaser.Math.FloatBetween(-0.42, 0.42);
        const dirAngle = this.angle + spread;
        const dist = Phaser.Math.FloatBetween(26, 115);
        const startScale = Phaser.Math.FloatBetween(0.35, 0.65);
        const endScale = Phaser.Math.FloatBetween(1.15, 1.95);

        const puff = this.scene.add
          .image(muzzle.x, muzzle.y, "smoke_puff")
          .setDepth(92)
          .setScale(startScale)
          .setAlpha(Phaser.Math.FloatBetween(0.72, 0.92))
          .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));

        // わずかに砂色・アイボリーが混じる白煙トーン
        const smokeTints = [0xffffff, 0xfafaf9, 0xf5f5f4, 0xe7e0d6];
        puff.setTint(smokeTints[i % smokeTints.length]);

        const targetX = muzzle.x + Math.cos(dirAngle) * dist + Phaser.Math.FloatBetween(-12, 12);
        const targetY = muzzle.y + Math.sin(dirAngle) * dist - Phaser.Math.FloatBetween(12, 34);

        this.scene.tweens.add({
          targets: puff,
          x: targetX,
          y: targetY,
          scale: endScale,
          alpha: 0,
          rotation: puff.rotation + Phaser.Math.FloatBetween(-1.1, 1.1),
          duration: Phaser.Math.Between(380, 720),
          ease: "Cubic.easeOut",
          onComplete: () => puff.destroy(),
        });
      }
    }

    // 3. 銃の横へ跳ね飛ぶ真鍮の空薬莢演出
    const shell = this.scene.add
      .rectangle(this.x + 8, this.y - 6, 9, 4, 0xfbbf24, 0.95)
      .setDepth(88);
    const ejectX = this.x + Phaser.Math.Between(28, 62);
    const ejectY = this.y + Phaser.Math.Between(10, 35);
    this.scene.tweens.add({
      targets: shell,
      x: ejectX,
      y: ejectY,
      angle: Phaser.Math.Between(180, 540),
      alpha: 0,
      duration: 380,
      ease: "Quad.easeOut",
      onComplete: () => shell.destroy(),
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
