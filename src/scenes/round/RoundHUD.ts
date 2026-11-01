import type Phaser from "phaser";

import { AudioManager } from "../../audio/AudioManager";
import { WEAPONS } from "../../config/gameData";
import { formatNumber, formatSeconds } from "../../logic/format";
import { GameState } from "../../logic/GameState";
import { addCrispText } from "../../utils/text";
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
    const topBar = this.scene.add.graphics();
    topBar.fillStyle(0x0f172a, 0.96);
    topBar.fillRect(0, 0, width, 180);
    topBar.lineStyle(2, 0x1e293b, 1);
    topBar.moveTo(0, 180);
    topBar.lineTo(width, 180);
    topBar.strokePath();

    this.roundInfoText = addCrispText(this.scene, 50, 30, `ROUND ${this.gameState.round}`, {
      fontSize: "36px",
      fontStyle: "bold",
      color: "#38bdf8",
    });

    this.timerText = addCrispText(
      this.scene,
      width / 2,
      95,
      `TIME: ${formatSeconds(this.gameState.getRoundDuration())}`,
      {
        fontSize: "44px",
        fontStyle: "bold",
        fontFamily: "monospace",
        color: "#22c55e",
      },
    ).setOrigin(0.5, 0);

    this.lockOnStatusText = addCrispText(this.scene, width / 2, 40, "AIMING...", {
      fontSize: "18px",
      fontStyle: "bold",
      color: "#64748b",
      fontFamily: "monospace",
    }).setOrigin(0.5, 0);

    this.spText = addCrispText(
      this.scene,
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
      this.scene,
      width - 50,
      60,
      `獲得: +${formatNumber(this.gameState.lastRoundSpEarned)} SP`,
      {
        fontSize: "20px",
        color: "#94a3b8",
      },
    ).setOrigin(1, 0);
  }

  private createBottomControlPanels(width: number, height: number): void {
    const bottomBar = this.scene.add.graphics();
    bottomBar.fillStyle(0x0f172a, 0.96);
    bottomBar.fillRect(0, 1040, width, height - 1040);
    bottomBar.lineStyle(2, 0x1e293b, 1);
    bottomBar.moveTo(0, 1040);
    bottomBar.lineTo(width, 1040);
    bottomBar.strokePath();

    this.weaponButtonsContainer = this.scene.add.container(50, 1065);
    this.refreshWeaponButtons();

    this.autoFireToggleContainer = this.scene.add.container(width - 150, 1145);
    this.refreshAutoFireToggle();

    addCrispText(
      this.scene,
      width / 2,
      1210,
      "🕹️ スティックで照準を移動 ➔ 的に合わせると自動発射！",
      {
        fontSize: "20px",
        fontStyle: "bold",
        color: "#38bdf8",
      },
    ).setOrigin(0.5);

    addCrispText(this.scene, width / 2, 1510, "（PCの場合は WASD / 矢印キー でも照準を操作可能）", {
      fontSize: "15px",
      color: "#64748b",
    }).setOrigin(0.5);
  }

  public updateTimer(timeRemaining: number): void {
    this.timerText.setText(`TIME: ${formatSeconds(timeRemaining)}`);
    if (timeRemaining <= 2.5) {
      this.timerText.setColor("#ef4444");
    } else {
      this.timerText.setColor("#22c55e");
    }
  }

  public updateLockOn(targetName: string | null): void {
    if (targetName) {
      this.lockOnStatusText.setText(`🎯 LOCK ON: ${targetName}`);
      this.lockOnStatusText.setColor("#ef4444");
    } else {
      this.lockOnStatusText.setText("AIMING...");
      this.lockOnStatusText.setColor("#64748b");
    }
  }

  public updateSp(): void {
    this.spText.setText(`所持: ${formatNumber(this.gameState.sp)} SP`);
    this.roundSpText.setText(`獲得: +${formatNumber(this.gameState.lastRoundSpEarned)} SP`);
  }

  public refreshWeaponButtons(onEquip?: () => void): void {
    this.weaponButtonsContainer.removeAll(true);

    const owned = this.gameState.ownedWeapons;
    const buttonWidth = 250;
    const buttonHeight = 65;
    const gap = 25;

    owned.forEach((weaponId, index) => {
      const def = WEAPONS[weaponId];
      const isEquipped = this.gameState.equippedWeapon === weaponId;
      const x = index * (buttonWidth + gap);

      const btn = this.scene.add.container(x, 0);
      const bg = this.scene.add.graphics();
      bg.fillStyle(isEquipped ? 0x0284c7 : 0x1e293b, 1);
      bg.lineStyle(isEquipped ? 3 : 1.5, isEquipped ? 0x38bdf8 : 0x475569, 1);
      bg.fillRoundedRect(0, 0, buttonWidth, buttonHeight, 10);
      bg.strokeRoundedRect(0, 0, buttonWidth, buttonHeight, 10);

      const label = addCrispText(this.scene, buttonWidth / 2, 20, def.name, {
        fontSize: "19px",
        fontStyle: isEquipped ? "bold" : "normal",
        color: isEquipped ? "#ffffff" : "#cbd5e1",
      }).setOrigin(0.5);

      const subLabel = addCrispText(
        this.scene,
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
    const btnW = 220;
    const btnH = 46;

    const bg = this.scene.add.graphics();
    bg.fillStyle(isOn ? 0x16a34a : 0x334155, 1);
    bg.lineStyle(2, isOn ? 0x4ade80 : 0x64748b, 1);
    bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
    bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);

    const label = addCrispText(this.scene, 0, 0, `オートエイム: ${isOn ? "ON" : "OFF"}`, {
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
      this.refreshAutoFireToggle(onToggle);
      if (onToggle) onToggle();
    });
  }

  public showStartBanner(): void {
    const centerX = this.bounds.left + this.bounds.size / 2;
    const centerY = this.bounds.top + this.bounds.size / 2;

    const banner = addCrispText(this.scene, centerX, centerY, "START!", {
      fontSize: "76px",
      fontStyle: "bold",
      color: "#facc15",
      stroke: "#ca8a04",
      strokeThickness: 5,
    })
      .setOrigin(0.5)
      .setDepth(200);

    this.scene.tweens.add({
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

  public showTimeUpBanner(onComplete: () => void): void {
    const centerX = this.bounds.left + this.bounds.size / 2;
    const centerY = this.bounds.top + this.bounds.size / 2;

    const banner = addCrispText(this.scene, centerX, centerY, "TIME UP!", {
      fontSize: "76px",
      fontStyle: "bold",
      color: "#ef4444",
      stroke: "#991b1b",
      strokeThickness: 5,
    })
      .setOrigin(0.5)
      .setDepth(200);

    this.scene.tweens.add({
      targets: banner,
      scale: 1.2,
      duration: 700,
      ease: "Power2",
      onComplete,
    });
  }

  public showDamagePopup(x: number, y: number, dmg: number, isCrit: boolean, color?: string): void {
    const text = isCrit ? `CRIT! -${dmg}` : `-${dmg}`;
    const fontColor = color ? color : isCrit ? "#facc15" : "#ffffff";
    const fontSize = isCrit ? "28px" : "22px";

    const popup = addCrispText(this.scene, x, y - 20, text, {
      fontSize,
      fontStyle: "bold",
      color: fontColor,
      stroke: "#000000",
      strokeThickness: 3,
    })
      .setOrigin(0.5)
      .setDepth(50);

    this.scene.tweens.add({
      targets: popup,
      y: y - 55,
      alpha: 0,
      duration: 600,
      ease: "Power1",
      onComplete: () => popup.destroy(),
    });
  }

  public showSpPopup(x: number, y: number, sp: number): void {
    const popup = addCrispText(this.scene, x, y, `+${formatNumber(sp)} SP`, {
      fontSize: "26px",
      fontStyle: "bold",
      color: "#38bdf8",
      stroke: "#0284c7",
      strokeThickness: 3,
    })
      .setOrigin(0.5)
      .setDepth(60);

    this.scene.tweens.add({
      targets: popup,
      y: y - 70,
      scale: 1.15,
      alpha: 0,
      duration: 750,
      ease: "Power2",
      onComplete: () => popup.destroy(),
    });
  }

  public showTimeBonusPopup(x: number, y: number, seconds: number): void {
    const popup = addCrispText(this.scene, x, y - 30, `+${seconds.toFixed(1)}s!`, {
      fontSize: "30px",
      fontStyle: "bold",
      color: "#22c55e",
      stroke: "#15803d",
      strokeThickness: 4,
    })
      .setOrigin(0.5)
      .setDepth(70);

    this.scene.tweens.add({
      targets: popup,
      y: y - 80,
      scale: 1.25,
      alpha: 0,
      duration: 800,
      ease: "Back.easeOut",
      onComplete: () => popup.destroy(),
    });
  }
}
