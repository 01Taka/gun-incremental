import { SKILL_IDS, SKILL_STATS, SKILL_TREE, SKILLS } from "../../config/skillTree";
import type { SkillNodeId, SkillNodeSize } from "../../config/types";
import { formatPercent } from "../../logic/format";

/** グリッド 1 マスのピクセルサイズと上下左右余白 */
export const TREE_GRID = {
  colW: 140,
  rowH: 148,
  padX: 118,
  padTop: 80,
  padBottom: 80,
};

/** ドラッグスクロール判定しきい値 (px) */
export const DRAG_THRESHOLD = 8;

/** 長押し購入の所要時間 (ms) */
export const LONG_PRESS_DURATION = 500;

/** スティック連続移動時のインターバル設定 (ms) */
export const STICK_MOVE_COOLDOWN = 280; // 連続移動時の最小インターバル（方向転換時の暴発防止クールダウン）
export const STICK_REPEAT_DELAY = 360; // スティックを倒し続けたときに次の移動が始まるまでのディレイ
export const STICK_REPEAT_INTERVAL = 280; // スティックを倒し続けたときの連続移動インターバル

export const DPAD_REPEAT_DELAY = STICK_REPEAT_DELAY;
export const DPAD_REPEAT_INTERVAL = STICK_REPEAT_INTERVAL;

export const NODE_STYLE: Record<
  SkillNodeSize,
  {
    radius: number;
    iconSize: number;
    levelTextClass: string;
    nameTextClass: string;
    lineWidth: number;
  }
> = {
  large: {
    radius: 41,
    iconSize: 25,
    levelTextClass: "text-[11px]",
    nameTextClass: "text-[12px]",
    lineWidth: 5,
  },
  medium: {
    radius: 34,
    iconSize: 20,
    levelTextClass: "text-[10px]",
    nameTextClass: "text-[11px]",
    lineWidth: 3.8,
  },
  small: {
    radius: 28,
    iconSize: 16,
    levelTextClass: "text-[9.5px]",
    nameTextClass: "text-[10.5px]",
    lineWidth: 2.5,
  },
};

export interface CanvasMetrics {
  width: number;
  height: number;
  centerX: number;
  coords: Record<SkillNodeId, { x: number; y: number }>;
}

/**
 * 魚の骨レイアウト結果から、描画キャンバスのピクセルサイズと各ノードの中心座標を算出
 */
export function calculateCanvasMetrics(treeLayout: {
  minCol: number;
  maxCol: number;
  maxRow: number;
  positions: Record<SkillNodeId, { col: number; row: number }>;
}): CanvasMetrics {
  const { minCol, maxCol, maxRow, positions } = treeLayout;
  const halfCols = Math.max(Math.abs(minCol), Math.abs(maxCol), 1);
  const width = halfCols * 2 * TREE_GRID.colW + TREE_GRID.padX * 2;
  const height = maxRow * TREE_GRID.rowH + TREE_GRID.padTop + TREE_GRID.padBottom;
  const centerX = width / 2;

  const coords: Record<SkillNodeId, { x: number; y: number }> = {} as Record<
    SkillNodeId,
    { x: number; y: number }
  >;
  for (const id of SKILL_IDS) {
    const pos = positions[id];
    coords[id] = {
      x: centerX + pos.col * TREE_GRID.colW,
      y: TREE_GRID.padTop + pos.row * TREE_GRID.rowH,
    };
  }

  return { width, height, centerX, coords };
}

/**
 * 現在選択中ノードから指定方向 (dx, dy) にある次のノードを探索
 */
export function findNextNodeInDirection(
  currentId: SkillNodeId,
  dx: number,
  dy: number,
  positions: Record<SkillNodeId, { col: number; row: number }>,
): SkillNodeId | null {
  const curPos = positions[currentId];
  if (!curPos) return null;

  // 1. 直接接続されている親子ノードのうち、指定方向にあるものを最優先
  const connectedIds: SkillNodeId[] = [];
  const parentId = SKILLS[currentId]?.requirement?.nodeId;
  if (parentId) connectedIds.push(parentId);
  for (const childId of Object.values(SKILL_TREE.children[currentId] ?? {})) {
    if (childId) connectedIds.push(childId);
  }

  for (const neighborId of connectedIds) {
    const nPos = positions[neighborId];
    if (!nPos) continue;
    if (dx !== 0 && nPos.row === curPos.row && Math.sign(nPos.col - curPos.col) === dx) {
      return neighborId;
    }
    if (dy !== 0 && nPos.col === curPos.col && Math.sign(nPos.row - curPos.row) === dy) {
      return neighborId;
    }
  }

  // 2. 直接接続がない場合はグリッド座標上で指定方向の最も自然なノードを選択
  let bestId: SkillNodeId | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidateId of SKILL_IDS) {
    if (candidateId === currentId) continue;
    const pos = positions[candidateId];
    if (!pos) continue;

    if (dx !== 0) {
      if (Math.sign(pos.col - curPos.col) !== dx) continue;
      const dCol = Math.abs(pos.col - curPos.col);
      const dRow = Math.abs(pos.row - curPos.row);
      const score = dRow * 2 + dCol * 1.5;
      if (score < bestScore) {
        bestScore = score;
        bestId = candidateId;
      }
    } else if (dy !== 0) {
      if (Math.sign(pos.row - curPos.row) !== dy) continue;
      const dCol = Math.abs(pos.col - curPos.col);
      const dRow = Math.abs(pos.row - curPos.row);
      const score = dCol === 0 ? dRow : 1000 + dRow * 2 + dCol * 3;
      if (score < bestScore) {
        bestScore = score;
        bestId = candidateId;
      }
    }
  }

  return bestId;
}

/**
 * スキル効果値を単位（%、加算値など）に応じて整形
 */
export function formatSkillStatValue(statKey: keyof typeof SKILL_STATS, val: number): string {
  const statInfo = SKILL_STATS[statKey];
  const unit = statInfo?.unit ?? "";
  const roundVal = Math.round(val * 1000) / 1000;

  if (unit === "%") {
    return formatPercent(val, true);
  }
  if (unit === "") {
    return `+${roundVal}`;
  }
  return `+${roundVal} ${unit}`;
}
