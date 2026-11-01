import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import { EventBus } from "../EventBus";
import { GameState } from "../logic/GameState";
import { addCrispText } from "../utils/text";
import { BulletManager } from "./round/BulletManager";
import { GunTurret } from "./round/GunTurret";
import { RoundHUD } from "./round/RoundHUD";
import { TargetManager } from "./round/TargetManager";
import type { ArenaBounds } from "./round/types";
import { VerticalSlider } from "./round/VerticalSlider";

type RoundPhase = "countdown" | "playing" | "ended";

export class RoundScene extends Phaser.Scene {
  // ラウンド開始前の3カウント合計時間（秒）
  private static readonly COUNTDOWN_DURATION = 1.0;

  private gameState!: GameState;
  private audio!: AudioManager;

  // 正方形の的出現エリア定義 (幅800 × 高さ800, 画面最上部に配置)
  public readonly arenaBounds: ArenaBounds = {
    left: 50,
    top: 40,
    size: 800,
    right: 850,
    bottom: 840,
  };

  // サブシステム
  private verticalSlider!: VerticalSlider;
  private gunTurret!: GunTurret;
  private bulletManager!: BulletManager;
  private targetManager!: TargetManager;
  private hud!: RoundHUD;

  // ラウンド進行状態
  private timeRemaining: number = 7.0;
  private phase: RoundPhase = "countdown";
  private countdownRemaining: number = RoundScene.COUNTDOWN_DURATION;
  private lastDisplayedCount: number = 0;
  private lastFireTime: number = -Infinity;

  // マガジン & リロード管理
  private currentAmmo: number = 0;
  private isReloading: boolean = false;
  private reloadTimeRemaining: number = 0;
  private totalReloadDuration: number = 1.0;
  private reloadStage: number = 0; // 0: 待機, 1: マガジン排出済み, 2: マガジン挿入済み

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

    // ラウンド状態の初期化（まずは約1秒の3カウントダウンから開始）
    this.timeRemaining = this.gameState.getRoundDuration();
    this.phase = "countdown";
    this.countdownRemaining = RoundScene.COUNTDOWN_DURATION;
    this.lastDisplayedCount = 3;
    this.lastFireTime = -Infinity;

    // マガジン装填
    this.currentAmmo = this.gameState.getMagazineSize();
    this.isReloading = false;
    this.reloadTimeRemaining = 0;
    this.totalReloadDuration = this.gameState.getReloadTime();
    this.reloadStage = 0;

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

    // 4. 縦型直線スライダー（VerticalSlider）を配置（感度20%減少: halfLength 150 -> 188px）
    this.verticalSlider = new VerticalSlider(this, {
      defaultCenterX: width / 2,
      defaultCenterY: 1385,
      halfLength: 188,
      trackWidth: 20,
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

    // 9. 初期照準の描画 & ラウンド開始前の3カウント開始
    this.gunTurret.setAimRatio(this.verticalSlider.ratio);
    this.gunTurret.drawLaserSight();
    this.hud.setReadyStatus();
    this.hud.updateAmmo(this.currentAmmo, this.gameState.getMagazineSize(), false, 0);
    this.hud.refreshWeaponButtons(() => this.onWeaponEquipped());
    this.hud.showCountdownNumber(3);
    this.audio.playSE("countdown", { volume: 0.7 });
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
      this.verticalSlider.handlePointerDown(pointer);
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      this.verticalSlider.handlePointerMove(pointer);
    });

    const releaseHandler = (pointer: Phaser.Input.Pointer) => {
      this.verticalSlider.handlePointerUp(pointer);
    };

