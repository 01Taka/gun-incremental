import type Phaser from "phaser";

/**
 * デバイスピクセル比（DPR）に応じた高精細解像度（最低2倍、最大3倍）を取得
 */
export const getDeviceResolution = (): number => {
  if (typeof window === "undefined") return 2;
  const dpr = window.devicePixelRatio || 1;
  return Math.min(Math.max(dpr, 2), 2);
};

// 西部劇ポスター・木札風スラブセリフ & 重厚明朝フォントスタック
export const WESTERN_DISPLAY_FONT_STACK =
  '"Rye", "Roboto Slab", "Rockwell", "Noto Serif JP", "Yu Mincho", "Hiragino Mincho ProN", Georgia, serif';

export const SYSTEM_FONT_STACK =
  '"Roboto Slab", "Noto Serif JP", "Yu Mincho", "Hiragino Mincho ProN", "Rockwell", Georgia, serif';

export const MONO_FONT_STACK =
  '"Courier Prime", "Courier New", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

/**
 * 高解像度・文字欠け防止・西部劇スラブセリフフォントスタックを安全に適用するテキスト作成ヘルパー
 */
export function addCrispText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string | string[],
  style?: Phaser.Types.GameObjects.Text.TextStyle,
): Phaser.GameObjects.Text {
  const rawFamily = style?.fontFamily ?? "";
  const isMono = rawFamily.includes("mono") || rawFamily.includes("Courier");
  const isDisplay = rawFamily.includes("display") || rawFamily.includes("Rye");

  const chosenFontFamily = isMono
    ? MONO_FONT_STACK
    : isDisplay
      ? WESTERN_DISPLAY_FONT_STACK
      : SYSTEM_FONT_STACK;

  // styleからstrokeThicknessやfontFamilyを取り除き、確実に安全な値をセット（NaN防止）
  const cleanStyle: Phaser.Types.GameObjects.Text.TextStyle = {
    ...style,
    fontFamily: chosenFontFamily,
  };
  delete cleanStyle.strokeThickness;

  const textObj = scene.add.text(x, y, text, {
    resolution: getDeviceResolution(),
    padding: { x: 6, y: 6 },
    ...cleanStyle,
    // strokeThicknessが明示的に数値で指定されている場合のみ渡す
    ...(typeof style?.strokeThickness === "number" && style.strokeThickness > 0
      ? { strokeThickness: style.strokeThickness }
      : {}),
  });

  return textObj;
}
