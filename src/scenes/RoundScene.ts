import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import { EventBus } from "../EventBus";
import { GameState } from "../logic/GameState";
import { addCrispText } from "../utils/text";
import { ArcSlider } from "./round/ArcSlider";
import { BulletManager } from "./round/BulletManager";
import { GunTurret } from "./round/GunTurret";
import { RoundHUD } from "./round/RoundHUD";
import { TargetManager } from "./round/TargetManager";
import type { ArenaBounds } from "./round/types";

export class RoundScene extends Phaser.Scene {
  private gameState!: GameState;
  private audio!: AudioManager;

  // 正方形の的出現エリア定義 (幅800 × 高さ800)
  public readonly arenaBounds: ArenaBounds = {
    left: 50,
    top: 220,
    size: 800,
    right: 850,
    bottom: 1020,
  };

  // サブシステム
  private arcSlider!: ArcSlider;
  private gunTurret!: GunTurret;
  private bulletManager!: BulletManager;
  private targetManager!: TargetManager;
  private hud!: RoundHUD;

  // ラウンド進行状態
  private timeRemaining: number = 7.0;
  private isRoundActive: boolean = false;
  private lastFireTime: number = 0;

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

    // マルチタッチポインターの有効化
    this.input.addPointer(3);

    // ラウンド状態の初期化
    this.timeRemaining = this.gameState.getRoundDuration();
    this.isRoundActive = true;
    this.lastFireTime = 0;

    // 1. 全体背景と正方形アリーナの描画
    this.createBackground(width, height);
    this.createSquareTargetArena();

    // 2. エフェクトパーティクル初期化
    this.sparkEmitter = this.add.particles(0, 0, "spark", {
      speed: { min: 80, max: 240 },
      scale: { start: 0.6, end: 0 },
      blendMode: "ADD",
      lifespan: 300,
      gravityY: 150,
      emitting: false,
    });

    // 3. HUD（上部情報・下部コントロール）の作成
    this.hud = new RoundHUD(this, this.arenaBounds);

    // 4. 中央付近に1/4円弧メーター（ArcSlider）を配置（同じ形状のまま水平中心を画面中央へ配置）
    this.arcSlider = new ArcSlider(this, {
      centerX: width / 2 + 190, // 640 (スライダーの水平中心が画面中央 x:450 に一致)
      centerY: height, // 1600
      radius: 350,
      trackWidth: 26,
      startAngleDeg: 185, // 左下側（左を狙う）
      endAngleDeg: 265, // 右上側（右を狙う）
      initialRatio: 0.5, // 中央（真上を狙う）
    });

    // 5. 銃（中央下部に配置されるタレット）の作成
    this.gunTurret = new GunTurret(this, this.arenaBounds);

    // 6. 的（ターゲット）マネージャーの作成
    this.targetManager = new TargetManager(this, this.arenaBounds, this.sparkEmitter, {
      onDamage: (x, y, damage, isCrit, color) => {
        this.hud.showDamagePopup(x, y, damage, isCrit, color);
      },
      onSpEarned: (x, y, sp) => {
        this.hud.updateSp();
        this.hud.showSpPopup(x, y, sp);
      },
      onTimeBonus: (x, y, bonusSeconds) => {
        this.timeRemaining += bonusSeconds;
        this.hud.showTimeBonusPopup(x, y, bonusSeconds);
      },
    });
    this.targetManager.spawnInitialTargets();

    // 7. 弾丸（プロジェクタイル）マネージャーの作成
    this.bulletManager = new BulletManager(this, this.arenaBounds, this.targetManager, {
      onHitTarget: () => {
        // ヒット時処理
      },
    });

    // 8. 入力イベント設定
    this.setupInputHandlers();

