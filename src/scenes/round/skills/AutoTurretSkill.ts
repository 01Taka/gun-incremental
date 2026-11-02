import Phaser from "phaser";

import type { RoundContext, RoundHook } from "./types";

/**
 * 自動攻撃タレットスキル（Auto Turret）
 * ラウンド開始時に配置され、近くの的を自律索敵して射撃する。
 * 1スキル＝1ファイルで完全自己完結
 */
export class AutoTurretSkill implements RoundHook {
  public readonly id = "auto_turret";

  // 配置座標（アリーナ左下付近）
  private posX: number = 130;
  private posY: number = 810;

  // 射撃クールダウン
  private fireInterval: number = 1.2;
  private cooldownTimer: number = 0;

  // 表示オブジェクト
  private turretContainer?: Phaser.GameObjects.Container;
  private barrelContainer?: Phaser.GameObjects.Container;
  private level: number;

  constructor(level: number) {
    this.level = level;
    // レベルに応じて発射間隔を短縮（Lv1: 1.2秒, Lv2: 1.0秒, Lv3: 0.8秒... 最短0.4秒）
    this.fireInterval = Math.max(0.4, 1.4 - level * 0.2);
  }

  public onRoundStart(ctx: RoundContext): void {
    this.cooldownTimer = 0.6; // ラウンド開始直後は少し待機

    // タレットのビジュアル生成（ミニチュア風の真鍮リボルバー台座）
    const scene = ctx.scene;
    this.turretContainer = scene.add.container(this.posX, this.posY).setDepth(75);

    // 1. 台座ベース（木製＋真鍮リング）
    const baseGraphics = scene.add.graphics();
    baseGraphics.fillStyle(0x3e2723, 1.0);
    baseGraphics.fillCircle(0, 0, 18);
    baseGraphics.lineStyle(2, 0xd97706, 1.0);
    baseGraphics.strokeCircle(0, 0, 18);
    this.turretContainer.add(baseGraphics);

    // 2. 回転する銃身
    this.barrelContainer = scene.add.container(0, 0);
    const barrelGraphics = scene.add.graphics();
    barrelGraphics.fillStyle(0x4b423b, 1.0);
    barrelGraphics.fillRect(0, -4, 22, 8); // 銃身
    barrelGraphics.lineStyle(1.5, 0x92400e, 1.0);
    barrelGraphics.strokeRect(0, -4, 22, 8);
    barrelGraphics.fillStyle(0x291206, 1.0);
    barrelGraphics.fillCircle(0, 0, 7); // 機関部
    this.barrelContainer.add(barrelGraphics);
    this.turretContainer.add(this.barrelContainer);

    // スポーン時の演出（小さく出現してポンと弾む）
    this.turretContainer.setScale(0);
    scene.tweens.add({
      targets: this.turretContainer,
      scale: 1,
      duration: 300,
      ease: "Back.easeOut",
    });
  }

  public onUpdate(deltaSeconds: number, ctx: RoundContext): void {
    if (!this.turretContainer || !this.barrelContainer) return;

    this.cooldownTimer -= deltaSeconds;

    // 最寄りの的を索敵
    const target = ctx.getClosestTarget(this.posX, this.posY);
    if (!target) return;

    // 銃身を的の方向に向ける
    const targetAngle = Phaser.Math.Angle.Between(this.posX, this.posY, target.x, target.y);
    this.barrelContainer.setRotation(targetAngle);

    // クールダウン経過で発射
    if (this.cooldownTimer <= 0) {
      this.cooldownTimer = this.fireInterval;
      this.shoot(targetAngle, ctx);
    }
  }

  private shoot(angle: number, ctx: RoundContext): void {
    if (!this.barrelContainer) return;

    // 銃口のワールド座標
    const muzzleOffset = 22;
    const muzzleX = this.posX + Math.cos(angle) * muzzleOffset;
    const muzzleY = this.posY + Math.sin(angle) * muzzleOffset;

    // タレットの弾ダメージ（プレイヤーの基礎ダメージの40% + レベルごとに15%加算）
    const playerBaseDmg = ctx.getPlayerBaseDamage();
    const damage = Math.max(1, Math.round(playerBaseDmg * (0.4 + this.level * 0.15)));

    // 弾丸生成
    ctx.spawnBullet(
      muzzleX,
      muzzleY,
      angle,
      {
        speed: 750,
        radius: 4,
      },
      damage,
    );

    // 発射音と火花
    ctx.playSynthSE("shoot", 0.5);
    ctx.emitSparks(muzzleX, muzzleY, 4);

    // 反動アニメーション
    const recoilX = -Math.cos(angle) * 4;
    const recoilY = -Math.sin(angle) * 4;
    ctx.scene.tweens.add({
      targets: this.barrelContainer,
      x: recoilX,
      y: recoilY,
      duration: 40,
      yoyo: true,
      ease: "Quad.easeOut",
    });
  }

  public onRoundEnd(): void {
    if (this.turretContainer) {
      this.turretContainer.destroy();
      this.turretContainer = undefined;
      this.barrelContainer = undefined;
    }
  }
}
