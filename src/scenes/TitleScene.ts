import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import { VOCAB } from "../config/vocab";
import { EventBus } from "../EventBus";
import { GameState } from "../logic/GameState";
import { drawWesternBackdrop, showCinemaTitleCard } from "./WesternDecor";

/**
 * タイトル画面シーン。
 * UI（WANTEDポスター、各種ボタン、戦歴パネル等）はすべて React (TitleOverlay) 側で描画する。
 * このシーンは西部劇背景描画とシーン遷移のライフサイクル連携を担当する。
 */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  create() {
    EventBus.emit("current-scene-ready", this);
    const { width, height } = this.scale;
    const gameState = GameState.getInstance();
    const audio = AudioManager.getInstance();

    // エンニオ・モリコーネ風の口笛・ギター・ハーモニカBGMを開始
    audio.playBGM("western_town");

    // 1. 夕焼けの荒野・岩山・サボテン・酒場・駅舎・タンブルウィード背景
    drawWesternBackdrop(this, width, height, {
      horizonY: 960,
      variant: "sunset",
      withBuildings: true,
      withAtmosphere: true,
    });

    // 2. 映画タイトルカード風の開幕レターボックス演出（非ブロッキング・自動フェード）
    showCinemaTitleCard(this, {
      actLabel: "A FISTFUL OF BOUNTY",
      title: "HIGH NOON",
      quote: VOCAB.titleScreen.introQuote,
      y: 1210,
      holdMs: 1100,
      fadeMs: 550,
      letterbox: true,
    });

    // React 側の TitleOverlay からのイベントを処理
    const handleStartGame = () => {
      gameState.startNewRun();
      this.scene.start("RoundScene");
    };

    const handleOpenPermanent = () => {
      this.scene.start("PermanentUpgradeScene");
    };

    EventBus.on("title-start-game", handleStartGame);
    EventBus.on("title-open-permanent", handleOpenPermanent);
    EventBus.emit("title-scene-active", true);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off("title-start-game", handleStartGame);
      EventBus.off("title-open-permanent", handleOpenPermanent);
      EventBus.emit("title-scene-active", false);
    });
  }
}
