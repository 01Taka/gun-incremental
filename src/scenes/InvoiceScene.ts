import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import { PASSIVES } from "../config/gameData";
import type { PassiveId } from "../config/types";
import { VOCAB } from "../config/vocab";
import { EventBus } from "../EventBus";
import { formatMoney } from "../logic/format";
import { GameState } from "../logic/GameState";
import { addCrispText } from "../utils/text";
import {
  createWesternButton,
  drawParchmentCard,
  drawWesternBackdrop,
  drawWoodPanel,
} from "./WesternDecor";

type SceneStep = "invoice" | "passive";

export class InvoiceScene extends Phaser.Scene {
  private gameState!: GameState;
  private audio!: AudioManager;

  public currentStep: SceneStep = "invoice";
  private mainContainer!: Phaser.GameObjects.Container;

  constructor() {
    super("InvoiceScene");
  }

  create() {
    EventBus.emit("current-scene-ready", this);
    this.gameState = GameState.getInstance();
    this.audio = AudioManager.getInstance();

    this.audio.playBGM("western_town");

    const { width, height } = this.scale;

    drawWesternBackdrop(this, width, height, {
      horizonY: 980,
      variant: "crimson",
      withBuildings: true,
      withAtmosphere: true,
    });
    this.mainContainer = this.add.container(0, 0).setDepth(15);

    if (this.gameState.shouldShowInvoiceIntro()) {
      this.showIntroModal();
    } else {
      this.showInvoiceStep();
    }
  }

