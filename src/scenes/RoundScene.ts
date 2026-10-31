import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import { WEAPONS } from "../config/gameData";
import type { TargetDefinition } from "../config/types";
import { EventBus } from "../EventBus";
import { formatNumber, formatSeconds } from "../logic/format";
import { GameState } from "../logic/GameState";
import { addCrispText } from "../utils/text";

interface ActiveTarget {
  id: string;
  def: TargetDefinition;
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  hpBar?: Phaser.GameObjects.Graphics;
  currentHp: number;
  maxHp: number;
  remainingLife?: number;
  x: number;
  y: number;
}

export class RoundScene extends Phaser.Scene {
  private gameState!: GameState;
  private audio!: AudioManager;

  // 正方形の的出現エリア定義 (幅800 × 高さ800)
  public readonly arenaLeft = 50;
  public readonly arenaTop = 220;
  public readonly arenaSize = 800;
  public readonly arenaRight = 50 + 800; // 850
  public readonly arenaBottom = 220 + 800; // 1020

  // ラウンドタイマー
  private timeRemaining: number = 7.0;
  private isRoundActive: boolean = false;

  // 射撃制御
  private isPointerDown: boolean = false;
  private lastFireTime: number = 0;
  private pointerWorldX: number = 450;
  private pointerWorldY: number = 620;

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

    // 全体背景描画
    this.createBackground(width, height);

    // ★ 正方形の的出現エリア（Target Arena）を描画
    this.createSquareTargetArena();

    // パーティクルエミッター
    this.sparkEmitter = this.add.particles(0, 0, "spark", {
      speed: { min: 80, max: 240 },
      scale: { start: 0.6, end: 0 },
      blendMode: "ADD",
      lifespan: 300,
      gravityY: 150,
      emitting: false,
    });

    // 正方形エリア内に的を初期出現
    this.spawnInitialTargets();

    // 上部HUDの作成
    this.createTopHUD(width);

    // 下部コントロールパネルの作成
    this.createBottomControls(width, height);

    // 照準 (レティクル)
    this.reticle = this.add
      .image(width / 2, this.arenaTop + this.arenaSize / 2, "reticle")
      .setDepth(100);

    // 入力イベントの設定
    this.setupInputHandlers();