    // 9. ラウンド開始バナー
    this.hud.showStartBanner();
  }

  private createBackground(width: number, height: number): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x070b14, 0x070b14, 0x0f172a, 0x0f172a, 1);
    bg.fillRect(0, 0, width, height);

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

  private createSquareTargetArena(): void {
    const g = this.add.graphics();
    const { left, top, size, right, bottom } = this.arenaBounds;

    g.fillStyle(0x0a0f1d, 0.95);
    g.fillRoundedRect(left, top, size, size, 16);

    g.lineStyle(1, 0x1e293b, 0.6);
    for (let x = left + 80; x < right; x += 80) {
      g.moveTo(x, top);
      g.lineTo(x, bottom);
    }
    for (let y = top + 80; y < bottom; y += 80) {
      g.moveTo(left, y);
      g.lineTo(right, y);
    }
    g.strokePath();

    const centerX = left + size / 2;
    const centerY = top + size / 2;
    g.lineStyle(1.5, 0x0284c7, 0.35);
    g.strokeCircle(centerX, centerY, 120);
    g.strokeCircle(centerX, centerY, 240);
    g.strokeCircle(centerX, centerY, 360);

    g.lineStyle(3, 0x0284c7, 0.9);
    g.strokeRoundedRect(left, top, size, size, 16);

    const cornerSize = 40;
    const cornerThick = 4;
    g.lineStyle(cornerThick, 0x38bdf8, 1);

    g.beginPath();
    g.moveTo(left + cornerSize, top);
    g.lineTo(left, top);
    g.lineTo(left, top + cornerSize);
    g.strokePath();

    g.beginPath();
    g.moveTo(right - cornerSize, top);
    g.lineTo(right, top);
    g.lineTo(right, top + cornerSize);
    g.strokePath();

    g.beginPath();
    g.moveTo(left, bottom - cornerSize);
    g.lineTo(left, bottom);
    g.lineTo(left + cornerSize, bottom);
    g.strokePath();

    g.beginPath();
    g.moveTo(right - cornerSize, bottom);
    g.lineTo(right, bottom);
    g.lineTo(right, bottom - cornerSize);
    g.strokePath();

    addCrispText(this, centerX, top - 18, "TARGET SHOOTING ARENA", {
      fontSize: "14px",
      fontFamily: "monospace",
      color: "#38bdf8",
    }).setOrigin(0.5);
  }

  private setupInputHandlers(): void {
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.arcSlider.handlePointerDown(pointer);
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      this.arcSlider.handlePointerMove(pointer);
    });

    const releaseHandler = (pointer: Phaser.Input.Pointer) => {
      this.arcSlider.handlePointerUp(pointer);
    };

    this.input.on("pointerup", releaseHandler);
    this.input.on("pointerupoutside", releaseHandler);
  }

  update(_time: number, delta: number): void {
    if (!this.isRoundActive) return;

    const deltaSeconds = delta / 1000;
    this.timeRemaining -= deltaSeconds;

    // タイマーHUDの更新
    this.hud.updateTimer(this.timeRemaining);

    // キーボードによるスライダー更新
    this.arcSlider.update(deltaSeconds);

    // オートエイム設定時（操作中でなく、かつオートエイムが有効な場合）
    const isAutoAimOn =
      this.gameState.canToggleAutoFire() && this.gameState.persistentData.settings.autoFire;
    if (isAutoAimOn && !this.arcSlider.isDragging) {
      const closestTarget = this.targetManager.getClosestTarget(this.gunTurret.x, this.gunTurret.y);
      if (closestTarget) {
        const targetAngle = Phaser.Math.Angle.Between(
          this.gunTurret.x,
          this.gunTurret.y,
          closestTarget.x,
          closestTarget.y,
        );
        const targetRatio = this.gunTurret.getRatioForAngle(targetAngle);
        // 滑らかに目標の比率へ追従
        const diff = targetRatio - this.arcSlider.ratio;
        const step = deltaSeconds * 1.5;
        if (Math.abs(diff) < step) {
          this.arcSlider.setRatio(targetRatio);
        } else {
          this.arcSlider.setRatio(this.arcSlider.ratio + Math.sign(diff) * step);
        }
      }
    }

    // ★ メーターの位置で銃の角度を直接設定
    this.gunTurret.setAimRatio(this.arcSlider.ratio);

    // ★ 射線（直線）と的の交差判定
    const targets = this.targetManager.getTargets();
    const lockedTarget = this.gunTurret.checkRayIntersection(targets);

    // レーザーサイトの描画（当たっている時は赤色ビーム）
    this.gunTurret.drawLaserSight(lockedTarget);

    // HUDのロックオンステータス表示
    if (lockedTarget) {
      this.hud.updateLockOn(lockedTarget.def.name);
    } else {
      this.hud.updateLockOn(null);
    }

    // ★ 射撃が行われるのは「ひとつ以上的に直線が当たっている時だけ」！
    if (lockedTarget) {
      this.attemptAutoFire();
    }

    // 弾丸の更新（移動・衝突判定）
    this.bulletManager.update(deltaSeconds);

    // 的マネージャーのフレーム更新（金の的などの寿命管理）
    this.targetManager.update(deltaSeconds);

    if (this.timeRemaining <= 0) {
      this.onRoundTimeUp();
    }
  }

  private attemptAutoFire(): void {
    const now = this.time.now;
    const intervalMs = this.gameState.getFireInterval() * 1000;

    if (now - this.lastFireTime >= intervalMs) {
      this.lastFireTime = now;
      this.fireBullet();
    }
  }

  private fireBullet(): void {
    this.audio.playSynthSE("laser", 0.55);
    this.cameras.main.shake(40, 0.0018);

    const muzzle = this.gunTurret.getMuzzlePosition();
    this.bulletManager.spawnBullet(muzzle.x, muzzle.y, this.gunTurret.angle);
    this.gunTurret.playRecoilAnimation();
  }

  private onRoundTimeUp(): void {
    this.isRoundActive = false;
    this.timeRemaining = 0;
    this.targetManager.setRoundActive(false);
    this.hud.updateTimer(0);
    this.bulletManager.clear();

    this.gameState.endRound();

    this.hud.showTimeUpBanner(() => {
      if (this.gameState.isCleared) {
        this.scene.start("ClearScene");
      } else {
        this.scene.start("ResultScene");
      }
    });
  }
}
