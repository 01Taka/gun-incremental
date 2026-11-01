import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import { EventBus } from "../EventBus";
import { GameState } from "../logic/GameState";
import { drawWesternBackdrop } from "./WesternDecor";

/**
 * 上納金（インボイス）およびパッシブ選択画面シーン。
 * UI（初回説明モーダル、請求書支払い、パッシブ3択切り札選択等）はすべて React (InvoiceOverlay) 側で描画する。
 * このシーンは西部劇背景描画とシーン遷移のライフサイクル連携を担当する。
 */
export class InvoiceScene extends Phaser.Scene {
  private gameState!: GameState;
  private audio!: AudioManager;

  constructor() {
    super("InvoiceScene");
  }

  create() {
    EventBus.emit("current-scene-ready", this);
    this.gameState = GameState.getInstance();
    this.audio = AudioManager.getInstance();

    this.audio.playBGM("western_town");

    const { width, height } = this.scale;

    drawWesternBackdrop(this, width, height, {
      horizonY: 980,
      variant: "crimson",
      withBuildings: true,
      withAtmosphere: true,
    });

    const handleIntroConfirm = () => {
      this.scene.start("ResultScene");
    };

    const handlePassiveChosen = () => {
      this.scene.start("ResultScene");
    };

    const handleGameOver = () => {
      this.scene.start("GameOverScene");
    };

    EventBus.on("invoice-intro-confirm", handleIntroConfirm);
    EventBus.on("invoice-passive-chosen", handlePassiveChosen);
    EventBus.on("invoice-game-over", handleGameOver);
    EventBus.emit("invoice-scene-active", true);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off("invoice-intro-confirm", handleIntroConfirm);
      EventBus.off("invoice-passive-chosen", handlePassiveChosen);
      EventBus.off("invoice-game-over", handleGameOver);
      EventBus.emit("invoice-scene-active", false);
    });
  }
}
