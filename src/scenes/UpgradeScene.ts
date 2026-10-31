import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import { SKILLS, WEAPONS } from "../config/gameData";
import type { SkillDefinition, SkillNodeId, WeaponId } from "../config/types";
import { EventBus } from "../EventBus";
import { formatNumber, formatPercent } from "../logic/format";
import { GameState } from "../logic/GameState";
import { addCrispText } from "../utils/text";

type TabType = "skills" | "weapons";

export class UpgradeScene extends Phaser.Scene {
  private gameState!: GameState;
  private audio!: AudioManager;

  private currentTab: TabType = "skills";
  private selectedSkillId: SkillNodeId = "damage_base";

  // UI要素
  private spDisplay!: Phaser.GameObjects.Text;
  private invoiceDisplay!: Phaser.GameObjects.Text;
  private contentContainer!: Phaser.GameObjects.Container;
  private skillTabButton!: Phaser.GameObjects.Container;
  private weaponTabButton!: Phaser.GameObjects.Container;

  // ツリー描画用
  private treeLinesGraphics!: Phaser.GameObjects.Graphics;
  private nodesContainer!: Phaser.GameObjects.Container;
  private detailPanelContainer!: Phaser.GameObjects.Container;

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
    this.contentContainer = this.add.container(0, 150);

    // 画面下部アクションボタン (「完了して次へ」)
    this.createBottomBar(width, height);

    // 初期タブ描画
    this.renderCurrentTab();
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
    headerBg.fillRect(0, 0, width, 85);
    headerBg.lineStyle(2, 0x1e293b, 1);
    headerBg.moveTo(0, 85);
    headerBg.lineTo(width, 85);
    headerBg.strokePath();

    addCrispText(this, 40, 26, "UPGRADES", {
      fontSize: "28px",
      fontStyle: "bold",
      color: "#38bdf8",
    });

    this.spDisplay = addCrispText(
      this,
      width / 2 + 30,
      26,
      `所持: ${formatNumber(this.gameState.sp)} SP`,
      {
        fontSize: "24px",
        fontStyle: "bold",
        color: "#facc15",
      },
    ).setOrigin(0.5, 0);

