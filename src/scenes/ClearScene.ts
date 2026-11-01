import confetti from "canvas-confetti";
import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import { VOCAB } from "../config/vocab";
import { EventBus } from "../EventBus";
import { formatMoney } from "../logic/format";
import { GameState } from "../logic/GameState";
import { addCrispText } from "../utils/text";
import { createWesternButton, drawParchmentCard, drawWesternBackdrop } from "./WesternDecor";

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

    this.audio.playBGM("western_town");

    const { width, height } = this.scale;

    drawWesternBackdrop(this, width, height, {
      horizonY: 980,
      variant: "gold",
      withBuildings: true,
      withAtmosphere: true,
    });

    this.audio.playSynthSE("laser", 0.9);
    this.fireConfetti();

    addCrispText(this, width / 2, 165, "★ LEGEND OF THE WEST ★", {
      fontSize: "48px",
      fontFamily: "display",
      fontStyle: "bold",
      color: "#fef08a",
      stroke: "#451a03",
      strokeThickness: 6,
    })
      .setOrigin(0.5)
      .setDepth(10);

    addCrispText(this, width / 2, 248, VOCAB.records.clearSubtitle, {
      fontSize: "20px",
      fontStyle: "bold",
      color: "#fde68a",
      align: "center",
    })
      .setOrigin(0.5)
      .setDepth(10);

    this.createRecordCard(width);
    this.createActionButtons(width);
  }

  private fireConfetti(): void {
    const westernGoldColors = ["#fbbf24", "#d97706", "#fef3c7", "#b45309", "#dc2626"];
    try {
      confetti({
        particleCount: 110,
        spread: 90,
        colors: westernGoldColors,
        origin: { y: 0.5 },
      });
      this.time.delayedCall(400, () => {
        confetti({
          particleCount: 65,
          angle: 60,
          spread: 70,
          colors: westernGoldColors,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 65,
          angle: 120,
          spread: 70,
          colors: westernGoldColors,
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
    const cardY = 345;

    const g = this.add.graphics().setDepth(10);
    drawParchmentCard(g, width / 2 - cardW / 2, cardY, cardW, cardH, {
      borderColor: 0x78350f,
      pinned: true,
    });

    const stats = this.gameState.runStats;
    const weaponNames = stats.weaponsPurchased.map((id) => VOCAB.weapons[id].name).join(" / ");

    const records = [
      { label: VOCAB.records.roundCleared, val: VOCAB.progression.roundName(stats.round) },
      {
        label: VOCAB.records.invoicesPaidCount,
        val: VOCAB.records.countValue(stats.invoicesPassed),
      },
      {
        label: VOCAB.records.totalBountyEarned,
        val: `${formatMoney(stats.totalSpEarned)}`,
      },
      {
        label: VOCAB.records.totalTaxesPaid,
        val: `${formatMoney(stats.totalInvoicesPaidAmount)}`,
      },
      {
        label: VOCAB.records.totalTargetsHit,
        val: VOCAB.records.targetsHitValue(stats.targetsDestroyedTotal),
      },
      { label: VOCAB.records.gunsAcquired, val: weaponNames },
    ];

    records.forEach((item, index) => {
      const y = cardY + 54 + index * 68;

      addCrispText(this, width / 2 - 285, y, item.label, {
        fontSize: "20px",
        fontStyle: "bold",
        color: "#5c2d10",
      }).setDepth(12);

      addCrispText(this, width / 2 + 285, y, item.val, {
        fontSize: item.val.length > 26 ? "16px" : "22px",
        fontStyle: "bold",
        color: "#2b1206",
      })
        .setOrigin(1, 0)
        .setDepth(12);
    });
  }

  private createActionButtons(width: number): void {
    const btnY = 955;
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
      "rust",
      () => {
        this.scene.start("TitleScene");
      },
      540,
      78,
    ).setDepth(15);
  }
}
