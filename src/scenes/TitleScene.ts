import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import { EventBus } from "../EventBus";
import { GameState } from "../logic/GameState";
import { addCrispText } from "../utils/text";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  create() {
    EventBus.emit("current-scene-ready", this);
    const { width, height } = this.scale;
    const gameState = GameState.getInstance();
    const audio = AudioManager.getInstance();

    // 背景装飾 (グリッド線)
    const bgGraphics = this.add.graphics();
    bgGraphics.lineStyle(1, 0x1e293b, 0.5);
    for (let x = 0; x < width; x += 60) {
      bgGraphics.moveTo(x, 0);
      bgGraphics.lineTo(x, height);
    }
    for (let y = 0; y < height; y += 60) {
      bgGraphics.moveTo(0, y);
      bgGraphics.lineTo(width, y);
    }
    bgGraphics.strokePath();

    // 背景に漂う的の装飾
    for (let i = 0; i < 4; i++) {
      const targetKeys = ["target_standard", "target_hard", "target_gold", "target_electric"];
      const t = this.add.image(
        Phaser.Math.Between(100, width - 100),
        Phaser.Math.Between(150, height - 150),
        targetKeys[i],
      );
      t.setAlpha(0.18);
      t.setScale(Phaser.Math.FloatBetween(0.8, 1.3));
      this.tweens.add({
        targets: t,
        y: t.y + Phaser.Math.Between(-30, 30),
        x: t.x + Phaser.Math.Between(-30, 30),
        angle: 360,
        duration: Phaser.Math.Between(12000, 20000),
        repeat: -1,
        yoyo: true,
        ease: "Sine.easeInOut",
      });
    }

    // 設定ボタン (右上の歯車風ボタン)
    this.createSmallButton(width - 100, 70, "⚙ 設定", () => {
      audio.playSynthSE("click");
      EventBus.emit("open-settings");
    });

    // ゲームタイトル (縦画面レイアウト: y = 340)
    addCrispText(this, width / 2, 340, "銃的当て", {
      fontSize: "64px",
      fontStyle: "bold",
      color: "#38bdf8",
      stroke: "#0369a1",
      strokeThickness: 5,
    }).setOrigin(0.5);

    addCrispText(this, width / 2, 420, "インクリメンタル", {
      fontSize: "52px",
      fontStyle: "bold",
      color: "#f8fafc",
      stroke: "#0f172a",
      strokeThickness: 4,
    }).setOrigin(0.5);

    addCrispText(this, width / 2, 500, "7秒射撃 × スキルツリー × 請求の生存ゲーム", {
      fontSize: "22px",
      color: "#94a3b8",
    }).setOrigin(0.5);

    // 統計・永続情報サマリーカード
    const permPoints = gameState.persistentData.permanentPoints;
    const highestRound = gameState.persistentData.stats.highestRound;
    const totalRuns = gameState.persistentData.stats.totalRuns;

    const statsW = 760;
    const statsH = 120;
    const statsY = 620;

    const statsBg = this.add.graphics();
    statsBg.fillStyle(0x0f172a, 0.85);
    statsBg.fillRoundedRect(width / 2 - statsW / 2, statsY, statsW, statsH, 16);
    statsBg.lineStyle(1.5, 0x334155, 1);
    statsBg.strokeRoundedRect(width / 2 - statsW / 2, statsY, statsW, statsH, 16);

    addCrispText(this, width / 2, statsY + 36, `所持永続ポイント: ${permPoints} pt`, {
      fontSize: "26px",
      color: "#facc15",
      fontStyle: "bold",
    }).setOrigin(0.5);

    addCrispText(
      this,
      width / 2,
      statsY + 80,
      `最高到達: Round ${highestRound}   |   挑戦回数: ${totalRuns} 回`,
      {
        fontSize: "19px",
        color: "#94a3b8",
      },
    ).setOrigin(0.5);

    // ボタン配置
    const buttonY = 880;
    const buttonSpacing = 110;

    // 1. ラン開始ボタン
    this.createButton(
      width / 2,
      buttonY,
      "▶  ランを開始する",
      0x0284c7,
      0x38bdf8,
      () => {
        audio.playSynthSE("click");
        gameState.startNewRun();
        this.scene.start("RoundScene");
      },
      520,
      76,
    );

    // 2. 永続強化ボタン
    const permBtnText =
      permPoints > 0 ? `⭐  永続強化 (${permPoints} pt)` : "⭐  永続強化 (ポイント不足)";
    this.createButton(
      width / 2,
      buttonY + buttonSpacing,
      permBtnText,
      permPoints > 0 ? 0x7c3aed : 0x334155,
      permPoints > 0 ? 0xa855f7 : 0x64748b,
      () => {
        audio.playSynthSE("click");
        this.scene.start("PermanentUpgradeScene");
      },
      520,
      76,
    );
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    color: number,
    hoverColor: number,
    onClick: () => void,
    width = 480,
    height = 70,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 16);
    bg.lineStyle(2, 0xffffff, 0.4);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 16);

    const label = addCrispText(this, 0, 0, text, {
      fontSize: "26px",
      fontStyle: "bold",
      color: "#ffffff",
    }).setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });

    container.on("pointerover", () => {
      bg.clear();
      bg.fillStyle(hoverColor, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 16);
      bg.lineStyle(3, 0xffffff, 0.9);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 16);
      container.setScale(1.03);
    });

    container.on("pointerout", () => {
      bg.clear();
      bg.fillStyle(color, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 16);
      bg.lineStyle(2, 0xffffff, 0.4);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 16);
      container.setScale(1.0);
    });

    container.on("pointerdown", () => {
      container.setScale(0.97);
    });

    container.on("pointerup", () => {
      container.setScale(1.03);
      onClick();
    });

    return container;
  }

  private createSmallButton(
    x: number,
    y: number,
    text: string,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(0x1e293b, 0.85);
    bg.lineStyle(1, 0x475569, 1);
    bg.fillRoundedRect(-55, -22, 110, 44, 10);
    bg.strokeRoundedRect(-55, -22, 110, 44, 10);

    const label = addCrispText(this, 0, 0, text, {
      fontSize: "18px",
      color: "#cbd5e1",
    }).setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(110, 44);
    container.setInteractive({ useHandCursor: true });

    container.on("pointerover", () => {
      bg.clear();
      bg.fillStyle(0x334155, 1);
      bg.lineStyle(2, 0x38bdf8, 1);
      bg.fillRoundedRect(-55, -22, 110, 44, 10);
      bg.strokeRoundedRect(-55, -22, 110, 44, 10);
      container.setScale(1.05);
    });

    container.on("pointerout", () => {
      bg.clear();
      bg.fillStyle(0x1e293b, 0.85);
      bg.lineStyle(1, 0x475569, 1);
      bg.fillRoundedRect(-55, -22, 110, 44, 10);
      bg.strokeRoundedRect(-55, -22, 110, 44, 10);
      container.setScale(1.0);
    });

    container.on("pointerup", onClick);
    return container;
  }
}
