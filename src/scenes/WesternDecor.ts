import Phaser from "phaser";

import { AudioManager } from "../audio/AudioManager";
import { INVOICE_CONFIG } from "../config/gameData";
import { VOCAB } from "../config/vocab";
import { addCrispText } from "../utils/text";

export function getWesternQuote(indexOrSeed: number): string {
  const quotes = VOCAB.quotes;
  const idx = Math.abs(Math.floor(indexOrSeed)) % quotes.length;
  return quotes[idx];
}

export function getStageSubtitle(round: number): string {
  if (round % INVOICE_CONFIG.intervalRounds === 0) {
    return VOCAB.sheriffStageSubtitle;
  }
  const subtitles = VOCAB.stageSubtitles;
  const idx = Math.abs(round - 1) % subtitles.length;
  return subtitles[idx];
}

export interface BackdropOptions {
  horizonY?: number;
  variant?: "sunset" | "dusk" | "crimson" | "gold";
  withBuildings?: boolean;
  withAtmosphere?: boolean;
}

/**
 * 西部劇の夕焼け荒野・岩山・サボテン・朽ちた酒場と駅舎の背景を描画
 */
export function drawWesternBackdrop(
  scene: Phaser.Scene,
  width: number,
  height: number,
  options: BackdropOptions = {},
): Phaser.GameObjects.Container {
  const horizonY = options.horizonY ?? Math.round(height * 0.62);
  const variant = options.variant ?? "sunset";
  const withBuildings = options.withBuildings ?? true;
  const withAtmosphere = options.withAtmosphere ?? true;

  const root = scene.add.container(0, 0).setDepth(0);
  const g = scene.add.graphics();
  root.add(g);

  // 1. 夕焼け空のグラデーション（青・緑を排し、赤茶・夕焼けオレンジ・砂色で構成）
  let skyTop = 0x2d1108;
  let skyMid = 0x8a2c0f;
  let skyLow = 0xd97706;
  if (variant === "crimson") {
    skyTop = 0x220806;
    skyMid = 0x6b140e;
    skyLow = 0xb45309;
  } else if (variant === "dusk") {
    skyTop = 0x1e0e07;
    skyMid = 0x5c220e;
    skyLow = 0xa14d14;
  } else if (variant === "gold") {
    skyTop = 0x3b180a;
    skyMid = 0x9a3412;
    skyLow = 0xeab308;
  }

  const upperH = Math.round(horizonY * 0.55);
  g.fillGradientStyle(skyTop, skyTop, skyMid, skyMid, 1);
  g.fillRect(0, 0, width, upperH);

  g.fillGradientStyle(skyMid, skyMid, skyLow, skyLow, 1);
  g.fillRect(0, upperH, width, horizonY - upperH);

  // 2. 地平線に沈む巨大な夕陽
  const sunX = width * 0.5;
  const sunY = horizonY - 36;
  g.fillStyle(0xfbbf24, 0.16);
  g.fillCircle(sunX, sunY, 175);
  g.fillStyle(0xf59e0b, 0.28);
  g.fillCircle(sunX, sunY, 115);
  g.fillStyle(0xfde68a, 0.65);
  g.fillCircle(sunX, sunY, 68);

  // 3. 遠景の岩山（モニュメントバレー風のメサ・ビュート）
  g.fillStyle(0x5c2210, 0.85);
  g.beginPath();
  g.moveTo(0, horizonY);
  g.lineTo(0, horizonY - 75);
  g.lineTo(65, horizonY - 82);
  g.lineTo(95, horizonY - 138);
  g.lineTo(195, horizonY - 138);
  g.lineTo(225, horizonY - 72);
  g.lineTo(310, horizonY - 58);
  g.lineTo(355, horizonY - 40);
  g.lineTo(545, horizonY - 40);
  g.lineTo(590, horizonY - 118);
  g.lineTo(680, horizonY - 118);
  g.lineTo(715, horizonY - 68);
  g.lineTo(790, horizonY - 96);
  g.lineTo(860, horizonY - 96);
  g.lineTo(900, horizonY - 54);
  g.lineTo(900, horizonY);
  g.closePath();
  g.fillPath();

  // 中景の岩肌シャドウ
  g.fillStyle(0x3d170b, 0.95);
  g.beginPath();
  g.moveTo(0, horizonY);
  g.lineTo(0, horizonY - 35);
  g.lineTo(120, horizonY - 52);
  g.lineTo(240, horizonY - 26);
  g.lineTo(450, horizonY - 18);
  g.lineTo(650, horizonY - 46);
  g.lineTo(780, horizonY - 28);
  g.lineTo(900, horizonY - 42);
  g.lineTo(900, horizonY);
  g.closePath();
  g.fillPath();

  // 4. 朽ちた木造の酒場（左）と廃駅舎・給水塔（右）のシルエット
  if (withBuildings) {
    const silhouetteColor = 0x261107;
    g.fillStyle(silhouetteColor, 0.96);

    // 左端: 朽ちた酒場 (SALOON の段付きファサード＋ポーチ柱)
    const sx = 18;
    const sy = horizonY;
    g.fillRect(sx, sy - 78, 108, 78);
    g.fillRect(sx + 12, sy - 102, 84, 26); // 偽正面（フォールスフロント）看板部
    g.fillRect(sx + 108, sy - 46, 36, 46); // 傾いたポーチ屋根下
    // 窓の夕陽の透過光
    g.fillStyle(0xd97706, 0.45);
    g.fillRect(sx + 24, sy - 58, 18, 24);
    g.fillRect(sx + 64, sy - 58, 18, 24);

    // 右端: 朽ちた木造駅舎と給水塔 (DEPOT & WATER TOWER)
    g.fillStyle(silhouetteColor, 0.96);
    const dx = width - 155;
    // 駅舎の三角屋根と本体
    g.fillRect(dx + 35, sy - 54, 105, 54);
    g.beginPath();
    g.moveTo(dx + 22, sy - 54);
    g.lineTo(dx + 88, sy - 86);
    g.lineTo(dx + 152, sy - 54);
    g.closePath();
    g.fillPath();

    // 給水塔（脚＋円筒タンク＋三角屋根）
    const wx = dx - 22;
    g.fillRect(wx + 4, sy - 72, 5, 72);
    g.fillRect(wx + 27, sy - 72, 5, 72);
    g.lineStyle(2, silhouetteColor, 0.95);
    g.lineBetween(wx + 5, sy - 50, wx + 30, sy - 24);
    g.lineBetween(wx + 30, sy - 50, wx + 5, sy - 24);
    g.fillRect(wx, sy - 108, 36, 38);
    g.beginPath();
    g.moveTo(wx - 4, sy - 108);
    g.lineTo(wx + 18, sy - 124);
    g.lineTo(wx + 40, sy - 108);
    g.closePath();
    g.fillPath();
  }

  // 5. 荒野の赤土・砂の大地グラデーション
  g.fillGradientStyle(0x472311, 0x472311, 0x1b0d06, 0x1b0d06, 1);
  g.fillRect(0, horizonY, width, height - horizonY);

  // 地平線の砂塵霞ライン
  g.fillStyle(0xf59e0b, 0.14);
  g.fillRect(0, horizonY - 6, width, 14);

  // 大地の轍（わだち）・砂紋ライン
  g.lineStyle(1.5, 0x2b1509, 0.55);
  for (let i = 1; i <= 6; i++) {
    const y = horizonY + Math.pow(i / 6, 1.6) * (height - horizonY - 30);
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(width, y);
    g.strokePath();
  }

  // 6. サワロ・サボテン (Saguaro Cactus) シルエット
  drawCactus(g, 185, horizonY + 18, 0.85, 0x210f06);
  drawCactus(g, width - 195, horizonY + 26, 1.05, 0x1e0d05);
  drawCactus(g, 74, horizonY + 95, 1.2, 0x180a04);

  // 7. 風に転がるタンブルウィード & 舞い上がる砂ぼこり
  if (withAtmosphere) {
    spawnDesertAtmosphere(scene, root, width, horizonY, height);
  }

  return root;
}

