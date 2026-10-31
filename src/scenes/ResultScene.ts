import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import { TARGETS } from "../config/gameData";
import { EventBus } from "../EventBus";
import { formatNumber } from "../logic/format";
import { GameState } from "../logic/GameState";
import { addCrispText } from "../utils/text";

export class ResultScene extends Phaser.Scene {
  private gameState!: GameState;
  private audio!: AudioManager;

  constructor() {
    super("ResultScene");
  }

  create() {
    EventBus.emit("current-scene-ready", this);
    this.gameState = GameState.getInstance();
    this.audio = AudioManager.getInstance();

    const { width, height } = this.scale;

    // 背景描画
    this.createBackground(width, height);

    // リザルトヘッダー (y = 150)
    addCrispText(this, width / 2, 140, `ROUND ${this.gameState.round} FINISHED`, {
      fontSize: "44px",
      fontStyle: "bold",
      color: "#38bdf8",
      stroke: "#0369a1",
      strokeThickness: 4,
    }).setOrigin(0.5);

    // リザルトカード (獲得SP & 所持SP)
    this.createSummaryCard(width);

    // 的ポイント進捗バー
    this.createTargetProgressCard(width, height);

    // 請求予告アラート (次のラウンドが請求の場合)
    this.createInvoiceWarningCard(width);

    // アクションボタン (「強化する」「次のラウンドへ」)
    this.createActionButtons(width);
  }

