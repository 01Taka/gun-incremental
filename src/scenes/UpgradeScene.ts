import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import { EventBus } from "../EventBus";
import { GameState } from "../logic/GameState";
import { drawWesternBackdrop } from "./WesternDecor";

/**
 * 強化画面シーン。
 * 実際のスキルツリー & 銃砲店 UI は React (UpgradeOverlay / SkillTreeView) 側で描画する。
 * このシーンは西部劇背景描画とシーン遷移のライフサイクル連携を担当する。
 */
export class UpgradeScene extends Phaser.Scene {
  private gameState!: GameState;

  constructor() {
    super("UpgradeScene");
  }

  create() {
    EventBus.emit("current-scene-ready", this);
    this.gameState = GameState.getInstance();
    AudioManager.getInstance().playBGM("western_town");

    const { width, height } = this.scale;
    drawWesternBackdrop(this, width, height, {
      horizonY: 980,
      variant: "dusk",
      withBuildings: true,
      withAtmosphere: false,
    });

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

  private proceedToNext(): void {
    this.gameState.prepareNextRound();
    this.scene.start("RoundScene");
  }
}