function drawCactus(
  g: Phaser.GameObjects.Graphics,
  x: number,
  baseY: number,
  scale: number,
  color: number,
): void {
  g.fillStyle(color, 0.95);
  const trunkW = 12 * scale;
  const trunkH = 68 * scale;
  g.fillRoundedRect(x - trunkW / 2, baseY - trunkH, trunkW, trunkH, 5 * scale);

  // 左腕
  const armW = 9 * scale;
  g.fillRoundedRect(x - 22 * scale, baseY - trunkH * 0.62, 18 * scale, armW, 4 * scale);
  g.fillRoundedRect(x - 22 * scale, baseY - trunkH * 0.88, armW, trunkH * 0.32, 4 * scale);

  // 右腕
  g.fillRoundedRect(x + 4 * scale, baseY - trunkH * 0.48, 18 * scale, armW, 4 * scale);
  g.fillRoundedRect(x + 13 * scale, baseY - trunkH * 0.76, armW, trunkH * 0.34, 4 * scale);
}

function spawnDesertAtmosphere(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  width: number,
  horizonY: number,
  height: number,
): void {
  // 砂ぼこりパーティクル（横風に乗って流れる砂粒）
  if (scene.textures.exists("dust_puff")) {
    const emitter = scene.add.particles(0, 0, "dust_puff", {
      x: -40,
      y: { min: Math.max(80, horizonY - 220), max: height - 80 },
      speedX: { min: 70, max: 185 },
      speedY: { min: -14, max: 14 },
      scale: { start: 0.35, end: 1.15 },
      alpha: { start: 0.16, end: 0 },
      lifespan: { min: 4500, max: 7500 },
      frequency: 420,
      tint: [0xd6b384, 0xc2955d, 0x9a5b25],
    });
    parent.add(emitter);
  }

  // 風に転がるタンブルウィード（回転枯れ草）
  if (scene.textures.exists("tumbleweed")) {
    const spawnTumbleweed = (initialDelay = 0) => {
      scene.time.delayedCall(initialDelay, () => {
        if (!scene.sys || !scene.sys.isActive()) return;
        const baseY = Phaser.Math.Between(horizonY + 12, Math.min(height - 90, horizonY + 180));
        const scale = Phaser.Math.FloatBetween(0.65, 1.05);
        const tw = scene.add.image(-50, baseY, "tumbleweed").setScale(scale).setAlpha(0.75);
        parent.add(tw);

        const travelDuration = Phaser.Math.Between(6500, 10500);

        // 横移動＋回転
        scene.tweens.add({
          targets: tw,
          x: width + 70,
          angle: 1080,
          duration: travelDuration,
          ease: "Linear",
          onComplete: () => {
            tw.destroy();
            spawnTumbleweed(Phaser.Math.Between(1800, 4800));
          },
        });

        // 風で跳ねるバウンド
        scene.tweens.add({
          targets: tw,
          y: baseY - Phaser.Math.Between(18, 38),
          duration: Phaser.Math.Between(420, 620),
          yoyo: true,
          repeat: Math.floor(travelDuration / 1000),
          ease: "Sine.easeOut",
        });
      });
    };

    spawnTumbleweed(400);
    spawnTumbleweed(3600);
  }
}

