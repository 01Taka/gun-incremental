import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import { VOCAB } from "../config/vocab";
import { EventBus } from "../EventBus";
import { GameState } from "../logic/GameState";
import { addCrispText } from "../utils/text";
import {
  createWesternButton,
  drawParchmentCard,
  drawWesternBackdrop,
  drawWoodPanel,
  showCinemaTitleCard,
} from "./WesternDecor";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  create() {
    EventBus.emit("current-scene-ready", this);
    const { width, height } = this.scale;
    const gameState = GameState.getInstance();
    const audio = AudioManager.getInstance();

    // エンニオ・モリコーネ風の口笛・ギター・ハーモニカBGMを開始
    audio.playBGM("western_town");

    // 1. 夕焼けの荒野・岩山・サボテン・酒場・駅舎・タンブルウィード背景
    drawWesternBackdrop(this, width, height, {
      horizonY: 960,
      variant: "sunset",
      withBuildings: true,
      withAtmosphere: true,
    });

    // 2. 右上の木札「設定」ボタン
    this.createSmallWoodButton(width - 96, 68, `⚙ ${VOCAB.facilities.settings}`, () => {
      audio.playSynthSE("spur", 0.65);
      EventBus.emit("open-settings");
    });

    // 3. WANTED指名手配書風のメインタイトルボード
    const posterW = 730;
    const posterH = 440;
    const posterX = width / 2 - posterW / 2;
    const posterY = 155;

    const posterG = this.add.graphics().setDepth(10);
    drawParchmentCard(posterG, posterX, posterY, posterW, posterH, {
      borderColor: 0x4a2109,
      pinned: true,
    });

    // 手配書の弾痕アクセント
    if (this.textures.exists("bullet_hole")) {
      this.add
        .image(posterX + 58, posterY + 62, "bullet_hole")
        .setDepth(12)
        .setAlpha(0.85);
      this.add
        .image(posterX + posterW - 52, posterY + posterH - 54, "bullet_hole")
        .setDepth(12)
        .setScale(0.9)
        .setAlpha(0.8);
    }

    addCrispText(this, width / 2, posterY + 58, "★  W A N T E D  ★", {
      fontSize: "48px",
      fontFamily: "display",
      fontStyle: "bold",
      color: "#5c1f0b",
    })
      .setOrigin(0.5)
      .setDepth(12);

    addCrispText(this, width / 2, posterY + 108, "— DEAD OR ALIVE —", {
      fontSize: "19px",
      fontFamily: "display",
      fontStyle: "bold",
      color: "#7c2d12",
    })
      .setOrigin(0.5)
      .setDepth(12);

    addCrispText(this, width / 2, posterY + 190, "荒野の早撃ち", {
      fontSize: "66px",
      fontStyle: "bold",
      color: "#2b1206",
      stroke: "#ecd9b5",
      strokeThickness: 2,
    })
      .setOrigin(0.5)
      .setDepth(12);

    addCrispText(this, width / 2, posterY + 272, "賞 金 稼 ぎ", {
      fontSize: "54px",
      fontStyle: "bold",
      color: "#7f1d1d",
    })
      .setOrigin(0.5)
      .setDepth(12);

    addCrispText(this, width / 2, posterY + 344, "7秒の早撃ち決闘 × 銃器改造 × 保安官の上納金", {
      fontSize: "20px",
      fontStyle: "bold",
      color: "#4a250d",
    })
      .setOrigin(0.5)
      .setDepth(12);

    addCrispText(this, width / 2, posterY + 394, "「この町は俺には狭すぎる」", {
      fontSize: "22px",
      fontStyle: "bold",
      color: "#6b2710",
    })
      .setOrigin(0.5)
      .setDepth(12);

    // 4. 賞金稼ぎの戦歴・名声バッジ木札パネル
    const permPoints = gameState.persistentData.permanentPoints;
    const highestRound = gameState.persistentData.stats.highestRound;
    const totalRuns = gameState.persistentData.stats.totalRuns;

    const statsW = 730;
    const statsH = 132;
    const statsY = 635;

    const statsBg = this.add.graphics().setDepth(10);
    drawWoodPanel(statsBg, width / 2 - statsW / 2, statsY, statsW, statsH, {
      fill: 0x261308,
      border: 0xb45309,
      rivets: true,
    });

    addCrispText(
      this,
      width / 2,
      statsY + 42,
      `★ 所持${VOCAB.currency.metaPoints}: ${permPoints}`,
      {
        fontSize: "27px",
        color: "#fbbf24",
        fontStyle: "bold",
        stroke: "#1c0a04",
        strokeThickness: 3,
      },
    )
      .setOrigin(0.5)
      .setDepth(12);

    addCrispText(
      this,
      width / 2,
      statsY + 90,
      `最高到達: ${VOCAB.progression.roundName(highestRound)}   |   決闘歴: ${totalRuns} 回`,
      {
        fontSize: "19px",
        color: "#d6b384",
      },
    )
      .setOrigin(0.5)
      .setDepth(12);

    // 5. アクション木札ボタン群
    const buttonY = 875;
    const buttonSpacing = 112;

    createWesternButton(
      this,
      width / 2,
      buttonY,
      `🔫  ${VOCAB.actions.startDuel}`,
      "rust",
      () => {
        gameState.startNewRun();
        this.scene.start("RoundScene");
      },
      550,
      80,
    ).setDepth(15);

    const permBtnText =
      permPoints > 0
        ? `★  ${VOCAB.actions.trainSaloonWithPoints(permPoints)}`
        : `★  ${VOCAB.facilities.saloon}（${VOCAB.facilities.saloonSub}）`;
    createWesternButton(
      this,
      width / 2,
      buttonY + buttonSpacing,
      permBtnText,
      permPoints > 0 ? "brass" : "leather",
      () => {
        this.scene.start("PermanentUpgradeScene");
      },
      550,
      80,
    ).setDepth(15);

    // 6. 映画タイトルカード風の開幕レターボックス演出（非ブロッキング・自動フェード）
    showCinemaTitleCard(this, {
      actLabel: "A FISTFUL OF BOUNTY",
      title: "HIGH NOON",
      quote: "「風が止んだら……抜け」",
      y: 1210,
      holdMs: 1100,
      fadeMs: 550,
      letterbox: true,
    });
  }

  private createSmallWoodButton(
    x: number,
    y: number,
    text: string,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y).setDepth(20);
    const bg = this.add.graphics();

    const draw = (hover: boolean) => {
      bg.clear();
      bg.fillStyle(hover ? 0x4a2511 : 0x2b1509, 0.95);
      bg.lineStyle(hover ? 2 : 1.5, hover ? 0xfbbf24 : 0x92400e, 1);
      bg.fillRoundedRect(-58, -23, 116, 46, 8);
      bg.strokeRoundedRect(-58, -23, 116, 46, 8);
    };
    draw(false);

    const label = addCrispText(this, 0, 0, text, {
      fontSize: "18px",
      fontStyle: "bold",
      color: "#fde68a",
    }).setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(116, 46);
    container.setInteractive({ useHandCursor: true });

    container.on("pointerover", () => {
      draw(true);
      container.setScale(1.05);
    });
    container.on("pointerout", () => {
      draw(false);
      container.setScale(1.0);
    });
    container.on("pointerup", onClick);

    return container;
  }
}
