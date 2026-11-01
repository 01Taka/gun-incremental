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

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x2b1107, 0x2b1107, 0x160a04, 0x160a04, 1);
    bg.fillRect(0, 0, width, height);

    const loadingText = addCrispText(this, width / 2, height / 2 - 84, "WANTED: HIGH NOON", {
      fontSize: "42px",
      fontFamily: "display",
      fontStyle: "bold",
      color: "#fef3c7",
      stroke: "#451a03",
      strokeThickness: 4,
    }).setOrigin(0.5);

    const percentText = addCrispText(
      this,
      width / 2,
      height / 2 + 72,
      "銃身に油を差しています...",
      {
        fontSize: "22px",
        color: "#d6b384",
      },
    ).setOrigin(0.5);

    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x2a1509, 0.95);
    progressBox.fillRoundedRect(width / 2 - 250, height / 2 - 16, 500, 32, 8);
    progressBox.lineStyle(2, 0x92400e, 1);
    progressBox.strokeRoundedRect(width / 2 - 250, height / 2 - 16, 500, 32, 8);

    const progressBar = this.add.graphics();
    progressBar.fillStyle(0xd97706, 1);
    progressBar.fillRoundedRect(width / 2 - 244, height / 2 - 10, 488, 20, 5);

    this.createGameTextures();

    // Webフォント読み込み完了（最大280ms待機）後にTitleSceneへ
    const fontReady =
      typeof document !== "undefined" && document.fonts ? document.fonts.ready : Promise.resolve();
    const minWait = new Promise<void>((resolve) => {
      this.time.delayedCall(220, () => resolve());
    });
    const maxTimeout = new Promise<void>((resolve) => {
      this.time.delayedCall(320, () => resolve());
    });

    Promise.race([Promise.all([fontReady, minWait]), maxTimeout]).then(() => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
      bg.destroy();
      this.scene.start("TitleScene");
    });
  }

  private createGameTextures(): void {
    // 1. 各種賞金首・標的のテクスチャ（木製・鉄板・金貨・火薬樽・懐中時計など西部劇風デザイン）
    for (const [key, target] of Object.entries(TARGETS)) {
      const size = target.radius * 2 + 12;
      const cx = size / 2;
      const cy = size / 2;
      const r = target.radius;
      const g = this.make.graphics({ x: 0, y: 0 });

      // 砂塵の影・外周リング
      g.fillStyle(0x140803, 0.45);
      g.fillCircle(cx + 2, cy + 3, r + 2);

      // 外枠ベース
      g.fillStyle(target.border, 1.0);
      g.fillCircle(cx, cy, r + 2);

      // メインカラー円
      g.fillStyle(target.color, 1.0);
      g.fillCircle(cx, cy, r - 2);

      // 古びた羊皮紙クリーム色の内帯
      g.fillStyle(0xecd9b5, 0.92);
      g.fillCircle(cx, cy, r * 0.72);

      // 内円
      g.fillStyle(target.color, 1.0);
      g.fillCircle(cx, cy, r * 0.46);

      // ブルズアイ（赤茶・真鍮コア）
      g.fillStyle(key === "gold" ? 0xfef08a : 0x7f1d1d, 1.0);
      g.fillCircle(cx, cy, r * 0.22);

      // 種別ごとの西部劇モチーフ装飾
      if (key === "hard") {
        // 鉄板リベット鋲を8方向に配置
        for (let i = 0; i < 8; i++) {
          const ang = (Math.PI * 2 * i) / 8;
          const rx = cx + Math.cos(ang) * (r * 0.84);
          const ry = cy + Math.sin(ang) * (r * 0.84);
          g.fillStyle(0x292018, 1);
          g.fillCircle(rx, ry, 3.5);
          g.fillStyle(0xd6c7b2, 0.8);
          g.fillCircle(rx - 0.7, ry - 0.7, 1.3);
        }
      } else if (key === "electric") {
        // 火薬樽（TNT/DYNAMITE）の黒タガ線と導火線火花マーク
        g.lineStyle(3, 0x290d08, 0.85);
        g.strokeCircle(cx, cy, r * 0.62);
        g.fillStyle(0xfbbf24, 1);
        g.fillCircle(cx, cy, r * 0.16);
      } else if (key === "time") {
        // 懐中時計の文字盤目盛りと長針・短針
        g.lineStyle(2.5, 0x3b1d06, 0.95);
        g.beginPath();
        g.moveTo(cx, cy);
        g.lineTo(cx, cy - r * 0.56);
        g.moveTo(cx, cy);
        g.lineTo(cx + r * 0.38, cy + r * 0.14);
        g.strokePath();
        for (let i = 0; i < 12; i++) {
          const ang = (Math.PI * 2 * i) / 12;
          g.lineStyle(2, 0x451a03, 0.85);
          g.lineBetween(
            cx + Math.cos(ang) * (r * 0.76),
            cy + Math.sin(ang) * (r * 0.76),
            cx + Math.cos(ang) * (r * 0.9),
            cy + Math.sin(ang) * (r * 0.9),
          );
        }
      } else {
        // アイアンサイトの十字線
        g.lineStyle(1.8, target.border, 0.75);
        g.beginPath();
        g.moveTo(cx, 6);
        g.lineTo(cx, size - 6);
        g.moveTo(6, cy);
        g.lineTo(size - 6, cy);
        g.strokePath();
      }

      g.generateTexture(`target_${key}`, size, size);
      g.destroy();
    }

    // 2. 西部劇アイアンサイト照準 (Reticle)
    const reticleSize = 64;
    const rg = this.make.graphics({ x: 0, y: 0 });
    rg.lineStyle(2, 0xd97706, 0.9);
    rg.strokeCircle(reticleSize / 2, reticleSize / 2, 20);
    rg.lineStyle(2, 0xfef3c7, 0.95);
    rg.beginPath();
    rg.moveTo(reticleSize / 2, 6);
    rg.lineTo(reticleSize / 2, 18);
    rg.moveTo(reticleSize / 2, reticleSize - 18);
    rg.moveTo(6, reticleSize / 2);
    rg.lineTo(18, reticleSize / 2);
    rg.moveTo(reticleSize - 18, reticleSize / 2);
    rg.lineTo(reticleSize - 6, reticleSize / 2);
    rg.strokePath();
    rg.fillStyle(0xdc2626, 0.95);
    rg.fillCircle(reticleSize / 2, reticleSize / 2, 2.5);
    rg.generateTexture("reticle", reticleSize, reticleSize);
    rg.destroy();

    // 3. 火花パーティクル (真鍮・火薬スパーク)
    const pg = this.make.graphics({ x: 0, y: 0 });
    pg.fillStyle(0xfbbf24, 0.55);
    pg.fillCircle(8, 8, 8);
    pg.fillStyle(0xfffbeb, 1);
    pg.fillCircle(8, 8, 4.5);
    pg.generateTexture("spark", 16, 16);
    pg.destroy();

    // 4. リボルバー発砲時の派手な白煙テクスチャ (smoke_puff)
    const sg = this.make.graphics({ x: 0, y: 0 });
    sg.fillStyle(0xe7e5e4, 0.35);
    sg.fillCircle(24, 24, 22);
    sg.fillStyle(0xf5f5f4, 0.65);
    sg.fillCircle(21, 22, 15);
    sg.fillStyle(0xffffff, 0.9);
    sg.fillCircle(19, 20, 9);
    sg.generateTexture("smoke_puff", 48, 48);
    sg.destroy();

    // 5. 土煙・砂ぼこりテクスチャ (dust_puff)
    const dg = this.make.graphics({ x: 0, y: 0 });
    dg.fillStyle(0xc2955d, 0.38);
    dg.fillCircle(20, 20, 18);
    dg.fillStyle(0xd6b384, 0.7);
    dg.fillCircle(18, 18, 11);
    dg.generateTexture("dust_puff", 40, 40);
    dg.destroy();

    // 6. 風に転がるタンブルウィード（回転枯れ草）テクスチャ
    const tg = this.make.graphics({ x: 0, y: 0 });
    tg.lineStyle(2, 0x85582c, 0.9);
    tg.strokeCircle(28, 28, 22);
    tg.lineStyle(1.6, 0xa16e3a, 0.85);
    tg.strokeEllipse(28, 28, 42, 26);
    tg.strokeEllipse(28, 28, 26, 42);
    tg.lineStyle(1.4, 0x6b4420, 0.8);
    tg.lineBetween(10, 14, 46, 42);
    tg.lineBetween(14, 44, 44, 12);
    tg.lineBetween(8, 28, 48, 26);
    tg.lineBetween(28, 8, 26, 48);
    tg.generateTexture("tumbleweed", 56, 56);
    tg.destroy();

    // 7. 鉛の着弾痕 (Bullet Hole)
    const hg = this.make.graphics({ x: 0, y: 0 });
    hg.fillStyle(0x2b1508, 0.75);
    hg.fillCircle(12, 12, 10);
    hg.fillStyle(0x0c0603, 0.95);
    hg.fillCircle(12, 12, 5.5);
    hg.generateTexture("bullet_hole", 24, 24);
    hg.destroy();

    // 8. 大口径鉛弾・真鍮カートリッジ弾丸 (Bullet)
    const bg = this.make.graphics({ x: 0, y: 0 });
    // 火薬の熱い残光トレイル
    bg.fillStyle(0xea580c, 0.45);
    bg.fillRoundedRect(0, 1, 28, 10, 5);
    // 真鍮ジャケット
    bg.fillStyle(0xd97706, 0.95);
    bg.fillRoundedRect(4, 2, 18, 8, 3);
    // 鉛・高温弾頭
    bg.fillStyle(0xfef3c7, 1.0);
    bg.fillRoundedRect(14, 3, 12, 6, 3);
    bg.generateTexture("bullet", 30, 12);
    bg.destroy();
  }

  create() {
    EventBus.emit("current-scene-ready", this);
  }
}