/**
 * 木の板＋金属の鋲（リベット）パネルを描画する
 */
export function drawWoodPanel(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  options: {
    fill?: number;
    border?: number;
    alpha?: number;
    rivets?: boolean;
    radius?: number;
  } = {},
): void {
  const fill = options.fill ?? 0x261409;
  const border = options.border ?? 0x92400e;
  const alpha = options.alpha ?? 0.96;
  const radius = options.radius ?? 10;
  const showRivets = options.rivets ?? true;

  // 外枠ドロップシャドウ
  g.fillStyle(0x0c0502, 0.55);
  g.fillRoundedRect(x + 4, y + 6, w, h, radius);

  // 木板ベース
  g.fillStyle(fill, alpha);
  g.fillRoundedRect(x, y, w, h, radius);

  // 横木目スジ
  g.lineStyle(1, 0x452310, 0.45);
  for (let py = y + 16; py < y + h - 10; py += 18) {
    g.beginPath();
    g.moveTo(x + 10, py);
    g.lineTo(x + w - 10, py);
    g.strokePath();
  }

  // 外枠（焼き印＆真鍮フレーム）
  g.lineStyle(2.5, border, 1);
  g.strokeRoundedRect(x, y, w, h, radius);

  // 内側の細い飾り罫線
  g.lineStyle(1, 0xd97706, 0.35);
  g.strokeRoundedRect(x + 6, y + 6, w - 12, h - 12, Math.max(4, radius - 3));

  // 四隅の金属の鋲（リベット）
  if (showRivets) {
    const inset = 14;
    const corners = [
      [x + inset, y + inset],
      [x + w - inset, y + inset],
      [x + inset, y + h - inset],
      [x + w - inset, y + h - inset],
    ];
    for (const [cx, cy] of corners) {
      g.fillStyle(0x140904, 0.9);
      g.fillCircle(cx + 1, cy + 1, 5);
      g.fillStyle(0xb45309, 1);
      g.fillCircle(cx, cy, 4.5);
      g.fillStyle(0xfde68a, 0.85);
      g.fillCircle(cx - 1, cy - 1, 1.8);
    }
  }
}

