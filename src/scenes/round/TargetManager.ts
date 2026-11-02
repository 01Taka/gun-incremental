import Phaser from "phaser";

import { AudioManager } from "../../audio/AudioManager";
import { ARENA_CONFIG } from "../../config/gameData";
import { GameState } from "../../logic/GameState";
import type { ActiveTarget, ArenaBounds, HitResult } from "./types";

export interface TargetCallbacks {
  onDamage: (x: number, y: number, damage: number, isCrit: boolean, color?: string) => void;
  onSpEarned: (x: number, y: number, sp: number) => void;
  onTimeBonus: (x: number, y: number, bonusSeconds: number) => void;
  onDestroyTarget?: (
    target: ActiveTarget,
    hitX: number,
    hitY: number,
    killingDamage: number,
    spEarned: number,
  ) => void;
}

export class TargetManager {
  private scene: Phaser.Scene;
  private bounds: ArenaBounds;
  private gameState: GameState;
  private audio: AudioManager;
  private sparkEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private callbacks: TargetCallbacks;

  private activeTargets: Map<string, ActiveTarget> = new Map();
  private nextTargetUid: number = 1;
  private isRoundActive: boolean = true;

  constructor(
    scene: Phaser.Scene,
    bounds: ArenaBounds,
    sparkEmitter: Phaser.GameObjects.Particles.ParticleEmitter,
    callbacks: TargetCallbacks,
  ) {
    this.scene = scene;
    this.bounds = bounds;
    this.sparkEmitter = sparkEmitter;
    this.callbacks = callbacks;
    this.gameState = GameState.getInstance();
    this.audio = AudioManager.getInstance();
  }

  public setRoundActive(active: boolean): void {
    this.isRoundActive = active;
  }

  public getTargetCount(): number {
    return this.activeTargets.size;
  }

  public getTargets(): ActiveTarget[] {
    return Array.from(this.activeTargets.values());
  }

  public spawnInitialTargets(): void {
    this.activeTargets.clear();
    const targetCount = this.gameState.getMaxTargets();
    for (let i = 0; i < targetCount; i++) {
      this.spawnOneTarget();
    }
  }

  public spawnOneTarget(): void {
    if (!this.isRoundActive) return;

    const def = this.gameState.rollTarget();

    const margin = def.radius + 20;
    const minX = this.bounds.left + margin;
    const maxX = this.bounds.right - margin;
    const minY = this.bounds.top + margin + 16;
    const maxY = this.bounds.bottom - margin - 24;

    let x = 0;
    let y = 0;
    let attempts = 0;
    let foundSafePos = false;

    while (attempts < 20 && !foundSafePos) {
      attempts++;
      x = Phaser.Math.Between(minX, maxX);
      y = Phaser.Math.Between(minY, maxY);

      foundSafePos = true;
      for (const t of this.activeTargets.values()) {
        const dist = Phaser.Math.Distance.Between(x, y, t.x, t.y);
        if (dist < def.radius + t.def.radius + 18) {
          foundSafePos = false;
          break;
        }
      }
    }

    const uid = `target_${this.nextTargetUid++}`;
    const container = this.scene.add.container(x, y).setDepth(30);

    const sprite = this.scene.add.image(0, 0, `target_${def.id}`);
    container.add(sprite);

    let hpBar: Phaser.GameObjects.Graphics | undefined;
    if (def.hp > 1) {
      hpBar = this.scene.add.graphics();
      this.updateHpBar(hpBar, def.hp, def.hp, def.radius);
      container.add(hpBar);
    }

    container.setScale(0);
    this.scene.tweens.add({
      targets: container,
      scale: 1,
      duration: 240,
      ease: "Back.easeOut",
    });

    const activeTarget: ActiveTarget = {
      id: uid,
      def,
      container,
      sprite,
      hpBar,
      currentHp: def.hp,
      maxHp: def.hp,
      remainingLife: def.lifetime,
      x,
      y,
    };

    this.activeTargets.set(uid, activeTarget);
  }

  private updateHpBar(
    bar: Phaser.GameObjects.Graphics,
    current: number,
    max: number,
    radius: number,
  ): void {
    bar.clear();
    const barWidth = radius * 1.5;
    const barHeight = 7;
    const startX = -barWidth / 2;
    const startY = radius + 8;

    bar.fillStyle(0x1f0e06, 0.9);
    bar.fillRect(startX - 1, startY - 1, barWidth + 2, barHeight + 2);

    const ratio = Math.max(0, current / max);
    const color = ratio > 0.5 ? 0xd97706 : ratio > 0.25 ? 0xea580c : 0xb91c1c;
    bar.fillStyle(color, 1);
    bar.fillRect(startX, startY, barWidth * ratio, barHeight);
  }

