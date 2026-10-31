import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import { EventBus } from "../EventBus";
import { formatNumber } from "../logic/format";
import { GameState } from "../logic/GameState";
import { addCrispText } from "../utils/text";

export class GameOverScene extends Phaser.Scene {
  private gameState!: GameState;
  private audio!: AudioManager;

  constructor() {
    super("GameOverScene");
  }

  create() {
    EventBus.emit("current-scene-ready", this);
    this.gameState = GameState.getInstance();
    this.audio = AudioManager.getInstance();

    const { width, height } = this.scale;

    // 背景
    this.createBackground(width, height);

    // ゲームオーバータイトル
    addCrispText(this, width / 2, 100, "💀 GAME OVER 💀", {
      fontSize: "64px",
      fontStyle: "bold",
      color: "#ef4444",
      stroke: "#7f1d1d",
      strokeThickness: 4,
    }).setOrigin(0.5);

    addCrispText(this, width / 2, 170, "請求の支払いに失敗し、今回のランは終了しました。", {
      fontSize: "22px",
      color: "#94a3b8",
    }).setOrigin(0.5);

    // 統計サマリーカード
    this.createStatsCard(width, height);

    // 永続ポイント獲得カード
    this.createPermanentPointsCard(width, height);

    // アクションボタン
    this.createActionButtons(width, height);
  }

  private createBackground(width: number, height: number): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x180505, 0x180505, 0x0f172a, 0x0f172a, 1);
    bg.fillRect(0, 0, width, height);

    bg.lineStyle(1, 0x2d1215, 0.5);
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

  private createStatsCard(width: number, _height: number): void {
    const cardW = 760;
    const cardH = 220;
    const cardY = 220;

    const g = this.add.graphics();
    g.fillStyle(0x0f172a, 0.95);
    g.fillRoundedRect(width / 2 - cardW / 2, cardY, cardW, cardH, 16);
    g.lineStyle(1.5, 0x334155, 1);
    g.strokeRoundedRect(width / 2 - cardW / 2, cardY, cardW, cardH, 16);

    const stats = this.gameState.runStats;

    const items = [
      { label: "到達ラウンド", val: `Round ${stats.round}` },
      { label: "クリアした請求数", val: `${stats.invoicesPassed} 回` },
      { label: "累計獲得SP", val: `${formatNumber(stats.totalSpEarned)} SP` },
      { label: "支払総額", val: `${formatNumber(stats.totalInvoicesPaidAmount)} SP` },
      { label: "破壊した的の総数", val: `${stats.targetsDestroyedTotal} 個` },
      { label: "解放した的の数", val: `${this.gameState.unlockedTargets.length} / 6 種` },
    ];

    items.forEach((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = width / 2 - 200 + col * 400;
      const y = cardY + 40 + row * 60;

      addCrispText(this, x - 120, y, item.label, {
        fontSize: "19px",
        color: "#94a3b8",
      });

      addCrispText(this, x + 80, y, item.val, {
        fontSize: "22px",
        fontStyle: "bold",
        color: "#f8fafc",
      });
    });
  }

  private createPermanentPointsCard(width: number, _height: number): void {
    const cardW = 760;
    const cardH = 140;
    const cardY = 470;

    const g = this.add.graphics();
    g.fillStyle(0x0f172a, 0.95);
    g.fillRoundedRect(width / 2 - cardW / 2, cardY, cardW, cardH, 16);
    g.lineStyle(2, 0xa855f7, 1);
    g.strokeRoundedRect(width / 2 - cardW / 2, cardY, cardW, cardH, 16);

    addCrispText(this, width / 2, cardY + 32, "⭐ 支払額の2%を永続ポイントとして獲得！ ⭐", {
      fontSize: "20px",
      color: "#c084fc",
    }).setOrigin(0.5);

    const gained = this.gameState.lastGainedPermanentPoints;
    const currentTotal = this.gameState.persistentData.permanentPoints;

    addCrispText(
      this,
      width / 2,
      cardY + 80,
      `+${gained} pt 獲得！ (現在合計: ${currentTotal} pt)`,
      {
        fontSize: "34px",
        fontStyle: "bold",
        color: "#facc15",
      },
    ).setOrigin(0.5);
  }

  private createActionButtons(width: number, height: number): void {
    const btnY = height - 110;
    const spacing = 380;

    // 永続強化画面へ
    this.createButton(
      width / 2 - spacing / 2,
      btnY,
      "⭐ 永続強化を行う",
      0x7c3aed,
      0x9333ea,
      () => {
        this.audio.playSynthSE("click");
        this.scene.start("PermanentUpgradeScene");
      },
      320,
      64,
    );

    // タイトルへ戻る
    this.createButton(
      width / 2 + spacing / 2,
      btnY,
      "🏠 タイトルへ戻る",
      0x334155,
      0x475569,
      () => {
        this.audio.playSynthSE("click");
        this.scene.start("TitleScene");
      },
      320,
      64,
    );
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
      bg.lineStyle(3, 0xffffff, 0.9);
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
