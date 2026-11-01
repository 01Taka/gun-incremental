import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import { EventBus } from "../EventBus";
import { GameState } from "../logic/GameState";
import { drawWesternBackdrop } from "./WesternDecor";

/**
 * ゲームクリア（全制覇）画面シーン。
 * UI（最終戦績カード、永続ポイント、各種ボタン等）はすべて React (ClearOverlay) 側で描画する。
 * このシーンは西部劇背景描画とシーン遷移のライフサイクル連携を担当する。
 */
export class ClearScene extends Phaser.Scene {
  private gameState!: GameState;
  private audio!: AudioManager;

  constructor() {
    super("ClearScene");
  }

  create() {
    EventBus.emit("current-scene-ready", this);
    this.gameState = GameState.getInstance();
    this.audio = AudioManager.getInstance();

    this.audio.playBGM("western_town");

    const { width, height } = this.scale;

    drawWesternBackdrop(this, width, height, {
      horizonY: 980,
      variant: "gold",
      withBuildings: true,
      withAtmosphere: true,
    });

    const handleBackTitle = () => {
      this.scene.start("TitleScene");
    };

    const handleOpenPermanent = () => {
      this.scene.start("PermanentUpgradeScene");
    };

    EventBus.on("clear-back-title", handleBackTitle);
    EventBus.on("clear-open-saloon", handleOpenPermanent);
    EventBus.emit("clear-scene-active", true);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off("clear-back-title", handleBackTitle);
      EventBus.off("clear-open-saloon", handleOpenPermanent);
      EventBus.emit("clear-scene-active", false);
    });
  }
}