/**
 * 古びた指名手配書（WANTEDポスター / 羊皮紙）パネルを描画する
 */
export function drawParchmentCard(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  options: {
    borderColor?: number;
    pinned?: boolean;
  } = {},
): void {
  const borderColor = options.borderColor ?? 0x5c2d10;
  const pinned = options.pinned ?? true;

  // 影
  g.fillStyle(0x0c0502, 0.6);
  g.fillRoundedRect(x + 5, y + 7, w, h, 8);

  // 羊皮紙ベース
  g.fillStyle(0xdfc496, 0.97);
  g.fillRoundedRect(x, y, w, h, 8);

  // 周囲の古びた焼けムラ枠
  g.lineStyle(6, 0xc49e68, 0.55);
  g.strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, 6);

  // 西部劇ポスターの二重インク枠線
  g.lineStyle(2.5, borderColor, 0.9);
  g.strokeRoundedRect(x + 10, y + 10, w - 20, h - 20, 4);
  g.lineStyle(1, borderColor, 0.65);
  g.strokeRoundedRect(x + 15, y + 15, w - 30, h - 30, 3);

  // 上部中央の鋲（釘止め）
  if (pinned) {
    const px = x + w / 2;
    const py = y + 12;
    g.fillStyle(0x1c0d06, 0.9);
    g.fillCircle(px + 1, py + 2, 6);
    g.fillStyle(0x78350f, 1);
    g.fillCircle(px, py, 5.5);
    g.fillStyle(0xfbbf24, 0.85);
    g.fillCircle(px - 1.5, py - 1.5, 2);
  }
}

export type WesternButtonVariant = "rust" | "brass" | "leather" | "danger";

const BUTTON_PALETTES: Record<
  WesternButtonVariant,
  { fill: number; hoverFill: number; border: number; hoverBorder: number; text: string }
> = {
  rust: {
    fill: 0x7c2d12,
    hoverFill: 0x9a3412,
    border: 0xd97706,
    hoverBorder: 0xfbbf24,
    text: "#fef3c7",
  },
  brass: {
    fill: 0x92400e,
    hoverFill: 0xb45309,
    border: 0xfbbf24,
    hoverBorder: 0xfef08a,
    text: "#fffbeb",
  },
  leather: {
    fill: 0x361d0f,
    hoverFill: 0x4a2815,
    border: 0x854d0e,
    hoverBorder: 0xd97706,
    text: "#fde68a",
  },
  danger: {
    fill: 0x7f1d1d,
    hoverFill: 0x991b1b,
    border: 0xef4444,
    hoverBorder: 0xfca5a5,
    text: "#fef2f2",
  },
};

/**
 * 木札＋真鍮の鋲（リベット）＋拍車音付きの西部劇ボタンを作成する
 */
