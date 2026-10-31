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

    // リザルトヘッダー
    addCrispText(this, width / 2, 70, `ROUND ${this.gameState.round} FINISHED`, {
      fontSize: "48px",
      fontStyle: "bold",
      color: "#38bdf8",
      stroke: "#0369a1",
      strokeThickness: 3,
    }).setOrigin(0.5);

    // リザルトカード
    this.createSummaryCard(width, height);

    // 的ポイント進捗バー
    this.createTargetProgressCard(width, height);

    // 請求予告アラート (次のラウンドが請求の場合)
    this.createInvoiceWarningCard(width, height);

    // アクションボタン (「強化する」「次のラウンドへ」)
    this.createActionButtons(width, height);
  }

  private createBackground(width: number, height: number): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x090d16, 0x090d16, 0x0f172a, 0x0f172a, 1);
    bg.fillRect(0, 0, width, height);

    // グリッド線
    bg.lineStyle(1, 0x1e293b, 0.4);
    for (let x = 0; x < width; x += 100) {
      bg.moveTo(x, 0);
      bg.lineTo(x, height);
    }
    for (let y = 0; y < height; y += 100) {
      bg.moveTo(0, y);
      bg.lineTo(width, y);
    }
    bg.strokePath();
  }

  private createSummaryCard(width: number, _height: number): void {
    const cardY = 180;
    const cardWidth = 720;
    const cardHeight = 160;

    const g = this.add.graphics();
    g.fillStyle(0x0f172a, 0.85);
    g.fillRoundedRect(width / 2 - cardWidth / 2, cardY, cardWidth, cardHeight, 14);
    g.lineStyle(1.5, 0x334155, 1);
    g.strokeRoundedRect(width / 2 - cardWidth / 2, cardY, cardWidth, cardHeight, 14);

    // ラウンド獲得SP
    addCrispText(this, width / 2 - 200, cardY + 35, "獲得SP:", {
      fontSize: "24px",
      color: "#94a3b8",
    }).setOrigin(0.5);

    addCrispText(
      this,
      width / 2 - 200,
      cardY + 85,
      `+${formatNumber(this.gameState.lastRoundSpEarned)} SP`,
      {
        fontSize: "36px",
        fontStyle: "bold",
        color: "#38bdf8",
      },
    ).setOrigin(0.5);

    // 現在の所持SP
    addCrispText(this, width / 2 + 200, cardY + 35, "現在の所持SP:", {
      fontSize: "24px",
      color: "#94a3b8",
    }).setOrigin(0.5);

    addCrispText(this, width / 2 + 200, cardY + 85, `${formatNumber(this.gameState.sp)} SP`, {
      fontSize: "36px",
      fontStyle: "bold",
      color: "#facc15",
    }).setOrigin(0.5);

    // 破壊した的の数
    addCrispText(
      this,
      width / 2,
      cardY + 130,
      `破壊した的: ${this.gameState.lastRoundTargetsDestroyed} 個`,
      {
        fontSize: "18px",
        color: "#cbd5e1",
      },
    ).setOrigin(0.5);
  }

  private createTargetProgressCard(width: number, height: number): void {
    const cardY = 370;
    const cardWidth = 720;
    const cardHeight = 180;

    const g = this.add.graphics();
    g.fillStyle(0x0f172a, 0.85);
    g.fillRoundedRect(width / 2 - cardWidth / 2, cardY, cardWidth, cardHeight, 14);
    g.lineStyle(1.5, 0x334155, 1);
    g.strokeRoundedRect(width / 2 - cardWidth / 2, cardY, cardWidth, cardHeight, 14);

    const progress = this.gameState.getTargetUnlockProgress();

    // タイトル
    addCrispText(this, width / 2, cardY + 28, "的ポイント & 次の解放進捗", {
      fontSize: "22px",
      fontStyle: "bold",
      color: "#f8fafc",
    }).setOrigin(0.5);

    if (progress.nextTarget) {
      addCrispText(
        this,
        width / 2,
        cardY + 65,
        `次の解放目標: 【${progress.nextTarget.name}】 (${progress.percent}%)`,
        {
          fontSize: "20px",
          color: "#38bdf8",
        },
      ).setOrigin(0.5);

      // プログレスバー背景
      const barWidth = 560;
      const barHeight = 22;
      const barX = width / 2 - barWidth / 2;
      const barY = cardY + 95;

      g.fillStyle(0x1e293b, 1);
      g.fillRoundedRect(barX, barY, barWidth, barHeight, 6);

      // 充填バー
      const fillW = Math.max(0, barWidth * (progress.percent / 100));
      g.fillStyle(0x0284c7, 1);
      g.fillRoundedRect(barX, barY, fillW, barHeight, 6);

      addCrispText(
        this,
        width / 2,
        cardY + 140,
        `累計的ポイント: ${formatNumber(this.gameState.targetPoints)} pt`,
        {
          fontSize: "17px",
          color: "#94a3b8",
        },
      ).setOrigin(0.5);
    } else {
      addCrispText(this, width / 2, cardY + 80, "🎉 全ての的が解放されました！", {
        fontSize: "24px",
        fontStyle: "bold",
        color: "#facc15",
      }).setOrigin(0.5);
    }

    // 新規解放のアラート表示
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
    bg.fillStyle(0x0284c7, 0.95);
    bg.lineStyle(3, 0xfacc15, 1);
    bg.fillRoundedRect(-300, -80, 600, 160, 16);
    bg.strokeRoundedRect(-300, -80, 600, 160, 16);

    const t1 = addCrispText(this, 0, -35, "🎯 NEW TARGET UNLOCKED! 🎯", {
      fontSize: "28px",
      fontStyle: "bold",
      color: "#facc15",
    }).setOrigin(0.5);

    const t2 = addCrispText(this, 0, 10, `${names} がプールに追加！`, {
      fontSize: "24px",
      color: "#ffffff",
    }).setOrigin(0.5);

    const t3 = addCrispText(this, 0, 45, "（クリックして閉じる）", {
      fontSize: "16px",
      color: "#cbd5e1",
    }).setOrigin(0.5);

    banner.add([bg, t1, t2, t3]);
    banner.setSize(600, 160);
    banner.setInteractive({ useHandCursor: true });
    banner.on("pointerdown", () => banner.destroy());

    this.audio.playSynthSE("laser", 0.7);
  }

  private createInvoiceWarningCard(width: number, _height: number): void {
    const nextRound = this.gameState.round + 1;
    const isNextInvoice = nextRound % 5 === 0;

    if (!isNextInvoice) return;

    const invoiceCost = this.gameState.getInvoiceAmount();
    const canAfford = this.gameState.sp >= invoiceCost;

    const alertY = 580;
    const g = this.add.graphics();
    g.fillStyle(canAfford ? 0x1e293b : 0x450a0a, 0.9);
    g.lineStyle(2, canAfford ? 0xeab308 : 0xef4444, 1);
    g.fillRoundedRect(width / 2 - 360, alertY, 720, 60, 10);
    g.strokeRoundedRect(width / 2 - 360, alertY, 720, 60, 10);

    const alertMsg = canAfford
      ? `⚠️ 次のRound ${nextRound}終了後に【請求: ${formatNumber(invoiceCost)} SP】が発生します！ SPの使いすぎに注意！`
      : `🚨 警告: 次のRound ${nextRound}終了後に【請求: ${formatNumber(invoiceCost)} SP】！ 現在SPが不足しています！`;

    addCrispText(this, width / 2, alertY + 30, alertMsg, {
      fontSize: "18px",
      fontStyle: "bold",
      color: canAfford ? "#fef08a" : "#fca5a5",
    }).setOrigin(0.5);
  }

  private createActionButtons(width: number, height: number): void {
    const btnY = height - 120;
    const spacing = 380;

    // 1. 強化するボタン (UpgradeScene へ)
    this.createButton(
      width / 2 - spacing / 2,
      btnY,
      "⚡ 強化する (スキル/武器)",
      0x7c3aed,
      0x9333ea,
      () => {
        this.audio.playSynthSE("click");
        this.scene.start("UpgradeScene");
      },
      320,
      64,
    );

    // 2. 次のラウンドへ直行ボタン
    this.createButton(
      width / 2 + spacing / 2,
      btnY,
      "▶ 次のラウンドへ",
      0x0284c7,
      0x0ea5e9,
      () => {
        this.audio.playSynthSE("click");
        this.proceedToNext();
      },
      320,
      64,
    );
  }

  private proceedToNext(): void {
    // もし現在のラウンドが請求ラウンド（5の倍数）であれば請求画面へ
    if (this.gameState.isInvoiceDue()) {
      this.scene.start("InvoiceScene");
    } else {
      // 次のラウンドへ
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
    width = 320,
    height = 64,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
    bg.lineStyle(2, 0xffffff, 0.4);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);

    const label = addCrispText(this, 0, 0, text, {
      fontSize: "22px",
      fontStyle: "bold",
      color: "#ffffff",
    }).setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });

    container.on("pointerover", () => {
      bg.clear();
      bg.fillStyle(hoverColor, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
      bg.lineStyle(2, 0xffffff, 0.9);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
      container.setScale(1.03);
    });

    container.on("pointerout", () => {
      bg.clear();
      bg.fillStyle(color, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
      bg.lineStyle(2, 0xffffff, 0.4);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
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
