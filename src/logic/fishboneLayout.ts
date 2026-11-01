/**
 * 魚の骨 (フィッシュボーン) 型スキルツリーのグリッドレイアウト計算
 *
 * 描画エンジンに依存しない純粋関数。ノードごとにグリッド座標 (col, row) を返す。
 *   - col: 0 が背骨。負が左、正が右
 *   - row: 0 がルート。下に行くほど増える
 *
 * 配置ルール:
 *   - 大ノード: 背骨 (col 0) を真下へ一直線
 *   - 中ノード: 親の大ノードと同じ行で左右へ 1 マスずつ外側へ
 *   - 小ノード: 親の中ノードと同じ列で真下へ 1 マスずつ
 *
 * 大ノード 1 つ分の「骨ユニット」(大ノード + そこから生える肋骨と小ノード群) を
 * 上から順に置いていき、既に置いたノードと衝突しない最も浅い行に配置する。
 * 背骨以外の列では、接続関係のないノード同士が縦に接して見えないよう 1 マス空ける。
 */
import type { SkillTreeModel } from "../config/skillTree";
import type { SkillNodeId } from "../config/types";

export interface GridPos {
  col: number;
  row: number;
}

export interface FishboneLayout {
  positions: Record<SkillNodeId, GridPos>;
  minCol: number;
  maxCol: number;
  maxRow: number;
}

interface RelativeCell {
  id: SkillNodeId;
  col: number;
  dRow: number; // 骨ユニットの大ノードからの相対行
}

const cellKey = (col: number, row: number) => `${col},${row}`;

/** 大ノード 1 つ分の骨ユニットに含まれるノードの相対座標を集める */
function collectBoneUnit(tree: SkillTreeModel, largeId: SkillNodeId): RelativeCell[] {
  const cells: RelativeCell[] = [{ id: largeId, col: 0, dRow: 0 }];

  for (const side of ["left", "right"] as const) {
    const dir = side === "left" ? -1 : 1;
    let mediumId = tree.children[largeId][side];
    let col = dir;

    // 肋骨 (中ノード) を水平に外側へ
    while (mediumId) {
      cells.push({ id: mediumId, col, dRow: 0 });

      // 中ノードから垂れ下がる小ノード列
      let smallId = tree.children[mediumId].down;
      let dRow = 1;
      while (smallId) {
        cells.push({ id: smallId, col, dRow });
        smallId = tree.children[smallId].down;
        dRow++;
      }

      mediumId = tree.children[mediumId].outward;
      col += dir;
    }
  }

  return cells;
}

export function layoutFishbone(tree: SkillTreeModel): FishboneLayout {
  const positions: Record<SkillNodeId, GridPos> = {};
  const occupied = new Set<string>();

  const isFree = (cells: RelativeCell[], baseRow: number) =>
    cells.every(({ col, dRow }) => {
      const row = baseRow + dRow;
      if (occupied.has(cellKey(col, row))) return false;
      // 背骨以外は、直上に無関係なノードがあれば 1 マス空ける
      if (col !== 0 && occupied.has(cellKey(col, row - 1))) return false;
      return true;
    });

  let largeId: SkillNodeId | undefined = tree.rootId;
  let row = 0;

  while (largeId) {
    const unit = collectBoneUnit(tree, largeId);
    while (!isFree(unit, row)) row++;

    for (const cell of unit) {
      const pos = { col: cell.col, row: row + cell.dRow };
      positions[cell.id] = pos;
      occupied.add(cellKey(pos.col, pos.row));
    }

    largeId = tree.children[largeId].down;
    row++;
  }

  const all = Object.values(positions);
  return {
    positions,
    minCol: Math.min(...all.map((p) => p.col)),
    maxCol: Math.max(...all.map((p) => p.col)),
    maxRow: Math.max(...all.map((p) => p.row)),
  };
}
