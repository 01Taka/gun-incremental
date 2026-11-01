import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import { EventBus } from "../EventBus";
import { GameState } from "../logic/GameState";
import { drawWesternBackdrop } from "./WesternDecor";

/**
 * リザルト画面シーン。
 * UI（賞金サマリー、ターゲット解禁プログレス、次回上納金案内、ボタン、モーダル等）はすべて React (ResultOverlay) 側で描画する。
 * このシーンは西部劇背景描画とシーン遷移のライフサイクル連携を担当する。
 */
export class ResultScene extends Phaser.Scene {
  private gameState!: GameState;
  private audio!: AudioManager;

  constructor() {
    super("ResultScene");
  }

  create() {
    EventBus.emit("current-scene-ready", this);
    this.gameState = GameState.getInstance();
    this.audio = AudioManager.getInstance();

    this.audio.playBGM("western_town");

    const { width, height } = this.scale;

    drawWesternBackdrop(this, width, height, {
      horizonY: 980,
      variant: "dusk",
      withBuildings: true,
      withAtmosphere: true,
    });

    const handleToUpgrade = () => {
      this.scene.start("UpgradeScene");
    };

    const handleNextDuel = () => {
      this.proceedToNext();
    };

    EventBus.on("result-to-upgrade", handleToUpgrade);
    EventBus.on("result-next-duel", handleNextDuel);
    EventBus.emit("result-scene-active", true);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off("result-to-upgrade", handleToUpgrade);
      EventBus.off("result-next-duel", handleNextDuel);
      EventBus.emit("result-scene-active", false);
    });
  }

  private proceedToNext(): void {
    this.gameState.prepareNextRound();
    this.scene.start("RoundScene");
  }
}
