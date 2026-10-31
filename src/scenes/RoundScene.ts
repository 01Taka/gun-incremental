import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import { WEAPONS } from "../config/gameData";
import type { TargetDefinition } from "../config/types";
import { EventBus } from "../EventBus";
import { formatNumber, formatSeconds } from "../logic/format";
import { GameState } from "../logic/GameState";
import { addCrispText } from "../utils/text";

interface ActiveTarget {
  id: string; // ユニーク識別子
  def: TargetDefinition;
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  hpBar?: Phaser.GameObjects.Graphics;
  currentHp: number;
  maxHp: number;
  remainingLife?: number; // 金の的などの制限時間
  x: number;
  y: number;
}

export class RoundScene extends Phaser.Scene {
  private gameState!: GameState;
  private audio!: AudioManager;

  // ラウンドタイマー
  private timeRemaining: number = 7.0;
  private isRoundActive: boolean = false;

  // 射撃制御
  private isPointerDown: boolean = false;
  private lastFireTime: number = 0;
  private pointerWorldX: number = 800;
  private pointerWorldY: number = 450;

  // 的管理
  private activeTargets: Map<string, ActiveTarget> = new Map();
  private nextTargetUid: number = 1;

  // UI要素
  private timerText!: Phaser.GameObjects.Text;
  private spText!: Phaser.GameObjects.Text;
  private roundSpText!: Phaser.GameObjects.Text;
  private roundInfoText!: Phaser.GameObjects.Text;
  private weaponButtonsContainer!: Phaser.GameObjects.Container;
  private autoFireToggleContainer!: Phaser.GameObjects.Container;
  private reticle!: Phaser.GameObjects.Image;