  public findLockedTarget(
    reticleX: number,
    reticleY: number,
    reticleRadius: number,
  ): ActiveTarget | null {
    let lockedTarget: ActiveTarget | null = null;
    let minDistance = Infinity;

    for (const t of this.activeTargets.values()) {
      const dist = Phaser.Math.Distance.Between(reticleX, reticleY, t.x, t.y);
      if (dist <= t.def.radius + reticleRadius && dist < minDistance) {
        minDistance = dist;
        lockedTarget = t;
      }
    }

    return lockedTarget;
  }

  public getClosestTarget(x: number, y: number): ActiveTarget | null {
    let closestTarget: ActiveTarget | null = null;
    let closestDist = Infinity;

    for (const t of this.activeTargets.values()) {
      const d = Phaser.Math.Distance.Between(x, y, t.x, t.y);
      if (d < closestDist) {
        closestDist = d;
        closestTarget = t;
      }
    }

    return closestTarget;
  }

  public update(deltaSeconds: number): void {
    for (const t of Array.from(this.activeTargets.values())) {
      if (typeof t.remainingLife === "number") {
        t.remainingLife -= deltaSeconds;
        if (t.remainingLife <= ARENA_CONFIG.targetBlinkThresholdSeconds) {
          t.container.setAlpha(Math.floor(this.scene.time.now / 80) % 2 === 0 ? 0.35 : 1.0);
        }
        if (t.remainingLife <= 0) {
          this.activeTargets.delete(t.id);
          this.spawnDustBurst(t.x, t.y, 4);
          this.scene.tweens.add({
            targets: t.container,
            scale: 0,
            alpha: 0,
            duration: 200,
            onComplete: () => {
              t.container.destroy();
              if (this.isRoundActive && this.activeTargets.size < this.gameState.getMaxTargets()) {
                this.spawnOneTarget();
              }
            },
          });
        }
      }
    }
  }

  public hitTarget(
    target: ActiveTarget,
    hitX: number,
    hitY: number,
    overrideDamage?: number,
  ): HitResult {
    const isCrit = overrideDamage !== undefined ? false : this.gameState.rollCrit();
    const damage =
      overrideDamage !== undefined ? overrideDamage : this.gameState.calculateDamage(isCrit);

    if (isCrit) {
      // 急所ヒット時は西部劇の跳弾音（ピチューン！）を重ねる
      this.audio.playSynthSE("ricochet", 0.72);
    } else {
      this.audio.playSynthSE("hit", 0.7);
    }

    this.sparkEmitter.explode(8, hitX, hitY);
    this.callbacks.onDamage(hitX, hitY, damage, isCrit);

    target.currentHp -= damage;
    if (target.hpBar) {
      this.updateHpBar(target.hpBar, target.currentHp, target.maxHp, target.def.radius);
    }

    this.scene.tweens.add({
      targets: target.container,
      scaleX: 0.9,
      scaleY: 0.9,
      duration: 50,
      yoyo: true,
      ease: "Quad.easeOut",
    });

    let destroyed = false;
    let spEarned = 0;
    let bonusTime = 0;

    if (target.currentHp <= 0) {
      destroyed = true;
      const res = this.destroyTarget(target, damage, hitX, hitY);
      spEarned = res.spEarned;
      bonusTime = res.bonusTime;
    }

    return { destroyed, damage, isCrit, spEarned, bonusTime };
  }

