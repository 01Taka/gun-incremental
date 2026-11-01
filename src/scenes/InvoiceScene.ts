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

    this.showInvoiceStep();
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

    const quote = addCrispText(
      this,
      width / 2,
      275,
      "「この町で銃を抜くなら、保安官事務所への挨拶代を置いていきな」",
      {
        fontSize: "19px",
        fontStyle: "bold",
        color: "#d6b384",
      },
    ).setOrigin(0.5);
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
      `— ${VOCAB.progression.invoiceShort} 徴収額 —`,
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

    const spStatus = addCrispText(
      this,
      width / 2,
      cardY + 355,
      `現在の${VOCAB.currency.moneyName}: ${formatMoney(this.gameState.sp)}\n(${canAfford ? "支払い可能 — 保安官も納得の額だ" : "所持金不足 — 袋の底が空っぽだ！"})`,
      {
        fontSize: "22px",
        fontStyle: "bold",
        color: canAfford ? "#5c2d10" : "#b91c1c",
        align: "center",
      },
    ).setOrigin(0.5);
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

    const subtitle = addCrispText(
      this,
      width / 2,
      192,
      `3つの${VOCAB.facilities.passivesTitle}から1つを選んで身につけろ（重複習得可能）`,
      {
        fontSize: "20px",
        color: "#d6b384",
      },
    ).setOrigin(0.5);
    this.mainContainer.add(subtitle);

    const cardW = 780;
    const cardH = 260;
    const startY = 265;
    const gap = 34;

    choices.forEach((passiveId, index) => {
      const def = PASSIVES[passiveId];
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

      const name = addCrispText(this, -180, -48, def.name, {
        fontSize: "28px",
        fontStyle: "bold",
        color: "#fef3c7",
      });

      const desc = addCrispText(this, -180, 4, def.description, {
        fontSize: "22px",
        fontStyle: "bold",
        color: "#fbbf24",
      });

      const owned = addCrispText(this, -180, 50, count > 0 ? `現在習得数: ×${count}` : "未習得", {
        fontSize: "17px",
        color: count > 0 ? "#fde68a" : "#a88b67",
      });

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

    this.gameState.prepareNextRound();
    this.scene.start("RoundScene");
  }
}
