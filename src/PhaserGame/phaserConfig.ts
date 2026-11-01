import Phaser from "phaser";

import {
  ClearScene,
  GameOverScene,
  InvoiceScene,
  PermanentUpgradeScene,
  PreloadScene,
  ResultScene,
  RoundScene,
  TitleScene,
  UpgradeScene,
} from "../scenes";

/**
 * Phaserゲームの基本設定（高解像度 縦画面 900x1600 / 9:16 比率でRetina・スマホ全画面にクッキリ描画）
 */
export function createPhaserGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: 900,
    height: 1600,
    backgroundColor: "#1c0f08", // Scorched Western Umber
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      antialias: true,
      antialiasGL: true,
      roundPixels: true,
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [
      PreloadScene,
      TitleScene,
      RoundScene,
      ResultScene,
      UpgradeScene,
      InvoiceScene,
      GameOverScene,
      PermanentUpgradeScene,
      ClearScene,
    ],
  };
}
