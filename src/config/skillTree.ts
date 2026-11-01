/**
 * 魚の骨 (フィッシュボーン) 型スキルツリーの定義ローダー
 *
 * 具体的なノードは skillTree.json に記述する。本モジュールは
 *   1. JSON のスキーマ検証 (zod)
 *   2. 構造ルールの検証 (接続可能なサイズ・方向・スロット重複・到達可能性)
 *   3. 検証済みツリーモデル (SkillTreeModel) の構築
 * を担当し、描画 (fishboneLayout / UpgradeScene) やゲームロジック (GameState) は
 * このモデルだけを参照する。
 *
 * ■ 構造ルール
 *   大 → 大 : 真下 (背骨の延長)              … スロット "down"
 *   大 → 中 : 左右 (肋骨。side 必須)         … スロット "left" / "right"
 *   中 → 中 : 同じ向きへ水平に延長           … スロット "outward"
 *   中 → 小 : 真下 (背骨と並行)              … スロット "down"
 *   小 → 小 : 真下へ延長                     … スロット "down"
 *   各スロットには子を 1 つだけ接続できる。ルートは大ノード 1 つのみ。
 */
import { z } from "zod";

import rawSkillTree from "./skillTree.json";
import type {
  SkillDefinition,
  SkillNodeId,
  SkillNodeSize,
  SkillStatId,
  SkillTreeSide,
} from "./types";
import { VOCAB } from "./vocab";

// ------------------------------------------
// ステータス定義 (JSON の effect.stat で参照)
// ------------------------------------------
export interface SkillStatDefinition {
  label: string;
  unit: string; // 表示単位 ("%" の場合は割合として表示)
}

const SKILL_STAT_KEYS: Record<SkillStatId, true> = {
  damage: true,
  critRate: true,
  fireRateReduction: true,
  magazineCapacity: true,
  magazineMultiplier: true,
  reloadTimeReduction: true,
  roundTime: true,
  maxTargets: true,
  spMultiplier: true,
  targetPointMultiplier: true,
  shopDiscount: true,
  timeTargetBonus: true,
  chainDamage: true,
};

export const SKILL_STATS: Record<SkillStatId, SkillStatDefinition> = new Proxy(
  SKILL_STAT_KEYS as unknown as Record<SkillStatId, SkillStatDefinition>,
  {
    get(_target, prop: string) {
      if (prop in SKILL_STAT_KEYS) {
        const stat = VOCAB.stats[prop as SkillStatId];
        return { label: stat.label, unit: stat.unit };
      }
      return undefined;
    },
  },
);

// ------------------------------------------
// 接続ルール
// ------------------------------------------
/** 親ノード内で子が占有する位置 */
export type SkillTreeSlot = "down" | "left" | "right" | "outward";

/** 親サイズ → 子サイズ → 接続方向 ("side" は子の side で left/right に解決) */
const CONNECTION_RULES: Record<
  SkillNodeSize,
  Partial<Record<SkillNodeSize, "down" | "side" | "outward">>
> = {
  large: { large: "down", medium: "side" },
  medium: { medium: "outward", small: "down" },
  small: { small: "down" },
};

export const SIZE_LABELS: Record<SkillNodeSize, string> = {
  large: "大",
  medium: "中",
  small: "小",
};

// ------------------------------------------
// JSON スキーマ
// ------------------------------------------
const STAT_IDS = Object.keys(SKILL_STATS) as [SkillStatId, ...SkillStatId[]];

const nodeSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9_]+$/, "id は英小文字・数字・_ のみ使用できます"),
    size: z.enum(["large", "medium", "small"]),
    parent: z.string().optional(),
    side: z.enum(["left", "right"]).optional(),
    unlockLevel: z.number().int().min(1).optional(),
    name: z.string().min(1),
    description: z.string(),
    icon: z.string().min(1),
    category: z.enum(["combat", "economy"]),
    maxLevel: z.number().int().min(1),
    costs: z.array(z.number().nonnegative()),
    effect: z.strictObject({
      stat: z.enum(STAT_IDS),
      perLevel: z.number(),
    }),
  })
  .strict();

const treeSchema = z
  .object({
    $schema: z.string().optional(),
    nodes: z.array(nodeSchema).min(1),
  })
  .strict();

export type SkillTreeNodeJson = z.infer<typeof nodeSchema>;
export type SkillTreeJson = z.infer<typeof treeSchema>;

// ------------------------------------------
// ツリーモデル
// ------------------------------------------
export interface SkillTreeModel {
  rootId: SkillNodeId;
  /** JSON の記述順 */
  ids: SkillNodeId[];
  nodes: Record<SkillNodeId, SkillDefinition>;
  /** 親ノードのスロットごとの子 */
  children: Record<SkillNodeId, Partial<Record<SkillTreeSlot, SkillNodeId>>>;
}

export class SkillTreeValidationError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(`skillTree.json の定義が不正です:\n- ${problems.join("\n- ")}`);
    this.name = "SkillTreeValidationError";
    this.problems = problems;
  }
}

/**
 * 子ノードが親のどのスロットに接続されるかを解決する。
 * 接続ルール違反の場合はエラーメッセージを返す。
 */
