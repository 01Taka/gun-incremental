import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import { VOCAB } from "../config/vocab";
import { EventBus } from "../EventBus";
import { GameState } from "../logic/GameState";
import { addCrispText } from "../utils/text";
import { BulletManager } from "./round/BulletManager";
import { GunTurret } from "./round/GunTurret";
import { RoundHUD } from "./round/RoundHUD";
import { TargetManager } from "./round/TargetManager";
import type { ArenaBounds } from "./round/types";
import { VerticalSlider } from "./round/VerticalSlider";
import {
  drawWesternBackdrop,
  getStageSubtitle,
  getWesternQuote,
  showCinemaTitleCard,
} from "./WesternDecor";

type RoundPhase = "countdown" | "playing" | "ended";

export class RoundScene extends Phaser.Scene {
  // 決闘開始前の「静寂の間」3カウント合計時間（秒）
  private static readonly COUNTDOWN_DURATION = 1.15;

  private gameState!: GameState;
  private audio!: AudioManager;

  // 正方形の賞金首出現エリア定義 (幅800 × 高さ800, 画面最上部に配置)
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

  // シリンダー装弾 & リロード管理
  private currentAmmo: number = 0;
  private isReloading: boolean = false;
  private reloadTimeRemaining: number = 0;
  private totalReloadDuration: number = 1.0;
  private reloadStage: number = 0; // 0: 待機, 1: シリンダー回転排出済み, 2: 真鍮弾挿入済み

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

    // 決闘直前の「静寂の間」：BGMを止め、乾いた風と懐中時計・鐘の音だけを残す
    this.audio.enterDuelSilence();

    // ラウンド状態の初期化
    this.timeRemaining = this.gameState.getRoundDuration();
    this.phase = "countdown";
    this.countdownRemaining = RoundScene.COUNTDOWN_DURATION;
    this.lastDisplayedCount = 3;
    this.lastFireTime = -Infinity;

    // 弾倉装填
    this.currentAmmo = this.gameState.getMagazineSize();
    this.isReloading = false;
    this.reloadTimeRemaining = 0;
    this.totalReloadDuration = this.gameState.getReloadTime();
    this.reloadStage = 0;

    // 1. 西部劇の夕焼け荒野背景と木柵アリーナの描画
    drawWesternBackdrop(this, width, height, {
      horizonY: 540,
      variant: this.gameState.round % 5 === 0 ? "crimson" : "sunset",
      withBuildings: true,
      withAtmosphere: true,
    });
    this.createFrontierTargetArena();

    // 2. 火薬火花パーティクル初期化
    this.sparkEmitter = this.add
      .particles(0, 0, "spark", {
        speed: { min: 90, max: 260 },
        scale: { start: 0.7, end: 0 },
        blendMode: "ADD",
        lifespan: 320,
        gravityY: 180,
        tint: [0xfef08a, 0xf59e0b, 0xea580c],
        emitting: false,
      })
      .setDepth(50);

    // 3. HUD（6連シリンダー・賞金・下部コントロール）の作成
    this.hud = new RoundHUD(this, this.arenaBounds);

    // 4. 縦型直線スライダー配置
    this.verticalSlider = new VerticalSlider(this, {
      defaultCenterX: width / 2,
      defaultCenterY: 1385,
      halfLength: 188,
      trackWidth: 20,
    });

    // 5. リボルバー銃身（中央下部）の作成
    this.gunTurret = new GunTurret(this, this.arenaBounds);

    // 6. 賞金首ターゲットマネージャーの作成
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

    // 7. 鉛弾マネージャーの作成
    this.bulletManager = new BulletManager(this, this.arenaBounds, this.targetManager, {
      onHitTarget: () => {},
    });

    // 8. 入力イベント設定
    this.setupInputHandlers();

    // 9. 初期照準の描画 & 映画タイトルカード風のステージ開幕演出
    this.gunTurret.setAimRatio(this.verticalSlider.ratio);
    this.gunTurret.drawLaserSight();
    this.hud.setReadyStatus();
    this.hud.updateAmmo(this.currentAmmo, this.gameState.getMagazineSize(), false, 0);
    this.hud.refreshWeaponButtons(() => this.onWeaponEquipped());

    showCinemaTitleCard(this, {
      actLabel: getStageSubtitle(this.gameState.round),
      title: VOCAB.progression.roundHudLabel(this.gameState.round),
      quote: getWesternQuote(this.gameState.round + 1),
      y: 235,
      holdMs: 680,
      fadeMs: 280,
    });