  // エフェクト用パーティクル
  private sparkEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super("RoundScene");
  }

  create() {
    EventBus.emit("current-scene-ready", this);
    this.gameState = GameState.getInstance();
    this.audio = AudioManager.getInstance();

    const { width, height } = this.scale;

    // ラウンド初期化
    this.timeRemaining = this.gameState.getRoundDuration();
    this.isRoundActive = true;
    this.activeTargets.clear();
    this.lastFireTime = 0;

    // 背景描画
    this.createBackground(width, height);

    // パーティクルエミッター
    this.sparkEmitter = this.add.particles(0, 0, "spark", {
      speed: { min: 80, max: 240 },
      scale: { start: 0.6, end: 0 },
      blendMode: "ADD",
      lifespan: 300,
      gravityY: 150,
      emitting: false,
    });

    // 的出現領域の設定 (上部HUDと下部UIを避けた射撃エリア)
    this.spawnInitialTargets();

    // HUDの作成
    this.createHUD(width, height);

    // 照準 (レティクル)
    this.reticle = this.add.image(width / 2, height / 2, "reticle").setDepth(100);

    // 入力イベントの設定
    this.setupInputHandlers();

    // ラウンド開始アナウンス演出
    this.showRoundStartBanner();
  }

  private createBackground(width: number, height: number): void {
    const bg = this.add.graphics();
    // 濃紺のグラデーション風
    bg.fillGradientStyle(0x090d16, 0x090d16, 0x0f172a, 0x0f172a, 1);
    bg.fillRect(0, 0, width, height);

    // グリッド線
    bg.lineStyle(1, 0x1e293b, 0.4);
    for (let x = 60; x < width; x += 100) {
      bg.moveTo(x, 70);
      bg.lineTo(x, height - 70);
    }
    for (let y = 100; y < height - 60; y += 100) {
      bg.moveTo(60, y);
      bg.lineTo(width - 60, y);
    }
    bg.strokePath();

    // プレイエリア枠
    bg.lineStyle(2, 0x334155, 0.8);
    bg.strokeRoundedRect(50, 80, width - 100, height - 160, 16);
  }

  private createHUD(width: number, height: number): void {
    // 上部バー背景
    const topBar = this.add.graphics();
    topBar.fillStyle(0x0f172a, 0.95);
    topBar.fillRect(0, 0, width, 75);
    topBar.lineStyle(2, 0x1e293b, 1);
    topBar.moveTo(0, 75);
    topBar.lineTo(width, 75);
    topBar.strokePath();

    // ラウンド表示
    this.roundInfoText = addCrispText(this, 50, 20, `ROUND ${this.gameState.round}`, {
      fontSize: "32px",
      fontStyle: "bold",
      color: "#38bdf8",
    });

    // タイマー表示
    this.timerText = addCrispText(
      this,
      width / 2,
      20,
      `TIME: ${formatSeconds(this.timeRemaining)}`,
      {
        fontSize: "36px",
        fontStyle: "bold",
        fontFamily: "monospace",
        color: "#22c55e",
      },
    ).setOrigin(0.5, 0);

    // SP表示 (所持SP + 今回ラウンド獲得分)
    this.spText = addCrispText(this, width - 50, 14, `所持SP: ${formatNumber(this.gameState.sp)}`, {
      fontSize: "22px",
      fontStyle: "bold",
      color: "#facc15",
    }).setOrigin(1, 0);

    this.roundSpText = addCrispText(
      this,
      width - 50,
      42,
      `獲得: +${formatNumber(this.gameState.lastRoundSpEarned)} SP`,
      {
        fontSize: "18px",
        color: "#94a3b8",
      },
    ).setOrigin(1, 0);

    // 下部バー背景
    const bottomBar = this.add.graphics();
    bottomBar.fillStyle(0x0f172a, 0.95);
    bottomBar.fillRect(0, height - 75, width, 75);
    bottomBar.lineStyle(2, 0x1e293b, 1);
    bottomBar.moveTo(0, height - 75);
    bottomBar.lineTo(width, height - 75);
    bottomBar.strokePath();

    // 武器選択ボタンコンテナ
    this.weaponButtonsContainer = this.add.container(60, height - 60);
    this.refreshWeaponButtons();

    // オート射撃切り替えボタン
    this.autoFireToggleContainer = this.add.container(width - 190, height - 60);
    this.refreshAutoFireToggle();
  }

  public refreshWeaponButtons(): void {
    this.weaponButtonsContainer.removeAll(true);

    const owned = this.gameState.ownedWeapons;
    let offsetX = 0;

    for (const weaponId of owned) {
      const def = WEAPONS[weaponId];
      const isEquipped = this.gameState.equippedWeapon === weaponId;

      const btn = this.add.container(offsetX, 0);
      const bg = this.add.graphics();
      bg.fillStyle(isEquipped ? 0x0284c7 : 0x1e293b, 1);
      bg.lineStyle(isEquipped ? 2 : 1, isEquipped ? 0x38bdf8 : 0x475569, 1);
      bg.fillRoundedRect(0, 0, 140, 46, 8);
      bg.strokeRoundedRect(0, 0, 140, 46, 8);

      const label = addCrispText(this, 70, 23, def.name, {
        fontSize: "17px",
        fontStyle: isEquipped ? "bold" : "normal",
        color: isEquipped ? "#ffffff" : "#cbd5e1",
      }).setOrigin(0.5);

      btn.add([bg, label]);
      btn.setSize(140, 46);
      btn.setInteractive({ useHandCursor: true });

      btn.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        // クリックイベントが射撃と重複しないよう
        pointer.event.stopPropagation();
        this.gameState.equipWeapon(weaponId);
        this.audio.playSynthSE("click");
        this.refreshWeaponButtons();
      });

      this.weaponButtonsContainer.add(btn);
      offsetX += 155;
    }
  }

  public refreshAutoFireToggle(): void {
    this.autoFireToggleContainer.removeAll(true);
    if (!this.gameState.canToggleAutoFire()) return;

    const isOn = this.gameState.persistentData.settings.autoFire;
    const bg = this.add.graphics();
    bg.fillStyle(isOn ? 0x16a34a : 0x334155, 1);
    bg.lineStyle(1.5, isOn ? 0x4ade80 : 0x64748b, 1);
    bg.fillRoundedRect(0, 0, 140, 46, 8);
    bg.strokeRoundedRect(0, 0, 140, 46, 8);

    const label = addCrispText(this, 70, 23, `AUTO: ${isOn ? "ON" : "OFF"}`, {
      fontSize: "16px",
      fontStyle: "bold",
      color: "#ffffff",
    }).setOrigin(0.5);

    this.autoFireToggleContainer.add([bg, label]);
    this.autoFireToggleContainer.setSize(140, 46);
    this.autoFireToggleContainer.setInteractive({ useHandCursor: true });

    this.autoFireToggleContainer.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.gameState.toggleAutoFire();
      this.audio.playSynthSE("click");
      this.refreshAutoFireToggle();
    });
  }

  private setupInputHandlers(): void {
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      this.pointerWorldX = pointer.x;
      this.pointerWorldY = pointer.y;
      this.reticle.setPosition(pointer.x, pointer.y);
    });

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      // HUD領域のタップ時は射撃しない
      if (pointer.y < 75 || pointer.y > this.scale.height - 75) return;

      this.isPointerDown = true;
      this.pointerWorldX = pointer.x;
      this.pointerWorldY = pointer.y;
      this.reticle.setPosition(pointer.x, pointer.y);

      // 初弾の発射
      this.attemptFire();
    });

    this.input.on("pointerup", () => {
      this.isPointerDown = false;
    });
  }

  private showRoundStartBanner(): void {
    const { width, height } = this.scale;
    const banner = addCrispText(this, width / 2, height / 2, "START!", {
      fontSize: "68px",
      fontStyle: "bold",
      color: "#facc15",
      stroke: "#ca8a04",
      strokeThickness: 5,
    })
      .setOrigin(0.5)
      .setDepth(200);

    this.tweens.add({
      targets: banner,
      scale: 1.4,
      alpha: 0,
      duration: 700,
      ease: "Power2",
      onComplete: () => {
        banner.destroy();
      },
    });
  }

  // --- 的の生成管理 ---
  private spawnInitialTargets(): void {
    const targetCount = this.gameState.getMaxTargets();
    for (let i = 0; i < targetCount; i++) {
      this.spawnOneTarget();
    }
  }

  private spawnOneTarget(): void {
    if (!this.isRoundActive) return;

    const def = this.gameState.rollTarget();
    const { width, height } = this.scale;

    // スポーン領域: x: 120 ~ width-120, y: 140 ~ height-140
    let x = 0;
    let y = 0;
    let attempts = 0;
    let foundSafePos = false;

    // 既存の的と重ならない位置を探索
    while (attempts < 15 && !foundSafePos) {
      attempts++;
      x = Phaser.Math.Between(120, width - 120);
      y = Phaser.Math.Between(150, height - 150);

      foundSafePos = true;
      for (const t of this.activeTargets.values()) {
        const dist = Phaser.Math.Distance.Between(x, y, t.x, t.y);
        if (dist < def.radius + t.def.radius + 20) {
          foundSafePos = false;
          break;
        }
      }
    }

    const uid = `target_${this.nextTargetUid++}`;
    const container = this.add.container(x, y);

    const sprite = this.add.image(0, 0, `target_${def.id}`);
    container.add(sprite);

    // HPゲージ (最大HPが2以上の場合のみ)
    let hpBar: Phaser.GameObjects.Graphics | undefined;
    if (def.hp > 1) {
      hpBar = this.add.graphics();
      this.updateHpBar(hpBar, def.hp, def.hp, def.radius);
      container.add(hpBar);
    }

    // 出現アニメーション (ポップアップ)
    container.setScale(0);
    this.tweens.add({
      targets: container,
      scale: 1,
      duration: 250,
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
    const barHeight = 6;
    const startX = -barWidth / 2;
    const startY = radius + 8;

    // 背景
    bar.fillStyle(0x0f172a, 0.8);
    bar.fillRect(startX, startY, barWidth, barHeight);

    // 残りHP
    const ratio = Math.max(0, current / max);
    const color = ratio > 0.5 ? 0x22c55e : ratio > 0.25 ? 0xeab308 : 0xef4444;
    bar.fillStyle(color, 1);
    bar.fillRect(startX, startY, barWidth * ratio, barHeight);
  }

  // --- 射撃ロジック ---
  private attemptFire(): void {
    if (!this.isRoundActive) return;

    const now = this.time.now;
    const intervalMs = this.gameState.getFireInterval() * 1000;

    // 最速発射間隔の制限
    if (now - this.lastFireTime < intervalMs) {
      return;
    }
    this.lastFireTime = now;

    this.performShot(this.pointerWorldX, this.pointerWorldY);
  }

  private performShot(targetX: number, targetY: number): void {
    // 効果音 (レーザー・射撃)
    this.audio.playSynthSE("laser", 0.6);

    // 画面の微小振動
    this.cameras.main.shake(60, 0.003);

    // マズルフラッシュ / 着弾マーク
    const hole = this.add.image(targetX, targetY, "bullet_hole").setDepth(5);
    this.tweens.add({
      targets: hole,
      alpha: 0,
      duration: 1500,
      onComplete: () => hole.destroy(),
    });

    // 的との当たり判定
    let hitTarget: ActiveTarget | null = null;
    let minDistance = Infinity;

    for (const t of this.activeTargets.values()) {
      const dist = Phaser.Math.Distance.Between(targetX, targetY, t.x, t.y);
      if (dist <= t.def.radius && dist < minDistance) {
        minDistance = dist;
        hitTarget = t;
      }
    }

    if (hitTarget) {
      this.handleTargetHit(hitTarget, targetX, targetY);
    }
  }

  private handleTargetHit(target: ActiveTarget, hitX: number, hitY: number): void {
    // 会心判定
    const isCrit = this.gameState.rollCrit();
    const damage = this.gameState.calculateDamage(isCrit);

    // 被弾SE
    this.audio.playSynthSE("hit", 0.7);

    // 被弾エフェクト (スパーク)
    this.sparkEmitter.explode(8, hitX, hitY);

    // ダメージポップアップ
    this.showDamagePopup(hitX, hitY, damage, isCrit);

    // HP減少
    target.currentHp -= damage;
    if (target.hpBar) {
      this.updateHpBar(target.hpBar, target.currentHp, target.maxHp, target.def.radius);
    }

    // 被弾アニメーション (一瞬縮む)
    this.tweens.add({
      targets: target.container,
      scaleX: 0.9,
      scaleY: 0.9,
      duration: 50,
      yoyo: true,
      ease: "Quad.easeOut",
    });

    // 撃破チェック
    if (target.currentHp <= 0) {
      this.destroyTarget(target, damage);
    }
  }

  private destroyTarget(target: ActiveTarget, killingDamage: number): void {
    this.activeTargets.delete(target.id);

    // 撃破SE
    this.audio.playSynthSE("explosion", 0.8);

    // SP獲得処理
    const spEarned = this.gameState.onTargetDestroyed(target.def.id);
    this.spText.setText(`所持SP: ${formatNumber(this.gameState.sp)}`);
    this.roundSpText.setText(`獲得: +${formatNumber(this.gameState.lastRoundSpEarned)} SP`);

    // SPポップアップ
    this.showSpPopup(target.x, target.y, spEarned);

    // 特殊効果発動
    this.triggerTargetSpecialEffect(target, killingDamage);

    // 破壊アニメーション
    this.sparkEmitter.explode(20, target.x, target.y);
    this.tweens.add({
      targets: target.container,
      scale: 1.3,
      alpha: 0,
      duration: 150,
      ease: "Power2",
      onComplete: () => {
        target.container.destroy();
      },
    });

    // 補充 (最大出現数を維持)
    this.time.delayedCall(200, () => {
      if (this.isRoundActive && this.activeTargets.size < this.gameState.getMaxTargets()) {
        this.spawnOneTarget();
      }
    });
  }

  // --- 特殊効果 ---
  private triggerTargetSpecialEffect(target: ActiveTarget, killingDamage: number): void {
    // 1. 時間の的 (ラウンド時間延長)
    if (target.def.id === "time") {
      const bonusSeconds = this.gameState.getTimeTargetBonus();
      this.timeRemaining += bonusSeconds;
      this.showTimeBonusPopup(target.x, target.y, bonusSeconds);
    }

    // 2. 電撃の的 (連鎖ダメージ)
    if (target.def.id === "electric") {
      this.triggerChainLightning(target.x, target.y, killingDamage);
    }
  }

  private triggerChainLightning(fromX: number, fromY: number, sourceDamage: number): void {
    const chainDamage = this.gameState.getChainDamage(sourceDamage);
    const targetsToHit = Array.from(this.activeTargets.values());

    for (const other of targetsToHit) {
      // 電撃ライン描画
      const line = this.add.graphics().setDepth(20);
      line.lineStyle(3, 0xa855f7, 1);
      line.beginPath();
      line.moveTo(fromX, fromY);
      line.lineTo(other.x, other.y);
      line.strokePath();

      this.tweens.add({
        targets: line,
        alpha: 0,
        duration: 250,
        onComplete: () => line.destroy(),
      });

      // 連鎖ダメージ適用
      other.currentHp -= chainDamage;
      if (other.hpBar) {
        this.updateHpBar(other.hpBar, other.currentHp, other.maxHp, other.def.radius);
      }
      this.showDamagePopup(other.x, other.y, chainDamage, false, "#a855f7");

      if (other.currentHp <= 0) {
        this.time.delayedCall(50, () => {
          if (this.activeTargets.has(other.id)) {
            this.destroyTarget(other, chainDamage);
          }
        });
      }
    }
  }

  // --- ポップアップ演出 ---
  private showDamagePopup(
    x: number,
    y: number,
    dmg: number,
    isCrit: boolean,
    color?: string,
  ): void {
    const text = isCrit ? `CRIT! -${dmg}` : `-${dmg}`;
    const fontColor = color ? color : isCrit ? "#facc15" : "#ffffff";
    const fontSize = isCrit ? "28px" : "22px";

    const popup = addCrispText(this, x, y - 20, text, {
      fontSize,
      fontStyle: "bold",
      color: fontColor,
      stroke: "#000000",
      strokeThickness: 3,
    })
      .setOrigin(0.5)
      .setDepth(50);

    this.tweens.add({
      targets: popup,
      y: y - 55,
      alpha: 0,
      duration: 600,
      ease: "Power1",
      onComplete: () => popup.destroy(),
    });
  }

  private showSpPopup(x: number, y: number, sp: number): void {
    const popup = addCrispText(this, x, y, `+${formatNumber(sp)} SP`, {
      fontSize: "26px",
      fontStyle: "bold",
      color: "#38bdf8",
      stroke: "#0284c7",
      strokeThickness: 3,
    })
      .setOrigin(0.5)
      .setDepth(60);

    this.tweens.add({
      targets: popup,
      y: y - 70,
      scale: 1.15,
      alpha: 0,
      duration: 750,
      ease: "Power2",
      onComplete: () => popup.destroy(),
    });
  }

  private showTimeBonusPopup(x: number, y: number, seconds: number): void {
    const popup = addCrispText(this, x, y - 30, `+${seconds.toFixed(1)}s!`, {
      fontSize: "30px",
      fontStyle: "bold",
      color: "#22c55e",
      stroke: "#15803d",
      strokeThickness: 4,
    })
      .setOrigin(0.5)
      .setDepth(70);

    this.tweens.add({
      targets: popup,
      y: y - 80,
      scale: 1.25,
      alpha: 0,
      duration: 800,
      ease: "Back.easeOut",
      onComplete: () => popup.destroy(),
    });
  }

  // --- 毎フレーム更新 ---
  update(_time: number, delta: number): void {
    if (!this.isRoundActive) return;

    const deltaSeconds = delta / 1000;
    this.timeRemaining -= deltaSeconds;

    // タイマー更新
    this.timerText.setText(`TIME: ${formatSeconds(this.timeRemaining)}`);
    if (this.timeRemaining <= 2.5) {
      this.timerText.setColor("#ef4444");
    } else {
      this.timerText.setColor("#22c55e");
    }

    // 金の的などの寿命カウントダウン
    for (const t of Array.from(this.activeTargets.values())) {
      if (typeof t.remainingLife === "number") {
        t.remainingLife -= deltaSeconds;
        // 点滅演出
        if (t.remainingLife <= 0.8) {
          t.container.setAlpha(Math.floor(this.time.now / 80) % 2 === 0 ? 0.3 : 1.0);
        }
        if (t.remainingLife <= 0) {
          // 自然消滅
          this.activeTargets.delete(t.id);
          this.tweens.add({
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

    // オート射撃または長押し射撃
    const isAutoOn =
      this.gameState.canToggleAutoFire() && this.gameState.persistentData.settings.autoFire;

    if (isAutoOn) {
      // オート射撃: 画面内の的を自動で狙って発射
      if (this.activeTargets.size > 0) {
        const firstTarget = this.activeTargets.values().next().value;
        if (firstTarget) {
          this.pointerWorldX = firstTarget.x;
          this.pointerWorldY = firstTarget.y;
          this.reticle.setPosition(firstTarget.x, firstTarget.y);
          this.attemptFire();
        }
      }
    } else if (this.isPointerDown) {
      this.attemptFire();
    }

    // 時間切れチェック
    if (this.timeRemaining <= 0) {
      this.onRoundTimeUp();
    }
  }

  private onRoundTimeUp(): void {
    this.isRoundActive = false;
    this.timeRemaining = 0;
    this.timerText.setText("TIME: 0.0s");

    // ラウンド終了処理 (的ポイント加算 & 解放チェック)
    this.gameState.endRound();

    // 終了バナー
    const { width, height } = this.scale;
    const banner = addCrispText(this, width / 2, height / 2, "TIME UP!", {
      fontSize: "72px",
      fontStyle: "bold",
      color: "#ef4444",
      stroke: "#991b1b",
      strokeThickness: 5,
    })
      .setOrigin(0.5)
      .setDepth(200);

    this.tweens.add({
      targets: banner,
      scale: 1.2,
      duration: 700,
      ease: "Power2",
      onComplete: () => {
        // 全的解放でクリアした場合は直接 ClearScene へ
        if (this.gameState.isCleared) {
          this.scene.start("ClearScene");
        } else {
          this.scene.start("ResultScene");
        }
      },
    });
  }
}
