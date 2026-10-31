import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import { SKILLS, WEAPONS } from "../config/gameData";
import type { SkillNodeId, WeaponId } from "../config/types";
import { EventBus } from "../EventBus";
import { formatNumber, formatPercent } from "../logic/format";
import { GameState } from "../logic/GameState";
import { addCrispText } from "../utils/text";

type TabType = "skills" | "weapons";

export class UpgradeScene extends Phaser.Scene {
  private gameState!: GameState;
  private audio!: AudioManager;

  private currentTab: TabType = "skills";

  // UI要素
  private spDisplay!: Phaser.GameObjects.Text;
  private invoiceDisplay!: Phaser.GameObjects.Text;
  private contentContainer!: Phaser.GameObjects.Container;
  private skillTabButton!: Phaser.GameObjects.Container;
  private weaponTabButton!: Phaser.GameObjects.Container;

  constructor() {
    super("UpgradeScene");
  }

  create() {
    EventBus.emit("current-scene-ready", this);
    this.gameState = GameState.getInstance();
    this.audio = AudioManager.getInstance();

    const { width, height } = this.scale;

    // 背景
    this.createBackground(width, height);

    // ヘッダー (所持SP & 次回請求予定)
    this.createHeader(width);

    // タブ切り替えボタン
    this.createTabs(width);

    // メインコンテンツ表示用コンテナ
    this.contentContainer = this.add.container(0, 180);

    // 画面下部アクションボタン (「完了して次へ」)
    this.createBottomBar(width, height);

    // 初期タブ描画
    this.renderCurrentTab();
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
    headerBg.fillRect(0, 0, width, 80);
    headerBg.lineStyle(2, 0x1e293b, 1);
    headerBg.moveTo(0, 80);
    headerBg.lineTo(width, 80);
    headerBg.strokePath();

    addCrispText(this, 50, 24, "UPGRADE SYSTEM", {
      fontSize: "30px",
      fontStyle: "bold",
      color: "#38bdf8",
    });

    this.spDisplay = addCrispText(
      this,
      width / 2,
      25,
      `所持SP: ${formatNumber(this.gameState.sp)} SP`,
      {
        fontSize: "28px",
        fontStyle: "bold",
        color: "#facc15",
      },
    ).setOrigin(0.5, 0);

    const nextInvoice = this.gameState.getInvoiceAmount();
    const canAfford = this.gameState.sp >= nextInvoice;
    this.invoiceDisplay = addCrispText(
      this,
      width - 50,
      26,
      `次回請求: ${formatNumber(nextInvoice)} SP (${canAfford ? "支払可能" : "SP不足"})`,
      {
        fontSize: "20px",
        fontStyle: "bold",
        color: canAfford ? "#4ade80" : "#f87171",
      },
    ).setOrigin(1, 0);
  }

  private createTabs(width: number): void {
    const tabY = 125;
    const tabWidth = 240;
    const tabHeight = 44;

    // スキルツリータブ
    this.skillTabButton = this.createTabButton(
      width / 2 - 140,
      tabY,
      "⚡ スキルツリー",
      this.currentTab === "skills",
      () => {
        if (this.currentTab !== "skills") {
          this.currentTab = "skills";
          this.audio.playSynthSE("click");
          this.updateTabStyles();
          this.renderCurrentTab();
        }
      },
      tabWidth,
      tabHeight,
    );

    // 武器ショップタブ
    const isShopUnlocked = this.gameState.isShopAvailable();
    const shopLabel = isShopUnlocked ? "🔫 武器ショップ" : "🔒 武器ショップ (Round 3〜)";

    this.weaponTabButton = this.createTabButton(
      width / 2 + 140,
      tabY,
      shopLabel,
      this.currentTab === "weapons",
      () => {
        if (!isShopUnlocked) return;
        if (this.currentTab !== "weapons") {
          this.currentTab = "weapons";
          this.audio.playSynthSE("click");
          this.updateTabStyles();
          this.renderCurrentTab();
        }
      },
      tabWidth,
      tabHeight,
      !isShopUnlocked,
    );
  }

