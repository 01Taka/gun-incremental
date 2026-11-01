/**
 * JSON静的定義から標準ステータス変更コールバック（StatModifier）を自動生成するファクトリ
 *
 * skillTree.json, permanentUpgrades.json, passives.json の各定義と
 * 現在の習得レベル／スタック数から、中間集計バケット（StatAccumulator）への
 * 参照書き換えを行う汎用コールバックを生成する。
 */
import { PASSIVES, PERMANENT_UPGRADES } from "../config/gameData";
import { SKILLS } from "../config/skillTree";
import type { PassiveId, PermanentUpgradeId, SkillNodeId } from "../config/types";
import type { StatAccumulator, StatModifier } from "./StatPipeline";

/**
 * スキル定義から汎用コールバック（モディファイア）を構築
 */
export function createSkillModifier(nodeId: SkillNodeId, level: number): StatModifier | null {
  if (level <= 0) return null;
  const def = SKILLS[nodeId];
  if (!def) return null;

  const totalValue = level * def.effect.perLevel;

  return {
    id: `skill:${nodeId}`,
    name: def.name,
    source: "skill",
    apply: (acc: StatAccumulator) => {
      switch (def.effect.stat) {
        case "damage":
          acc.damageFlat += totalValue;
          break;
        case "critRate":
          acc.critRate += totalValue;
          break;
        case "fireRateReduction":
          acc.fireRateReduction += totalValue;
          break;
        case "magazineCapacity":
          acc.magazineCapacityFlat += totalValue;
          break;
        case "magazineMultiplier":
          acc.magazineMultiplier += totalValue;
          break;
        case "reloadTimeReduction":
          acc.reloadTimeReduction += totalValue;
          break;
        case "roundTime":
          acc.roundTimeFlat += totalValue;
          break;
        case "maxTargets":
          acc.maxTargetsFlat += totalValue;
          break;
        case "spMultiplier":
          acc.spSkillMult += totalValue;
          break;
        case "targetPointMultiplier":
          acc.tpSkillMult += totalValue;
          break;
        case "shopDiscount":
          acc.shopDiscount += totalValue;
          break;
        case "timeTargetBonus":
          acc.timeTargetBonus += totalValue;
          break;
        case "chainDamage":
          acc.chainDamageMultiplier += totalValue;
          break;
      }
    },
  };
}

/**
 * 永続強化定義から汎用コールバック（モディファイア）を構築
 */
export function createPermanentUpgradeModifier(
  id: PermanentUpgradeId,
  level: number,
): StatModifier | null {
  if (level <= 0) return null;
  const def = PERMANENT_UPGRADES[id];
  if (!def) return null;

  const rawEffect = def.effects[level - 1] ?? 0;

  return {
    id: `perm:${id}`,
    name: def.name,
    source: "permanent",
    apply: (acc: StatAccumulator) => {
      switch (id) {
        case "base_dmg":
          acc.damageFlat += rawEffect;
          break;
        case "round_time":
          acc.roundTimeFlat += rawEffect;
          break;
        case "tp_gain":
          acc.tpPermMult += rawEffect / 100;
          break;
        case "invoice_reduction":
          acc.invoiceReduction += rawEffect / 100;
          break;
        case "start_sp":
          // ラウンド中の戦闘ステータスには影響しない（初期SPのみ）
          break;
      }
    },
  };
}

/**
 * パッシブボーナス定義から汎用コールバック（モディファイア）を構築
 */
export function createPassiveModifier(id: PassiveId, stacks: number): StatModifier | null {
  if (stacks <= 0) return null;
  const def = PASSIVES[id];
  if (!def) return null;

  const totalValue = stacks * def.effectPerStack;

  return {
    id: `passive:${id}`,
    name: def.name,
    source: "passive",
    apply: (acc: StatAccumulator) => {
      switch (id) {
        case "dmg_bonus":
          acc.damageMultiplier += totalValue;
          break;
        case "crit_bonus":
          acc.critRate += totalValue;
          break;
        case "time_bonus":
          acc.roundTimeFlat += totalValue;
          break;
        case "target_bonus":
          acc.maxTargetsFlat += totalValue;
          break;
        case "sp_bonus":
          acc.spPassiveMult += totalValue;
          break;
        case "tp_bonus":
          acc.tpPassiveMult += totalValue;
          break;
      }
    },
  };
}
