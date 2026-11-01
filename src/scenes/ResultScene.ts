import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import { INVOICE_CONFIG, TARGET_UNLOCK_SEQUENCE } from "../config/gameData";
import { VOCAB } from "../config/vocab";
import { EventBus } from "../EventBus";
import { useI18n } from "../i18n";
import { formatMoney, formatNumber } from "../logic/format";
import { GameState } from "../logic/GameState";
import { addCrispText } from "../utils/text";
import {
  createWesternButton,
  drawParchmentCard,
  drawWesternBackdrop,
  drawWoodPanel,
  getWesternQuote,
} from "./WesternDecor";

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

    this.audio.playBGM("western_town");

    const { width, height } = this.scale;

    drawWesternBackdrop(this, width, height, {
      horizonY: 980,
      variant: "dusk",
      withBuildings: true,
      withAtmosphere: true,
    });

    // ヘッダー
    addCrispText(this, width / 2, 118, VOCAB.progression.roundHeader(this.gameState.round), {
      fontSize: "42px",
      fontFamily: "display",
      fontStyle: "bold",
      color: "#fde68a",
      stroke: "#2b1206",
      strokeThickness: 5,
    })
      .setOrigin(0.5)
      .setDepth(10);

    addCrispText(this, width / 2, 172, getWesternQuote(this.gameState.round + 3), {
      fontSize: "19px",
      color: "#d6b384",
      fontStyle: "bold",
    })
      .setOrigin(0.5)
      .setDepth(10);

    // 賞金サマリー（指名手配書カード）
    this.createSummaryCard(width);

    // 懸賞金評価 & 次の賞金首手配書進捗（木札パネル）
    this.createTargetProgressCard(width, height);

    // アクションボタン & 次回上納金案内
    this.createActionButtons(width);
  }

  private createSummaryCard(width: number): void {
    const cardY = 218;
    const cardWidth = 780;
    const cardHeight = 232;

    const g = this.add.graphics().setDepth(10);
    drawParchmentCard(g, width / 2 - cardWidth / 2, cardY, cardWidth, cardHeight, {
      borderColor: 0x5c2d10,
      pinned: true,
    });

    addCrispText(this, width / 2 - 195, cardY + 52, VOCAB.currency.earnedMoney, {
      fontSize: "21px",
      fontStyle: "bold",
      color: "#5c2d10",
    })
      .setOrigin(0.5)
      .setDepth(12);

    addCrispText(
      this,
      width / 2 - 195,
      cardY + 112,
      `+${formatMoney(this.gameState.lastRoundSpEarned)}`,
      {
        fontSize: "42px",
        fontStyle: "bold",
        color: "#7f1d1d",
      },
    )
      .setOrigin(0.5)
      .setDepth(12);

    addCrispText(this, width / 2 + 195, cardY + 52, VOCAB.resultScreen.currentCash, {
      fontSize: "21px",
      fontStyle: "bold",
      color: "#5c2d10",
    })
      .setOrigin(0.5)
      .setDepth(12);

    addCrispText(this, width / 2 + 195, cardY + 112, `${formatMoney(this.gameState.sp)}`, {
      fontSize: "42px",
      fontStyle: "bold",
      color: "#2b1206",
    })
      .setOrigin(0.5)
      .setDepth(12);

    addCrispText(
      this,
      width / 2,
      cardY + 185,
      VOCAB.resultScreen.targetsHit(this.gameState.lastRoundTargetsDestroyed),
      {
        fontSize: "21px",
        fontStyle: "bold",
        color: "#4a2109",
      },
    )
      .setOrigin(0.5)
      .setDepth(12);
  }

  private createTargetProgressCard(width: number, height: number): void {
    const cardY = 486;
    const cardWidth = 780;
    const cardHeight = 256;

    const g = this.add.graphics().setDepth(10);
    drawWoodPanel(g, width / 2 - cardWidth / 2, cardY, cardWidth, cardHeight, {
      fill: 0x261308,
      border: 0xb45309,
      rivets: true,
    });

    const progress = this.gameState.getTargetUnlockProgress();

    addCrispText(this, width / 2, cardY + 38, VOCAB.resultScreen.unlockSectionTitle, {
      fontSize: "25px",
      fontStyle: "bold",
      color: "#fde68a",
    })
      .setOrigin(0.5)
      .setDepth(12);

    if (progress.nextTarget) {
      const nextTargetName = VOCAB.targets[progress.nextTarget.id].name;
      const nextStep = TARGET_UNLOCK_SEQUENCE.find((s) => s.targetId === progress.nextTarget!.id);

      addCrispText(
        this,
        width / 2,
        cardY + 88,
        VOCAB.resultScreen.nextTargetProgress(nextTargetName, progress.percent),
        {
          fontSize: "22px",
          fontStyle: "bold",
          color: "#fbbf24",
        },
      )
        .setOrigin(0.5)
        .setDepth(12);

      const barWidth = 650;
      const barHeight = 26;
      const barX = width / 2 - barWidth / 2;
      const barY = cardY + 128;

      const barG = this.add.graphics().setDepth(12);
      barG.fillStyle(0x140904, 1);
      barG.fillRoundedRect(barX, barY, barWidth, barHeight, 6);
      barG.lineStyle(1.5, 0x78350f, 1);
      barG.strokeRoundedRect(barX, barY, barWidth, barHeight, 6);

      const fillW = Math.max(0, barWidth * (progress.percent / 100));
      if (fillW > 0) {
        barG.fillStyle(0xd97706, 1);
        barG.fillRoundedRect(barX, barY, fillW, barHeight, 6);
      }

      addCrispText(
        this,
        width / 2,
        cardY + 195,
        VOCAB.resultScreen.totalWantedPoints(
          formatNumber(this.gameState.targetPoints),
          formatNumber(nextStep?.requiredPoints ?? 0),
        ),
        {
          fontSize: "20px",
          color: "#d6b384",
        },
      )
        .setOrigin(0.5)
        .setDepth(12);
    } else {
      addCrispText(this, width / 2, cardY + 120, VOCAB.resultScreen.allTargetsUnlocked, {
        fontSize: "26px",
        fontStyle: "bold",
        color: "#fbbf24",
      })
        .setOrigin(0.5)
        .setDepth(12);
    }

    if (this.gameState.lastRoundNewlyUnlockedTargets.length > 0) {
      const locale = useI18n.getState().locale;
      const unlockedNames = this.gameState.lastRoundNewlyUnlockedTargets
        .map((id) =>
          locale === "en" ? `[${VOCAB.targets[id].name}]` : `【${VOCAB.targets[id].name}】`,
        )
        .join(" ");
      this.showUnlockPopup(width, height, unlockedNames);
    }
  }

  private showUnlockPopup(width: number, height: number, names: string): void {
    // 1. 背景の Blur フィルタ（Phaser 4 のカメラフィルタ機能）
    let blurFilter: Phaser.Filters.Blur | null = null;
    let modalCamera: Phaser.Cameras.Scene2D.Camera | null = null;

    const modalRoot = this.add.container(0, 0).setDepth(200);

    try {
      if (this.cameras.main.filters?.internal?.addBlur) {
        blurFilter = this.cameras.main.filters.internal.addBlur(0, 2, 2, 1);
        modalCamera = this.cameras.add(0, 0, width, height);
        this.cameras.main.ignore(modalRoot);
        const bgChildren = this.children.list.filter((obj) => obj !== modalRoot);
        modalCamera.ignore(bgChildren);
      }
    } catch {
      // フィルタ非対応環境フォールバック
    }

    const closeModal = () => {
      this.audio.playSynthSE("spur", 0.6);
      if (blurFilter) {
        try {
          this.cameras.main.filters.internal.remove(blurFilter);
        } catch {
          // ignore
        }
      }
      if (modalCamera) {
        this.cameras.remove(modalCamera);
      }
      modalRoot.destroy();
    };

    // 2. 全画面オーバーレイ（背後クリック遮断 ＆ 暗転演出）
    const overlay = this.add.graphics();
    overlay.fillStyle(0x0a0503, 0.78);
    overlay.fillRect(0, 0, width, height);
    overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, width, height),
      Phaser.Geom.Rectangle.Contains,
    );
    overlay.on("pointerdown", closeModal);
    modalRoot.add(overlay);

    // 3. 高さを上げた指名手配書モーダルカード本体 (width: 740, height: 460)
    const cardW = 740;
    const cardH = 460;

    const cardContainer = this.add.container(width / 2, height / 2);
    modalRoot.add(cardContainer);

    const bg = this.add.graphics();
    drawParchmentCard(bg, -cardW / 2, -cardH / 2, cardW, cardH, {
      borderColor: 0x7f1d1d,
      pinned: true,
    });
    cardContainer.add(bg);

    // ヘッダータイトル
    const t1 = addCrispText(this, 0, -cardH / 2 + 65, VOCAB.resultScreen.unlockPopupBanner, {
      fontSize: "36px",
      fontFamily: "display",
      fontStyle: "bold",
      color: "#7f1d1d",
    }).setOrigin(0.5);
    cardContainer.add(t1);

    // 装飾ライン
    const lineG = this.add.graphics();
    lineG.lineStyle(1.8, 0xa16207, 0.6);
    lineG.lineBetween(-cardW / 2 + 40, -cardH / 2 + 105, cardW / 2 - 40, -cardH / 2 + 105);
    cardContainer.add(lineG);

    // 🎯 アイコンバッジプレート
    const badgeG = this.add.graphics();
    badgeG.fillStyle(0xecd8be, 0.9);
    badgeG.fillCircle(0, -32, 42);
    badgeG.lineStyle(2, 0xb45309, 1);
    badgeG.strokeCircle(0, -32, 42);
    cardContainer.add(badgeG);

    const iconText = addCrispText(this, 0, -32, "🎯", {
      fontSize: "42px",
    }).setOrigin(0.5);
    cardContainer.add(iconText);

    // 解放メッセージ本文
    const t2 = addCrispText(this, 0, 52, VOCAB.resultScreen.unlockPopupBody(names), {
      fontSize: "25px",
      fontStyle: "bold",
      color: "#2b1206",
      align: "center",
      lineSpacing: 10,
      wordWrap: { width: cardW - 80, useAdvancedWrap: true },
    }).setOrigin(0.5);
    cardContainer.add(t2);

    // 閉じるボタン（押しやすい西部劇ボタンスタイル）
    const closeBtn = createWesternButton(
      this,
      0,
      cardH / 2 - 68,
      `★  ${VOCAB.resultScreen.unlockPopupClose}`,
      "brass",
      closeModal,
      480,
      68,
    );
    cardContainer.add(closeBtn);

    this.audio.playSynthSE("laser", 0.8);
  }

  private createActionButtons(width: number): void {
    const btnY = 955;
    const spacing = 116;

    createWesternButton(
      this,
      width / 2,
      btnY,
      `🔫  ${VOCAB.actions.toUpgrade}`,
      "brass",
      () => {
        this.scene.start("UpgradeScene");
      },
      550,
      78,
    ).setDepth(15);

    createWesternButton(
      this,
      width / 2,
      btnY + spacing,
      `▶  ${VOCAB.actions.nextDuel}`,
      "rust",
      () => {
        this.proceedToNext();
      },
      550,
      78,
    ).setDepth(15);

    // 上納金があらわれた後は、次のラウンドへ進むボタンの下にあと何ラウンド後に何ドル支払うかを記述
    const hasInvoiceAppeared =
      this.gameState.invoiceIntroduced ||
      this.gameState.invoiceCount > 0 ||
      this.gameState.round >= INVOICE_CONFIG.intervalRounds;

    if (hasInvoiceAppeared) {
      const roundsRemaining = this.gameState.getRoundsUntilNextInvoice();
      const invoiceCost = this.gameState.getInvoiceAmount();
      const formattedCost = formatMoney(invoiceCost);
      const isUrgent = roundsRemaining === 1;

      const noticeY = btnY + spacing + 66;
      const noticeW = 660;
      const noticeH = 60;

      const g = this.add.graphics().setDepth(14);
      g.fillStyle(isUrgent ? 0x450a0a : 0x1f1008, 0.94);
      g.fillRoundedRect(width / 2 - noticeW / 2, noticeY, noticeW, noticeH, 8);
      g.lineStyle(2, isUrgent ? 0xef4444 : 0xb45309, 1);
      g.strokeRoundedRect(width / 2 - noticeW / 2, noticeY, noticeW, noticeH, 8);

      const noticeText = isUrgent
        ? VOCAB.progression.invoiceDueNextRound(formattedCost)
        : VOCAB.progression.invoiceDueInRounds(roundsRemaining, formattedCost);

      addCrispText(this, width / 2, noticeY + noticeH / 2, noticeText, {
        fontSize: "21px",
        fontStyle: "bold",
        color: isUrgent ? "#fca5a5" : "#fde68a",
      })
        .setOrigin(0.5)
        .setDepth(16);
    }
  }

  private proceedToNext(): void {
    this.gameState.prepareNextRound();
    this.scene.start("RoundScene");
  }
}