    // ラウンド開始アナウンス演出
    this.showRoundStartBanner();
  }

  private createBackground(width: number, height: number): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x070b14, 0x070b14, 0x0f172a, 0x0f172a, 1);
    bg.fillRect(0, 0, width, height);

    // 全体グリッド線
    bg.lineStyle(1, 0x1e293b, 0.3);
    for (let x = 0; x < width; x += 60) {
      bg.moveTo(x, 0);
      bg.lineTo(x, height);
    }
    for (let y = 0; y < height; y += 60) {
      bg.moveTo(0, y);
      bg.lineTo(width, y);
    }
    bg.strokePath();
  }

  /**
   * ★ 800×800 の正方形の的出現エリアを描画
   */
  private createSquareTargetArena(): void {
    const g = this.add.graphics();

    // 正方形内部のハイテク暗背景
    g.fillStyle(0x0a0f1d, 0.95);
    g.fillRoundedRect(this.arenaLeft, this.arenaTop, this.arenaSize, this.arenaSize, 16);

    // 正方形内部のグリッド（100px刻み）
    g.lineStyle(1, 0x1e293b, 0.6);
    for (let x = this.arenaLeft + 80; x < this.arenaRight; x += 80) {
      g.moveTo(x, this.arenaTop);
      g.lineTo(x, this.arenaBottom);
    }
    for (let y = this.arenaTop + 80; y < this.arenaBottom; y += 80) {
      g.moveTo(this.arenaLeft, y);
      g.lineTo(this.arenaRight, y);
    }
    g.strokePath();

    // 中央の十字照準ライン
    const centerX = this.arenaLeft + this.arenaSize / 2;
    const centerY = this.arenaTop + this.arenaSize / 2;
    g.lineStyle(1.5, 0x0284c7, 0.35);
    g.strokeCircle(centerX, centerY, 120);
    g.strokeCircle(centerX, centerY, 240);
    g.strokeCircle(centerX, centerY, 360);

    // 正方形の外枠フレーム
    g.lineStyle(3, 0x0284c7, 0.9);
    g.strokeRoundedRect(this.arenaLeft, this.arenaTop, this.arenaSize, this.arenaSize, 16);

    // 四隅のサイバーターゲットブラケット
    const cornerSize = 40;
    const cornerThick = 4;
    g.lineStyle(cornerThick, 0x38bdf8, 1);

    // 左上
    g.beginPath();
    g.moveTo(this.arenaLeft + cornerSize, this.arenaTop);
    g.lineTo(this.arenaLeft, this.arenaTop);
    g.lineTo(this.arenaLeft, this.arenaTop + cornerSize);
    g.strokePath();

    // 右上
    g.beginPath();
    g.moveTo(this.arenaRight - cornerSize, this.arenaTop);
    g.lineTo(this.arenaRight, this.arenaTop);
    g.lineTo(this.arenaRight, this.arenaTop + cornerSize);
    g.strokePath();

    // 左下
    g.beginPath();
    g.moveTo(this.arenaLeft, this.arenaBottom - cornerSize);
    g.lineTo(this.arenaLeft, this.arenaBottom);
    g.lineTo(this.arenaLeft + cornerSize, this.arenaBottom);
    g.strokePath();

    // 右下
    g.beginPath();
    g.moveTo(this.arenaRight - cornerSize, this.arenaBottom);
    g.lineTo(this.arenaRight, this.arenaBottom);
    g.lineTo(this.arenaRight, this.arenaBottom - cornerSize);
    g.strokePath();

    // 正方形エリアのラベル表示
    addCrispText(this, centerX, this.arenaTop - 18, "TARGET SHOOTING ARENA", {
      fontSize: "14px",
      fontFamily: "monospace",
      color: "#38bdf8",
    }).setOrigin(0.5);
  }

  private createTopHUD(width: number): void {
    const topBar = this.add.graphics();
    topBar.fillStyle(0x0f172a, 0.96);
    topBar.fillRect(0, 0, width, 180);
    topBar.lineStyle(2, 0x1e293b, 1);
    topBar.moveTo(0, 180);
    topBar.lineTo(width, 180);
    topBar.strokePath();

    // ラウンド表示
    this.roundInfoText = addCrispText(this, 50, 30, `ROUND ${this.gameState.round}`, {
      fontSize: "36px",
      fontStyle: "bold",
      color: "#38bdf8",
    });

    // タイマー表示 (中央)
    this.timerText = addCrispText(
      this,
      width / 2,
      95,
      `TIME: ${formatSeconds(this.timeRemaining)}`,
      {
        fontSize: "44px",
        fontStyle: "bold",
        fontFamily: "monospace",
        color: "#22c55e",
      },
    ).setOrigin(0.5, 0);

    // 所持SP表示 (右上)
    this.spText = addCrispText(
      this,
      width - 50,
      25,
      `所持: ${formatNumber(this.gameState.sp)} SP`,
      {
        fontSize: "24px",
        fontStyle: "bold",
        color: "#facc15",
      },
    ).setOrigin(1, 0);

    // 今回ラウンド獲得SP
    this.roundSpText = addCrispText(
      this,
      width - 50,
      60,
      `獲得: +${formatNumber(this.gameState.lastRoundSpEarned)} SP`,
      {
        fontSize: "20px",
        color: "#94a3b8",
      },
    ).setOrigin(1, 0);
  }

  private createBottomControls(width: number, height: number): void {
    const bottomBar = this.add.graphics();
    bottomBar.fillStyle(0x0f172a, 0.96);
    bottomBar.fillRect(0, 1050, width, height - 1050);
    bottomBar.lineStyle(2, 0x1e293b, 1);
    bottomBar.moveTo(0, 1050);
    bottomBar.lineTo(width, 1050);
    bottomBar.strokePath();

    // 武器選択ボタンコンテナ
    this.weaponButtonsContainer = this.add.container(50, 1080);
    this.refreshWeaponButtons();

    // オート射撃切り替えトグルコンテナ
    this.autoFireToggleContainer = this.add.container(width / 2, 1260);
    this.refreshAutoFireToggle();

    // 操作説明テキスト
    addCrispText(this, width / 2, 1360, "タップ / クリックで射撃  •  長押しで連射", {
      fontSize: "19px",
      color: "#94a3b8",
    }).setOrigin(0.5);

    addCrispText(this, width / 2, 1400, "5ラウンドごとにSPの請求が発生します", {
      fontSize: "16px",
      color: "#64748b",
    }).setOrigin(0.5);
  }

  public refreshWeaponButtons(): void {
    this.weaponButtonsContainer.removeAll(true);

    const owned = this.gameState.ownedWeapons;
    const buttonWidth = 250;
    const buttonHeight = 70;
    const gap = 25;

    owned.forEach((weaponId, index) => {
      const def = WEAPONS[weaponId];
      const isEquipped = this.gameState.equippedWeapon === weaponId;
      const x = index * (buttonWidth + gap);

      const btn = this.add.container(x, 0);
      const bg = this.add.graphics();
      bg.fillStyle(isEquipped ? 0x0284c7 : 0x1e293b, 1);
      bg.lineStyle(isEquipped ? 3 : 1.5, isEquipped ? 0x38bdf8 : 0x475569, 1);
      bg.fillRoundedRect(0, 0, buttonWidth, buttonHeight, 12);
      bg.strokeRoundedRect(0, 0, buttonWidth, buttonHeight, 12);

      const label = addCrispText(this, buttonWidth / 2, 22, def.name, {
        fontSize: "20px",
        fontStyle: isEquipped ? "bold" : "normal",
        color: isEquipped ? "#ffffff" : "#cbd5e1",
      }).setOrigin(0.5);

      const subLabel = addCrispText(
        this,
        buttonWidth / 2,
        48,
        `威力:${def.damage} | 速度:${def.fireInterval}s`,
        {
          fontSize: "14px",
          color: isEquipped ? "#bae6fd" : "#94a3b8",
        },
      ).setOrigin(0.5);

      btn.add([bg, label, subLabel]);
      btn.setSize(buttonWidth, buttonHeight);
      btn.setInteractive({ useHandCursor: true });

      btn.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        this.gameState.equipWeapon(weaponId);
        this.audio.playSynthSE("click");
        this.refreshWeaponButtons();
      });

      this.weaponButtonsContainer.add(btn);
    });
  }

  public refreshAutoFireToggle(): void {
    this.autoFireToggleContainer.removeAll(true);
    if (!this.gameState.canToggleAutoFire()) return;

    const isOn = this.gameState.persistentData.settings.autoFire;
    const btnW = 380;
    const btnH = 60;

    const bg = this.add.graphics();
    bg.fillStyle(isOn ? 0x16a34a : 0x334155, 1);
    bg.lineStyle(2, isOn ? 0x4ade80 : 0x64748b, 1);
    bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);

    const label = addCrispText(
      this,
      0,
      0,
      `オート射撃: ${isOn ? "【 ON (自動連射中) 】" : "【 OFF 】"}`,
      {
        fontSize: "20px",
        fontStyle: "bold",
        color: "#ffffff",
      },
    ).setOrigin(0.5);

    this.autoFireToggleContainer.add([bg, label]);
    this.autoFireToggleContainer.setSize(btnW, btnH);
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
      // 正方形の射撃エリア内のみ射撃実行
      if (
        pointer.x < this.arenaLeft ||
        pointer.x > this.arenaRight ||
        pointer.y < this.arenaTop ||
        pointer.y > this.arenaBottom
      ) {
        return;
      }

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
    const centerX = this.arenaLeft + this.arenaSize / 2;
    const centerY = this.arenaTop + this.arenaSize / 2;

    const banner = addCrispText(this, centerX, centerY, "START!", {
      fontSize: "76px",
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

  // --- 正方形エリア内での的の生成管理 ---
  private spawnInitialTargets(): void {
    const targetCount = this.gameState.getMaxTargets();
    for (let i = 0; i < targetCount; i++) {
      this.spawnOneTarget();
    }
  }

  private spawnOneTarget(): void {
    if (!this.isRoundActive) return;

    const def = this.gameState.rollTarget();

    // ★ 的のスポーン座標は「正方形エリア」の内側に完全に制限する
    const margin = def.radius + 20;
    const minX = this.arenaLeft + margin;
    const maxX = this.arenaRight - margin;
    const minY = this.arenaTop + margin;
    const maxY = this.arenaBottom - margin;

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
    const container = this.add.container(x, y);

    const sprite = this.add.image(0, 0, `target_${def.id}`);
    container.add(sprite);

    // HPゲージ
    let hpBar: Phaser.GameObjects.Graphics | undefined;
    if (def.hp > 1) {
      hpBar = this.add.graphics();
      this.updateHpBar(hpBar, def.hp, def.hp, def.radius);
      container.add(hpBar);
    }

    // 出現アニメーション
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

    bar.fillStyle(0x0f172a, 0.8);
    bar.fillRect(startX, startY, barWidth, barHeight);

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

    if (now - this.lastFireTime < intervalMs) {
      return;
    }
    this.lastFireTime = now;

    this.performShot(this.pointerWorldX, this.pointerWorldY);
  }

  private performShot(targetX: number, targetY: number): void {
    this.audio.playSynthSE("laser", 0.6);
    this.cameras.main.shake(60, 0.003);

    const hole = this.add.image(targetX, targetY, "bullet_hole").setDepth(5);
    this.tweens.add({
      targets: hole,
      alpha: 0,
      duration: 1500,
      onComplete: () => hole.destroy(),
    });

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
    const isCrit = this.gameState.rollCrit();
    const damage = this.gameState.calculateDamage(isCrit);

    this.audio.playSynthSE("hit", 0.7);
    this.sparkEmitter.explode(8, hitX, hitY);
    this.showDamagePopup(hitX, hitY, damage, isCrit);

    target.currentHp -= damage;
    if (target.hpBar) {
      this.updateHpBar(target.hpBar, target.currentHp, target.maxHp, target.def.radius);
    }

    this.tweens.add({
      targets: target.container,
      scaleX: 0.9,
      scaleY: 0.9,
      duration: 50,
      yoyo: true,
      ease: "Quad.easeOut",
    });

    if (target.currentHp <= 0) {
      this.destroyTarget(target, damage);
    }
  }

  private destroyTarget(target: ActiveTarget, killingDamage: number): void {
    this.activeTargets.delete(target.id);
    this.audio.playSynthSE("explosion", 0.8);

    const spEarned = this.gameState.onTargetDestroyed(target.def.id);
    this.spText.setText(`所持: ${formatNumber(this.gameState.sp)} SP`);
    this.roundSpText.setText(`獲得: +${formatNumber(this.gameState.lastRoundSpEarned)} SP`);

    this.showSpPopup(target.x, target.y, spEarned);
    this.triggerTargetSpecialEffect(target, killingDamage);

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

    this.time.delayedCall(200, () => {
      if (this.isRoundActive && this.activeTargets.size < this.gameState.getMaxTargets()) {
        this.spawnOneTarget();
      }
    });
  }

  private triggerTargetSpecialEffect(target: ActiveTarget, killingDamage: number): void {
    if (target.def.id === "time") {
      const bonusSeconds = this.gameState.getTimeTargetBonus();
      this.timeRemaining += bonusSeconds;
      this.showTimeBonusPopup(target.x, target.y, bonusSeconds);
    }

    if (target.def.id === "electric") {
      this.triggerChainLightning(target.x, target.y, killingDamage);
    }
  }

  private triggerChainLightning(fromX: number, fromY: number, sourceDamage: number): void {
    const chainDamage = this.gameState.getChainDamage(sourceDamage);
    const targetsToHit = Array.from(this.activeTargets.values());

    for (const other of targetsToHit) {
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

  update(_time: number, delta: number): void {
    if (!this.isRoundActive) return;

    const deltaSeconds = delta / 1000;
    this.timeRemaining -= deltaSeconds;

    this.timerText.setText(`TIME: ${formatSeconds(this.timeRemaining)}`);
    if (this.timeRemaining <= 2.5) {
      this.timerText.setColor("#ef4444");
    } else {
      this.timerText.setColor("#22c55e");
    }

    for (const t of Array.from(this.activeTargets.values())) {
      if (typeof t.remainingLife === "number") {
        t.remainingLife -= deltaSeconds;
        if (t.remainingLife <= 0.8) {
          t.container.setAlpha(Math.floor(this.time.now / 80) % 2 === 0 ? 0.3 : 1.0);
        }
        if (t.remainingLife <= 0) {
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

    const isAutoOn =
      this.gameState.canToggleAutoFire() && this.gameState.persistentData.settings.autoFire;

    if (isAutoOn) {
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

    if (this.timeRemaining <= 0) {
      this.onRoundTimeUp();
    }
  }

  private onRoundTimeUp(): void {
    this.isRoundActive = false;
    this.timeRemaining = 0;
    this.timerText.setText("TIME: 0.0s");

    this.gameState.endRound();

    const centerX = this.arenaLeft + this.arenaSize / 2;
    const centerY = this.arenaTop + this.arenaSize / 2;

    const banner = addCrispText(this, centerX, centerY, "TIME UP!", {
      fontSize: "76px",
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
        if (this.gameState.isCleared) {
          this.scene.start("ClearScene");
        } else {
          this.scene.start("ResultScene");
        }
      },
    });
  }
}
