import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import { WEAPONS } from "../config/gameData";
import type { TargetDefinition } from "../config/types";
import { EventBus } from "../EventBus";
import { formatNumber, formatSeconds } from "../logic/format";
import { GameState } from "../logic/GameState";
import { useGameSettings } from "../stores/useGameSettings";
import { addCrispText } from "../utils/text";

export interface StickState {
  x: number; // -1.0 〜 1.0 (左〜右)
  y: number; // -1.0 〜 1.0 (上〜下)
  active: boolean; // デッドゾーンを超えて操作中か
  angle: number; // 倒されている角度（ラジアン: -PI 〜 PI）
  force: number; // 倒しの強さ（0.0 〜 1.0）
}

interface StickVisuals {
  container: Phaser.GameObjects.Container;
  baseBg: Phaser.GameObjects.Graphics;
  label?: Phaser.GameObjects.Text;
  knob: Phaser.GameObjects.Container;
  knobGraphics: Phaser.GameObjects.Graphics;
  pointerId: number | null;
  baseX: number;
  baseY: number;
  originX: number;
  originY: number;
  maxRadius: number;
  deadZone: number;
  baseRadius: number;
  knobRadius: number;
  baseColor: number;
  borderColor: number;
  knobColor: number;
  labelText: string;
  state: StickState;
}

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

  // 照準 (レティクル) 位置・速度
  private reticleX: number = 450;
  private reticleY: number = 620;
  private readonly reticleSpeed: number = 850; // px/s
  private readonly reticleRadius: number = 28;

  // ★ 初期コミットから流用したバーチャルスティック
  private aimStick!: StickVisuals;

  // キーボード操作対応 (WASD / 矢印キー)
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  // 射撃制御
  private lastFireTime: number = 0;
  private currentAimTarget: ActiveTarget | null = null;

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
  private reticle!: Phaser.GameObjects.Container;
  private reticleInnerRing!: Phaser.GameObjects.Graphics;
  private lockOnStatusText!: Phaser.GameObjects.Text;

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

    // ラウンド初期化
    this.timeRemaining = this.gameState.getRoundDuration();
    this.isRoundActive = true;
    this.activeTargets.clear();
    this.lastFireTime = 0;
    this.currentAimTarget = null;

    // 照準を正方形エリアの中央にリセット
    this.reticleX = this.arenaLeft + this.arenaSize / 2;
    this.reticleY = this.arenaTop + this.arenaSize / 2;

    // 全体背景描画
    this.createBackground(width, height);

    // 正方形の的出現エリア（Target Arena）を描画
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

    // 下部コントロールパネル & バーチャルスティック作成
    this.createBottomControls(width, height);

    // レティクル（照準）の作成
    this.createReticleObject();

    // 入力イベント（バーチャルスティック & キーボード）
    this.setupInputHandlers();

    // ラウンド開始バナー
    this.showRoundStartBanner();
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

  /**
   * 800×800 の正方形の的出現エリアを描画
   */
  private createSquareTargetArena(): void {
    const g = this.add.graphics();

    g.fillStyle(0x0a0f1d, 0.95);
    g.fillRoundedRect(this.arenaLeft, this.arenaTop, this.arenaSize, this.arenaSize, 16);

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

    const centerX = this.arenaLeft + this.arenaSize / 2;
    const centerY = this.arenaTop + this.arenaSize / 2;
    g.lineStyle(1.5, 0x0284c7, 0.35);
    g.strokeCircle(centerX, centerY, 120);
    g.strokeCircle(centerX, centerY, 240);
    g.strokeCircle(centerX, centerY, 360);

    g.lineStyle(3, 0x0284c7, 0.9);
    g.strokeRoundedRect(this.arenaLeft, this.arenaTop, this.arenaSize, this.arenaSize, 16);

    const cornerSize = 40;
    const cornerThick = 4;
    g.lineStyle(cornerThick, 0x38bdf8, 1);

    g.beginPath();
    g.moveTo(this.arenaLeft + cornerSize, this.arenaTop);
    g.lineTo(this.arenaLeft, this.arenaTop);
    g.lineTo(this.arenaLeft, this.arenaTop + cornerSize);
    g.strokePath();

    g.beginPath();
    g.moveTo(this.arenaRight - cornerSize, this.arenaTop);
    g.lineTo(this.arenaRight, this.arenaTop);
    g.lineTo(this.arenaRight, this.arenaTop + cornerSize);
    g.strokePath();

    g.beginPath();
    g.moveTo(this.arenaLeft, this.arenaBottom - cornerSize);
    g.lineTo(this.arenaLeft, this.arenaBottom);
    g.lineTo(this.arenaLeft + cornerSize, this.arenaBottom);
    g.strokePath();

    g.beginPath();
    g.moveTo(this.arenaRight - cornerSize, this.arenaBottom);
    g.lineTo(this.arenaRight, this.arenaBottom);
    g.lineTo(this.arenaRight, this.arenaBottom - cornerSize);
    g.strokePath();

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

    this.roundInfoText = addCrispText(this, 50, 30, `ROUND ${this.gameState.round}`, {
      fontSize: "36px",
      fontStyle: "bold",
      color: "#38bdf8",
    });

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

    this.lockOnStatusText = addCrispText(this, width / 2, 40, "AIMING...", {
      fontSize: "18px",
      fontStyle: "bold",
      color: "#64748b",
      fontFamily: "monospace",
    }).setOrigin(0.5, 0);

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

  /**
   * 画面下部コントロール領域 & 初期コミット流用バーチャルスティックの構築
   */
  private createBottomControls(width: number, height: number): void {
    const bottomBar = this.add.graphics();
    bottomBar.fillStyle(0x0f172a, 0.96);
    bottomBar.fillRect(0, 1040, width, height - 1040);
    bottomBar.lineStyle(2, 0x1e293b, 1);
    bottomBar.moveTo(0, 1040);
    bottomBar.lineTo(width, 1040);
    bottomBar.strokePath();

    // 武器選択ボタン (上部に横並び配置)
    this.weaponButtonsContainer = this.add.container(50, 1065);
    this.refreshWeaponButtons();

    // オート射撃切り替えトグル
    this.autoFireToggleContainer = this.add.container(width - 150, 1145);
    this.refreshAutoFireToggle();

    // ★ 初期コミット（ControllerScene）の設計を流用したバーチャルスティックを生成
    this.aimStick = this.createVirtualStick({
      originX: width / 2,
      originY: 1350,
      baseRadius: 90,
      knobRadius: 42,
      maxRadius: 80,
      deadZone: 12,
      baseColor: 0x0f172a,
      borderColor: 0x38bdf8,
      knobColor: 0x0284c7,
      label: "AIM",
    });

    // スティック描画
    this.drawFullStickGraphics(this.aimStick);

    // 操作ガイド表示
    addCrispText(this, width / 2, 1210, "🕹️ スティックで照準を移動 ➔ 的に合わせると自動発射！", {
      fontSize: "20px",
      fontStyle: "bold",
      color: "#38bdf8",
    }).setOrigin(0.5);

    addCrispText(this, width / 2, 1510, "（PCの場合は WASD / 矢印キー でも照準を操作可能）", {
      fontSize: "15px",
      color: "#64748b",
    }).setOrigin(0.5);
  }

  // ==========================================
  // 初期コミット流用: バーチャルスティック生成と描画
  // ==========================================

  protected createVirtualStick(options: {
    originX: number;
    originY: number;
    baseRadius: number;
    knobRadius: number;
    maxRadius: number;
    deadZone: number;
    baseColor: number;
    borderColor: number;
    knobColor: number;
    label: string;
  }): StickVisuals {
    const {
      originX,
      originY,
      baseRadius,
      knobRadius,
      maxRadius,
      deadZone,
      baseColor,
      borderColor,
      knobColor,
      label,
    } = options;

    const container = this.add.container(originX, originY);
    const baseBg = this.add.graphics();
    container.add(baseBg);

    // スティック中央テキストラベル
    const stickLabel = addCrispText(this, 0, 0, label, {
      fontSize: "20px",
      fontFamily: "monospace",
      fontStyle: "bold",
      color: "#94a3b8",
    }).setOrigin(0.5);
    container.add(stickLabel);

    // ノブ（スティック頭）
    const knob = this.add.container(0, 0);
    const knobGraphics = this.add.graphics();
    knob.add(knobGraphics);
    container.add(knob);

    return {
      container,
      baseBg,
      label: stickLabel,
      knob,
      knobGraphics,
      pointerId: null,
      baseX: originX,
      baseY: originY,
      originX,
      originY,
      maxRadius,
      deadZone,
      baseRadius,
      knobRadius,
      baseColor,
      borderColor,
      knobColor,
      labelText: label,
      state: {
        x: 0,
        y: 0,
        active: false,
        angle: 0,
        force: 0,
      },
    };
  }

  /**
   * 初期コミット流用: リッチなスティック描画（装飾線・二重リング等）
   */
  protected drawFullStickGraphics(stick: StickVisuals) {
    if (stick.label) {
      stick.label.setVisible(true);
    }

    stick.baseBg.clear();
    stick.baseBg.fillStyle(stick.baseColor, 0.55);
    stick.baseBg.fillCircle(0, 0, stick.baseRadius);
    stick.baseBg.lineStyle(4, stick.borderColor, 0.85);
    stick.baseBg.strokeCircle(0, 0, stick.baseRadius);
    stick.baseBg.lineStyle(2, stick.borderColor, 0.35);
    stick.baseBg.strokeCircle(0, 0, stick.baseRadius * 0.5);
    stick.baseBg.lineStyle(1.5, stick.borderColor, 0.3);
    stick.baseBg.lineBetween(-stick.baseRadius * 0.75, 0, stick.baseRadius * 0.75, 0);
    stick.baseBg.lineBetween(0, -stick.baseRadius * 0.75, 0, stick.baseRadius * 0.75);

    stick.knobGraphics.clear();
    stick.knobGraphics.fillStyle(stick.knobColor, 0.9);
    stick.knobGraphics.fillCircle(0, 0, stick.knobRadius);
    stick.knobGraphics.lineStyle(3.5, 0xffffff, 0.95);
    stick.knobGraphics.strokeCircle(0, 0, stick.knobRadius);
    stick.knobGraphics.fillStyle(0xffffff, 0.85);
    stick.knobGraphics.fillCircle(0, 0, 7);
  }

  /**
   * 初期コミット流用: スティックのタッチ開始
   */
  protected activateStick(stick: StickVisuals, pointer: Phaser.Input.Pointer) {
    stick.pointerId = pointer.id;

    const isDynamic = useGameSettings.getState().joystickType === "dynamic";

    if (isDynamic) {
      this.tweens.killTweensOf(stick.container);
      stick.baseX = pointer.x;
      stick.baseY = pointer.y;
      stick.container.setPosition(pointer.x, pointer.y);
    } else {
      stick.baseX = stick.originX;
      stick.baseY = stick.originY;
      stick.container.setPosition(stick.originX, stick.originY);
    }

    stick.container.setAlpha(1.0);
    this.updateStickPosition(stick, pointer.x, pointer.y);
  }

  /**
   * 初期コミット流用: スティックノブの位置と入力ベクトルの更新
   */
  protected updateStickPosition(stick: StickVisuals, pointerX: number, pointerY: number) {
    let dx = pointerX - stick.baseX;
    let dy = pointerY - stick.baseY;
    let distance = Math.hypot(dx, dy);
    let angle = Math.atan2(dy, dx);

    const isDynamic = useGameSettings.getState().joystickType === "dynamic";

    if (isDynamic && distance > stick.maxRadius) {
      const excess = distance - stick.maxRadius;
      stick.baseX += Math.cos(angle) * excess;
      stick.baseY += Math.sin(angle) * excess;
      stick.container.setPosition(stick.baseX, stick.baseY);

      dx = pointerX - stick.baseX;
      dy = pointerY - stick.baseY;
      distance = Math.hypot(dx, dy);
      angle = Math.atan2(dy, dx);
    }

    const clampedDist = Math.min(distance, stick.maxRadius);
    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    stick.knob.setPosition(knobX, knobY);

    if (distance > stick.deadZone) {
      const force = Math.min(distance / stick.maxRadius, 1.0);
      stick.state.x = Math.cos(angle) * force;
      stick.state.y = Math.sin(angle) * force;
      stick.state.active = true;
      stick.state.angle = angle;
      stick.state.force = force;
    } else {
      stick.state.x = 0;
      stick.state.y = 0;
      stick.state.active = false;
      stick.state.force = 0;
    }
  }

  /**
   * 初期コミット流用: スティック解放時のリセット処理 (スムーズなスプリング復帰)
   */
  protected releaseStick(stick: StickVisuals) {
    stick.pointerId = null;
    stick.state.x = 0;
    stick.state.y = 0;
    stick.state.active = false;
    stick.state.force = 0;

    this.tweens.killTweensOf(stick.knob);
    this.tweens.add({
      targets: stick.knob,
      x: 0,
      y: 0,
      duration: 100,
      ease: Phaser.Math.Easing.Sine.Out,
    });

    const isDynamic = useGameSettings.getState().joystickType === "dynamic";
    if (isDynamic) {
      this.tweens.killTweensOf(stick.container);
      this.tweens.add({
        targets: stick.container,
        x: stick.originX,
        y: stick.originY,
        alpha: 0.85,
        duration: 200,
        ease: Phaser.Math.Easing.Sine.Out,
        onComplete: () => {
          stick.baseX = stick.originX;
          stick.baseY = stick.originY;
        },
      });
    } else {
      stick.container.setAlpha(0.85);
    }
  }

  // ==========================================
  // 照準 (レティクル) オブジェクトの作成
  // ==========================================

  private createReticleObject(): void {
    this.reticle = this.add.container(this.reticleX, this.reticleY).setDepth(100);

    const outerRing = this.add.image(0, 0, "reticle");
    this.reticleInnerRing = this.add.graphics();
    this.updateReticleVisual(false);

    this.reticle.add([outerRing, this.reticleInnerRing]);
  }

  private updateReticleVisual(isLocked: boolean): void {
    this.reticleInnerRing.clear();
    if (isLocked) {
      this.reticleInnerRing.lineStyle(2, 0xef4444, 0.9);
      this.reticleInnerRing.strokeCircle(0, 0, this.reticleRadius + 4);

      this.reticleInnerRing.lineStyle(3, 0xfacc15, 1);
      const b = 18;
      this.reticleInnerRing.strokeRect(-b, -b, b * 2, b * 2);
    } else {
      this.reticleInnerRing.lineStyle(1.5, 0x38bdf8, 0.4);
      this.reticleInnerRing.strokeCircle(0, 0, this.reticleRadius);
    }
  }

  public refreshWeaponButtons(): void {
    this.weaponButtonsContainer.removeAll(true);

    const owned = this.gameState.ownedWeapons;
    const buttonWidth = 250;
    const buttonHeight = 65;
    const gap = 25;

    owned.forEach((weaponId, index) => {
      const def = WEAPONS[weaponId];
      const isEquipped = this.gameState.equippedWeapon === weaponId;
      const x = index * (buttonWidth + gap);

      const btn = this.add.container(x, 0);
      const bg = this.add.graphics();
      bg.fillStyle(isEquipped ? 0x0284c7 : 0x1e293b, 1);
      bg.lineStyle(isEquipped ? 3 : 1.5, isEquipped ? 0x38bdf8 : 0x475569, 1);
      bg.fillRoundedRect(0, 0, buttonWidth, buttonHeight, 10);
      bg.strokeRoundedRect(0, 0, buttonWidth, buttonHeight, 10);

      const label = addCrispText(this, buttonWidth / 2, 20, def.name, {
        fontSize: "19px",
        fontStyle: isEquipped ? "bold" : "normal",
        color: isEquipped ? "#ffffff" : "#cbd5e1",
      }).setOrigin(0.5);

      const subLabel = addCrispText(
        this,
        buttonWidth / 2,
        45,
        `威力:${def.damage} | 間隔:${def.fireInterval}s`,
        {
          fontSize: "13px",
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
    const btnW = 220;
    const btnH = 46;

    const bg = this.add.graphics();
    bg.fillStyle(isOn ? 0x16a34a : 0x334155, 1);
    bg.lineStyle(2, isOn ? 0x4ade80 : 0x64748b, 1);
    bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
    bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);

    const label = addCrispText(this, 0, 0, `オートエイム: ${isOn ? "ON" : "OFF"}`, {
      fontSize: "16px",
      fontStyle: "bold",
      color: "#ffffff",
    }).setOrigin(0.5);

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

  /**
   * バーチャルスティック＆キーボード入力ハンドラの設定
   */
  private setupInputHandlers(): void {
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasdKeys = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }

    // タッチ / マウスポインター処理
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      // 画面下部のスティック操作領域（y > 1150）でスティック開始
      if (pointer.y > 1180 && this.aimStick.pointerId === null) {
        this.activateStick(this.aimStick, pointer);
      }
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.aimStick.pointerId) {
        this.updateStickPosition(this.aimStick, pointer.x, pointer.y);
      }
    });

    const releaseHandler = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.aimStick.pointerId) {
        this.releaseStick(this.aimStick);
      }
    };

    this.input.on("pointerup", releaseHandler);
    this.input.on("pointerupoutside", releaseHandler);
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

    let hpBar: Phaser.GameObjects.Graphics | undefined;
    if (def.hp > 1) {
      hpBar = this.add.graphics();
      this.updateHpBar(hpBar, def.hp, def.hp, def.radius);
      container.add(hpBar);
    }

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

  // --- 毎フレーム更新（スティック照準移動 ＆ エイム自動射撃） ---
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

    // 1. スティック移動入力の取得 (バーチャルスティック + キーボード)
    let moveX = this.aimStick.state.x;
    let moveY = this.aimStick.state.y;

    if (this.cursors && this.wasdKeys) {
      if (this.cursors.left.isDown || this.wasdKeys.A.isDown) moveX -= 1;
      if (this.cursors.right.isDown || this.wasdKeys.D.isDown) moveX += 1;
      if (this.cursors.up.isDown || this.wasdKeys.W.isDown) moveY -= 1;
      if (this.cursors.down.isDown || this.wasdKeys.S.isDown) moveY += 1;
    }

    // オートエイム設定
    const isAutoAimOn =
      this.gameState.canToggleAutoFire() && this.gameState.persistentData.settings.autoFire;

    if (isAutoAimOn && this.activeTargets.size > 0 && moveX === 0 && moveY === 0) {
      let closestTarget: ActiveTarget | null = null;
      let closestDist = Infinity;
      for (const t of this.activeTargets.values()) {
        const d = Phaser.Math.Distance.Between(this.reticleX, this.reticleY, t.x, t.y);
        if (d < closestDist) {
          closestDist = d;
          closestTarget = t;
        }
      }
      if (closestTarget) {
        const angle = Phaser.Math.Angle.Between(
          this.reticleX,
          this.reticleY,
          closestTarget.x,
          closestTarget.y,
        );
        moveX = Math.cos(angle) * 0.95;
        moveY = Math.sin(angle) * 0.95;
      }
    }

    // 入力強度の正規化
    const inputMagnitude = Math.hypot(moveX, moveY);
    if (inputMagnitude > 1.0) {
      moveX /= inputMagnitude;
      moveY /= inputMagnitude;
    }

    // 2. 照準（レティクル）の移動
    if (inputMagnitude > 0.05) {
      this.reticleX += moveX * this.reticleSpeed * deltaSeconds;
      this.reticleY += moveY * this.reticleSpeed * deltaSeconds;

      this.reticleX = Phaser.Math.Clamp(this.reticleX, this.arenaLeft + 15, this.arenaRight - 15);
      this.reticleY = Phaser.Math.Clamp(this.reticleY, this.arenaTop + 15, this.arenaBottom - 15);
    }

    this.reticle.setPosition(this.reticleX, this.reticleY);

    // 3. ★ エイム判定（照準が的と重なっているか判定）
    let lockedTarget: ActiveTarget | null = null;
    let minDistance = Infinity;

    for (const t of this.activeTargets.values()) {
      const dist = Phaser.Math.Distance.Between(this.reticleX, this.reticleY, t.x, t.y);
      if (dist <= t.def.radius + this.reticleRadius && dist < minDistance) {
        minDistance = dist;
        lockedTarget = t;
      }
    }

    this.currentAimTarget = lockedTarget;

    // ★ エイムが的に合っている間は最速間隔で自動発射！
    if (lockedTarget) {
      this.updateReticleVisual(true);
      this.lockOnStatusText.setText(`🎯 LOCK ON: ${lockedTarget.def.name}`);
      this.lockOnStatusText.setColor("#ef4444");

      this.attemptAutoFire(lockedTarget);
    } else {
      this.updateReticleVisual(false);
      this.lockOnStatusText.setText("AIMING...");
      this.lockOnStatusText.setColor("#64748b");
    }

    // 4. 金の的などの寿命カウントダウン
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

    if (this.timeRemaining <= 0) {
      this.onRoundTimeUp();
    }
  }

  /**
   * エイムが合っている間の自動連射ロジック
   */
  private attemptAutoFire(target: ActiveTarget): void {
    const now = this.time.now;
    const intervalMs = this.gameState.getFireInterval() * 1000;

    if (now - this.lastFireTime >= intervalMs) {
      this.lastFireTime = now;
      this.performAutoShot(target);
    }
  }

  private performAutoShot(target: ActiveTarget): void {
    this.audio.playSynthSE("laser", 0.6);
    this.cameras.main.shake(50, 0.0025);

    const hole = this.add.image(this.reticleX, this.reticleY, "bullet_hole").setDepth(5);
    this.tweens.add({
      targets: hole,
      alpha: 0,
      duration: 1200,
      onComplete: () => hole.destroy(),
    });

    this.handleTargetHit(target, this.reticleX, this.reticleY);
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
    if (this.currentAimTarget === target) {
      this.currentAimTarget = null;
    }

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