  private destroyTarget(
    target: ActiveTarget,
    killingDamage: number,
    hitX: number = target.x,
    hitY: number = target.y,
  ): { spEarned: number; bonusTime: number } {
    this.activeTargets.delete(target.id);
    this.audio.playSynthSE("explosion", 0.8);

    const spEarned = this.gameState.onTargetDestroyed(target.def.id);
    this.callbacks.onSpEarned(target.x, target.y, spEarned);
    this.callbacks.onDestroyTarget?.(target, hitX, hitY, killingDamage, spEarned);

    let bonusTime = 0;
    if (target.def.id === "time") {
      bonusTime = this.gameState.getTimeTargetBonus();
      this.callbacks.onTimeBonus(target.x, target.y, bonusTime);
    }

    if (target.def.id === "electric") {
      this.triggerDynamiteBlast(target.x, target.y, killingDamage);
    }

    // 派手な土煙・砂ぼこり＆火花バースト
    this.sparkEmitter.explode(18, target.x, target.y);
    this.spawnDustBurst(target.x, target.y, target.def.id === "electric" ? 11 : 7);

    this.scene.tweens.add({
      targets: target.container,
      scale: 1.32,
      alpha: 0,
      duration: 160,
      ease: "Power2",
      onComplete: () => {
        target.container.destroy();
      },
    });

    // 的の復活率（スキルツリー等で強化可能）判定
    // 画面上の的が0体になって進行不能になるのを防ぐため、全滅時は確実に補充
    const shouldRespawn = this.gameState.rollTargetRespawn() || this.activeTargets.size === 0;

    if (shouldRespawn) {
      this.scene.time.delayedCall(ARENA_CONFIG.targetRespawnDelayMs, () => {
        if (this.isRoundActive && this.activeTargets.size < this.gameState.getMaxTargets()) {
          this.spawnOneTarget();
        }
      });
    }

    return { spEarned, bonusTime };
  }

  /**
   * 的破壊時に荒野の土煙・白煙を派手に舞い上げる
   */
  private spawnDustBurst(x: number, y: number, count: number): void {
    const hasDust = this.scene.textures.exists("dust_puff");
    const hasSmoke = this.scene.textures.exists("smoke_puff");
    if (!hasDust && !hasSmoke) return;

    for (let i = 0; i < count; i++) {
      const tex = i % 3 === 0 && hasSmoke ? "smoke_puff" : "dust_puff";
      const angle = (Math.PI * 2 * i) / count + Phaser.Math.FloatBetween(-0.3, 0.3);
      const dist = Phaser.Math.FloatBetween(22, 68);
      const puff = this.scene.add
        .image(x, y, tex)
        .setDepth(42)
        .setScale(Phaser.Math.FloatBetween(0.45, 0.75))
        .setAlpha(0.82);

      this.scene.tweens.add({
        targets: puff,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist - 14,
        scale: Phaser.Math.FloatBetween(1.15, 1.8),
        alpha: 0,
        duration: Phaser.Math.Between(360, 620),
        ease: "Cubic.easeOut",
        onComplete: () => puff.destroy(),
      });
    }
  }

  /**
   * 火薬樽の爆破魔（id: "electric"）破壊時のダイナマイト誘爆エフェクト
   */
  private triggerDynamiteBlast(fromX: number, fromY: number, sourceDamage: number): void {
    const chainDamage = this.gameState.getChainDamage(sourceDamage);
    const targetsToHit = Array.from(this.activeTargets.values());

    // 爆心地の火球リング
    const ring = this.scene.add.graphics().setDepth(38);
    ring.lineStyle(5, 0xea580c, 0.9);
    ring.strokeCircle(fromX, fromY, 45);
    this.scene.tweens.add({
      targets: ring,
      scale: 2.2,
      alpha: 0,
      duration: 280,
      onComplete: () => ring.destroy(),
    });

    for (const other of targetsToHit) {
      const line = this.scene.add.graphics().setDepth(35);
      line.lineStyle(4, 0xea580c, 0.95);
      line.beginPath();
      line.moveTo(fromX, fromY);
      line.lineTo(other.x, other.y);
      line.strokePath();

      line.lineStyle(1.5, 0xfef08a, 0.9);
      line.beginPath();
      line.moveTo(fromX, fromY);
      line.lineTo(other.x, other.y);
      line.strokePath();

      this.scene.tweens.add({
        targets: line,
        alpha: 0,
        duration: 260,
        onComplete: () => line.destroy(),
      });

      other.currentHp -= chainDamage;
      if (other.hpBar) {
        this.updateHpBar(other.hpBar, other.currentHp, other.maxHp, other.def.radius);
      }
      this.callbacks.onDamage(other.x, other.y, chainDamage, false, "#fb923c");

      if (other.currentHp <= 0) {
        this.scene.time.delayedCall(50, () => {
          if (this.activeTargets.has(other.id)) {
            this.destroyTarget(other, chainDamage);
          }
        });
      }
    }
  }

  public clear(): void {
    for (const t of this.activeTargets.values()) {
      t.container.destroy();
    }
    this.activeTargets.clear();
  }
}
