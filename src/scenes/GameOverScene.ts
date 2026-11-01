import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import { TARGET_UNLOCK_SEQUENCE } from "../config/gameData";
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

    drawWesternBackdrop(this, width, height, {
      horizonY: 980,
      variant: "crimson",
      withBuildings: true,
      withAtmosphere: true,
    });

    addCrispText(this, width / 2, 175, "💀 OUTLAW'S END 💀", {
      fontSize: "54px",
      fontFamily: "display",
      fontStyle: "bold",
      color: "#fca5a5",
      stroke: "#450a0a",
      strokeThickness: 6,
    })
      .setOrigin(0.5)
      .setDepth(10);

    addCrispText(this, width / 2, 250, "「俺の墓標に名は要らねえ……次はもっと速く抜くだけさ」", {
      fontSize: "20px",
      fontStyle: "bold",
      color: "#e7d0a7",
    })
      .setOrigin(0.5)
      .setDepth(10);

    this.createStatsCard(width);
    this.createPermanentPointsCard(width);
    this.createActionButtons(width);
  }

  private createStatsCard(width: number): void {
    const cardW = 780;
    const cardH = 420;
    const cardY = 320;

    const g = this.add.graphics().setDepth(10);
    drawParchmentCard(g, width / 2 - cardW / 2, cardY, cardW, cardH, {
      borderColor: 0x5c2d10,
      pinned: true,
    });

    const stats = this.gameState.runStats;

    const items = [
      { label: "到達した決闘", val: VOCAB.progression.roundName(stats.round) },
      { label: `納めた${VOCAB.progression.invoiceShort}の回数`, val: `${stats.invoicesPassed} 回` },
      {
        label: `稼いだ${VOCAB.currency.earnedMoney}総額`,
        val: `${formatMoney(stats.totalSpEarned)}`,
      },
      {
        label: `${VOCAB.progression.invoiceTerm}総額`,
        val: `${formatMoney(stats.totalInvoicesPaidAmount)}`,
      },
      {
        label: `仕留めた${VOCAB.combat.targetName}の総数`,
        val: `${stats.targetsDestroyedTotal} ${VOCAB.combat.targetUnit}`,
      },
      {
        label: `手配書を暴いた${VOCAB.combat.targetName}`,
        val: `${this.gameState.unlockedTargets.length} / ${TARGET_UNLOCK_SEQUENCE.length} ${VOCAB.combat.targetUnit}`,
      },
    ];

    items.forEach((item, index) => {
      const y = cardY + 52 + index * 58;

      addCrispText(this, width / 2 - 285, y, item.label, {
        fontSize: "20px",
        fontStyle: "bold",
        color: "#5c2d10",
      }).setDepth(12);

      addCrispText(this, width / 2 + 285, y, item.val, {
        fontSize: "24px",
        fontStyle: "bold",
        color: "#2b1206",
      })
        .setOrigin(1, 0)
        .setDepth(12);
    });
  }

  private createPermanentPointsCard(width: number): void {
    const cardW = 780;
    const cardH = 165;
    const cardY = 775;

    const g = this.add.graphics().setDepth(10);
    drawWoodPanel(g, width / 2 - cardW / 2, cardY, cardW, cardH, {
      fill: 0x261308,
      border: 0xd97706,
      rivets: true,
    });

    addCrispText(
      this,
      width / 2,
      cardY + 40,
      `★ 上納総額の2%を「${VOCAB.currency.metaPoints}」として獲得！ ★`,
      {
        fontSize: "21px",
        fontStyle: "bold",
        color: "#fde68a",
      },
    )
      .setOrigin(0.5)
      .setDepth(12);

    const gained = this.gameState.lastGainedPermanentPoints;
    const currentTotal = this.gameState.persistentData.permanentPoints;

    addCrispText(this, width / 2, cardY + 100, `★ +${gained} 獲得！ (現在所持: ${currentTotal})`, {
      fontSize: "34px",
      fontStyle: "bold",
      color: "#fbbf24",
    })
      .setOrigin(0.5)
      .setDepth(12);
  }

  private createActionButtons(width: number): void {
    const btnY = 1030;
    const spacing = 116;

    createWesternButton(
      this,
      width / 2,
      btnY,
      `★  ${VOCAB.actions.trainSaloon}`,
      "brass",
      () => {
        this.scene.start("PermanentUpgradeScene");
      },
      540,
      78,
    ).setDepth(15);

    createWesternButton(
      this,
      width / 2,
      btnY + spacing,
      `🤠  ${VOCAB.actions.backToTitle}`,
      "leather",
      () => {
        this.scene.start("TitleScene");
      },
      540,
      78,
    ).setDepth(15);
  }
}
