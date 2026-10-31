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

    // 薄い方眼グリッド
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
    headerBg.fillStyle(0x0f172a, 0.95);
    headerBg.fillRect(0, 0, width, 75);
    headerBg.lineStyle(2, 0x1e293b, 1);
    headerBg.moveTo(0, 75);
    headerBg.lineTo(width, 75);
    headerBg.strokePath();

    addCrispText(this, 50, 22, "UPGRADE SYSTEM", {
      fontSize: "28px",
      fontStyle: "bold",
      color: "#38bdf8",
    });

    this.spDisplay = addCrispText(
      this,
      width / 2,
      22,
      `所持SP: ${formatNumber(this.gameState.sp)} SP`,
      {
        fontSize: "26px",
        fontStyle: "bold",
        color: "#facc15",
      },
    ).setOrigin(0.5, 0);

    const nextInvoice = this.gameState.getInvoiceAmount();
    const canAfford = this.gameState.sp >= nextInvoice;
    this.invoiceDisplay = addCrispText(
      this,
      width - 50,
      24,
      `次回請求: ${formatNumber(nextInvoice)} SP (${canAfford ? "支払可能" : "SP不足"})`,
      {
        fontSize: "19px",
        fontStyle: "bold",
        color: canAfford ? "#4ade80" : "#f87171",
      },
    ).setOrigin(1, 0);
  }

  private createTabs(width: number): void {
    const tabY = 115;
    const tabWidth = 240;
    const tabHeight = 42;

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
    h = 42,
    isDisabled = false,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    this.drawTabBg(bg, isActive, isDisabled, w, h);

    const label = addCrispText(this, 0, 0, text, {
      fontSize: "17px",
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
      42,
    );
    this.drawTabBg(
      this.weaponTabButton.getAt(0) as Phaser.GameObjects.Graphics,
      this.currentTab === "weapons",
      !isShopUnlocked,
      240,
      42,
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

  // ==========================================
  // 本格的スキルツリー構造の描画 (インクリメンタルDAGツリー)
  // ==========================================
  private renderSkillTree(): void {
    const { width } = this.scale;

    // 左〜中央: ツリービューポート (幅 1080px, 高さ 640px)
    const treeViewportWidth = 1100;
    const treeViewportHeight = 640;

    // ツリー枠線の装飾
    const treeBg = this.add.graphics();
    treeBg.fillStyle(0x0b1120, 0.6);
    treeBg.fillRoundedRect(40, 10, treeViewportWidth, treeViewportHeight, 16);
    treeBg.lineStyle(1.5, 0x1e293b, 0.8);
    treeBg.strokeRoundedRect(40, 10, treeViewportWidth, treeViewportHeight, 16);
    this.contentContainer.add(treeBg);

    // 接続線レイヤー
    this.treeLinesGraphics = this.add.graphics();
    this.contentContainer.add(this.treeLinesGraphics);

    // ノードレイヤー
    this.nodesContainer = this.add.container(0, 0);
    this.contentContainer.add(this.nodesContainer);

    // 右側: 詳細インスペクターパネル (幅 400px, x=1160)
    this.detailPanelContainer = this.add.container(width - 430, 10);
    this.contentContainer.add(this.detailPanelContainer);

    // ツリー接続線の描画
    this.drawTreeConnectionLines();

    // 各ノードの描画
    this.drawTreeNodes();

    // 右側詳細パネルの描画
    this.renderDetailPanel();
  }

  /**
   * 親子ノード間の有向接続線（コネクタ）を描画
   */
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

      // 線色の決定
      let lineColor = 0x1e293b;
      let lineAlpha = 0.5;
      let lineWidth = 2;

      if (isChildMax) {
        lineColor = 0xfacc15; // ゴールド (MAX)
        lineAlpha = 0.9;
        lineWidth = 4;
      } else if (childLevel > 0) {
        lineColor = 0x38bdf8; // 明るいシアン (習得中)
        lineAlpha = 0.9;
        lineWidth = 3.5;
      } else if (isConditionMet) {
        lineColor = 0x0284c7; // シアン (解放可能)
        lineAlpha = 0.75;
        lineWidth = 2.5;
      }

      this.treeLinesGraphics.lineStyle(lineWidth, lineColor, lineAlpha);

      // カクカクした回路風の折れ線コネクタ:
      // (parentX, parentY) -> (midX, parentY) -> (midX, childY) -> (childX, childY)
      const midX = (parentPos.x + childPos.x) / 2;

      this.treeLinesGraphics.beginPath();
      this.treeLinesGraphics.moveTo(parentPos.x, parentPos.y);
      this.treeLinesGraphics.lineTo(midX, parentPos.y);
      this.treeLinesGraphics.lineTo(midX, childPos.y);
      this.treeLinesGraphics.lineTo(childPos.x, childPos.y);
      this.treeLinesGraphics.strokePath();

      // 親から子への方向を示す小さな矢印/ドットマーカー
      const arrowSize = 5;
      this.treeLinesGraphics.fillStyle(lineColor, lineAlpha);
      this.treeLinesGraphics.fillTriangle(
        childPos.x - 42,
        childPos.y,
        childPos.x - 42 - arrowSize * 2,
        childPos.y - arrowSize,
        childPos.x - 42 - arrowSize * 2,
        childPos.y + arrowSize,
      );
    }
  }

  /**
   * ツリーの各ノードを描画
   */
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

      // 前提条件のチェック
      let isRequirementMet = true;
      if (def.requirement) {
        const reqLvl = this.gameState.skillLevels[def.requirement.nodeId] || 0;
        if (reqLvl < def.requirement.level) {
          isRequirementMet = false;
        }
      }

      const nodeX = def.treePos.x;
      const nodeY = def.treePos.y;
      const radius = 38;

      const nodeContainer = this.add.container(nodeX, nodeY);

      // 外周グロー / 選択ハイライト
      const glowGraphics = this.add.graphics();
      if (isSelected) {
        glowGraphics.lineStyle(3, 0xffffff, 0.9);
        glowGraphics.strokeCircle(0, 0, radius + 7);
      }
      if (canUnlock && !isMax) {
        glowGraphics.lineStyle(2, 0x38bdf8, 0.6);
        glowGraphics.strokeCircle(0, 0, radius + 4);
      }
      nodeContainer.add(glowGraphics);

      // ノード本体の円グラフィックス
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
      const icon = addCrispText(this, 0, -6, iconText, {
        fontSize: "26px",
      }).setOrigin(0.5);
      nodeContainer.add(icon);

      // レベルバッジ (ノード内下部)
      const levelLabel = isMax ? "MAX" : `${curLevel}/${def.maxLevel}`;
      const badgeColor = isMax ? "#facc15" : curLevel > 0 ? "#38bdf8" : "#94a3b8";
      const lvlText = addCrispText(this, 0, 20, levelLabel, {
        fontSize: "13px",
        fontStyle: "bold",
        color: badgeColor,
      }).setOrigin(0.5);
      nodeContainer.add(lvlText);

      // ノード上部: スキル名
      const titleColor = !isRequirementMet ? "#475569" : isMax ? "#fef08a" : "#f8fafc";
      const nameText = addCrispText(this, 0, -radius - 12, def.name, {
        fontSize: "14px",
        fontStyle: "bold",
        color: titleColor,
      }).setOrigin(0.5);
      nodeContainer.add(nameText);

      // ノード下部: コスト / ステータス
      if (!isMax && cost !== null) {
        const costColor = canUnlock ? "#38bdf8" : "#64748b";
        const costText = addCrispText(this, 0, radius + 12, `${formatNumber(cost)} SP`, {
          fontSize: "13px",
          fontStyle: "bold",
          color: costColor,
        }).setOrigin(0.5);
        nodeContainer.add(costText);
      } else if (isMax) {
        const completeText = addCrispText(this, 0, radius + 12, "★ 習得完了", {
          fontSize: "12px",
          fontStyle: "bold",
          color: "#facc15",
        }).setOrigin(0.5);
        nodeContainer.add(completeText);
      }

      // インタラクション
      nodeContainer.setSize(radius * 2, radius * 2);
      nodeContainer.setInteractive({ useHandCursor: true });

      nodeContainer.on("pointerover", () => {
        nodeContainer.setScale(1.08);
      });

      nodeContainer.on("pointerout", () => {
        nodeContainer.setScale(1.0);
      });

      nodeContainer.on("pointerdown", () => {
        this.selectedSkillId = skillId;
        this.audio.playSynthSE("click");

        // クリックで直接購入可能なら購入
        if (this.gameState.canUnlockSkill(skillId)) {
          if (this.gameState.buySkill(skillId)) {
            this.audio.playSynthSE("laser", 0.7);
          }
        }

        // ツリーと詳細パネルの再描画
        this.refreshTreeViews();
      });

      this.nodesContainer.add(nodeContainer);
    }
  }

  /**
   * 右側詳細インスペクターパネルの描画
   */
  private renderDetailPanel(): void {
    this.detailPanelContainer.removeAll(true);

    const panelW = 410;
    const panelH = 640;

    const def: SkillDefinition = SKILLS[this.selectedSkillId];
    const curLevel = this.gameState.skillLevels[this.selectedSkillId];
    const isMax = curLevel >= def.maxLevel;
    const cost = this.gameState.getSkillCost(this.selectedSkillId);
    const canUnlock = this.gameState.canUnlockSkill(this.selectedSkillId);

    // 前提条件
    let isRequirementMet = true;
    let reqText = "なし (初期解放)";
    if (def.requirement) {
      const parentDef = SKILLS[def.requirement.nodeId];
      const parentCur = this.gameState.skillLevels[def.requirement.nodeId] || 0;
      isRequirementMet = parentCur >= def.requirement.level;
      reqText = `${parentDef.name} Lv.${def.requirement.level} 以上 (現在: Lv.${parentCur})`;
    }

    // パネル枠
    const bg = this.add.graphics();
    bg.fillStyle(0x0f172a, 0.98);
    bg.fillRoundedRect(0, 0, panelW, panelH, 16);
    bg.lineStyle(2, isMax ? 0xfacc15 : 0x0284c7, 1);
    bg.strokeRoundedRect(0, 0, panelW, panelH, 16);
    this.detailPanelContainer.add(bg);

    // ヘッダー部
    const categoryBadge = def.category === "combat" ? "⚔️ 戦闘強化" : "📊 経済強化";
    const categoryColor = def.category === "combat" ? 0xef4444 : 0x10b981;

    const catBg = this.add.graphics();
    catBg.fillStyle(categoryColor, 0.2);
    catBg.lineStyle(1, categoryColor, 0.8);
    catBg.fillRoundedRect(24, 20, 110, 26, 6);
    catBg.strokeRoundedRect(24, 20, 110, 26, 6);
    this.detailPanelContainer.add(catBg);

    addCrispText(this, 79, 33, categoryBadge, {
      fontSize: "12px",
      fontStyle: "bold",
      color: "#ffffff",
    }).setOrigin(0.5);

    // スキル名とアイコン
    addCrispText(this, 24, 60, `${def.icon} ${def.name}`, {
      fontSize: "26px",
      fontStyle: "bold",
      color: "#f8fafc",
    });

    // レベル表示
    addCrispText(this, panelW - 24, 64, isMax ? "★ MAX" : `Lv.${curLevel} / ${def.maxLevel}`, {
      fontSize: "18px",
      fontStyle: "bold",
      color: isMax ? "#facc15" : "#38bdf8",
    }).setOrigin(1, 0);

    // レベルバー
    const barW = panelW - 48;
    const barH = 10;
    const barY = 105;

    const barBg = this.add.graphics();
    barBg.fillStyle(0x1e293b, 1);
    barBg.fillRoundedRect(24, barY, barW, barH, 5);

    const fillW = Math.max(0, barW * (curLevel / def.maxLevel));
    barBg.fillStyle(isMax ? 0xfacc15 : 0x0284c7, 1);
    barBg.fillRoundedRect(24, barY, fillW, barH, 5);
    this.detailPanelContainer.add(barBg);

    // 説明文
    addCrispText(this, 24, 130, def.description, {
      fontSize: "15px",
      color: "#94a3b8",
      wordWrap: { width: panelW - 48 },
    });

    // 区切り線
    const divider1 = this.add.graphics();
    divider1.lineStyle(1, 0x1e293b, 1);
    divider1.moveTo(24, 195);
    divider1.lineTo(panelW - 24, 195);
    divider1.strokePath();
    this.detailPanelContainer.add(divider1);

    // 効果量の詳細比較 (インクリメンタルゲームならではのBefore / After)
    const curVal = curLevel * def.effectPerLevel;
    const nextVal = (curLevel + 1) * def.effectPerLevel;
    const unit = def.effectUnit;

    const curDisplay = unit === "%" ? formatPercent(curVal, true) : `+${curVal} ${unit}`;
    const nextDisplay = unit === "%" ? formatPercent(nextVal, true) : `+${nextVal} ${unit}`;
    const diffDisplay =
      unit === "%"
        ? `(+${Math.round(def.effectPerLevel * 100)}%)`
        : `(+${def.effectPerLevel} ${unit})`;

    addCrispText(this, 24, 215, "効果の詳細", {
      fontSize: "17px",
      fontStyle: "bold",
      color: "#cbd5e1",
    });

    // 現在の効果
    addCrispText(this, 24, 250, "現在のボーナス:", {
      fontSize: "15px",
      color: "#94a3b8",
    });
    addCrispText(this, panelW - 24, 250, curLevel > 0 ? curDisplay : "効果なし (Lv.0)", {
      fontSize: "16px",
      fontStyle: "bold",
      color: curLevel > 0 ? "#38bdf8" : "#64748b",
    }).setOrigin(1, 0);

    // 次レベルの効果
    if (!isMax) {
      addCrispText(this, 24, 285, "次のレベル (UP):", {
        fontSize: "15px",
        color: "#94a3b8",
      });
      addCrispText(this, panelW - 24, 285, `${nextDisplay}  ${diffDisplay}`, {
        fontSize: "16px",
        fontStyle: "bold",
        color: "#4ade80",
      }).setOrigin(1, 0);
    }

    // 区切り線2
    const divider2 = this.add.graphics();
    divider2.lineStyle(1, 0x1e293b, 1);
    divider2.moveTo(24, 335);
    divider2.lineTo(panelW - 24, 335);
    divider2.strokePath();
    this.detailPanelContainer.add(divider2);

    // 前提条件
    addCrispText(this, 24, 355, "ツリー解放条件", {
      fontSize: "17px",
      fontStyle: "bold",
      color: "#cbd5e1",
    });

    addCrispText(this, 24, 385, reqText, {
      fontSize: "15px",
      fontStyle: isRequirementMet ? "normal" : "bold",
      color: isRequirementMet ? "#38bdf8" : "#ef4444",
      wordWrap: { width: panelW - 48 },
    });

    // 下部購入アクションボタン
    const buttonY = panelH - 90;

    if (isMax) {
      const maxBanner = this.add.graphics();
      maxBanner.fillStyle(0x361e05, 1);
      maxBanner.lineStyle(2, 0xfacc15, 1);
      maxBanner.fillRoundedRect(24, buttonY, panelW - 48, 60, 10);
      maxBanner.strokeRoundedRect(24, buttonY, panelW - 48, 60, 10);
      this.detailPanelContainer.add(maxBanner);

      addCrispText(this, panelW / 2, buttonY + 30, "★ 最大レベル習得済み", {
        fontSize: "20px",
        fontStyle: "bold",
        color: "#facc15",
      }).setOrigin(0.5);
    } else if (!isRequirementMet) {
      const lockBanner = this.add.graphics();
      lockBanner.fillStyle(0x180505, 1);
      lockBanner.lineStyle(1.5, 0xef4444, 0.6);
      lockBanner.fillRoundedRect(24, buttonY, panelW - 48, 60, 10);
      lockBanner.strokeRoundedRect(24, buttonY, panelW - 48, 60, 10);
      this.detailPanelContainer.add(lockBanner);

      addCrispText(this, panelW / 2, buttonY + 30, "🔒 前提スキルが未達です", {
        fontSize: "18px",
        fontStyle: "bold",
        color: "#ef4444",
      }).setOrigin(0.5);
    } else {
      // レベルアップ購入ボタン
      const btn = this.add.container(panelW / 2, buttonY + 30);
      const btnBg = this.add.graphics();
      const btnColor = canUnlock ? 0x0284c7 : 0x1e293b;
      const btnBorder = canUnlock ? 0x38bdf8 : 0x334155;

      btnBg.fillStyle(btnColor, 1);
      btnBg.fillRoundedRect(-(panelW - 48) / 2, -30, panelW - 48, 60, 10);
      btnBg.lineStyle(2, btnBorder, 1);
      btnBg.strokeRoundedRect(-(panelW - 48) / 2, -30, panelW - 48, 60, 10);

      const btnText = addCrispText(this, 0, 0, `⚡ レベルアップ (${formatNumber(cost!)} SP)`, {
        fontSize: "20px",
        fontStyle: "bold",
        color: canUnlock ? "#ffffff" : "#64748b",
      }).setOrigin(0.5);

      btn.add([btnBg, btnText]);
      btn.setSize(panelW - 48, 60);

      if (canUnlock) {
        btn.setInteractive({ useHandCursor: true });
        btn.on("pointerover", () => btn.setScale(1.03));
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
  // 武器ショップ描画
  // ==========================================
  private renderWeaponShop(): void {
    const { width } = this.scale;
    const weapons: WeaponId[] = ["handgun", "rifle", "sniper"];

    const cardWidth = 400;
    const cardHeight = 340;
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
      addCrispText(card.scene, cardWidth / 2, 32, def.name, {
        fontSize: "26px",
        fontStyle: "bold",
        color: "#ffffff",
      }).setOrigin(0.5);

      // スペック
      const specs = [
        `ダメージ: ${def.damage}`,
        `発射間隔: ${def.fireInterval.toFixed(2)}s (${(1 / def.fireInterval).toFixed(1)}発/秒)`,
      ];

      addCrispText(card.scene, cardWidth / 2, 90, specs.join("\n"), {
        fontSize: "18px",
        color: "#38bdf8",
        align: "center",
      }).setOrigin(0.5);

      // 説明
      addCrispText(card.scene, cardWidth / 2, 160, def.description, {
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

    if (this.gameState.canToggleAutoFire()) {
      addCrispText(
        this,
        width / 2,
        cardHeight + 80,
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
    const btnY = height - 60;

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
      50,
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
    height = 50,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
    bg.lineStyle(2, 0xffffff, 0.4);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);

    const label = addCrispText(this, 0, 0, text, {
      fontSize: "21px",
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
