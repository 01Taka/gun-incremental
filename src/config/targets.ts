/**
 * 的 (ターゲット) パラメータのローダー
 *
 * 具体的なパラメータは targets.json に記述する。本モジュールは
 *   1. JSON のスキーマ検証 (zod)
 *   2. 色コード (HEX文字列 / 数値) の正規化
 *   3. 解放順序 (TARGET_UNLOCK_SEQUENCE) の生成
 * を行い、ゲーム全体で安全に扱えるようにする。
 */
import { z } from "zod";

import rawTargets from "./targets.json";
import type { TargetDefinition, TargetId } from "./types";

const colorSchema = z
  .union([
    z.number().int().nonnegative(),
    z
      .string()
      .regex(
        /^(?:0x|#)?[0-9a-fA-F]{6}$/,
        "有効な16進カラーコード (例: '#38bdf8' または '0x38bdf8') を指定してください",
      ),
  ])
  .transform((val) => {
    if (typeof val === "number") return val;
    const hex = val.replace(/^(?:0x|#)/, "");
    return parseInt(hex, 16);
  });

const targetJsonSchema = z.object({
  id: z.string().min(1, "id は必須です"),
  name: z.string().min(1, "name は必須です"),
  hp: z.number().int().min(1, "hp は1以上の整数である必要があります"),
  baseSp: z.number().nonnegative("baseSp は0以上である必要があります"),
  weight: z.number().positive("weight は正の数である必要があります"),
  radius: z.number().positive("radius は正の数である必要があります"),
  color: colorSchema,
  border: colorSchema,
  lifetime: z.number().positive("lifetime は正の数である必要があります").optional(),
  unlockPoints: z.number().nonnegative("unlockPoints は0以上である必要があります").default(0),
  description: z.string(),
});

const targetsFileSchema = z.object({
  $schema: z.string().optional(),
  targets: z.array(targetJsonSchema).min(1, "少なくとも1つの的が必要です"),
});

export type TargetJson = z.infer<typeof targetJsonSchema>;

export class TargetValidationError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(`targets.json の定義が不正です:\n- ${problems.join("\n- ")}`);
    this.name = "TargetValidationError";
    this.problems = problems;
  }
}

export interface TargetsModel {
  targets: Record<TargetId, TargetDefinition>;
  targetList: TargetDefinition[];
  unlockSequence: { targetId: TargetId; requiredPoints: number }[];
  targetIds: TargetId[];
}

export function buildTargets(raw: unknown): TargetsModel {
  const parsed = targetsFileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new TargetValidationError([z.prettifyError(parsed.error)]);
  }

  const problems: string[] = [];
  const rawList = parsed.data.targets;
  const seenIds = new Set<string>();

  for (const item of rawList) {
    if (seenIds.has(item.id)) {
      problems.push(`id "${item.id}" が重複しています`);
    }
    seenIds.add(item.id);
  }

  // 初期解放(unlockPoints: 0)の的が少なくとも1つ存在するか確認
  const initialTargets = rawList.filter((t) => t.unlockPoints === 0);
  if (initialTargets.length === 0) {
    problems.push("unlockPoints が 0 の最初から解放される的が少なくとも1つ必要です");
  }

  if (problems.length > 0) {
    throw new TargetValidationError(problems);
  }

  const targets: Record<TargetId, TargetDefinition> = {} as Record<TargetId, TargetDefinition>;
  const targetList: TargetDefinition[] = [];
  const targetIds: TargetId[] = [];

  for (const item of rawList) {
    const id = item.id as TargetId;
    const def: TargetDefinition = {
      id,
      name: item.name,
      hp: item.hp,
      baseSp: item.baseSp,
      weight: item.weight,
      radius: item.radius,
      color: item.color,
      border: item.border,
      lifetime: item.lifetime,
      unlockPoints: item.unlockPoints,
      description: item.description,
    };
    targets[id] = def;
    targetList.push(def);
    targetIds.push(id);
  }

  // 解放順序は unlockPoints 昇順 (同値の場合は記述順)
  const sorted = [...targetList].sort((a, b) => (a.unlockPoints ?? 0) - (b.unlockPoints ?? 0));
  const unlockSequence = sorted.map((t) => ({
    targetId: t.id,
    requiredPoints: t.unlockPoints ?? 0,
  }));

  return {
    targets,
    targetList,
    unlockSequence,
    targetIds,
  };
}

export const TARGETS_MODEL: TargetsModel = buildTargets(rawTargets);
export const TARGETS: Record<TargetId, TargetDefinition> = TARGETS_MODEL.targets;
export const TARGET_LIST: TargetDefinition[] = TARGETS_MODEL.targetList;
export const TARGET_UNLOCK_SEQUENCE: { targetId: TargetId; requiredPoints: number }[] =
  TARGETS_MODEL.unlockSequence;
export const TARGET_IDS: TargetId[] = TARGETS_MODEL.targetIds;
