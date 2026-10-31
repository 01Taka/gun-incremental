import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import { PERMANENT_UPGRADES } from "../config/gameData";
import type { PermanentUpgradeId } from "../config/types";
import { EventBus } from "../EventBus";
import { GameState } from "../logic/GameState";
import { addCrispText } from "../utils/text";

export class PermanentUpgradeScene extends Phaser.Scene {
  private gameState!: GameState;
  private audio!: AudioManager;

  private pointsText!: Phaser.GameObjects.Text;
  private cardsContainer!: Phaser.GameObjects.Container;

  constructor() {
    super("PermanentUpgradeScene");
  }

  create() {
    EventBus.emit("current-scene-ready", this);
    this.gameState = GameState.getInstance();
    this.audio = AudioManager.getInstance();

    const { width, height } = this.scale;

    this.createBackground(width, height);
    this.createHeader(width);

    // 永続強化カード一覧
    this.cardsContainer = this.add.container(0, 130);
    this.renderUpgradeCards();

    // 下部アクションボタン
    this.createBottomButtons(width, height);
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

  private createHeader(width: number): void {
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x0f172a, 0.96);
    headerBg.fillRect(0, 0, width, 95);
    headerBg.lineStyle(2, 0x1e293b, 1);
    headerBg.moveTo(0, 95);
    headerBg.lineTo(width, 95);
    headerBg.strokePath();

    addCrispText(this, 40, 30, "⭐ 永続強化 (METAGAME)", {
      fontSize: "28px",
      fontStyle: "bold",
      color: "#c084fc",
    });

    const points = this.gameState.persistentData.permanentPoints;
    this.pointsText = addCrispText(this, width - 40, 30, `所持: ${points} pt`, {
      fontSize: "26px",
      fontStyle: "bold",
      color: "#facc15",
    }).setOrigin(1, 0);
  }

  private renderUpgradeCards(): void {
    this.cardsContainer.removeAll(true);
    const { width } = this.scale;

    const upgrades: PermanentUpgradeId[] = [
      "start_sp",
      "base_dmg",
      "round_time",
      "tp_gain",
      "invoice_reduction",
    ];

    const cardW = 800;
    const cardH = 175;
    const spacing = 195;
    const startY = 30;

    upgrades.forEach((id, index) => {
      const def = PERMANENT_UPGRADES[id];
      const curLevel = this.gameState.persistentData.permanentUpgrades[id] || 0;
      const isMax = curLevel >= def.maxLevel;
      const cost = this.gameState.getPermanentUpgradeCost(id);
      const canAfford = cost !== null && this.gameState.persistentData.permanentPoints >= cost;

      const y = startY + index * spacing;

      const card = this.add.container(width / 2, y + cardH / 2);
      const bg = this.add.graphics();

      const bgColor = isMax ? 0x1e293b : canAfford ? 0x1e293b : 0x0f172a;
      const borderColor = isMax ? 0xfacc15 : canAfford ? 0xa855f7 : 0x334155;

      bg.fillStyle(bgColor, 0.96);
      bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
      bg.lineStyle(2, borderColor, 1);
      bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);

      // 名称 & 段階
      addCrispText(this, -cardW / 2 + 25, -55, def.name, {
        fontSize: "24px",
        fontStyle: "bold",
        color: "#f8fafc",
      });

      addCrispText(
        this,
        -cardW / 2 + 180,
        -53,
        isMax ? "★ MAX" : `Lv.${curLevel} / ${def.maxLevel}`,
        {
          fontSize: "19px",
          fontStyle: "bold",
          color: isMax ? "#facc15" : "#c084fc",
        },
      );

      // 説明
      addCrispText(this, -cardW / 2 + 25, -15, def.description, {
        fontSize: "17px",
        color: "#94a3b8",
        wordWrap: { width: cardW - 250 },
      });

      // 段階ごとの効果一覧 (横並び)
      let effX = -cardW / 2 + 25;
      def.effects.forEach((eff, i) => {
        const lvl = i + 1;
        const isCurrent = curLevel === lvl;
        const isPast = curLevel > lvl;
        const color = isCurrent ? "#38bdf8" : isPast ? "#94a3b8" : "#475569";
        const prefix = isCurrent ? "▶ " : isPast ? "✔ " : "";

        addCrispText(this, effX, 35, `${prefix}Lv.${lvl}: +${eff}${def.effectUnit}`, {
          fontSize: "16px",
          fontStyle: isCurrent ? "bold" : "normal",
          color,
        });
        effX += 165;
      });

      // 強化ボタン (カード右側)
      if (isMax) {
        addCrispText(this, cardW / 2 - 100, 0, "★ 取得完了", {
          fontSize: "20px",
          fontStyle: "bold",
          color: "#facc15",
        }).setOrigin(0.5);
      } else {
        const btn = this.add.graphics();
        btn.fillStyle(canAfford ? 0x7c3aed : 0x334155, 1);
        btn.fillRoundedRect(cardW / 2 - 190, -30, 165, 60, 10);

        const btnLabel = addCrispText(this, cardW / 2 - 107, 0, `強化 (${cost} pt)`, {
          fontSize: "19px",
          fontStyle: "bold",
          color: canAfford ? "#ffffff" : "#94a3b8",
        }).setOrigin(0.5);

        card.add([btn, btnLabel]);

        if (canAfford) {
          card.setSize(cardW, cardH);
          card.setInteractive({ useHandCursor: true });
          card.on("pointerdown", () => {
            if (this.gameState.purchasePermanentUpgrade(id)) {
              this.audio.playSynthSE("laser", 0.7);
              this.refreshScene();
            }
          });
        }
      }

      card.add(bg);
      card.sendToBack(bg);
      this.cardsContainer.add(card);
    });
  }

  private refreshScene(): void {
    const points = this.gameState.persistentData.permanentPoints;
    this.pointsText.setText(`所持: ${points} pt`);
    this.renderUpgradeCards();
  }

  private createBottomButtons(width: number, height: number): void {
    const btnY = height - 120;
    const spacing = 110;

    this.createButton(
      width / 2,
      btnY - spacing,
      "▶ 新しいランを開始",
      0x0284c7,
      0x0ea5e9,
      () => {
        this.audio.playSynthSE("click");
        this.gameState.startNewRun();
        this.scene.start("RoundScene");
      },
      520,
      72,
    );

    this.createButton(
      width / 2,
      btnY,
      "🏠 タイトルへ戻る",
      0x334155,
      0x475569,
      () => {
        this.audio.playSynthSE("click");
        this.scene.start("TitleScene");
      },
      520,
      72,
    );
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    color: number,
    hoverColor: number,
    onClick: () => void,
    width = 480,
    height = 72,
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
