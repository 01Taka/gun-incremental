import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import { EventBus } from "../EventBus";
import { GameState } from "../logic/GameState";
import { drawWesternBackdrop } from "./WesternDecor";

/**
 * ゲームオーバー画面シーン。
 * UI（戦績カード、永続ポイントカード、各種ボタン等）はすべて React (GameOverOverlay) 側で描画する。
 * このシーンは西部劇背景描画とシーン遷移のライフサイクル連携を担当する。
 */
export class GameOverScene extends Phaser.Scene {
  private gameState!: GameState;
  private audio!: AudioManager;

  constructor() {
    super("GameOverScene");
  }

  create() {
    EventBus.emit("current-scene-ready", this);
    this.gameState = GameState.getInstance();
    this.audio = AudioManager.getInstance();

    const { width, height } = this.scale;

    drawWesternBackdrop(this, width, height, {
      horizonY: 980,
      variant: "crimson",
      withBuildings: true,
      withAtmosphere: true,
    });

    const handleBackTitle = () => {
      this.scene.start("TitleScene");
    };

    const handleOpenPermanent = () => {
      this.scene.start("PermanentUpgradeScene");
    };

    EventBus.on("game-over-back-title", handleBackTitle);
    EventBus.on("game-over-open-saloon", handleOpenPermanent);
    EventBus.emit("game-over-scene-active", true);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off("game-over-back-title", handleBackTitle);
      EventBus.off("game-over-open-saloon", handleOpenPermanent);
      EventBus.emit("game-over-scene-active", false);
    });
  }
}