  private createBackground(width: number, height: number): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x070b14, 0x070b14, 0x0f172a, 0x0f172a, 1);
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

  private createSummaryCard(width: number): void {
    const cardY = 240;
    const cardWidth = 780;
    const cardHeight = 220;

    const g = this.add.graphics();
    g.fillStyle(0x0f172a, 0.95);
    g.fillRoundedRect(width / 2 - cardWidth / 2, cardY, cardWidth, cardHeight, 16);
    g.lineStyle(1.5, 0x334155, 1);
    g.strokeRoundedRect(width / 2 - cardWidth / 2, cardY, cardWidth, cardHeight, 16);

    // ラウンド獲得SP
    addCrispText(this, width / 2 - 200, cardY + 45, "獲得SP:", {
      fontSize: "24px",
      color: "#94a3b8",
    }).setOrigin(0.5);

    addCrispText(
      this,
      width / 2 - 200,
      cardY + 105,
      `+${formatNumber(this.gameState.lastRoundSpEarned)} SP`,
      {
        fontSize: "36px",
        fontStyle: "bold",
        color: "#38bdf8",
      },
    ).setOrigin(0.5);

    // 現在の所持SP
    addCrispText(this, width / 2 + 200, cardY + 45, "現在の所持SP:", {
      fontSize: "24px",
      color: "#94a3b8",
    }).setOrigin(0.5);

    addCrispText(this, width / 2 + 200, cardY + 105, `${formatNumber(this.gameState.sp)} SP`, {
      fontSize: "36px",
      fontStyle: "bold",
      color: "#facc15",
    }).setOrigin(0.5);

    // 破壊した的の数
    addCrispText(
      this,
      width / 2,
      cardY + 175,
      `破壊した的: ${this.gameState.lastRoundTargetsDestroyed} 個`,
      {
        fontSize: "20px",
        color: "#cbd5e1",
      },
    ).setOrigin(0.5);
  }

  private createTargetProgressCard(width: number, height: number): void {
    const cardY = 510;
    const cardWidth = 780;
    const cardHeight = 250;

    const g = this.add.graphics();
    g.fillStyle(0x0f172a, 0.95);
    g.fillRoundedRect(width / 2 - cardWidth / 2, cardY, cardWidth, cardHeight, 16);
    g.lineStyle(1.5, 0x334155, 1);
    g.strokeRoundedRect(width / 2 - cardWidth / 2, cardY, cardWidth, cardHeight, 16);

    const progress = this.gameState.getTargetUnlockProgress();

    addCrispText(this, width / 2, cardY + 35, "的ポイント & 解放進捗", {
      fontSize: "26px",
      fontStyle: "bold",
      color: "#f8fafc",
    }).setOrigin(0.5);

    if (progress.nextTarget) {
      addCrispText(
        this,
        width / 2,
        cardY + 85,
        `次の解放目標: 【${progress.nextTarget.name}】 (${progress.percent}%)`,
        {
          fontSize: "22px",
          color: "#38bdf8",
        },
      ).setOrigin(0.5);

      const barWidth = 660;
      const barHeight = 26;
      const barX = width / 2 - barWidth / 2;
      const barY = cardY + 125;

      g.fillStyle(0x1e293b, 1);
      g.fillRoundedRect(barX, barY, barWidth, barHeight, 8);

      const fillW = Math.max(0, barWidth * (progress.percent / 100));
      g.fillStyle(0x0284c7, 1);
      g.fillRoundedRect(barX, barY, fillW, barHeight, 8);

      addCrispText(
        this,
        width / 2,
        cardY + 190,
        `累計的ポイント: ${formatNumber(this.gameState.targetPoints)} pt`,
        {
          fontSize: "20px",
          color: "#94a3b8",
        },
      ).setOrigin(0.5);
    } else {
      addCrispText(this, width / 2, cardY + 110, "🎉 全ての的が解放されました！", {
        fontSize: "26px",
        fontStyle: "bold",
        color: "#facc15",
      }).setOrigin(0.5);
    }

    if (this.gameState.lastRoundNewlyUnlockedTargets.length > 0) {
      const unlockedNames = this.gameState.lastRoundNewlyUnlockedTargets
        .map((id) => `【${TARGETS[id].name}】`)
        .join(" ");
      this.showUnlockPopup(width, height, unlockedNames);
    }
  }

  private showUnlockPopup(width: number, height: number, names: string): void {
    const banner = this.add.container(width / 2, height / 2).setDepth(150);
    const bg = this.add.graphics();
    bg.fillStyle(0x0284c7, 0.98);
    bg.lineStyle(3, 0xfacc15, 1);
    bg.fillRoundedRect(-320, -100, 640, 200, 20);
    bg.strokeRoundedRect(-320, -100, 640, 200, 20);

    const t1 = addCrispText(this, 0, -45, "🎯 NEW TARGET UNLOCKED! 🎯", {
      fontSize: "30px",
      fontStyle: "bold",
      color: "#facc15",
    }).setOrigin(0.5);

    const t2 = addCrispText(this, 0, 10, `${names} がプールに追加！`, {
      fontSize: "26px",
      color: "#ffffff",
    }).setOrigin(0.5);

    const t3 = addCrispText(this, 0, 55, "（タップして閉じる）", {
      fontSize: "18px",
      color: "#cbd5e1",
    }).setOrigin(0.5);

    banner.add([bg, t1, t2, t3]);
    banner.setSize(640, 200);
    banner.setInteractive({ useHandCursor: true });
    banner.on("pointerdown", () => banner.destroy());

    this.audio.playSynthSE("laser", 0.7);
  }

  private createInvoiceWarningCard(width: number): void {
    const nextRound = this.gameState.round + 1;
    const isNextInvoice = nextRound % 5 === 0;

    if (!isNextInvoice) return;

    const invoiceCost = this.gameState.getInvoiceAmount();
    const canAfford = this.gameState.sp >= invoiceCost;

    const alertY = 800;
    const g = this.add.graphics();
    g.fillStyle(canAfford ? 0x1e293b : 0x450a0a, 0.95);
    g.lineStyle(2, canAfford ? 0xeab308 : 0xef4444, 1);
    g.fillRoundedRect(width / 2 - 390, alertY, 780, 80, 14);
    g.strokeRoundedRect(width / 2 - 390, alertY, 780, 80, 14);

    const alertMsg = canAfford
      ? `⚠️ 次のRound ${nextRound}終了後に【請求: ${formatNumber(invoiceCost)} SP】！ SPの温存を推奨！`
      : `🚨 警告: 次のRound ${nextRound}終了後に【請求: ${formatNumber(invoiceCost)} SP】！ 現在SPが不足しています！`;

    addCrispText(this, width / 2, alertY + 40, alertMsg, {
      fontSize: "19px",
      fontStyle: "bold",
      color: canAfford ? "#fef08a" : "#fca5a5",
    }).setOrigin(0.5);
  }

  private createActionButtons(width: number): void {
    const btnY = 960;
    const spacing = 120;

    // 1. 強化するボタン
    this.createButton(
      width / 2,
      btnY,
      "⚡ 強化する (スキルツリー/武器)",
      0x7c3aed,
      0x9333ea,
      () => {
        this.audio.playSynthSE("click");
        this.scene.start("UpgradeScene");
      },
      540,
      76,
    );

    // 2. 次のラウンドへ直行ボタン
    this.createButton(
      width / 2,
      btnY + spacing,
      "▶ 次のラウンドへ進む",
      0x0284c7,
      0x0ea5e9,
      () => {
        this.audio.playSynthSE("click");
        this.proceedToNext();
      },
      540,
      76,
    );
  }

  private proceedToNext(): void {
    if (this.gameState.isInvoiceDue()) {
      this.scene.start("InvoiceScene");
    } else {
      this.gameState.prepareNextRound();
      this.scene.start("RoundScene");
    }
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    color: number,
    hoverColor: number,
    onClick: () => void,
    width = 520,
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
