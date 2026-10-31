import confetti from "canvas-confetti";
import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import { WEAPONS } from "../config/gameData";
import { EventBus } from "../EventBus";
import { formatNumber } from "../logic/format";
import { GameState } from "../logic/GameState";
import { addCrispText } from "../utils/text";

export class ClearScene extends Phaser.Scene {
  private gameState!: GameState;
  private audio!: AudioManager;

  constructor() {
    super("ClearScene");
  }

  create() {
    EventBus.emit("current-scene-ready", this);
    this.gameState = GameState.getInstance();
    this.audio = AudioManager.getInstance();

    const { width, height } = this.scale;

    this.createBackground(width, height);

    this.audio.playSynthSE("laser", 0.9);
    this.fireConfetti();

    // クリアタイトル (y = 190)
    addCrispText(this, width / 2, 180, "🎉 GAME CLEAR! 🎉", {
      fontSize: "58px",
      fontStyle: "bold",
      color: "#facc15",
      stroke: "#ca8a04",
      strokeThickness: 5,
    }).setOrigin(0.5);

    addCrispText(
      this,
      width / 2,
      260,
      "おめでとうございます！\n全6種類の的の解放を達成しました！",
      {
        fontSize: "24px",
        fontStyle: "bold",
        color: "#38bdf8",
        align: "center",
      },
    ).setOrigin(0.5);

    // クリア統計カード
    this.createRecordCard(width);

    // アクションボタン
    this.createActionButtons(width);
  }

  private createBackground(width: number, height: number): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a1628, 0x0a1628, 0x0f172a, 0x0f172a, 1);
    bg.fillRect(0, 0, width, height);

    bg.lineStyle(1, 0x1e293b, 0.35);
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

  private fireConfetti(): void {
    try {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.5 },
      });
      this.time.delayedCall(400, () => {
        confetti({
          particleCount: 70,
          angle: 60,
          spread: 70,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 70,
          angle: 120,
          spread: 70,
          origin: { x: 1 },
        });
      });
    } catch (e) {
      console.warn("Confetti error:", e);
    }
  }

  private createRecordCard(width: number): void {
    const cardW = 780;
    const cardH = 480;
    const cardY = 360;

    const g = this.add.graphics();
    g.fillStyle(0x0f172a, 0.96);
    g.fillRoundedRect(width / 2 - cardW / 2, cardY, cardW, cardH, 16);
    g.lineStyle(2, 0xfacc15, 1);
    g.strokeRoundedRect(width / 2 - cardW / 2, cardY, cardW, cardH, 16);

    const stats = this.gameState.runStats;
    const weaponNames = stats.weaponsPurchased.map((id) => WEAPONS[id].name).join(", ");

    const records = [
      { label: "クリア到達ラウンド", val: `Round ${stats.round}` },
      { label: "クリアした請求回数", val: `${stats.invoicesPassed} 回` },
      { label: "累計獲得SP", val: `${formatNumber(stats.totalSpEarned)} SP` },
      { label: "支払総額", val: `${formatNumber(stats.totalInvoicesPaidAmount)} SP` },
      { label: "総破壊数", val: `${stats.targetsDestroyedTotal} 個` },
      { label: "使用・購入した武器", val: weaponNames },
    ];

    records.forEach((item, index) => {
      const y = cardY + 50 + index * 70;

      addCrispText(this, width / 2 - 280, y, item.label, {
        fontSize: "20px",
        color: "#94a3b8",
      });

      addCrispText(this, width / 2 + 280, y, item.val, {
        fontSize: "24px",
        fontStyle: "bold",
        color: "#f8fafc",
      }).setOrigin(1, 0);
    });
  }

  private createActionButtons(width: number): void {
    const btnY = 960;
    const spacing = 120;

    this.createButton(
      width / 2,
      btnY,
      "⭐ 永続強化画面へ",
      0x7c3aed,
      0x9333ea,
      () => {
        this.audio.playSynthSE("click");
        this.scene.start("PermanentUpgradeScene");
      },
      520,
      76,
    );

    this.createButton(
      width / 2,
      btnY + spacing,
      "🏠 タイトルへ戻る",
      0x0284c7,
      0x0ea5e9,
      () => {
        this.audio.playSynthSE("click");
        this.scene.start("TitleScene");
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
    height = 76,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 16);
    bg.lineStyle(2, 0xffffff, 0.4);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 16);

    const label = addCrispText(this, 0, 0, text, {
      fontSize: "24px",
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
}
