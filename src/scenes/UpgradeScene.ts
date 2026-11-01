import Phaser from "phaser";

import { EventBus } from "../EventBus";
import { GameState } from "../logic/GameState";

/**
 * 強化画面シーン。
 * 実際のスキルツリー & 武器ショップ UI は React (UpgradeOverlay / SkillTreeView) 側で描画する。
 * このシーンは背景描画とシーン遷移のライフサイクル連携を担当する。
 */
export class UpgradeScene extends Phaser.Scene {
  private gameState!: GameState;

  constructor() {
    super("UpgradeScene");
  }

  create() {
    EventBus.emit("current-scene-ready", this);
    this.gameState = GameState.getInstance();

    const { width, height } = this.scale;
    this.createBackground(width, height);

    const handleProceed = () => {
      this.proceedToNext();
    };

    EventBus.on("upgrade-proceed", handleProceed);
    EventBus.emit("upgrade-scene-active", true);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off("upgrade-proceed", handleProceed);
      EventBus.emit("upgrade-scene-active", false);
    });
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

  private proceedToNext(): void {
    if (this.gameState.isInvoiceDue()) {
      this.scene.start("InvoiceScene");
    } else {
      this.gameState.prepareNextRound();
      this.scene.start("RoundScene");
    }
  }
}