    this.hud.showCountdownNumber(3);
    this.audio.playSE("countdown", { volume: 0.75 });
  }

  private createFrontierTargetArena(): void {
    const g = this.add.graphics().setDepth(5);
    const { left, top, size, right, bottom } = this.arenaBounds;

    // 決闘アリーナの砂塵シェード（背景の夕陽・岩山・酒場がほんのり透けて見える濃度）
    g.fillStyle(0x1f0f07, 0.42);
    g.fillRoundedRect(left, top, size, size, 12);

    // 縄張り・射撃距離ガイド円（淡い真鍮アンバー）
    const centerX = left + size / 2;
    const centerY = top + size / 2;
    g.lineStyle(1.2, 0xd97706, 0.2);
    g.strokeCircle(centerX, centerY, 130);
    g.strokeCircle(centerX, centerY, 260);
    g.strokeCircle(centerX, centerY, 380);

    // 木製の牧場柵・梁フレーム外枠
    g.lineStyle(6, 0x3b1d0c, 0.95);
    g.strokeRoundedRect(left, top, size, size, 12);
    g.lineStyle(2, 0xb45309, 0.9);
    g.strokeRoundedRect(left, top, size, size, 12);

    // 四隅の鍛鉄金具ブラケット（L字アイアン＋真鍮鋲）
    const cornerSize = 42;
    g.lineStyle(5, 0xd97706, 1);

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

    addCrispText(this, centerX, top - 20, "★  HIGH NOON DUELING GROUND  ★", {
      fontSize: "15px",
      fontFamily: "display",
      fontStyle: "bold",
      color: "#fde68a",
      stroke: "#1c0a04",
      strokeThickness: 3,
    })
      .setOrigin(0.5)
      .setDepth(10);
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

    // 自動早撃ち照準設定時
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
        const diff = targetRatio - this.verticalSlider.ratio;
        const step = deltaSeconds * 1.5;
        if (Math.abs(diff) < step) {
          this.verticalSlider.setRatio(targetRatio);
        } else {
          this.verticalSlider.setRatio(this.verticalSlider.ratio + Math.sign(diff) * step);
        }
      }
    }

    // スライダー比率でリボルバーの角度を設定 & 照準線描画
    this.gunTurret.setAimRatio(this.verticalSlider.ratio);
    this.gunTurret.drawLaserSight(this.isReloading);

    // 決闘前の静寂カウントダウン中の処理
    if (this.phase === "countdown") {
      this.countdownRemaining -= deltaSeconds;
      if (this.countdownRemaining > 0) {
        const count = Math.ceil((this.countdownRemaining / RoundScene.COUNTDOWN_DURATION) * 3);
        if (count < this.lastDisplayedCount && count >= 1) {
          this.lastDisplayedCount = count;
          this.hud.showCountdownNumber(count);
          this.audio.playSE("countdown", { volume: 0.75 });
        }
        return;
      }

      this.startRound();
      const initialTarget = this.gunTurret.checkRayIntersection(this.targetManager.getTargets());
      this.hud.updateLockOn(initialTarget ? VOCAB.targets[initialTarget.def.id].name : null);
      if (initialTarget) {
        this.attemptAutoFire();
      }
      return;
    }

    // シリンダー再装填処理の更新
    if (this.isReloading) {
      this.reloadTimeRemaining -= deltaSeconds;
      const progress = 1 - Math.max(0, this.reloadTimeRemaining / this.totalReloadDuration);
      this.hud.updateAmmo(0, this.gameState.getMagazineSize(), true, progress);

      // 中間（約48%進行）で真鍮薬莢の装填チャリン音を再生
      if (this.reloadStage === 1 && progress >= 0.48) {
        this.reloadStage = 2;
        this.audio.playSynthSE("reload_insert", 0.72);
      }

      if (this.reloadTimeRemaining <= 0) {
        this.finishReload();
      }
    } else {
      this.hud.updateAmmo(this.currentAmmo, this.gameState.getMagazineSize(), false, 0);
    }

    this.timeRemaining -= deltaSeconds;
    this.hud.updateTimer(this.timeRemaining);

    // 射線と賞金首の交差判定
    const targets = this.targetManager.getTargets();
    const lockedTarget = this.gunTurret.checkRayIntersection(targets);

    if (this.isReloading) {
      this.hud.updateLockOn(null);
    } else if (lockedTarget) {
      this.hud.updateLockOn(VOCAB.targets[lockedTarget.def.id].name);
    } else {
      this.hud.updateLockOn(null);
    }

    // 賞金首に射線が合った瞬間、自動早撃ち発砲
    if (lockedTarget && !this.isReloading) {
      this.attemptAutoFire();
    }

    this.bulletManager.update(deltaSeconds);
    this.targetManager.update(deltaSeconds);

    if (this.timeRemaining <= 0) {
      this.onRoundTimeUp();
    }
  }

  private startRound(): void {
    this.phase = "playing";
    this.lastFireTime = -Infinity;
    this.audio.playSE("start", { volume: 0.9 });
    this.audio.playBGM("western_duel");
    this.hud.showStartBanner();
  }

  private onWeaponEquipped(): void {
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
    // シリンダーを回すカチカチ音
    this.audio.playSynthSE("reload", 0.75);
    this.hud.updateAmmo(0, this.gameState.getMagazineSize(), true, 0);
  }

  private finishReload(): void {
    this.isReloading = false;
    this.currentAmmo = this.gameState.getMagazineSize();
    this.reloadTimeRemaining = 0;
    this.reloadStage = 0;
    this.audio.playSynthSE("reload_complete", 0.78);
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

    // 重くエコーが響くリボルバー銃声 ＆ カメラ振動
    this.audio.playSynthSE("shoot", 0.78);
    this.cameras.main.shake(55, 0.0024);

    const muzzle = this.gunTurret.getMuzzlePosition();
    this.bulletManager.spawnBullet(muzzle.x, muzzle.y, this.gunTurret.angle);
    this.gunTurret.playRecoilAnimation();

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
    this.audio.playSynthSE("bell", 0.65);

    this.hud.showTimeUpBanner(() => {
      if (this.gameState.isCleared) {
        this.scene.start("ClearScene");
      } else {
        this.scene.start("ResultScene");
      }
    });
  }
}
