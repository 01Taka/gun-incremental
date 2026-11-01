/**
 * 永続強化（酒場 / SALOON）パラメータのローダー
 *
 * 具体的なパラメータは permanentUpgrades.json に記述する。
 */
import { z } from "zod";

import rawPermanentUpgrades from "./permanentUpgrades.json";
import type { PermanentUpgradeDefinition, PermanentUpgradeId } from "./types";

const REQUIRED_PERMANENT_UPGRADE_IDS: readonly PermanentUpgradeId[] = [
  "start_sp",
  "base_dmg",
  "round_time",
  "invoice_reduction",
];

const permanentUpgradeJsonSchema = z
  .object({
    id: z.enum(["start_sp", "base_dmg", "round_time", "invoice_reduction"]),
    name: z.string().min(1, "name は必須です"),
    description: z.string(),
    maxLevel: z.number().int().min(1, "maxLevel は1以上の整数である必要があります"),
    costs: z.array(z.number().nonnegative()),
    effects: z.array(z.number()),
    effectUnit: z.string(),
  })
  .strict();

const permanentUpgradesFileSchema = z
  .object({
    $schema: z.string().optional(),
    upgrades: z.array(permanentUpgradeJsonSchema).min(1, "少なくとも1つの永続強化が必要です"),
  })
  .strict();

export type PermanentUpgradeJson = z.infer<typeof permanentUpgradeJsonSchema>;

export class PermanentUpgradeValidationError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(`permanentUpgrades.json の定義が不正です:\n- ${problems.join("\n- ")}`);
    this.name = "PermanentUpgradeValidationError";
    this.problems = problems;
  }
}

export interface PermanentUpgradesModel {
  upgrades: Record<PermanentUpgradeId, PermanentUpgradeDefinition>;
  upgradeList: PermanentUpgradeDefinition[];
  upgradeIds: PermanentUpgradeId[];
}

export function buildPermanentUpgrades(raw: unknown): PermanentUpgradesModel {
  const parsed = permanentUpgradesFileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new PermanentUpgradeValidationError([z.prettifyError(parsed.error)]);
  }

  const problems: string[] = [];
  const rawList = parsed.data.upgrades;
  const seenIds = new Set<PermanentUpgradeId>();

  for (const item of rawList) {
    if (seenIds.has(item.id)) {
      problems.push(`id "${item.id}" が重複しています`);
    }
    seenIds.add(item.id);

    if (item.costs.length !== item.maxLevel) {
      problems.push(
        `"${item.id}": costs の要素数 (${item.costs.length}) が maxLevel (${item.maxLevel}) と一致しません`,
      );
    }
    if (item.effects.length !== item.maxLevel) {
      problems.push(
        `"${item.id}": effects の要素数 (${item.effects.length}) が maxLevel (${item.maxLevel}) と一致しません`,
      );
    }
  }

  for (const reqId of REQUIRED_PERMANENT_UPGRADE_IDS) {
    if (!seenIds.has(reqId)) {
      problems.push(`必須の永続強化 id "${reqId}" が定義されていません`);
    }
  }

  if (problems.length > 0) {
    throw new PermanentUpgradeValidationError(problems);
  }

  const upgrades = {} as Record<PermanentUpgradeId, PermanentUpgradeDefinition>;
  const upgradeList: PermanentUpgradeDefinition[] = [];
  const upgradeIds: PermanentUpgradeId[] = [];

  for (const item of rawList) {
    const def: PermanentUpgradeDefinition = {
      id: item.id,
      name: item.name,
      description: item.description,
      maxLevel: item.maxLevel,
      costs: item.costs,
      effects: item.effects,
      effectUnit: item.effectUnit,
    };
    upgrades[item.id] = def;
    upgradeList.push(def);
    upgradeIds.push(item.id);
  }

  return {
    upgrades,
    upgradeList,
    upgradeIds,
  };
}

export const PERMANENT_UPGRADES_MODEL: PermanentUpgradesModel =
  buildPermanentUpgrades(rawPermanentUpgrades);
export const PERMANENT_UPGRADES: Record<PermanentUpgradeId, PermanentUpgradeDefinition> =
  PERMANENT_UPGRADES_MODEL.upgrades;
export const PERMANENT_UPGRADE_LIST: PermanentUpgradeDefinition[] =
  PERMANENT_UPGRADES_MODEL.upgradeList;
export const PERMANENT_UPGRADE_IDS: PermanentUpgradeId[] = PERMANENT_UPGRADES_MODEL.upgradeIds;
