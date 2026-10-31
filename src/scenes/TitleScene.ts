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
    bgGraphics.lineStyle(1, 0x1e293b, 0.6);
    for (let x = 0; x < width; x += 80) {
      bgGraphics.moveTo(x, 0);
      bgGraphics.lineTo(x, height);
    }
    for (let y = 0; y < height; y += 80) {
      bgGraphics.moveTo(0, y);
      bgGraphics.lineTo(width, y);
    }
    bgGraphics.strokePath();

    // 背景にゆっくり漂う的の装飾
    for (let i = 0; i < 4; i++) {
      const targetKeys = ["target_standard", "target_hard", "target_gold", "target_electric"];
      const t = this.add.image(
        Phaser.Math.Between(150, width - 150),
        Phaser.Math.Between(100, height - 100),
        targetKeys[i],
      );
      t.setAlpha(0.18);
      t.setScale(Phaser.Math.FloatBetween(0.8, 1.4));
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

    // ゲームタイトル
    addCrispText(this, width / 2, height * 0.24, "銃的当てインクリメンタル", {
      fontSize: "64px",
      fontStyle: "bold",
      color: "#38bdf8",
      stroke: "#0369a1",
      strokeThickness: 4,
    }).setOrigin(0.5);

    addCrispText(this, width / 2, height * 0.33, "7秒射撃 × スキル強化 × 請求の生存ゲーム", {
      fontSize: "24px",
      color: "#94a3b8",
      fontFamily: "sans-serif",
    }).setOrigin(0.5);

    // 統計・永続情報サマリー
    const permPoints = gameState.persistentData.permanentPoints;
    const highestRound = gameState.persistentData.stats.highestRound;
    const totalRuns = gameState.persistentData.stats.totalRuns;

    const statsBg = this.add.graphics();
    statsBg.fillStyle(0x0f172a, 0.7);
    statsBg.lineStyle(1, 0x334155, 1);
    statsBg.fillRoundedRect(width / 2 - 280, height * 0.4, 560, 68, 12);
    statsBg.strokeRoundedRect(width / 2 - 280, height * 0.4, 560, 68, 12);

    addCrispText(
      this,
      width / 2,
      height * 0.435,
      `所持永続ポイント: ${permPoints} pt   |   最高到達: Round ${highestRound}   |   挑戦回数: ${totalRuns} 回`,
      {
        fontSize: "20px",
        color: "#facc15",
        fontStyle: "bold",
      },
    ).setOrigin(0.5);

    // ボタン配置
    const buttonY = height * 0.6;
    const buttonSpacing = 90;

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
      380,
      64,
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
      380,
      64,
    );

    // 3. 設定ボタン (右上の歯車風ボタン)
    this.createSmallButton(width - 120, 60, "⚙ 設定", () => {
      audio.playSynthSE("click");
      EventBus.emit("open-settings");
    });
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    color: number,
    hoverColor: number,
    onClick: () => void,
    width = 340,
    height = 60,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 14);
    bg.lineStyle(2, 0xffffff, 0.4);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 14);

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
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 14);
      bg.lineStyle(3, 0xffffff, 0.9);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 14);
      container.setScale(1.03);
    });

    container.on("pointerout", () => {
      bg.clear();
      bg.fillStyle(color, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 14);
      bg.lineStyle(2, 0xffffff, 0.4);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 14);
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
