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

    // 背景
    this.createBackground(width, height);

    // ヘッダー
    this.createHeader(width);

    // 永続強化カード一覧
    this.cardsContainer = this.add.container(0, 150);
    this.renderUpgradeCards();

    // 下部アクションボタン
    this.createBottomButtons(width, height);
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

  private createHeader(width: number): void {
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x0f172a, 0.95);
    headerBg.fillRect(0, 0, width, 85);
    headerBg.lineStyle(2, 0x1e293b, 1);
    headerBg.moveTo(0, 85);
    headerBg.lineTo(width, 85);
    headerBg.strokePath();

    addCrispText(this, 50, 26, "⭐ 永続強化 (METAGAME)", {
      fontSize: "30px",
      fontStyle: "bold",
      color: "#c084fc",
    });

    const points = this.gameState.persistentData.permanentPoints;
    this.pointsText = addCrispText(this, width - 50, 26, `所持永続ポイント: ${points} pt`, {
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

    const cardW = 280;
    const cardH = 380;
    const spacing = 300;
    const startX = width / 2 - (upgrades.length * spacing) / 2 + cardW / 2 + 10;

    upgrades.forEach((id, index) => {
      const def = PERMANENT_UPGRADES[id];
      const curLevel = this.gameState.persistentData.permanentUpgrades[id] || 0;
      const isMax = curLevel >= def.maxLevel;
      const cost = this.gameState.getPermanentUpgradeCost(id);
      const canAfford = cost !== null && this.gameState.persistentData.permanentPoints >= cost;

      const x = startX + index * spacing;
      const y = 30;

      const card = this.add.container(x, y);
      const bg = this.add.graphics();

      const bgColor = isMax ? 0x1e293b : canAfford ? 0x1e293b : 0x0f172a;
      const borderColor = isMax ? 0xfacc15 : canAfford ? 0xa855f7 : 0x334155;

      bg.fillStyle(bgColor, 0.95);
      bg.fillRoundedRect(-cardW / 2, 0, cardW, cardH, 16);
      bg.lineStyle(2, borderColor, 1);
      bg.strokeRoundedRect(-cardW / 2, 0, cardW, cardH, 16);

      // 名称
      addCrispText(this, 0, 25, def.name, {
        fontSize: "22px",
        fontStyle: "bold",
        color: "#f8fafc",
      }).setOrigin(0.5);

      // レベル表示
      addCrispText(this, 0, 65, isMax ? "★ MAX LEVEL" : `段階: ${curLevel} / ${def.maxLevel}`, {
        fontSize: "18px",
        fontStyle: "bold",
        color: isMax ? "#facc15" : "#c084fc",
      }).setOrigin(0.5);

      // 説明
      addCrispText(this, 0, 115, def.description, {
        fontSize: "15px",
        color: "#94a3b8",
        align: "center",
        wordWrap: { width: cardW - 30 },
      }).setOrigin(0.5);

      // 各段階の効果一覧
      let effectsY = 175;
      def.effects.forEach((eff, i) => {
        const lvl = i + 1;
        const isCurrent = curLevel === lvl;
        const isPast = curLevel > lvl;
        const color = isCurrent ? "#38bdf8" : isPast ? "#94a3b8" : "#475569";
        const prefix = isCurrent ? "▶ " : isPast ? "✔ " : "　";

        addCrispText(this, 0, effectsY, `${prefix}Lv.${lvl}: +${eff} ${def.effectUnit}`, {
          fontSize: "16px",
          fontStyle: isCurrent ? "bold" : "normal",
          color,
        }).setOrigin(0.5);
        effectsY += 34;
      });

      // 強化ボタン
      if (isMax) {
        addCrispText(this, 0, cardH - 45, "取得完了", {
          fontSize: "18px",
          fontStyle: "bold",
          color: "#facc15",
        }).setOrigin(0.5);
      } else {
        const btn = this.add.graphics();
        btn.fillStyle(canAfford ? 0x7c3aed : 0x334155, 1);
        btn.fillRoundedRect(-100, cardH - 65, 200, 46, 8);

        const btnLabel = addCrispText(this, 0, cardH - 42, `強化 (${cost} pt)`, {
          fontSize: "17px",
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
    this.pointsText.setText(`所持永続ポイント: ${points} pt`);
    this.renderUpgradeCards();
  }

  private createBottomButtons(width: number, height: number): void {
    const btnY = height - 90;
    const spacing = 380;

    // タイトルへ戻る
    this.createButton(
      width / 2 - spacing / 2,
      btnY,
      "🏠 タイトルへ戻る",
      0x334155,
      0x475569,
      () => {
        this.audio.playSynthSE("click");
        this.scene.start("TitleScene");
      },
      320,
      58,
    );

    // 新しいランを開始
    this.createButton(
      width / 2 + spacing / 2,
      btnY,
      "▶ 新しいランを開始",
      0x0284c7,
      0x0ea5e9,
      () => {
        this.audio.playSynthSE("click");
        this.gameState.startNewRun();
        this.scene.start("RoundScene");
      },
      320,
      58,
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
    height = 58,
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