    const nextInvoice = this.gameState.getInvoiceAmount();
    const canAfford = this.gameState.sp >= nextInvoice;
    this.invoiceDisplay = addCrispText(
      this,
      width - 40,
      28,
      `次回請求: ${formatNumber(nextInvoice)} SP`,
      {
        fontSize: "17px",
        fontStyle: "bold",
        color: canAfford ? "#4ade80" : "#f87171",
      },
    ).setOrigin(1, 0);
  }

  private createTabs(width: number): void {
    const tabY = 120;
    const tabWidth = 360;
    const tabHeight = 44;

    this.skillTabButton = this.createTabButton(
      width / 2 - 190,
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

    const isShopUnlocked = this.gameState.isShopAvailable();
    const shopLabel = isShopUnlocked ? "🔫 武器ショップ" : "🔒 ショップ (Round 3〜)";

    this.weaponTabButton = this.createTabButton(
      width / 2 + 190,
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
    w = 340,
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
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    bg.lineStyle(2, borderColor, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
  }

  private updateTabStyles(): void {
    const isShopUnlocked = this.gameState.isShopAvailable();
    this.drawTabBg(
      this.skillTabButton.getAt(0) as Phaser.GameObjects.Graphics,
      this.currentTab === "skills",
      false,
      360,
      44,
    );
    this.drawTabBg(
      this.weaponTabButton.getAt(0) as Phaser.GameObjects.Graphics,
      this.currentTab === "weapons",
      !isShopUnlocked,
      360,
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
    this.spDisplay.setText(`所持: ${formatNumber(this.gameState.sp)} SP`);
    const nextInvoice = this.gameState.getInvoiceAmount();
    const canAfford = this.gameState.sp >= nextInvoice;
    this.invoiceDisplay.setText(`次回請求: ${formatNumber(nextInvoice)} SP`);
    this.invoiceDisplay.setColor(canAfford ? "#4ade80" : "#f87171");
  }

  // ==========================================
  // 縦型スキルツリー構造の描画 (上から下へ展開)
  // ==========================================
  private renderSkillTree(): void {
    const treeW = 820;
    const treeH = 680;
    const treeX = 40;
    const treeY = 10;

    // ツリー枠背景
    const treeBg = this.add.graphics();
    treeBg.fillStyle(0x0b1120, 0.7);
    treeBg.fillRoundedRect(treeX, treeY, treeW, treeH, 16);
    treeBg.lineStyle(1.5, 0x1e293b, 0.8);
    treeBg.strokeRoundedRect(treeX, treeY, treeW, treeH, 16);
    this.contentContainer.add(treeBg);

    // 接続線レイヤー
    this.treeLinesGraphics = this.add.graphics();
    this.contentContainer.add(this.treeLinesGraphics);

    // ノードレイヤー
    this.nodesContainer = this.add.container(0, 0);
    this.contentContainer.add(this.nodesContainer);

    // 下部: 詳細インスペクターパネル (y = 705)
    this.detailPanelContainer = this.add.container(treeX, treeY + treeH + 15);
    this.contentContainer.add(this.detailPanelContainer);

    // 線とノードとパネルを描画
    this.drawTreeConnectionLines();
    this.drawTreeNodes();
    this.renderDetailPanel();
  }

  private drawTreeConnectionLines(): void {
    this.treeLinesGraphics.clear();

    const skillKeys = Object.keys(SKILLS) as SkillNodeId[];

    for (const skillId of skillKeys) {
      const def = SKILLS[skillId];
      if (!def.requirement) continue;

      const parentDef = SKILLS[def.requirement.nodeId];
      const parentPos = parentDef.treePos;
      const childPos = def.treePos;

      const parentLevel = this.gameState.skillLevels[def.requirement.nodeId] || 0;
      const isConditionMet = parentLevel >= def.requirement.level;
      const childLevel = this.gameState.skillLevels[skillId] || 0;
      const isChildMax = childLevel >= def.maxLevel;

      let lineColor = 0x1e293b;
      let lineAlpha = 0.5;
      let lineWidth = 2;

      if (isChildMax) {
        lineColor = 0xfacc15;
        lineAlpha = 0.9;
        lineWidth = 3.5;
      } else if (childLevel > 0) {
        lineColor = 0x38bdf8;
        lineAlpha = 0.9;
        lineWidth = 3;
      } else if (isConditionMet) {
        lineColor = 0x0284c7;
        lineAlpha = 0.75;
        lineWidth = 2.5;
      }

      this.treeLinesGraphics.lineStyle(lineWidth, lineColor, lineAlpha);

      // 上から下への回路配線コネクタ:
      // (parentX, parentY) -> (parentX, midY) -> (childX, midY) -> (childX, childY)
      const midY = (parentPos.y + childPos.y) / 2;

      this.treeLinesGraphics.beginPath();
      this.treeLinesGraphics.moveTo(parentPos.x, parentPos.y + 10);
      this.treeLinesGraphics.lineTo(parentPos.x, midY);
      this.treeLinesGraphics.lineTo(childPos.x, midY);
      this.treeLinesGraphics.lineTo(childPos.x, childPos.y + 10);
      this.treeLinesGraphics.strokePath();

      // 下向き矢印マーカー
      const arrowSize = 5;
      this.treeLinesGraphics.fillStyle(lineColor, lineAlpha);
      this.treeLinesGraphics.fillTriangle(
        childPos.x,
        childPos.y + 10 - 36,
        childPos.x - arrowSize,
        childPos.y + 10 - 36 - arrowSize * 2,
        childPos.x + arrowSize,
        childPos.y + 10 - 36 - arrowSize * 2,
      );
    }
  }

  private drawTreeNodes(): void {
    this.nodesContainer.removeAll(true);

    const skillKeys = Object.keys(SKILLS) as SkillNodeId[];

    for (const skillId of skillKeys) {
      const def = SKILLS[skillId];
      const curLevel = this.gameState.skillLevels[skillId];
      const isMax = curLevel >= def.maxLevel;
      const canUnlock = this.gameState.canUnlockSkill(skillId);
      const isSelected = this.selectedSkillId === skillId;
      const cost = this.gameState.getSkillCost(skillId);

      let isRequirementMet = true;
      if (def.requirement) {
        const reqLvl = this.gameState.skillLevels[def.requirement.nodeId] || 0;
        if (reqLvl < def.requirement.level) {
          isRequirementMet = false;
        }
      }

      const nodeX = def.treePos.x;
      const nodeY = def.treePos.y + 10;
      const radius = 34;

      const nodeContainer = this.add.container(nodeX, nodeY);

      // 選択グロー
      const glowGraphics = this.add.graphics();
      if (isSelected) {
        glowGraphics.lineStyle(3, 0xffffff, 0.9);
        glowGraphics.strokeCircle(0, 0, radius + 6);
      }
      if (canUnlock && !isMax) {
        glowGraphics.lineStyle(2, 0x38bdf8, 0.6);
        glowGraphics.strokeCircle(0, 0, radius + 3);
      }
      nodeContainer.add(glowGraphics);

      // ノード円グラフィック
      const nodeBg = this.add.graphics();

      let fillColor = 0x0f172a;
      let strokeColor = 0x334155;
      let strokeWidth = 2;

      if (isMax) {
        fillColor = 0x361e05;
        strokeColor = 0xfacc15;
        strokeWidth = 3;
      } else if (curLevel > 0) {
        fillColor = 0x0c4a6e;
        strokeColor = 0x38bdf8;
        strokeWidth = 3;
      } else if (canUnlock) {
        fillColor = 0x1e293b;
        strokeColor = 0x38bdf8;
        strokeWidth = 2.5;
      } else if (!isRequirementMet) {
        fillColor = 0x090d16;
        strokeColor = 0x1e293b;
        strokeWidth = 1.5;
      }

      nodeBg.fillStyle(fillColor, 1);
      nodeBg.fillCircle(0, 0, radius);
      nodeBg.lineStyle(strokeWidth, strokeColor, 1);
      nodeBg.strokeCircle(0, 0, radius);
      nodeContainer.add(nodeBg);

      // アイコン
      const iconText = !isRequirementMet ? "🔒" : def.icon;
      const icon = addCrispText(this, 0, -5, iconText, {
        fontSize: "24px",
      }).setOrigin(0.5);
      nodeContainer.add(icon);

      // レベルバッジ
      const levelLabel = isMax ? "MAX" : `${curLevel}/${def.maxLevel}`;
      const badgeColor = isMax ? "#facc15" : curLevel > 0 ? "#38bdf8" : "#94a3b8";
      const lvlText = addCrispText(this, 0, 18, levelLabel, {
        fontSize: "12px",
        fontStyle: "bold",
        color: badgeColor,
      }).setOrigin(0.5);
      nodeContainer.add(lvlText);

      // ノード上部: スキル名
      const titleColor = !isRequirementMet ? "#475569" : isMax ? "#fef08a" : "#f8fafc";
      const nameText = addCrispText(this, 0, -radius - 10, def.name, {
        fontSize: "13px",
        fontStyle: "bold",
        color: titleColor,
      }).setOrigin(0.5);
      nodeContainer.add(nameText);

      // ノード下部: コスト
      if (!isMax && cost !== null) {
        const costColor = canUnlock ? "#38bdf8" : "#64748b";
        const costText = addCrispText(this, 0, radius + 10, `${formatNumber(cost)} SP`, {
          fontSize: "12px",
          fontStyle: "bold",
          color: costColor,
        }).setOrigin(0.5);
        nodeContainer.add(costText);
      } else if (isMax) {
        const completeText = addCrispText(this, 0, radius + 10, "★ MAX", {
          fontSize: "11px",
          fontStyle: "bold",
          color: "#facc15",
        }).setOrigin(0.5);
        nodeContainer.add(completeText);
      }

      nodeContainer.setSize(radius * 2, radius * 2);
      nodeContainer.setInteractive({ useHandCursor: true });

      nodeContainer.on("pointerover", () => nodeContainer.setScale(1.08));
      nodeContainer.on("pointerout", () => nodeContainer.setScale(1.0));
      nodeContainer.on("pointerdown", () => {
        this.selectedSkillId = skillId;
        this.audio.playSynthSE("click");

        if (this.gameState.canUnlockSkill(skillId)) {
          if (this.gameState.buySkill(skillId)) {
            this.audio.playSynthSE("laser", 0.7);
          }
        }
        this.refreshTreeViews();
      });

      this.nodesContainer.add(nodeContainer);
    }
  }

  /**
   * 縦画面用詳細インスペクターパネル (幅 820, 高さ 580)
   */
  private renderDetailPanel(): void {
    this.detailPanelContainer.removeAll(true);

    const panelW = 820;
    const panelH = 580;

    const def: SkillDefinition = SKILLS[this.selectedSkillId];
    const curLevel = this.gameState.skillLevels[this.selectedSkillId];
    const isMax = curLevel >= def.maxLevel;
    const cost = this.gameState.getSkillCost(this.selectedSkillId);
    const canUnlock = this.gameState.canUnlockSkill(this.selectedSkillId);

    let isRequirementMet = true;
    let reqText = "なし (初期解放)";
    if (def.requirement) {
      const parentDef = SKILLS[def.requirement.nodeId];
      const parentCur = this.gameState.skillLevels[def.requirement.nodeId] || 0;
      isRequirementMet = parentCur >= def.requirement.level;
      reqText = `${parentDef.name} Lv.${def.requirement.level} 以上 (現在: Lv.${parentCur})`;
    }

    const bg = this.add.graphics();
    bg.fillStyle(0x0f172a, 0.98);
    bg.fillRoundedRect(0, 0, panelW, panelH, 16);
    bg.lineStyle(2, isMax ? 0xfacc15 : 0x0284c7, 1);
    bg.strokeRoundedRect(0, 0, panelW, panelH, 16);
    this.detailPanelContainer.add(bg);

    // カテゴリバッジ
    const categoryBadge = def.category === "combat" ? "⚔️ 戦闘強化" : "📊 経済強化";
    const categoryColor = def.category === "combat" ? 0xef4444 : 0x10b981;

    const catBg = this.add.graphics();
    catBg.fillStyle(categoryColor, 0.2);
    catBg.lineStyle(1, categoryColor, 0.8);
    catBg.fillRoundedRect(30, 25, 120, 30, 6);
    catBg.strokeRoundedRect(30, 25, 120, 30, 6);
    this.detailPanelContainer.add(catBg);

    addCrispText(this, 90, 40, categoryBadge, {
      fontSize: "14px",
      fontStyle: "bold",
      color: "#ffffff",
    }).setOrigin(0.5);

    // スキル名とアイコン
    addCrispText(this, 170, 26, `${def.icon} ${def.name}`, {
      fontSize: "28px",
      fontStyle: "bold",
      color: "#f8fafc",
    });

    // レベル表示
    addCrispText(this, panelW - 30, 30, isMax ? "★ MAX" : `Lv.${curLevel} / ${def.maxLevel}`, {
      fontSize: "22px",
      fontStyle: "bold",
      color: isMax ? "#facc15" : "#38bdf8",
    }).setOrigin(1, 0);

    // レベルバー
    const barW = panelW - 60;
    const barH = 12;
    const barY = 75;

    const barBg = this.add.graphics();
    barBg.fillStyle(0x1e293b, 1);
    barBg.fillRoundedRect(30, barY, barW, barH, 6);

    const fillW = Math.max(0, barW * (curLevel / def.maxLevel));
    barBg.fillStyle(isMax ? 0xfacc15 : 0x0284c7, 1);
    barBg.fillRoundedRect(30, barY, fillW, barH, 6);
    this.detailPanelContainer.add(barBg);

    // 説明文
    addCrispText(this, 30, 105, def.description, {
      fontSize: "18px",
      color: "#94a3b8",
      wordWrap: { width: panelW - 60 },
    });

    // 区切り線1
    const divider1 = this.add.graphics();
    divider1.lineStyle(1, 0x1e293b, 1);
    divider1.moveTo(30, 170);
    divider1.lineTo(panelW - 30, 170);
    divider1.strokePath();
    this.detailPanelContainer.add(divider1);

    // 効果量の詳細比較 (Before / After)
    const curVal = curLevel * def.effectPerLevel;
    const nextVal = (curLevel + 1) * def.effectPerLevel;
    const unit = def.effectUnit;

    const curDisplay = unit === "%" ? formatPercent(curVal, true) : `+${curVal} ${unit}`;
    const nextDisplay = unit === "%" ? formatPercent(nextVal, true) : `+${nextVal} ${unit}`;
    const diffDisplay =
      unit === "%"
        ? `(+${Math.round(def.effectPerLevel * 100)}%)`
        : `(+${def.effectPerLevel} ${unit})`;

    addCrispText(this, 30, 195, "効果の詳細", {
      fontSize: "19px",
      fontStyle: "bold",
      color: "#cbd5e1",
    });

    addCrispText(this, 30, 240, "現在のボーナス:", {
      fontSize: "17px",
      color: "#94a3b8",
    });
    addCrispText(this, panelW - 30, 240, curLevel > 0 ? curDisplay : "効果なし (Lv.0)", {
      fontSize: "19px",
      fontStyle: "bold",
      color: curLevel > 0 ? "#38bdf8" : "#64748b",
    }).setOrigin(1, 0);

    if (!isMax) {
      addCrispText(this, 30, 285, "次のレベル (UP):", {
        fontSize: "17px",
        color: "#94a3b8",
      });
      addCrispText(this, panelW - 30, 285, `${nextDisplay}  ${diffDisplay}`, {
        fontSize: "19px",
        fontStyle: "bold",
        color: "#4ade80",
      }).setOrigin(1, 0);
    }

    // 区切り線2
    const divider2 = this.add.graphics();
    divider2.lineStyle(1, 0x1e293b, 1);
    divider2.moveTo(30, 345);
    divider2.lineTo(panelW - 30, 345);
    divider2.strokePath();
    this.detailPanelContainer.add(divider2);

    // 前提条件
    addCrispText(this, 30, 370, "ツリー解放条件", {
      fontSize: "19px",
      fontStyle: "bold",
      color: "#cbd5e1",
    });

    addCrispText(this, 30, 410, reqText, {
      fontSize: "17px",
      fontStyle: isRequirementMet ? "normal" : "bold",
      color: isRequirementMet ? "#38bdf8" : "#ef4444",
      wordWrap: { width: panelW - 60 },
    });

    // 下部購入ボタン
    const buttonY = panelH - 95;

    if (isMax) {
      const maxBanner = this.add.graphics();
      maxBanner.fillStyle(0x361e05, 1);
      maxBanner.lineStyle(2, 0xfacc15, 1);
      maxBanner.fillRoundedRect(30, buttonY, panelW - 60, 68, 12);
      maxBanner.strokeRoundedRect(30, buttonY, panelW - 60, 68, 12);
      this.detailPanelContainer.add(maxBanner);

      addCrispText(this, panelW / 2, buttonY + 34, "★ 最大レベル習得済み", {
        fontSize: "22px",
        fontStyle: "bold",
        color: "#facc15",
      }).setOrigin(0.5);
    } else if (!isRequirementMet) {
      const lockBanner = this.add.graphics();
      lockBanner.fillStyle(0x180505, 1);
      lockBanner.lineStyle(1.5, 0xef4444, 0.6);
      lockBanner.fillRoundedRect(30, buttonY, panelW - 60, 68, 12);
      lockBanner.strokeRoundedRect(30, buttonY, panelW - 60, 68, 12);
      this.detailPanelContainer.add(lockBanner);

      addCrispText(this, panelW / 2, buttonY + 34, "🔒 前提スキルが未達です", {
        fontSize: "20px",
        fontStyle: "bold",
        color: "#ef4444",
      }).setOrigin(0.5);
    } else {
      const btn = this.add.container(panelW / 2, buttonY + 34);
      const btnBg = this.add.graphics();
      const btnColor = canUnlock ? 0x0284c7 : 0x1e293b;
      const btnBorder = canUnlock ? 0x38bdf8 : 0x334155;

      btnBg.fillStyle(btnColor, 1);
      btnBg.fillRoundedRect(-(panelW - 60) / 2, -34, panelW - 60, 68, 12);
      btnBg.lineStyle(2, btnBorder, 1);
      btnBg.strokeRoundedRect(-(panelW - 60) / 2, -34, panelW - 60, 68, 12);

      const btnText = addCrispText(this, 0, 0, `⚡ レベルアップ購入 (${formatNumber(cost!)} SP)`, {
        fontSize: "22px",
        fontStyle: "bold",
        color: canUnlock ? "#ffffff" : "#64748b",
      }).setOrigin(0.5);

      btn.add([btnBg, btnText]);
      btn.setSize(panelW - 60, 68);

      if (canUnlock) {
        btn.setInteractive({ useHandCursor: true });
        btn.on("pointerover", () => btn.setScale(1.02));
        btn.on("pointerout", () => btn.setScale(1.0));
        btn.on("pointerdown", () => {
          if (this.gameState.buySkill(this.selectedSkillId)) {
            this.audio.playSynthSE("laser", 0.7);
            this.refreshTreeViews();
          }
        });
      }

      this.detailPanelContainer.add(btn);
    }
  }

  private refreshTreeViews(): void {
    this.refreshHeader();
    this.drawTreeConnectionLines();
    this.drawTreeNodes();
    this.renderDetailPanel();
  }

  // ==========================================
  // 武器ショップ描画 (縦並び3枚カード)
  // ==========================================
  private renderWeaponShop(): void {
    const { width } = this.scale;
    const weapons: WeaponId[] = ["handgun", "rifle", "sniper"];

    const cardWidth = 780;
    const cardHeight = 360;
    const startY = 30;
    const gap = 40;

    weapons.forEach((weaponId, index) => {
      const def = WEAPONS[weaponId];
      const isOwned = this.gameState.ownedWeapons.includes(weaponId);
      const isEquipped = this.gameState.equippedWeapon === weaponId;
      const price = this.gameState.getWeaponPrice(weaponId);
      const canAfford = this.gameState.sp >= price;
      const isDiscounted = this.gameState.getShopDiscount() > 0 && def.price > 0;

      const y = startY + index * (cardHeight + gap);

      const card = this.add.container(width / 2, y);
      const bg = this.add.graphics();

      const bgColor = isEquipped ? 0x0c4a6e : isOwned ? 0x1e293b : 0x0f172a;
      const borderColor = isEquipped ? 0x38bdf8 : isOwned ? 0x22c55e : 0x475569;

      bg.fillStyle(bgColor, 0.95);
      bg.fillRoundedRect(-cardWidth / 2, 0, cardWidth, cardHeight, 16);
      bg.lineStyle(2, borderColor, 1);
      bg.strokeRoundedRect(-cardWidth / 2, 0, cardWidth, cardHeight, 16);

      // 武器名
      addCrispText(card.scene, 0, 40, def.name, {
        fontSize: "30px",
        fontStyle: "bold",
        color: "#ffffff",
      }).setOrigin(0.5);

      // スペック
      const specs = `ダメージ: ${def.damage}   |   発射間隔: ${def.fireInterval.toFixed(2)}s (${(1 / def.fireInterval).toFixed(1)}発/秒)`;
      addCrispText(card.scene, 0, 95, specs, {
        fontSize: "20px",
        color: "#38bdf8",
      }).setOrigin(0.5);

      // 説明
      addCrispText(card.scene, 0, 160, def.description, {
        fontSize: "18px",
        color: "#94a3b8",
        align: "center",
        wordWrap: { width: cardWidth - 80 },
      }).setOrigin(0.5);

      // アクションボタン
      if (isEquipped) {
        addCrispText(card.scene, 0, cardHeight - 65, "✔ 現在装備中", {
          fontSize: "24px",
          fontStyle: "bold",
          color: "#38bdf8",
        }).setOrigin(0.5);
      } else if (isOwned) {
        const equipBtn = this.createCardActionButton(
          0,
          cardHeight - 65,
          "装備する",
          0x0284c7,
          () => {
            this.gameState.equipWeapon(weaponId);
            this.audio.playSynthSE("click");
            this.renderCurrentTab();
          },
          260,
          56,
        );
        card.add(equipBtn);
      } else {
        const discountText = isDiscounted
          ? ` (${formatPercent(this.gameState.getShopDiscount())} OFF)`
          : "";
        const priceLabel = `購入: ${formatNumber(price)} SP${discountText}`;

        const buyBtn = this.createCardActionButton(
          0,
          cardHeight - 65,
          priceLabel,
          canAfford ? 0x16a34a : 0x334155,
          () => {
            if (this.gameState.buyWeapon(weaponId)) {
              this.audio.playSynthSE("laser", 0.8);
              this.renderCurrentTab();
            }
          },
          340,
          56,
          !canAfford,
        );
        card.add(buyBtn);
      }

      card.add(bg);
      card.sendToBack(bg);
      this.contentContainer.add(card);
    });

    if (this.gameState.canToggleAutoFire()) {
      addCrispText(
        this,
        width / 2,
        startY + weapons.length * (cardHeight + gap) + 20,
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
    w = 260,
    h = 56,
    isDisabled = false,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);

    const label = addCrispText(this, 0, 0, text, {
      fontSize: "19px",
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
    const btnY = height - 50;

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
      520,
      60,
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
    width = 520,
    height = 60,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 14);
    bg.lineStyle(2, 0xffffff, 0.4);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 14);

    const label = addCrispText(this, 0, 0, text, {
      fontSize: "23px",
      fontStyle: "bold",
      color: "#ffffff",
    }).setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });

    container.on("pointerover", () => {
      bg.clear();
      bg.fillStyle(hoverColor, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 14);
      bg.lineStyle(3, 0xffffff, 0.9);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 14);
      container.setScale(1.02);
    });

    container.on("pointerout", () => {
      bg.clear();
      bg.fillStyle(color, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 14);
      bg.lineStyle(2, 0xffffff, 0.4);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 14);
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
