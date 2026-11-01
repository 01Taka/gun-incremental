import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import { EventBus } from "../EventBus";
import { GameState } from "../logic/GameState";
import { drawWesternBackdrop } from "./WesternDecor";

/**
 * 永続強化（酒場の鍛錬）画面シーン。
 * 実際のカード一覧・購入 UI は React (PermanentUpgradeOverlay) 側で描画する。
 * このシーンは西部劇背景描画とシーン遷移のライフサイクル連携を担当する。
 */
export class PermanentUpgradeScene extends Phaser.Scene {
  private gameState!: GameState;

  constructor() {
    super("PermanentUpgradeScene");
  }

  create() {
    EventBus.emit("current-scene-ready", this);
    this.gameState = GameState.getInstance();
    AudioManager.getInstance().playBGM("western_town");

    const { width, height } = this.scale;
    drawWesternBackdrop(this, width, height, {
      horizonY: 980,
      variant: "sunset",
      withBuildings: true,
      withAtmosphere: false,
    });

    const handleStartRun = () => {
      this.gameState.startNewRun();
      this.scene.start("RoundScene");
    };

    const handleBackToTitle = () => {
      this.scene.start("TitleScene");
    };

    EventBus.on("permanent-upgrade-start-run", handleStartRun);
    EventBus.on("permanent-upgrade-back-title", handleBackToTitle);
    EventBus.emit("permanent-upgrade-scene-active", true);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off("permanent-upgrade-start-run", handleStartRun);
      EventBus.off("permanent-upgrade-back-title", handleBackToTitle);
      EventBus.emit("permanent-upgrade-scene-active", false);
    });
  }
}