function resolveSlot(
  parent: SkillTreeNodeJson,
  child: SkillTreeNodeJson,
): { slot: SkillTreeSlot } | { error: string } {
  const direction = CONNECTION_RULES[parent.size][child.size];
  const label = `"${child.id}" (${SIZE_LABELS[child.size]})`;
  const parentLabel = `"${parent.id}" (${SIZE_LABELS[parent.size]})`;

  if (!direction) {
    const allowed = Object.keys(CONNECTION_RULES[parent.size])
      .map((s) => SIZE_LABELS[s as SkillNodeSize])
      .join("・");
    return {
      error: `${label} は ${parentLabel} に接続できません (${SIZE_LABELS[parent.size]}ノードに繋げるのは ${allowed} のみ)`,
    };
  }

  if (direction === "side") {
    if (!child.side) {
      return { error: `${label} は大ノードの肋骨なので "side": "left" | "right" が必要です` };
    }
    return { slot: child.side };
  }

  if (child.side) {
    return { error: `${label}: "side" は大ノード直下の中ノードでのみ指定できます` };
  }
  return { slot: direction };
}

/**
 * 未検証の JSON からツリーモデルを構築する。
 * 不正な場合は全ての問題点をまとめて SkillTreeValidationError として投げる。
 */
export function buildSkillTree(raw: unknown): SkillTreeModel {
  const parsed = treeSchema.safeParse(raw);
  if (!parsed.success) {
    throw new SkillTreeValidationError([z.prettifyError(parsed.error)]);
  }

  const problems: string[] = [];
  const jsonNodes = parsed.data.nodes;
  const byId = new Map<string, SkillTreeNodeJson>();

  for (const node of jsonNodes) {
    if (byId.has(node.id)) problems.push(`id "${node.id}" が重複しています`);
    byId.set(node.id, node);

    if (node.costs.length !== node.maxLevel) {
      problems.push(
        `"${node.id}": costs の要素数 (${node.costs.length}) が maxLevel (${node.maxLevel}) と一致しません`,
      );
    }
  }

  // ルート判定
  const roots = jsonNodes.filter((n) => n.parent === undefined);
  if (roots.length !== 1) {
    problems.push(
      `parent を持たないルートノードはちょうど 1 つ必要です (現在: ${roots.map((r) => r.id).join(", ") || "なし"})`,
    );
  }
  const root = roots[0];
  if (root && root.size !== "large") {
    problems.push(`ルートノード "${root.id}" は大ノード (large) である必要があります`);
  }
  if (root && (root.side || root.unlockLevel !== undefined)) {
    problems.push(`ルートノード "${root.id}" には side / unlockLevel を指定できません`);
  }

  // 親子接続
  const children: SkillTreeModel["children"] = {};
  for (const node of jsonNodes) children[node.id] = {};

  for (const node of jsonNodes) {
    if (node.parent === undefined) continue;
    const parent = byId.get(node.parent);
    if (!parent) {
      problems.push(`"${node.id}": 親 "${node.parent}" が存在しません`);
      continue;
    }

    const resolved = resolveSlot(parent, node);
    if ("error" in resolved) {
      problems.push(resolved.error);
      continue;
    }

    const occupant = children[parent.id][resolved.slot];
    if (occupant) {
      problems.push(
        `"${node.id}": 親 "${parent.id}" のスロット "${resolved.slot}" は既に "${occupant}" が使用しています`,
      );
      continue;
    }
    children[parent.id][resolved.slot] = node.id;

    const unlockLevel = node.unlockLevel ?? 1;
    if (unlockLevel > parent.maxLevel) {
      problems.push(
        `"${node.id}": unlockLevel (${unlockLevel}) が親 "${parent.id}" の maxLevel (${parent.maxLevel}) を超えています`,
      );
    }
  }

  // 到達可能性 (循環参照・孤立ノードの検出)
  if (root) {
    const visited = new Set<string>();
    const stack = [root.id];
    while (stack.length > 0) {
      const id = stack.pop()!;
      if (visited.has(id)) continue;
      visited.add(id);
      stack.push(...Object.values(children[id] ?? {}).filter((c): c is string => !!c));
    }
    const unreachable = jsonNodes.filter((n) => !visited.has(n.id)).map((n) => n.id);
    if (unreachable.length > 0) {
      problems.push(
        `ルートから到達できないノードがあります (循環参照?): ${unreachable.join(", ")}`,
      );
    }
  }

  if (problems.length > 0) throw new SkillTreeValidationError(problems);

  const nodes: Record<SkillNodeId, SkillDefinition> = {};
  for (const n of jsonNodes) {
    nodes[n.id] = {
      id: n.id,
      size: n.size,
      parent: n.parent,
      side: n.side as SkillTreeSide | undefined,
      name: n.name,
      description: n.description,
      icon: n.icon,
      category: n.category,
      maxLevel: n.maxLevel,
      costs: n.costs,
      requirement:
        n.parent !== undefined ? { nodeId: n.parent, level: n.unlockLevel ?? 1 } : undefined,
      effect: { stat: n.effect.stat, perLevel: n.effect.perLevel },
    };
  }

  return {
    rootId: root!.id,
    ids: jsonNodes.map((n) => n.id),
    nodes,
    children,
  };
}

// ------------------------------------------
// アプリ全体で使用する検証済みツリー
// ------------------------------------------
export const SKILL_TREE: SkillTreeModel = buildSkillTree(rawSkillTree);
export const SKILLS: Record<SkillNodeId, SkillDefinition> = SKILL_TREE.nodes;
export const SKILL_IDS: readonly SkillNodeId[] = SKILL_TREE.ids;

/** 全ノードをレベル0で初期化したレベル表 */
export function createEmptySkillLevels(): Record<SkillNodeId, number> {
  return Object.fromEntries(SKILL_IDS.map((id) => [id, 0]));
}
