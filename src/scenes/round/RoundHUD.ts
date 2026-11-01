import type Phaser from "phaser";

import { AudioManager } from "../../audio/AudioManager";
import { ROUND_CONFIG, WEAPONS } from "../../config/gameData";
import { VOCAB } from "../../config/vocab";
import { formatMoney, formatSeconds } from "../../logic/format";
import { GameState } from "../../logic/GameState";
import { addCrispText } from "../../utils/text";
import { drawWoodPanel } from "../WesternDecor";
import type { ArenaBounds } from "./types";

export class RoundHUD {
  private scene: Phaser.Scene;
  private bounds: ArenaBounds;
  private gameState: GameState;
  private audio: AudioManager;

  private timerText!: Phaser.GameObjects.Text;
  private spText!: Phaser.GameObjects.Text;
  private roundSpText!: Phaser.GameObjects.Text;
  private roundInfoText!: Phaser.GameObjects.Text;
  private lockOnStatusText!: Phaser.GameObjects.Text;
  private ammoText!: Phaser.GameObjects.Text;
  private ammoSubText!: Phaser.GameObjects.Text;
  private reloadBarGraphics!: Phaser.GameObjects.Graphics;
  private countdownText?: Phaser.GameObjects.Text;

  // リボルバー6発シリンダーアイコン描画用
  private cylinderContainer!: Phaser.GameObjects.Container;
  private cylinderGraphics!: Phaser.GameObjects.Graphics;
  private lastKnownAmmo: number = -1;
  private cylinderVisualAngle: number = 0;

