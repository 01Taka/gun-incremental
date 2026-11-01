import Phaser from "phaser";

import { ARENA_CONFIG } from "../../config/gameData";
import type { WeaponBulletConfig } from "../../config/types";
import type { TargetManager } from "./TargetManager";
import type { ActiveTarget, ArenaBounds, Bullet, HitResult } from "./types";

export interface BulletCallbacks {
  onHitTarget: (hitResult: HitResult, hitX: number, hitY: number) => void;
}

/** 弾テクスチャ生成時の基準当たり判定半径 (px) */
const BASE_VISUAL_BULLET_RADIUS = 6;

export class BulletManager {
  private scene: Phaser.Scene;
  private bounds: ArenaBounds;
  private targetManager: TargetManager;
  private callbacks: BulletCallbacks;

  private bullets: Map<string, Bullet> = new Map();
  private nextBulletId: number = 1;

  constructor(
    scene: Phaser.Scene,
    bounds: ArenaBounds,
    targetManager: TargetManager,
    callbacks: BulletCallbacks,
  ) {
    this.scene = scene;
    this.bounds = bounds;
    this.targetManager = targetManager;
    this.callbacks = callbacks;
  }

  /**
   * 指定位置から指定角度へ、銃固有の弾パラメータで鉛弾を発射
   */
  public spawnBullet(
    startX: number,
    startY: number,
    angle: number,
    bulletConfig: WeaponBulletConfig,
  ): Bullet {
    const id = `bullet_${this.nextBulletId++}`;
    const { speed, radius } = bulletConfig;

    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    const sprite = this.scene.add.image(startX, startY, "bullet").setDepth(60);
    sprite.setRotation(angle);
    sprite.setScale(radius / BASE_VISUAL_BULLET_RADIUS);

    const bullet: Bullet = {
      id,
      sprite,
      x: startX,
      y: startY,
      vx,
      vy,
      angle,
      speed,
      radius,
    };

    this.bullets.set(id, bullet);
    return bullet;
  }

  public update(deltaSeconds: number): void {
    const bulletsToRemove: string[] = [];
    const padding = ARENA_CONFIG.bulletOutPadding;

    for (const bullet of this.bullets.values()) {
      const prevX = bullet.x;
      const prevY = bullet.y;

      bullet.x += bullet.vx * deltaSeconds;
      bullet.y += bullet.vy * deltaSeconds;
      bullet.sprite.setPosition(bullet.x, bullet.y);

      // 的との衝突判定（高速弾でもすり抜けない線分判定＋弾ごとの半径を使用）
      const collision = this.checkTargetCollision(prevX, prevY, bullet.x, bullet.y, bullet.radius);
      if (collision) {
        const hitResult = this.targetManager.hitTarget(
          collision.target,
          collision.hitX,
          collision.hitY,
        );
        this.callbacks.onHitTarget(hitResult, collision.hitX, collision.hitY);

        // 着弾エフェクト（火花＋砂煙）
        this.createHitSparks(collision.hitX, collision.hitY);
        bulletsToRemove.push(bullet.id);
        continue;
      }

      // アリーナ境界外判定
      if (
        bullet.x < this.bounds.left - padding ||
        bullet.x > this.bounds.right + padding ||
        bullet.y < this.bounds.top - padding ||
        bullet.y > this.bounds.bottom + padding
      ) {
        bulletsToRemove.push(bullet.id);
      }
    }

    for (const id of bulletsToRemove) {
      const b = this.bullets.get(id);
      if (b) {
        b.sprite.destroy();
        this.bullets.delete(id);
      }
    }
  }

  private checkTargetCollision(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    bulletRadius: number,
  ): { target: ActiveTarget; hitX: number; hitY: number } | null {
    const targets = this.targetManager.getTargets();
    const dx = x1 - x0;
    const dy = y1 - y0;
    const lenSq = dx * dx + dy * dy;

    let earliestU = Infinity;
    let hitTarget: ActiveTarget | null = null;
    let hitX = x1;
    let hitY = y1;

    for (const t of targets) {
      const u =
        lenSq > 0 ? Phaser.Math.Clamp(((t.x - x0) * dx + (t.y - y0) * dy) / lenSq, 0, 1) : 0;
      const closestX = x0 + u * dx;
      const closestY = y0 + u * dy;
      const distX = t.x - closestX;
      const distY = t.y - closestY;
      const combinedRadius = t.def.radius + bulletRadius;

      if (distX * distX + distY * distY <= combinedRadius * combinedRadius && u < earliestU) {
        earliestU = u;
        hitTarget = t;
        hitX = closestX;
        hitY = closestY;
      }
    }

    if (!hitTarget) return null;
    return { target: hitTarget, hitX, hitY };
  }

  private createHitSparks(x: number, y: number): void {
    // 瞬間的なオレンジ火花リング
    const spark = this.scene.add.graphics().setDepth(65);
    spark.fillStyle(0xfbbf24, 0.9);
    spark.fillCircle(x, y, 10);
    spark.fillStyle(0xea580c, 0.65);
    spark.fillCircle(x, y, 15);
    this.scene.tweens.add({
      targets: spark,
      scale: 1.7,
      alpha: 0,
      duration: 110,
      onComplete: () => spark.destroy(),
    });

    // 着弾時の小さな土煙・白煙パフ
    if (this.scene.textures.exists("dust_puff")) {
      for (let i = 0; i < 3; i++) {
        const dust = this.scene.add
          .image(x, y, "dust_puff")
          .setDepth(64)
          .setScale(0.35)
          .setAlpha(0.75);
        this.scene.tweens.add({
          targets: dust,
          x: x + Phaser.Math.Between(-24, 24),
          y: y + Phaser.Math.Between(-24, 16),
          scale: 0.95,
          alpha: 0,
          duration: 280,
          ease: "Quad.easeOut",
          onComplete: () => dust.destroy(),
        });
      }
    }
  }

  public clear(): void {
    for (const b of this.bullets.values()) {
      b.sprite.destroy();
    }
    this.bullets.clear();
  }
}