export function createWesternButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  variant: WesternButtonVariant,
  onClick: () => void,
  width = 520,
  height = 76,
): Phaser.GameObjects.Container {
  const palette = BUTTON_PALETTES[variant];
  const container = scene.add.container(x, y);
  const bg = scene.add.graphics();

  const drawState = (isHover: boolean) => {
    bg.clear();
    // 影
    bg.fillStyle(0x0c0502, 0.65);
    bg.fillRoundedRect(-width / 2 + 3, -height / 2 + 5, width, height, 10);

    // 木板塗り
    bg.fillStyle(isHover ? palette.hoverFill : palette.fill, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);

    // 木目ライン
    bg.lineStyle(1, 0x1c0a04, 0.35);
    bg.beginPath();
    bg.moveTo(-width / 2 + 14, -height / 6);
    bg.lineTo(width / 2 - 14, -height / 6);
    bg.moveTo(-width / 2 + 14, height / 5);
    bg.lineTo(width / 2 - 14, height / 5);
    bg.strokePath();

    // 枠線
    bg.lineStyle(isHover ? 3 : 2.2, isHover ? palette.hoverBorder : palette.border, 1);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);

    // 内枠ステッチ風ライン
    bg.lineStyle(1, 0xfde68a, isHover ? 0.45 : 0.22);
    bg.strokeRoundedRect(-width / 2 + 5, -height / 2 + 5, width - 10, height - 10, 7);

    // 左右両端の真鍮鋲（リベット）
    for (const rx of [-width / 2 + 18, width / 2 - 18]) {
      for (const ry of [-height / 2 + 16, height / 2 - 16]) {
        bg.fillStyle(0x1c0a04, 0.85);
        bg.fillCircle(rx + 1, ry + 1, 4);
        bg.fillStyle(0xd97706, 1);
        bg.fillCircle(rx, ry, 3.6);
        bg.fillStyle(0xfef3c7, 0.9);
        bg.fillCircle(rx - 0.8, ry - 0.8, 1.4);
      }
    }
  };

  drawState(false);

  const label = addCrispText(scene, 0, 0, text, {
    fontSize: height >= 70 ? "25px" : "18px",
    fontStyle: "bold",
    color: palette.text,
    stroke: "#1c0a04",
    strokeThickness: 3,
  }).setOrigin(0.5);

  container.add([bg, label]);
  container.setSize(width, height);
  container.setInteractive({ useHandCursor: true });

  container.on("pointerover", () => {
    drawState(true);
    container.setScale(1.025);
  });

  container.on("pointerout", () => {
    drawState(false);
    container.setScale(1.0);
  });

  container.on("pointerdown", () => {
    container.setScale(0.97);
  });

  container.on("pointerup", () => {
    container.setScale(1.025);
    AudioManager.getInstance().playSynthSE("spur", 0.7);
    onClick();
  });

  return container;
}

/**
 * 映画のタイトルカード風オーバーレイ演出を表示する（入力はブロックせず自動フェードアウト）
 */
export function showCinemaTitleCard(
  scene: Phaser.Scene,
  config: {
    actLabel: string;
    title: string;
    quote: string;
    y?: number;
    holdMs?: number;
    fadeMs?: number;
    letterbox?: boolean;
  },
): Phaser.GameObjects.Container {
  const { width, height } = scene.scale;
  const cardY = config.y ?? 240;
  const holdMs = config.holdMs ?? 720;
  const fadeMs = config.fadeMs ?? 380;

  const container = scene.add.container(0, 0).setDepth(260);

  if (config.letterbox) {
    const lbTop = scene.add.rectangle(width / 2, 42, width, 84, 0x0c0502, 0.92);
    const lbBot = scene.add.rectangle(width / 2, height - 42, width, 84, 0x0c0502, 0.92);
    container.add([lbTop, lbBot]);
  }

  const cardW = 740;
  const cardH = 168;
  const box = scene.add.graphics();
  box.fillStyle(0x160a04, 0.9);
  box.fillRoundedRect(width / 2 - cardW / 2, cardY - cardH / 2, cardW, cardH, 6);
  box.lineStyle(2.5, 0xd97706, 0.95);
  box.strokeRoundedRect(width / 2 - cardW / 2, cardY - cardH / 2, cardW, cardH, 6);
  box.lineStyle(1, 0xfde68a, 0.55);
  box.strokeRoundedRect(
    width / 2 - cardW / 2 + 7,
    cardY - cardH / 2 + 7,
    cardW - 14,
    cardH - 14,
    4,
  );

  const actText = addCrispText(scene, width / 2, cardY - 50, `— ${config.actLabel} —`, {
    fontSize: "16px",
    fontFamily: "display",
    color: "#f59e0b",
    fontStyle: "bold",
  }).setOrigin(0.5);

  const mainTitle = addCrispText(scene, width / 2, cardY - 6, config.title, {
    fontSize: "34px",
    fontFamily: "display",
    fontStyle: "bold",
    color: "#fef3c7",
    stroke: "#2b1206",
    strokeThickness: 4,
  }).setOrigin(0.5);

  const quoteText = addCrispText(scene, width / 2, cardY + 46, config.quote, {
    fontSize: "19px",
    color: "#d6b384",
    fontStyle: "bold",
  }).setOrigin(0.5);

  container.add([box, actText, mainTitle, quoteText]);
  container.setAlpha(0);

  scene.tweens.add({
    targets: container,
    alpha: 1,
    duration: 160,
    ease: "Quad.easeOut",
    onComplete: () => {
      scene.time.delayedCall(holdMs, () => {
        if (!container.scene) return;
        scene.tweens.add({
          targets: container,
          alpha: 0,
          duration: fadeMs,
          ease: "Quad.easeIn",
          onComplete: () => container.destroy(),
        });
      });
    },
  });

  return container;
}