    this.input.on("pointerup", releaseHandler);
    this.input.on("pointerupoutside", releaseHandler);
  }

  update(_time: number, delta: number): void {
    if (this.phase === "ended") return;

    const deltaSeconds = delta / 1000;

    // キーボードによるスライダー更新（カウントダウン中も事前エイム可能）
    this.verticalSlider.update(deltaSeconds);

    // オートエイム設定時（操作中でなく、かつオートエイムが有効な場合）
    const isAutoAimOn =
      this.gameState.canToggleAutoFire() && this.gameState.persistentData.settings.autoFire;
    if (isAutoAimOn && !this.verticalSlider.isDragging) {
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
        const diff = targetRatio - this.verticalSlider.ratio;
        const step = deltaSeconds * 1.5;
        if (Math.abs(diff) < step) {
          this.verticalSlider.setRatio(targetRatio);
        } else {
          this.verticalSlider.setRatio(this.verticalSlider.ratio + Math.sign(diff) * step);
        }
      }
    }

    // ★ スライダーの位置（比率）で銃の角度を直接設定 & レーザーサイト描画
    this.gunTurret.setAimRatio(this.verticalSlider.ratio);
    this.gunTurret.drawLaserSight(this.isReloading);

    // カウントダウン中の処理（タイマー減少・射撃・的の寿命減少は行わない）
    if (this.phase === "countdown") {
      this.countdownRemaining -= deltaSeconds;
      if (this.countdownRemaining > 0) {
        const count = Math.ceil((this.countdownRemaining / RoundScene.COUNTDOWN_DURATION) * 3);
        if (count < this.lastDisplayedCount && count >= 1) {
          this.lastDisplayedCount = count;
          this.hud.showCountdownNumber(count);
          this.audio.playSE("countdown", { volume: 0.7 });
        }
        return;
      }

      this.startRound();
      const initialTarget = this.gunTurret.checkRayIntersection(this.targetManager.getTargets());
      this.hud.updateLockOn(initialTarget ? initialTarget.def.name : null);
      if (initialTarget) {
        this.attemptAutoFire();
      }
      return;
    }

    // リロード処理の更新
    if (this.isReloading) {
      this.reloadTimeRemaining -= deltaSeconds;
      const progress = 1 - Math.max(0, this.reloadTimeRemaining / this.totalReloadDuration);
      this.hud.updateAmmo(0, this.gameState.getMagazineSize(), true, progress);

      // 実銃のようなリロード演出：中間（約48%進行）で新マガジンの挿入音を再生
      if (this.reloadStage === 1 && progress >= 0.48) {
        this.reloadStage = 2;
        this.audio.playSynthSE("reload_insert", 0.65);
      }

      if (this.reloadTimeRemaining <= 0) {
        this.finishReload();
      }
    } else {
      this.hud.updateAmmo(this.currentAmmo, this.gameState.getMagazineSize(), false, 0);
    }

    this.timeRemaining -= deltaSeconds;

    // タイマーHUDの更新
    this.hud.updateTimer(this.timeRemaining);

    // ★ 射線（直線）と的の交差判定
    const targets = this.targetManager.getTargets();
    const lockedTarget = this.gunTurret.checkRayIntersection(targets);

    // HUDのロックオンステータス表示
    if (this.isReloading) {
      this.hud.updateLockOn(null);
    } else if (lockedTarget) {
      this.hud.updateLockOn(lockedTarget.def.name);
    } else {
      this.hud.updateLockOn(null);
    }

    // ★ 射撃が行われるのは「ひとつ以上的に直線が当たっている時だけ」！
    if (lockedTarget && !this.isReloading) {
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

  private startRound(): void {
    this.phase = "playing";
    this.lastFireTime = -Infinity;
    this.audio.playSE("start", { volume: 0.85 });
    this.hud.showStartBanner();
  }

  private onWeaponEquipped(): void {
    // 武器を切り替えたら装填数を再設定
    const maxAmmo = this.gameState.getMagazineSize();
    this.currentAmmo = maxAmmo;
    this.isReloading = false;
    this.reloadTimeRemaining = 0;
    this.reloadStage = 0;
    this.hud.updateAmmo(this.currentAmmo, maxAmmo, false, 0);
  }

  private startReload(): void {
    if (this.isReloading) return;
    this.isReloading = true;
    this.totalReloadDuration = this.gameState.getReloadTime();
    this.reloadTimeRemaining = this.totalReloadDuration;
    this.reloadStage = 1;
    this.audio.playSynthSE("reload", 0.65);
    this.hud.updateAmmo(0, this.gameState.getMagazineSize(), true, 0);
  }

  private finishReload(): void {
    this.isReloading = false;
    this.currentAmmo = this.gameState.getMagazineSize();
    this.reloadTimeRemaining = 0;
    this.reloadStage = 0;
    this.audio.playSynthSE("reload_complete", 0.7);
    this.hud.updateAmmo(this.currentAmmo, this.currentAmmo, false, 0);
  }

  private attemptAutoFire(): void {
    if (this.isReloading) return;

    if (this.currentAmmo <= 0) {
      this.startReload();
      return;
    }

    const now = this.time.now;
    const intervalMs = this.gameState.getFireInterval() * 1000;

    if (now - this.lastFireTime >= intervalMs) {
      this.lastFireTime = now;
      this.fireBullet();
    }
  }

  private fireBullet(): void {
    if (this.currentAmmo <= 0) {
      this.startReload();
      return;
    }

    this.currentAmmo--;
    this.hud.updateAmmo(this.currentAmmo, this.gameState.getMagazineSize(), false, 0);

    // 火薬を使ったカジュアルな射撃音
    this.audio.playSynthSE("shoot", 0.65);
    this.cameras.main.shake(40, 0.0018);

    const muzzle = this.gunTurret.getMuzzlePosition();
    this.bulletManager.spawnBullet(muzzle.x, muzzle.y, this.gunTurret.angle);
    this.gunTurret.playRecoilAnimation();

    // 撃ち尽くした場合は即座に自動リロードを開始
    if (this.currentAmmo <= 0) {
      this.startReload();
    }
  }

  private onRoundTimeUp(): void {
    this.phase = "ended";
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
