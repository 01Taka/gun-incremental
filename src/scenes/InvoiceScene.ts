import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import { PASSIVES } from "../config/gameData";
import type { PassiveId } from "../config/types";
import { EventBus } from "../EventBus";
import { formatNumber } from "../logic/format";
import { GameState } from "../logic/GameState";
import { addCrispText } from "../utils/text";

type SceneStep = "invoice" | "passive";

export class InvoiceScene extends Phaser.Scene {
  private gameState!: GameState;
  private audio!: AudioManager;

  private currentStep: SceneStep = "invoice";
  private mainContainer!: Phaser.GameObjects.Container;

  constructor() {
    super("InvoiceScene");
  }

  create() {
    EventBus.emit("current-scene-ready", this);
    this.gameState = GameState.getInstance();
    this.audio = AudioManager.getInstance();

    const { width, height } = this.scale;

    // 背景
    this.createBackground(width, height);

    // メイン描画コンテナ
    this.mainContainer = this.add.container(0, 0);

    // 初期ステップ表示 (請求支払い)
    this.showInvoiceStep();
  }

  private createBackground(width: number, height: number): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x090d16, 0x090d16, 0x0f172a, 0x0f172a, 1);
    bg.fillRect(0, 0, width, height);

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

  // --- 請求ステップ ---
  private showInvoiceStep(): void {
    this.currentStep = "invoice";
    this.mainContainer.removeAll(true);

    const { width } = this.scale;
    const invoiceNumber = this.gameState.invoiceCount + 1;
    const invoiceCost = this.gameState.getInvoiceAmount();
    const canAfford = this.gameState.canPayInvoice();

    // タイトル
    const title = addCrispText(this, width / 2, 120, `🧾 請求書 (第 ${invoiceNumber} 回)`, {
      fontSize: "44px",
      fontStyle: "bold",
      color: "#facc15",
      stroke: "#ca8a04",
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.mainContainer.add(title);

    // 請求書パネルカード
    const cardW = 680;
    const cardH = 340;
    const cardY = 220;

    const g = this.add.graphics();
    g.fillStyle(0x0f172a, 0.95);
    g.fillRoundedRect(width / 2 - cardW / 2, cardY, cardW, cardH, 16);
    g.lineStyle(2, canAfford ? 0x0284c7 : 0xef4444, 1);
    g.strokeRoundedRect(width / 2 - cardW / 2, cardY, cardW, cardH, 16);
    this.mainContainer.add(g);

    // 説明
    const desc = addCrispText(
      this,
      width / 2,
      cardY + 50,
      "5ラウンドごとの維持費用請求です。\n期日までにSPを支払えなければ、ゲームオーバーとなります。",
      {
        fontSize: "19px",
        color: "#94a3b8",
        align: "center",
      },
    ).setOrigin(0.5);
    this.mainContainer.add(desc);

    // 請求金額表示
    const costLabel = addCrispText(this, width / 2, cardY + 130, "ご請求金額", {
      fontSize: "20px",
      color: "#cbd5e1",
    }).setOrigin(0.5);
    this.mainContainer.add(costLabel);

    const costValue = addCrispText(
      this,
      width / 2,
      cardY + 175,
      `${formatNumber(invoiceCost)} SP`,
      {
        fontSize: "46px",
        fontStyle: "bold",
        color: canAfford ? "#facc15" : "#ef4444",
      },
    ).setOrigin(0.5);
    this.mainContainer.add(costValue);

    // 現在の所持金
    const spStatus = addCrispText(
      this,
      width / 2,
      cardY + 245,
      `現在の所持SP: ${formatNumber(this.gameState.sp)} SP   (${canAfford ? "支払い可能" : "SP不足！"})`,
      {
        fontSize: "20px",
        fontStyle: "bold",
        color: canAfford ? "#4ade80" : "#f87171",
      },
    ).setOrigin(0.5);
    this.mainContainer.add(spStatus);

    // ボタン
    if (canAfford) {
      const payBtn = this.createButton(
        width / 2,
        cardY + cardH + 70,
        "💸 請求を支払う",
        0x16a34a,
        0x22c55e,
        () => {
          if (this.gameState.payInvoice()) {
            this.audio.playSynthSE("laser", 0.7);
            this.showPassiveChoiceStep();
          }
        },
        340,
        64,
      );
      this.mainContainer.add(payBtn);
    } else {
      const bankruptBtn = this.createButton(
        width / 2,
        cardY + cardH + 70,
        "💀 支払い不能 (ゲームオーバー)",
        0xb91c1c,
        0xdc2626,
        () => {
          this.audio.playSynthSE("gameover");
          this.gameState.triggerGameOver();
          this.scene.start("GameOverScene");
        },
        380,
        64,
      );
      this.mainContainer.add(bankruptBtn);
    }
  }

  // --- パッシブ3択ステップ ---
  private showPassiveChoiceStep(): void {
    this.currentStep = "passive";
    this.mainContainer.removeAll(true);

    const { width } = this.scale;
    const choices = this.gameState.rollPassives();

    // タイトル
    const title = addCrispText(this, width / 2, 120, "✨ 請求クリア！パッシブ強化を選択 ✨", {
      fontSize: "42px",
      fontStyle: "bold",
      color: "#38bdf8",
      stroke: "#0284c7",
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.mainContainer.add(title);

    const subtitle = addCrispText(
      this,
      width / 2,
      175,
      "次の3つのパッシブ能力から1つを選択してください (重複取得可)",
      {
        fontSize: "20px",
        color: "#94a3b8",
      },
    ).setOrigin(0.5);
    this.mainContainer.add(subtitle);

    // 3択カードの描画
    const cardW = 380;
    const cardH = 340;
    const startX = width / 2 - (3 * (cardW + 40)) / 2 + cardW / 2 + 20;
    const cardY = 380;

    choices.forEach((passiveId, index) => {
      const def = PASSIVES[passiveId];
      const count = this.gameState.passives[passiveId] || 0;
      const x = startX + index * (cardW + 40);

      const card = this.add.container(x, cardY);
      const bg = this.add.graphics();
      bg.fillStyle(0x0f172a, 0.95);
      bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
      bg.lineStyle(2, 0x334155, 1);
      bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);

      // アイコン
      const icon = addCrispText(this, 0, -80, def.icon, {
        fontSize: "56px",
      }).setOrigin(0.5);

      // パッシブ名
      const name = addCrispText(this, 0, -10, def.name, {
        fontSize: "26px",
        fontStyle: "bold",
        color: "#f8fafc",
      }).setOrigin(0.5);

      // 説明
      const desc = addCrispText(this, 0, 40, def.description, {
        fontSize: "20px",
        color: "#38bdf8",
      }).setOrigin(0.5);

      // 現在所持数
      const owned = addCrispText(this, 0, 80, count > 0 ? `現在所持: ×${count}` : "未所持", {
        fontSize: "16px",
        color: count > 0 ? "#facc15" : "#64748b",
      }).setOrigin(0.5);

      // 選択ボタン
      const btn = this.add.graphics();
      btn.fillStyle(0x0284c7, 1);
      btn.fillRoundedRect(-120, 110, 240, 48, 8);

      const btnLabel = addCrispText(this, 0, 134, "選択する", {
        fontSize: "18px",
        fontStyle: "bold",
        color: "#ffffff",
      }).setOrigin(0.5);

      card.add([bg, icon, name, desc, owned, btn, btnLabel]);
      card.setSize(cardW, cardH);
      card.setInteractive({ useHandCursor: true });

      card.on("pointerover", () => {
        bg.clear();
        bg.fillStyle(0x1e293b, 1);
        bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
        bg.lineStyle(3, 0x38bdf8, 1);
        bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
        card.setScale(1.03);
      });

      card.on("pointerout", () => {
        bg.clear();
        bg.fillStyle(0x0f172a, 0.95);
        bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
        bg.lineStyle(2, 0x334155, 1);
        bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
        card.setScale(1.0);
      });

      card.on("pointerdown", () => {
        this.selectPassiveAndContinue(passiveId);
      });

      this.mainContainer.add(card);
    });
  }

  private selectPassiveAndContinue(passiveId: PassiveId): void {
    this.audio.playSynthSE("click");
    this.gameState.choosePassive(passiveId);

    // 次のラウンドへ準備
    this.gameState.prepareNextRound();
    this.scene.start("RoundScene");
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    color: number,
    hoverColor: number,
    onClick: () => void,
    width = 340,
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