  private weaponButtonsContainer!: Phaser.GameObjects.Container;
  private autoFireToggleContainer!: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, bounds: ArenaBounds) {
    this.scene = scene;
    this.bounds = bounds;
    this.gameState = GameState.getInstance();
    this.audio = AudioManager.getInstance();

    const { width, height } = this.scene.scale;
    this.createTopHUD(width);
    this.createBottomControlPanels(width, height);
  }

  private createTopHUD(width: number): void {
    const hudTop = this.bounds.bottom + 14; // 854 (アリーナ直下)
    const hudHeight = 172;

    const topBar = this.scene.add.graphics();
    drawWoodPanel(topBar, 14, hudTop, width - 28, hudHeight, {
      fill: 0x241208,
      border: 0x92400e,
      rivets: true,
      radius: 12,
    });

    // 左上: ラウンド表記
    this.roundInfoText = addCrispText(
      this.scene,
      44,
      hudTop + 16,
      VOCAB.progression.roundHudLabel(this.gameState.round),
      {
        fontSize: "28px",
        fontFamily: "display",
        fontStyle: "bold",
        color: "#fde68a",
        stroke: "#1c0a04",
        strokeThickness: 3,
      },
    );

    // 左下: リボルバー6連シリンダーアイコン ＋ 残弾数
    this.cylinderContainer = this.scene.add.container(80, hudTop + 114);
    this.cylinderGraphics = this.scene.add.graphics();
    this.cylinderContainer.add(this.cylinderGraphics);

    this.ammoText = addCrispText(this.scene, 126, hudTop + 92, "-- / --", {
      fontSize: "24px",
      fontStyle: "bold",
      fontFamily: "monospace",
      color: "#fef3c7",
    });

    this.ammoSubText = addCrispText(
      this.scene,
      126,
      hudTop + 122,
      VOCAB.weapons[this.gameState.equippedWeapon].name,
      {
        fontSize: "13px",
        color: "#d6b384",
      },
    );

    // 中央: 照準状態 ＆ 残り時間
    this.lockOnStatusText = addCrispText(
      this.scene,
      width / 2,
      hudTop + 20,
      VOCAB.combat.lockOnReady,
      {
        fontSize: "17px",
        fontStyle: "bold",
        color: "#d6b384",
        fontFamily: "monospace",
      },
    ).setOrigin(0.5, 0);

    this.timerText = addCrispText(
      this.scene,
      width / 2,
      hudTop + 56,
      `${formatSeconds(this.gameState.getRoundDuration())}`,
      {
        fontSize: "48px",
        fontStyle: "bold",
        fontFamily: "monospace",
        color: "#fbbf24",
        stroke: "#2b1206",
        strokeThickness: 4,
      },
    ).setOrigin(0.5, 0);

    this.reloadBarGraphics = this.scene.add.graphics();

    // 右側: 所持金（$）＆ 今回の獲得賞金
    this.spText = addCrispText(
      this.scene,
      width - 44,
      hudTop + 22,
      `${VOCAB.currency.moneyName} ${formatMoney(this.gameState.sp)}`,
      {
        fontSize: "26px",
        fontStyle: "bold",
        color: "#fbbf24",
        stroke: "#1c0a04",
        strokeThickness: 3,
      },
    ).setOrigin(1, 0);

    this.roundSpText = addCrispText(
      this.scene,
      width - 44,
      hudTop + 62,
      `${VOCAB.currency.earnedMoney} +${formatMoney(this.gameState.lastRoundSpEarned)}`,
      {
        fontSize: "19px",
        fontStyle: "bold",
        color: "#e7d0a7",
      },
    ).setOrigin(1, 0);
  }

  /**
   * リボルバーの6発シリンダーアイコンを描画する
   */
  private drawRevolverCylinder(currentAmmo: number, maxAmmo: number, isReloading: boolean): void {
    const g = this.cylinderGraphics;
    g.clear();

    const outerR = 30;
    const chamberDist = 17.5;
    const chamberR = 6.8;

    // シリンダー外周の影
    g.fillStyle(0x0c0502, 0.75);
    g.fillCircle(1.5, 2, outerR + 1);

    // ガンメタル製シリンダー本体
    g.fillStyle(isReloading ? 0x3b2416 : 0x443b35, 1);
    g.fillCircle(0, 0, outerR);
    g.lineStyle(2.2, isReloading ? 0xd97706 : 0xb45309, 1);
    g.strokeCircle(0, 0, outerR);

    // 外周のフルート溝（6箇所のくぼみノッチ）
    for (let i = 0; i < 6; i++) {
      const notchAngle = (Math.PI * 2 * i) / 6 + Math.PI / 6;
      const nx = Math.cos(notchAngle) * (outerR - 1);
      const ny = Math.sin(notchAngle) * (outerR - 1);
      g.fillStyle(0x1f140d, 1);
      g.fillCircle(nx, ny, 3.6);
    }

    // 6つの薬室（チャンバー）: 残弾に応じて真鍮カートリッジ雷管を表示
    // 6発以上ある場合は全6室装填表示、5発以下は残弾数ぶん真鍮弾が入る
    const loadedChambers = isReloading ? 0 : Math.min(6, Math.max(0, currentAmmo));

    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (Math.PI * 2 * i) / 6;
      const cx = Math.cos(a) * chamberDist;
      const cy = Math.sin(a) * chamberDist;

      // 空の薬室穴
      g.fillStyle(0x140a05, 1);
      g.fillCircle(cx, cy, chamberR);
      g.lineStyle(1, 0x29201b, 0.9);
      g.strokeCircle(cx, cy, chamberR);

      if (i < loadedChambers) {
        // 真鍮リム（薬莢底面）
        g.fillStyle(0xeab308, 1);
        g.fillCircle(cx, cy, chamberR - 1.1);
        // 銅色の雷管（プライマー）
        g.fillStyle(0xb45309, 1);
        g.fillCircle(cx, cy, 2.7);
        g.fillStyle(0xfef3c7, 0.75);
        g.fillCircle(cx - 0.8, cy - 0.8, 1.0);
      }
    }

    // 中心のセンターピン（エジェクターロッド軸）
    g.fillStyle(0x1f140d, 1);
    g.fillCircle(0, 0, 5.2);
    g.fillStyle(0xd6b384, 0.9);
    g.fillCircle(0, 0, 2.8);
  }

  private createBottomControlPanels(width: number, height: number): void {
    const bottomBar = this.scene.add.graphics();
    bottomBar.fillGradientStyle(0x241208, 0x241208, 0x140904, 0x140904, 0.96);
    bottomBar.fillRect(0, 1040, width, height - 1040);
    bottomBar.lineStyle(2.5, 0x92400e, 1);
    bottomBar.moveTo(0, 1040);
    bottomBar.lineTo(width, 1040);
    bottomBar.strokePath();

    this.weaponButtonsContainer = this.scene.add.container(50, 1065);
    this.refreshWeaponButtons();

    this.autoFireToggleContainer = this.scene.add.container(width - 150, 1148);
    this.refreshAutoFireToggle();
  }

  public updateTimer(timeRemaining: number): void {
    this.timerText.setText(`${formatSeconds(timeRemaining)}`);
    if (timeRemaining <= ROUND_CONFIG.lowTimeWarningThreshold) {
      this.timerText.setColor("#ef4444");
    } else {
      this.timerText.setColor("#fbbf24");
    }
  }

  public setReadyStatus(): void {
    this.lockOnStatusText.setText(VOCAB.combat.lockOnReady);
    this.lockOnStatusText.setColor("#fde68a");
  }

  public updateLockOn(targetName: string | null): void {
    if (targetName) {
      this.lockOnStatusText.setText(VOCAB.combat.lockOnTarget(targetName));
      this.lockOnStatusText.setColor("#fbbf24");
    } else {
      this.lockOnStatusText.setText(VOCAB.combat.lockOnAiming);
      this.lockOnStatusText.setColor("#a88b67");
    }
  }

  public updateAmmo(
    currentAmmo: number,
    maxAmmo: number,
    isReloading: boolean,
    reloadProgress: number,
  ): void {
    // 発砲時（残弾が減った瞬間）に6連シリンダーを60度カチッと回転させる
    if (!isReloading && this.lastKnownAmmo > currentAmmo && currentAmmo >= 0) {
      this.cylinderVisualAngle += Math.PI / 3;
      this.scene.tweens.killTweensOf(this.cylinderContainer);
      this.scene.tweens.add({
        targets: this.cylinderContainer,
        rotation: this.cylinderVisualAngle,
        duration: 90,
        ease: "Back.easeOut",
      });
    }
    this.lastKnownAmmo = isReloading ? 0 : currentAmmo;

    this.drawRevolverCylinder(currentAmmo, maxAmmo, isReloading);

    const hudTop = this.bounds.bottom + 14;
    const { width } = this.scene.scale;
    const barWidth = 170;
    const barHeight = 7;
    const barX = width / 2 - barWidth / 2;
    const barY = hudTop + 132;

    this.reloadBarGraphics.clear();

    if (isReloading) {
      // リロード中はシリンダーをくるくる回転させる
      this.cylinderContainer.setRotation(reloadProgress * Math.PI * 4);
      this.ammoText.setText(VOCAB.combat.cylinderReloading(Math.floor(reloadProgress * 100)));
      this.ammoText.setColor("#f59e0b");
      this.ammoSubText.setText(VOCAB.combat.cylinderReloadSub);

      this.reloadBarGraphics.fillStyle(0x3b1d0c, 0.9);
      this.reloadBarGraphics.fillRoundedRect(barX, barY, barWidth, barHeight, 3);
      this.reloadBarGraphics.fillStyle(0xf59e0b, 1);
      this.reloadBarGraphics.fillRoundedRect(
        barX,
        barY,
        barWidth * Math.min(1, Math.max(0, reloadProgress)),
        barHeight,
        3,
      );
    } else {
      this.ammoText.setText(`${currentAmmo} / ${maxAmmo}`);
      if (currentAmmo <= 1) {
        this.ammoText.setColor("#ef4444");
      } else if (currentAmmo <= Math.ceil(maxAmmo * 0.35)) {
        this.ammoText.setColor("#f59e0b");
      } else {
        this.ammoText.setColor("#fef3c7");
      }

      const extraRounds = Math.max(0, currentAmmo - 6);
      this.ammoSubText.setText(
        extraRounds > 0
          ? VOCAB.combat.cylinderReserveAmmo(extraRounds)
          : VOCAB.weapons[this.gameState.equippedWeapon].name,
      );

      const ratio = maxAmmo > 0 ? currentAmmo / maxAmmo : 0;
      this.reloadBarGraphics.fillStyle(0x3b1d0c, 0.85);
      this.reloadBarGraphics.fillRoundedRect(barX, barY, barWidth, barHeight, 3);
      const color = ratio <= 0.25 ? 0xdc2626 : ratio <= 0.5 ? 0xea580c : 0xd97706;
      this.reloadBarGraphics.fillStyle(color, 1);
      this.reloadBarGraphics.fillRoundedRect(
        barX,
        barY,
        barWidth * Math.min(1, Math.max(0, ratio)),
        barHeight,
        3,
      );
    }
  }

  public updateSp(): void {
    this.spText.setText(`${VOCAB.currency.moneyName} ${formatMoney(this.gameState.sp)}`);
    this.roundSpText.setText(
      `${VOCAB.currency.earnedMoney} +${formatMoney(this.gameState.lastRoundSpEarned)}`,
    );
  }

  public refreshWeaponButtons(onEquip?: () => void): void {
    this.weaponButtonsContainer.removeAll(true);

    const owned = this.gameState.ownedWeapons;
    const buttonWidth = 250;
    const buttonHeight = 66;
    const gap = 25;

    owned.forEach((weaponId, index) => {
      const def = WEAPONS[weaponId];
      const localizedWeapon = VOCAB.weapons[weaponId];
      const isEquipped = this.gameState.equippedWeapon === weaponId;
      const x = index * (buttonWidth + gap);

      const btn = this.scene.add.container(x, 0);
      const bg = this.scene.add.graphics();
      bg.fillStyle(isEquipped ? 0x7c2d12 : 0x2b160a, 1);
      bg.lineStyle(isEquipped ? 2.5 : 1.5, isEquipped ? 0xfbbf24 : 0x78350f, 1);
      bg.fillRoundedRect(0, 0, buttonWidth, buttonHeight, 8);
      bg.strokeRoundedRect(0, 0, buttonWidth, buttonHeight, 8);

      const label = addCrispText(this.scene, buttonWidth / 2, 20, localizedWeapon.name, {
        fontSize: "18px",
        fontStyle: "bold",
        color: isEquipped ? "#fef3c7" : "#d6b384",
      }).setOrigin(0.5);

      const maxMag = this.gameState.getMagazineSize(weaponId);
      const subLabel = addCrispText(
        this.scene,
        buttonWidth / 2,
        46,
        VOCAB.combat.weaponSwitchSub(def.damage, def.fireInterval, maxMag),
        {
          fontSize: "12px",
          color: isEquipped ? "#fde68a" : "#a88b67",
        },
      ).setOrigin(0.5);

      btn.add([bg, label, subLabel]);
      btn.setSize(buttonWidth, buttonHeight);
      btn.setInteractive({ useHandCursor: true });

      btn.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        this.gameState.equipWeapon(weaponId);
        this.audio.playSynthSE("spur", 0.7);
        this.refreshWeaponButtons(onEquip);
        if (onEquip) onEquip();
      });

      this.weaponButtonsContainer.add(btn);
    });
  }

  public refreshAutoFireToggle(onToggle?: () => void): void {
    this.autoFireToggleContainer.removeAll(true);
    if (!this.gameState.canToggleAutoFire()) return;

    const isOn = this.gameState.persistentData.settings.autoFire;
    const btnW = 225;
    const btnH = 46;

    const bg = this.scene.add.graphics();
    bg.fillStyle(isOn ? 0x92400e : 0x2b160a, 1);
    bg.lineStyle(2, isOn ? 0xfbbf24 : 0x78350f, 1);
    bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
    bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);

    const label = addCrispText(
      this.scene,
      0,
      0,
      `${VOCAB.combat.autoFireAim}: ${isOn ? "ON" : "OFF"}`,
      {
        fontSize: "15px",
        fontStyle: "bold",
        color: isOn ? "#fef3c7" : "#c2a378",
      },
    ).setOrigin(0.5);

    this.autoFireToggleContainer.add([bg, label]);
    this.autoFireToggleContainer.setSize(btnW, btnH);
    this.autoFireToggleContainer.setInteractive({ useHandCursor: true });

    this.autoFireToggleContainer.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.gameState.toggleAutoFire();
      this.audio.playSynthSE("spur", 0.65);
      this.refreshAutoFireToggle(onToggle);
      if (onToggle) onToggle();
    });
  }

  public showCountdownNumber(count: number): void {
    this.clearCountdownText();

    const centerX = this.bounds.left + this.bounds.size / 2;
    const centerY = this.bounds.top + this.bounds.size / 2 + 65;

    const textObj = addCrispText(this.scene, centerX, centerY, String(count), {
      fontSize: "92px",
      fontFamily: "display",
      fontStyle: "bold",
      color: "#fef3c7",
      stroke: "#451a03",
      strokeThickness: 7,
    })
      .setOrigin(0.5)
      .setDepth(200)
      .setScale(1.4)
      .setAlpha(0.95);

    this.countdownText = textObj;

    this.scene.tweens.add({
      targets: textObj,
      scale: 1.0,
      duration: 250,
      ease: "Cubic.easeOut",
    });
  }

  private clearCountdownText(): void {
    if (this.countdownText) {
      this.scene.tweens.killTweensOf(this.countdownText);
      this.countdownText.destroy();
      this.countdownText = undefined;
    }
  }

  public showStartBanner(): void {
    this.clearCountdownText();

    const centerX = this.bounds.left + this.bounds.size / 2;
    const centerY = this.bounds.top + this.bounds.size / 2;

    const banner = addCrispText(this.scene, centerX, centerY, VOCAB.combat.draw, {
      fontSize: "84px",
      fontFamily: "display",
      fontStyle: "bold",
      color: "#fbbf24",
      stroke: "#7c2d12",
      strokeThickness: 7,
    })
      .setOrigin(0.5)
      .setDepth(200)
      .setScale(0.9);

    this.scene.tweens.add({
      targets: banner,
      scale: 1.38,
      alpha: 0,
      duration: 620,
      ease: "Power2",
      onComplete: () => {
        banner.destroy();
      },
    });
  }

  public showTimeUpBanner(onComplete: () => void): void {
    const centerX = this.bounds.left + this.bounds.size / 2;
    const centerY = this.bounds.top + this.bounds.size / 2;

    const banner = addCrispText(this.scene, centerX, centerY, VOCAB.combat.roundEnd, {
      fontSize: "82px",
      fontStyle: "bold",
      color: "#fef3c7",
      stroke: "#7f1d1d",
      strokeThickness: 8,
    })
      .setOrigin(0.5)
      .setDepth(200);

    this.scene.tweens.add({
      targets: banner,
      scale: 1.18,
      duration: 720,
      ease: "Power2",
      onComplete,
    });
  }

  public showDamagePopup(x: number, y: number, dmg: number, isCrit: boolean, color?: string): void {
    const text = isCrit ? `${VOCAB.combat.critHit} -${dmg}` : `-${dmg}`;
    const fontColor = color ? color : isCrit ? "#fbbf24" : "#fef3c7";
    const fontSize = isCrit ? "28px" : "22px";

    const popup = addCrispText(this.scene, x, y - 20, text, {
      fontSize,
      fontStyle: "bold",
      color: fontColor,
      stroke: "#1c0a04",
      strokeThickness: 4,
    })
      .setOrigin(0.5)
      .setDepth(55);

    this.scene.tweens.add({
      targets: popup,
      y: y - 56,
      alpha: 0,
      duration: 600,
      ease: "Power1",
      onComplete: () => popup.destroy(),
    });
  }

  public showSpPopup(x: number, y: number, sp: number): void {
    const popup = addCrispText(this.scene, x, y, `+${formatMoney(sp)}`, {
      fontSize: "28px",
      fontStyle: "bold",
      color: "#fde047",
      stroke: "#78350f",
      strokeThickness: 4,
    })
      .setOrigin(0.5)
      .setDepth(60);

    this.scene.tweens.add({
      targets: popup,
      y: y - 72,
      scale: 1.15,
      alpha: 0,
      duration: 760,
      ease: "Power2",
      onComplete: () => popup.destroy(),
    });
  }

  public showTimeBonusPopup(x: number, y: number, seconds: number): void {
    const popup = addCrispText(
      this.scene,
      x,
      y - 30,
      VOCAB.combat.timeExtensionPopup(seconds.toFixed(1)),
      {
        fontSize: "28px",
        fontStyle: "bold",
        color: "#fde68a",
        stroke: "#92400e",
        strokeThickness: 4,
      },
    )
      .setOrigin(0.5)
      .setDepth(70);

    this.scene.tweens.add({
      targets: popup,
      y: y - 80,
      scale: 1.22,
      alpha: 0,
      duration: 800,
      ease: "Back.easeOut",
      onComplete: () => popup.destroy(),
    });
  }
}
