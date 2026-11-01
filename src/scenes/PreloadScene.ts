import Phaser from "phaser";

import { TARGETS } from "../config/gameData";
import { EventBus } from "../EventBus";
import { addCrispText } from "../utils/text";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload() {
    const { width, height } = this.scale;

    const loadingText = addCrispText(this, width / 2, height / 2 - 80, "TARGET SHOOTER", {
      fontSize: "44px",
      fontFamily: "monospace",
      color: "#ffffff",
    }).setOrigin(0.5);

    const percentText = addCrispText(this, width / 2, height / 2 + 70, "Loading...", {
      fontSize: "26px",
      fontFamily: "monospace",
      color: "#94a3b8",
    }).setOrigin(0.5);

    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x1e293b, 0.9);
    progressBox.fillRoundedRect(width / 2 - 250, height / 2 - 16, 500, 32, 10);

    const progressBar = this.add.graphics();
    progressBar.fillStyle(0x38bdf8, 1);
    progressBar.fillRoundedRect(width / 2 - 246, height / 2 - 12, 492, 24, 8);

    this.createGameTextures();

    // わずかなディレイ後にTitleSceneへ
    this.time.delayedCall(200, () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
      this.scene.start("TitleScene");
    });
  }

  private createGameTextures(): void {
    // 1. 各種的のベーステクスチャ (同心円のターゲット模様)
    for (const [key, target] of Object.entries(TARGETS)) {
      const size = target.radius * 2 + 8;
      const g = this.make.graphics({ x: 0, y: 0 });

      // 外枠の光彩
      g.fillStyle(target.border, 0.3);
      g.fillCircle(size / 2, size / 2, target.radius + 3);

      // 外円
      g.fillStyle(target.color, 1.0);
      g.fillCircle(size / 2, size / 2, target.radius);

      // 白帯
      g.fillStyle(0xffffff, 0.85);
      g.fillCircle(size / 2, size / 2, target.radius * 0.72);

      // 内円
      g.fillStyle(target.color, 1.0);
      g.fillCircle(size / 2, size / 2, target.radius * 0.44);

      // センタードット (ブルズアイ)
      g.fillStyle(0xffffff, 1.0);
      g.fillCircle(size / 2, size / 2, target.radius * 0.2);

      // 十字線
      g.lineStyle(2, target.border, 0.8);
      g.beginPath();
      g.moveTo(size / 2, 4);
      g.lineTo(size / 2, size - 4);
      g.moveTo(4, size / 2);
      g.lineTo(size - 4, size / 2);
      g.strokePath();

      g.generateTexture(`target_${key}`, size, size);
      g.destroy();
    }

    // 2. 照準 (Crosshair / Reticle)
    const reticleSize = 64;
    const rg = this.make.graphics({ x: 0, y: 0 });
    rg.lineStyle(2, 0x38bdf8, 0.9);
    rg.strokeCircle(reticleSize / 2, reticleSize / 2, 20);

    // 十字
    rg.lineStyle(2, 0x38bdf8, 1);
    rg.beginPath();
    rg.moveTo(reticleSize / 2, 6);
    rg.lineTo(reticleSize / 2, 18);
    rg.moveTo(reticleSize / 2, reticleSize - 18);
    rg.lineTo(reticleSize / 2, reticleSize - 6);
    rg.moveTo(6, reticleSize / 2);
    rg.lineTo(18, reticleSize / 2);
    rg.moveTo(reticleSize - 18, reticleSize / 2);
    rg.lineTo(reticleSize - 6, reticleSize / 2);
    rg.strokePath();

    // センターポイント
    rg.fillStyle(0xef4444, 0.9);
    rg.fillCircle(reticleSize / 2, reticleSize / 2, 2.5);

    rg.generateTexture("reticle", reticleSize, reticleSize);
    rg.destroy();

    // 3. パーティクル (スパーク・光の破片)
    const pg = this.make.graphics({ x: 0, y: 0 });
    pg.fillStyle(0xffffff, 1);
    pg.fillCircle(8, 8, 8);
    pg.generateTexture("spark", 16, 16);
    pg.destroy();

    // 4. 着弾痕 (Bullet Hole)
    const hg = this.make.graphics({ x: 0, y: 0 });
    hg.fillStyle(0x0f172a, 0.7);
    hg.fillCircle(12, 12, 10);
    hg.fillStyle(0x000000, 0.9);
    hg.fillCircle(12, 12, 5);
    hg.generateTexture("bullet_hole", 24, 24);
    hg.destroy();

    // 5. 弾丸 (Bullet / Projectile)
    const bg = this.make.graphics({ x: 0, y: 0 });
    // 外側の光彩
    bg.fillStyle(0x38bdf8, 0.4);
    bg.fillRoundedRect(0, 0, 26, 10, 5);
    // メインのエネルギー体
    bg.fillStyle(0x0284c7, 0.9);
    bg.fillRoundedRect(2, 2, 22, 6, 3);
    // 白い高温コア
    bg.fillStyle(0xffffff, 1.0);
    bg.fillRoundedRect(6, 3, 14, 4, 2);
    bg.generateTexture("bullet", 26, 10);
    bg.destroy();
  }

  create() {
    EventBus.emit("current-scene-ready", this);
  }
}
