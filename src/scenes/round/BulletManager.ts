import Phaser from "phaser";

import type { TargetManager } from "./TargetManager";
import type { ArenaBounds, Bullet, HitResult } from "./types";

export interface BulletCallbacks {
  onHitTarget: (hitResult: HitResult, hitX: number, hitY: number) => void;
}

export class BulletManager {
  private scene: Phaser.Scene;
  private bounds: ArenaBounds;
  private targetManager: TargetManager;
  private callbacks: BulletCallbacks;

  private bullets: Map<string, Bullet> = new Map();
  private nextBulletId: number = 1;

  // 弾速 (px/s)
  public readonly bulletSpeed: number = 1850;
  public readonly bulletRadius: number = 6;

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
   * 指定位置から指定角度へ鉛弾を発射
   */
  public spawnBullet(startX: number, startY: number, angle: number): Bullet {
    const id = `bullet_${this.nextBulletId++}`;

    const vx = Math.cos(angle) * this.bulletSpeed;
    const vy = Math.sin(angle) * this.bulletSpeed;

    const sprite = this.scene.add.image(startX, startY, "bullet").setDepth(60);
    sprite.setRotation(angle);

    const bullet: Bullet = {
      id,
      sprite,
      x: startX,
      y: startY,
      vx,
      vy,
      angle,
      speed: this.bulletSpeed,
    };

    this.bullets.set(id, bullet);
    return bullet;
  }

  public update(deltaSeconds: number): void {
    const bulletsToRemove: string[] = [];

    for (const bullet of this.bullets.values()) {
      bullet.x += bullet.vx * deltaSeconds;
      bullet.y += bullet.vy * deltaSeconds;
      bullet.sprite.setPosition(bullet.x, bullet.y);

      // アリーナ境界外判定
      const padding = 20;
      if (
        bullet.x < this.bounds.left - padding ||
        bullet.x > this.bounds.right + padding ||
        bullet.y < this.bounds.top - padding ||
        bullet.y > this.bounds.bottom + padding
      ) {
        bulletsToRemove.push(bullet.id);
        continue;
      }

      // 的との衝突判定
      const hitTarget = this.checkTargetCollision(bullet.x, bullet.y);
      if (hitTarget) {
        const hitResult = this.targetManager.hitTarget(hitTarget, bullet.x, bullet.y);
        this.callbacks.onHitTarget(hitResult, bullet.x, bullet.y);

        // 着弾エフェクト（火花＋砂煙＋弾痕）
        this.createHitSparks(bullet.x, bullet.y);
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

  private checkTargetCollision(x: number, y: number) {
    const targets = this.targetManager.getTargets();
    for (const t of targets) {
      const dist = Phaser.Math.Distance.Between(x, y, t.x, t.y);
      if (dist <= t.def.radius + this.bulletRadius) {
        return t;
      }
    }
    return null;
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