  // --- 初回上納金登場の解説モーダル ---
  private showIntroModal(): void {
    const { width, height } = this.scale;
    const modalContainer = this.add.container(0, 0).setDepth(30);

    // 暗いオーバーレイ背景（背後クリック防止）
    const overlay = this.add.graphics();
    overlay.fillStyle(0x0a0503, 0.92);
    overlay.fillRect(0, 0, width, height);
    overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, width, height),
      Phaser.Geom.Rectangle.Contains,
    );
    modalContainer.add(overlay);

    // --- 上部セクション（カードで囲まない領域: ストーリー意味付け ＆ 注意） ---
    const title = addCrispText(this, width / 2, 310, VOCAB.progression.invoiceIntroTitle, {
      fontSize: "44px",
      fontFamily: "display",
      fontStyle: "bold",
      color: "#fde68a",
      stroke: "#2b1206",
      strokeThickness: 5,
    }).setOrigin(0.5);
    modalContainer.add(title);

    // 装飾ライン
    const lineG = this.add.graphics();
    lineG.lineStyle(2, 0xd97706, 0.75);
    lineG.lineBetween(width / 2 - 360, 360, width / 2 + 360, 360);
    modalContainer.add(lineG);

    // ストーリー＆注意文（カードで囲まずダイレクトに表示）
    const storyText = addCrispText(this, width / 2, 395, VOCAB.progression.invoiceIntroStory, {
      fontSize: "24px",
      fontStyle: "bold",
      color: "#fef3c7",
      stroke: "#1a0803",
      strokeThickness: 3,
      lineSpacing: 14,
      align: "center",
      wordWrap: { width: 750, useAdvancedWrap: true },
    }).setOrigin(0.5, 0);
    modalContainer.add(storyText);

    // --- 下部セクション（カードで囲む領域: 箇条書きで掟・やるべきことを記述） ---
    const cardW = 780;
    const cardH = 340;
    const cardX = width / 2 - cardW / 2;
    const cardY = 650;

    const cardBg = this.add.graphics();
    drawParchmentCard(cardBg, cardX, cardY, cardW, cardH, {
      borderColor: 0x7f1d1d,
      pinned: true,
    });
    modalContainer.add(cardBg);

    const cardTitle = addCrispText(
      this,
      width / 2,
      cardY + 48,
      VOCAB.progression.invoiceIntroCardTitle,
      {
        fontSize: "26px",
        fontStyle: "bold",
        color: "#7f1d1d",
      },
    ).setOrigin(0.5);
    modalContainer.add(cardTitle);

    const cardLine = this.add.graphics();
    cardLine.lineStyle(1.5, 0xa16207, 0.5);
    cardLine.lineBetween(cardX + 40, cardY + 80, cardX + cardW - 40, cardY + 80);
    modalContainer.add(cardLine);

    // 箇条書きリスト（カード内プレートバー & アイコン付きテキスト）
    const bullets = [
      {
        text: VOCAB.progression.invoiceIntroBullet1,
        y: cardY + 110,
        color: "#2b1206",
      },
      {
        text: VOCAB.progression.invoiceIntroBullet2,
        y: cardY + 215,
        color: "#7f1d1d",
      },
    ];

    bullets.forEach((b) => {
      // 箇条書き項目のプレート枠
      const bgBar = this.add.graphics();
      bgBar.fillStyle(0xedd4b4, 0.85);
      bgBar.fillRoundedRect(cardX + 35, b.y, cardW - 70, 80, 8);
      bgBar.lineStyle(1.5, 0xb45309, 0.9);
      bgBar.strokeRoundedRect(cardX + 35, b.y, cardW - 70, 80, 8);
      modalContainer.add(bgBar);

      // 箇条書きテキスト
      const bulletText = addCrispText(this, cardX + 55, b.y + 40, `•  ${b.text}`, {
        fontSize: "25px",
        fontStyle: "bold",
        color: b.color,
        wordWrap: { width: cardW - 110, useAdvancedWrap: true },
      }).setOrigin(0, 0.5);
      modalContainer.add(bulletText);
    });

    // 承知した（了解）ボタン - モーダル表示ラウンドでは支払いは発生せずリザルトへ進む
    const confirmBtn = createWesternButton(
      this,
      width / 2,
      cardY + cardH + 75,
      `★  ${VOCAB.progression.invoiceIntroConfirm}`,
      "brass",
      () => {
        this.audio.playSynthSE("spur", 0.7);
        this.gameState.invoiceIntroduced = true;
        modalContainer.destroy();
        this.scene.start("ResultScene");
      },
      580,
      82,
    );
    modalContainer.add(confirmBtn);

    this.audio.playSynthSE("bell", 0.8);
  }

  // --- 保安官の上納金ステップ ---
  private showInvoiceStep(): void {
    this.currentStep = "invoice";
    this.mainContainer.removeAll(true);

    const { width } = this.scale;
    const invoiceNumber = this.gameState.invoiceCount + 1;
    const invoiceCost = this.gameState.getInvoiceAmount();
    const canAfford = this.gameState.canPayInvoice();

    const title = addCrispText(
      this,
      width / 2,
      215,
      `★ ${VOCAB.progression.invoiceTitle(invoiceNumber)} ★`,
      {
        fontSize: "44px",
        fontStyle: "bold",
        color: "#fde68a",
        stroke: "#2b1206",
        strokeThickness: 5,
      },
    ).setOrigin(0.5);
    this.mainContainer.add(title);

    const quote = addCrispText(this, width / 2, 275, VOCAB.progression.invoiceQuote, {
      fontSize: "19px",
      fontStyle: "bold",
      color: "#d6b384",
    }).setOrigin(0.5);
    this.mainContainer.add(quote);

    const cardW = 760;
    const cardH = 470;
    const cardY = 335;

    const g = this.add.graphics();
    drawParchmentCard(g, width / 2 - cardW / 2, cardY, cardW, cardH, {
      borderColor: canAfford ? 0x5c2d10 : 0x991b1b,
      pinned: true,
    });
    this.mainContainer.add(g);

    const desc = addCrispText(this, width / 2, cardY + 68, VOCAB.progression.invoiceDueDesc, {
      fontSize: "20px",
      fontStyle: "bold",
      color: "#4a2109",
      align: "center",
    }).setOrigin(0.5);
    this.mainContainer.add(desc);

    const costLabel = addCrispText(
      this,
      width / 2,
      cardY + 165,
      VOCAB.progression.invoiceAmountLabel,
      {
        fontSize: "24px",
        fontStyle: "bold",
        color: "#6b2710",
      },
    ).setOrigin(0.5);
    this.mainContainer.add(costLabel);

    const costValue = addCrispText(this, width / 2, cardY + 235, `${formatMoney(invoiceCost)}`, {
      fontSize: "64px",
      fontStyle: "bold",
      color: canAfford ? "#2b1206" : "#b91c1c",
    }).setOrigin(0.5);
    this.mainContainer.add(costValue);

    const statusText = canAfford
      ? VOCAB.progression.invoiceStatusAfford(formatMoney(this.gameState.sp))
      : VOCAB.progression.invoiceStatusShort(formatMoney(this.gameState.sp));

    const spStatus = addCrispText(this, width / 2, cardY + 355, statusText, {
      fontSize: "22px",
      fontStyle: "bold",
      color: canAfford ? "#5c2d10" : "#b91c1c",
      align: "center",
    }).setOrigin(0.5);
    this.mainContainer.add(spStatus);

    if (canAfford) {
      const payBtn = createWesternButton(
        this,
        width / 2,
        cardY + cardH + 105,
        `💰  ${VOCAB.actions.payInvoice}`,
        "brass",
        () => {
          if (this.gameState.payInvoice()) {
            this.audio.playSynthSE("laser", 0.8);
            this.showPassiveChoiceStep();
          }
        },
        540,
        80,
      );
      this.mainContainer.add(payBtn);
    } else {
      const bankruptBtn = createWesternButton(
        this,
        width / 2,
        cardY + cardH + 105,
        `💀  ${VOCAB.actions.bankruptSurrender}`,
        "danger",
        () => {
          this.audio.playSynthSE("gameover");
          this.gameState.triggerGameOver();
          this.scene.start("GameOverScene");
        },
        560,
        80,
      );
      this.mainContainer.add(bankruptBtn);
    }
  }

  // --- 酒場の切り札（パッシブ3択）ステップ ---
  private showPassiveChoiceStep(): void {
    this.currentStep = "passive";
    this.mainContainer.removeAll(true);

    const { width } = this.scale;
    const choices = this.gameState.rollPassives();

    const title = addCrispText(this, width / 2, 130, `🥃 ${VOCAB.facilities.passivesSub}`, {
      fontSize: "38px",
      fontStyle: "bold",
      color: "#fde68a",
      stroke: "#2b1206",
      strokeThickness: 5,
    }).setOrigin(0.5);
    this.mainContainer.add(title);

    const subtitle = addCrispText(this, width / 2, 192, VOCAB.facilities.passivesDesc, {
      fontSize: "20px",
      color: "#d6b384",
    }).setOrigin(0.5);
    this.mainContainer.add(subtitle);

    const cardW = 780;
    const cardH = 260;
    const startY = 265;
    const gap = 34;

    choices.forEach((passiveId, index) => {
      const def = PASSIVES[passiveId];
      const localizedPassive = VOCAB.passives[passiveId];
      const count = this.gameState.passives[passiveId] || 0;
      const y = startY + index * (cardH + gap);

      const card = this.add.container(width / 2, y + cardH / 2);
      const bg = this.add.graphics();

      const drawCard = (hover: boolean) => {
        bg.clear();
        drawWoodPanel(bg, -cardW / 2, -cardH / 2, cardW, cardH, {
          fill: hover ? 0x3b1f0f : 0x261308,
          border: hover ? 0xfbbf24 : 0x92400e,
          rivets: true,
        });
      };
      drawCard(false);

      const icon = addCrispText(this, -265, 0, def.icon, {
        fontSize: "64px",
      }).setOrigin(0.5);

      const name = addCrispText(this, -180, -48, localizedPassive.name, {
        fontSize: "28px",
        fontStyle: "bold",
        color: "#fef3c7",
      });

      const desc = addCrispText(this, -180, 4, localizedPassive.description, {
        fontSize: "22px",
        fontStyle: "bold",
        color: "#fbbf24",
      });

      const owned = addCrispText(
        this,
        -180,
        50,
        count > 0 ? VOCAB.facilities.passiveOwnedCount(count) : VOCAB.facilities.passiveUnowned,
        {
          fontSize: "17px",
          color: count > 0 ? "#fde68a" : "#a88b67",
        },
      );

      const btn = this.add.graphics();
      btn.fillStyle(0x9a3412, 1);
      btn.lineStyle(2, 0xfbbf24, 1);
      btn.fillRoundedRect(160, -32, 190, 64, 8);
      btn.strokeRoundedRect(160, -32, 190, 64, 8);

      const btnLabel = addCrispText(this, 255, 0, VOCAB.actions.choosePassive, {
        fontSize: "22px",
        fontStyle: "bold",
        color: "#fef3c7",
      }).setOrigin(0.5);

      card.add([bg, icon, name, desc, owned, btn, btnLabel]);
      card.setSize(cardW, cardH);
      card.setInteractive({ useHandCursor: true });

      card.on("pointerover", () => {
        drawCard(true);
        card.setScale(1.02);
      });

      card.on("pointerout", () => {
        drawCard(false);
        card.setScale(1.0);
      });

      card.on("pointerdown", () => {
        this.selectPassiveAndContinue(passiveId);
      });

      this.mainContainer.add(card);
    });
  }

  private selectPassiveAndContinue(passiveId: PassiveId): void {
    this.audio.playSynthSE("spur", 0.75);
    this.gameState.choosePassive(passiveId);

    this.scene.start("ResultScene");
  }
}
