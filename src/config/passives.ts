/**
 * パッシブボーナス（上納金支払い時に選択する切り札）のローダー
 *
 * 具体的なパラメータは passives.json に記述する。
 */
import { z } from "zod";

import rawPassives from "./passives.json";
import type { PassiveDefinition, PassiveId } from "./types";

const REQUIRED_PASSIVE_IDS: readonly PassiveId[] = [
  "sp_bonus",
  "dmg_bonus",
  "time_bonus",
  "target_bonus",
  "shop_discount",
  "tp_bonus",
];

const passiveJsonSchema = z
  .object({
    id: z.enum([
      "sp_bonus",
      "dmg_bonus",
      "time_bonus",
      "target_bonus",
      "shop_discount",
      "tp_bonus",
    ]),
    name: z.string().min(1, "name は必須です"),
    description: z.string(),
    icon: z.string().min(1, "icon は必須です"),
    effectPerStack: z.number().positive("effectPerStack は正の数である必要があります"),
  })
  .strict();

const passivesFileSchema = z
  .object({
    $schema: z.string().optional(),
    passives: z.array(passiveJsonSchema).min(1, "少なくとも1つのパッシブが必要です"),
  })
  .strict();

export type PassiveJson = z.infer<typeof passiveJsonSchema>;

export class PassiveValidationError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(`passives.json の定義が不正です:\n- ${problems.join("\n- ")}`);
    this.name = "PassiveValidationError";
    this.problems = problems;
  }
}

export interface PassivesModel {
  passives: Record<PassiveId, PassiveDefinition>;
  passiveList: PassiveDefinition[];
  passiveIds: PassiveId[];
}

export function buildPassives(raw: unknown): PassivesModel {
  const parsed = passivesFileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new PassiveValidationError([z.prettifyError(parsed.error)]);
  }

  const problems: string[] = [];
  const rawList = parsed.data.passives;
  const seenIds = new Set<PassiveId>();

  for (const item of rawList) {
    if (seenIds.has(item.id)) {
      problems.push(`id "${item.id}" が重複しています`);
    }
    seenIds.add(item.id);
  }

  for (const reqId of REQUIRED_PASSIVE_IDS) {
    if (!seenIds.has(reqId)) {
      problems.push(`必須のパッシブ id "${reqId}" が定義されていません`);
    }
  }

  if (problems.length > 0) {
    throw new PassiveValidationError(problems);
  }

  const passives = {} as Record<PassiveId, PassiveDefinition>;
  const passiveList: PassiveDefinition[] = [];
  const passiveIds: PassiveId[] = [];

  for (const item of rawList) {
    const def: PassiveDefinition = {
      id: item.id,
      name: item.name,
      description: item.description,
      icon: item.icon,
      effectPerStack: item.effectPerStack,
    };
    passives[item.id] = def;
    passiveList.push(def);
    passiveIds.push(item.id);
  }

  return {
    passives,
    passiveList,
    passiveIds,
  };
}

export const PASSIVES_MODEL: PassivesModel = buildPassives(rawPassives);
export const PASSIVES: Record<PassiveId, PassiveDefinition> = PASSIVES_MODEL.passives;
export const PASSIVE_LIST: PassiveDefinition[] = PASSIVES_MODEL.passiveList;
export const PASSIVE_IDS: PassiveId[] = PASSIVES_MODEL.passiveIds;