  private createTabButton(
    x: number,
    y: number,
    text: string,
    isActive: boolean,
    onClick: () => void,
    w = 220,
    h = 44,
    isDisabled = false,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    this.drawTabBg(bg, isActive, isDisabled, w, h);

    const label = addCrispText(this, 0, 0, text, {
      fontSize: "18px",
      fontStyle: isActive ? "bold" : "normal",
      color: isDisabled ? "#64748b" : isActive ? "#ffffff" : "#94a3b8",
    }).setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(w, h);

    if (!isDisabled) {
      container.setInteractive({ useHandCursor: true });
      container.on("pointerdown", onClick);
    }

    return container;
  }

  private drawTabBg(
    bg: Phaser.GameObjects.Graphics,
    isActive: boolean,
    isDisabled: boolean,
    w: number,
    h: number,
  ): void {
    bg.clear();
    const color = isDisabled ? 0x1e293b : isActive ? 0x0284c7 : 0x1e293b;
    const borderColor = isDisabled ? 0x334155 : isActive ? 0x38bdf8 : 0x475569;

    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    bg.lineStyle(2, borderColor, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
  }

  private updateTabStyles(): void {
    const isShopUnlocked = this.gameState.isShopAvailable();
    this.drawTabBg(
      this.skillTabButton.getAt(0) as Phaser.GameObjects.Graphics,
      this.currentTab === "skills",
      false,
      240,
      44,
    );
    this.drawTabBg(
      this.weaponTabButton.getAt(0) as Phaser.GameObjects.Graphics,
      this.currentTab === "weapons",
      !isShopUnlocked,
      240,
      44,
    );
  }

  private renderCurrentTab(): void {
    this.contentContainer.removeAll(true);
    if (this.currentTab === "skills") {
      this.renderSkillTree();
    } else {
      this.renderWeaponShop();
    }
    this.refreshHeader();
  }

  private refreshHeader(): void {
    this.spDisplay.setText(`所持SP: ${formatNumber(this.gameState.sp)} SP`);
    const nextInvoice = this.gameState.getInvoiceAmount();
    const canAfford = this.gameState.sp >= nextInvoice;
    this.invoiceDisplay.setText(
      `次回請求: ${formatNumber(nextInvoice)} SP (${canAfford ? "支払可能" : "SP不足"})`,
    );
    this.invoiceDisplay.setColor(canAfford ? "#4ade80" : "#f87171");
  }

  // --- スキルツリー描画 ---
  private renderSkillTree(): void {
    const skillList: SkillNodeId[] = [
      "damage_base",
      "round_time",
      "fire_rate",
      "sp_multiplier",
      "max_targets",
      "crit_rate",
      "target_point_mult",
      "shop_discount",
      "time_target_bonus",
      "chain_damage",
    ];

    const cardWidth = 270;
    const cardHeight = 160;
    const startX = 140;
    const startY = 10;
    const gapX = 300;
    const gapY = 180;

    skillList.forEach((skillId, index) => {
      const col = index % 5;
      const row = Math.floor(index / 5);
      const x = startX + col * gapX;
      const y = startY + row * gapY;

      this.createSkillCard(x, y, skillId, cardWidth, cardHeight);
    });
  }

  private createSkillCard(x: number, y: number, skillId: SkillNodeId, w: number, h: number): void {
    const def = SKILLS[skillId];
    const currentLevel = this.gameState.skillLevels[skillId];
    const isMax = currentLevel >= def.maxLevel;
    const cost = this.gameState.getSkillCost(skillId);
    const canAfford = cost !== null && this.gameState.sp >= cost;

    // 前提条件チェック
    let isLocked = false;
    let lockReason = "";
    if (def.requirement) {
      const reqCur = this.gameState.skillLevels[def.requirement.nodeId] || 0;
      if (reqCur < def.requirement.level) {
        isLocked = true;
        const reqDef = SKILLS[def.requirement.nodeId];
        lockReason = `要: ${reqDef.name} Lv.${def.requirement.level}`;
      }
    }

    const card = this.add.container(x, y);
    const bg = this.add.graphics();

    const bgColor = isLocked ? 0x0f172a : isMax ? 0x1e293b : canAfford ? 0x1e293b : 0x0f172a;
    const borderColor = isLocked ? 0x334155 : isMax ? 0xfacc15 : canAfford ? 0x38bdf8 : 0x475569;

    bg.fillStyle(bgColor, 0.9);
    bg.fillRoundedRect(0, 0, w, h, 12);
    bg.lineStyle(isMax || canAfford ? 2 : 1, borderColor, 1);
    bg.strokeRoundedRect(0, 0, w, h, 12);

    // スキル名
    addCrispText(card.scene, 14, 12, def.name, {
      fontSize: "19px",
      fontStyle: "bold",
      color: isLocked ? "#64748b" : "#f8fafc",
    });

    // レベル
    addCrispText(card.scene, w - 14, 14, isMax ? "MAX" : `Lv.${currentLevel}/${def.maxLevel}`, {
      fontSize: "16px",
      fontStyle: "bold",
      color: isMax ? "#facc15" : "#38bdf8",
    }).setOrigin(1, 0);

    // 説明文
    addCrispText(card.scene, 14, 45, def.description, {
      fontSize: "14px",
      color: isLocked ? "#475569" : "#94a3b8",
      wordWrap: { width: w - 28 },
    });

    // ボタン / 状態表示
    if (isLocked) {
      addCrispText(card.scene, w / 2, h - 30, `🔒 ${lockReason}`, {
        fontSize: "14px",
        fontStyle: "bold",
        color: "#f87171",
      }).setOrigin(0.5);
    } else if (isMax) {
      addCrispText(card.scene, w / 2, h - 30, "★ 習得完了", {
        fontSize: "16px",
        fontStyle: "bold",
        color: "#facc15",
      }).setOrigin(0.5);
    } else {
      // 購入ボタン
      const btnBg = this.add.graphics();
      btnBg.fillStyle(canAfford ? 0x0284c7 : 0x334155, 1);
      btnBg.fillRoundedRect(14, h - 45, w - 28, 34, 6);

      const btnText = addCrispText(card.scene, w / 2, h - 28, `購入: ${formatNumber(cost!)} SP`, {
        fontSize: "15px",
        fontStyle: "bold",
        color: canAfford ? "#ffffff" : "#94a3b8",
      }).setOrigin(0.5);

      card.add([btnBg, btnText]);

      if (canAfford) {
        card.setSize(w, h);
        card.setInteractive({ useHandCursor: true });
        card.on("pointerdown", () => {
          if (this.gameState.buySkill(skillId)) {
            this.audio.playSynthSE("laser", 0.7);
            this.renderCurrentTab();
          }
        });
      }
    }

    card.add(bg);
    card.sendToBack(bg);
    this.contentContainer.add(card);
  }

  // --- 武器ショップ描画 ---
  private renderWeaponShop(): void {
    const { width } = this.scale;
    const weapons: WeaponId[] = ["handgun", "rifle", "sniper"];

    const cardWidth = 400;
    const cardHeight = 320;
    const startX = width / 2 - (weapons.length * (cardWidth + 40)) / 2 + 20;

    weapons.forEach((weaponId, index) => {
      const def = WEAPONS[weaponId];
      const isOwned = this.gameState.ownedWeapons.includes(weaponId);
      const isEquipped = this.gameState.equippedWeapon === weaponId;
      const price = this.gameState.getWeaponPrice(weaponId);
      const canAfford = this.gameState.sp >= price;
      const isDiscounted = this.gameState.getShopDiscount() > 0 && def.price > 0;

      const x = startX + index * (cardWidth + 40);
      const y = 30;

      const card = this.add.container(x, y);
      const bg = this.add.graphics();

      const bgColor = isEquipped ? 0x0c4a6e : isOwned ? 0x1e293b : 0x0f172a;
      const borderColor = isEquipped ? 0x38bdf8 : isOwned ? 0x22c55e : 0x475569;

      bg.fillStyle(bgColor, 0.95);
      bg.fillRoundedRect(0, 0, cardWidth, cardHeight, 16);
      bg.lineStyle(2, borderColor, 1);
      bg.strokeRoundedRect(0, 0, cardWidth, cardHeight, 16);

      // 武器名
      addCrispText(card.scene, cardWidth / 2, 28, def.name, {
        fontSize: "26px",
        fontStyle: "bold",
        color: "#ffffff",
      }).setOrigin(0.5);

      // スペック
      const specs = [
        `ダメージ: ${def.damage}`,
        `発射間隔: ${def.fireInterval.toFixed(2)}s (${(1 / def.fireInterval).toFixed(1)}発/秒)`,
      ];

      addCrispText(card.scene, cardWidth / 2, 80, specs.join("\n"), {
        fontSize: "18px",
        color: "#38bdf8",
        align: "center",
      }).setOrigin(0.5);

      // 説明
      addCrispText(card.scene, cardWidth / 2, 140, def.description, {
        fontSize: "16px",
        color: "#94a3b8",
        align: "center",
        wordWrap: { width: cardWidth - 40 },
      }).setOrigin(0.5);

      // アクション領域
      if (isEquipped) {
        addCrispText(card.scene, cardWidth / 2, cardHeight - 60, "✔ 現在装備中", {
          fontSize: "22px",
          fontStyle: "bold",
          color: "#38bdf8",
        }).setOrigin(0.5);
      } else if (isOwned) {
        // 装備するボタン
        const equipBtn = this.createCardActionButton(
          cardWidth / 2,
          cardHeight - 60,
          "装備する",
          0x0284c7,
          () => {
            this.gameState.equipWeapon(weaponId);
            this.audio.playSynthSE("click");
            this.renderCurrentTab();
          },
          180,
          48,
        );
        card.add(equipBtn);
      } else {
        // 価格表示 & 購入ボタン
        const discountText = isDiscounted
          ? ` (${formatPercent(this.gameState.getShopDiscount())} OFF)`
          : "";
        const priceLabel = `購入: ${formatNumber(price)} SP${discountText}`;

        const buyBtn = this.createCardActionButton(
          cardWidth / 2,
          cardHeight - 60,
          priceLabel,
          canAfford ? 0x16a34a : 0x334155,
          () => {
            if (this.gameState.buyWeapon(weaponId)) {
              this.audio.playSynthSE("laser", 0.8);
              this.renderCurrentTab();
            }
          },
          260,
          50,
          !canAfford,
        );
        card.add(buyBtn);
      }

      card.add(bg);
      card.sendToBack(bg);
      this.contentContainer.add(card);
    });

    // オート射撃の説明告知
    if (this.gameState.canToggleAutoFire()) {
      addCrispText(
        this,
        width / 2,
        cardHeight + 70,
        "✨ 全3種の武器を入手しました！「オート射撃」が利用可能です！",
        {
          fontSize: "20px",
          fontStyle: "bold",
          color: "#facc15",
        },
      ).setOrigin(0.5);
    }
  }

  private createCardActionButton(
    x: number,
    y: number,
    text: string,
    color: number,
    onClick: () => void,
    w = 180,
    h = 48,
    isDisabled = false,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);

    const label = addCrispText(this, 0, 0, text, {
      fontSize: "17px",
      fontStyle: "bold",
      color: isDisabled ? "#94a3b8" : "#ffffff",
    }).setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(w, h);

    if (!isDisabled) {
      container.setInteractive({ useHandCursor: true });
      container.on("pointerdown", onClick);
    }

    return container;
  }

  // --- 下部アクションバー ---
  private createBottomBar(width: number, height: number): void {
    const btnY = height - 70;

    // 「完了して次へ」ボタン
    this.createBigButton(
      width / 2,
      btnY,
      "▶ 強化を終えて次へ進む",
      0x0284c7,
      0x0ea5e9,
      () => {
        this.audio.playSynthSE("click");
        this.proceedToNext();
      },
      380,
      56,
    );
  }

  private proceedToNext(): void {
    if (this.gameState.isInvoiceDue()) {
      this.scene.start("InvoiceScene");
    } else {
      this.gameState.prepareNextRound();
      this.scene.start("RoundScene");
    }
  }

  private createBigButton(
    x: number,
    y: number,
    text: string,
    color: number,
    hoverColor: number,
    onClick: () => void,
    width = 380,
    height = 56,
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
      container.setScale(1.02);
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
      container.setScale(0.98);
    });

    container.on("pointerup", () => {
      container.setScale(1.02);
      onClick();
    });

    return container;
  }
}
