/**
 * 特殊スキル・永続強化・パッシブの個別コールバック（カスタム効果）レジストリ
 *
 * 基本的なステータス上昇は各 JSON（skillTree.json 等）から汎用コールバックが自動生成されるが、
 * 「特定武器装備時のみ発動する条件付き効果」「所持リソース連動」「複合ステータス変更」など、
 * JSON の静的パラメータ定義だけでは表現できない特殊ロジックをここで個別定義する。
 */
import type { PassiveId, PermanentUpgradeId, SkillNodeId } from "../config/types";
import type { StatAccumulator, StatContext } from "./StatPipeline";

export type CustomEffectFn = (
  acc: StatAccumulator,
  context: StatContext,
  levelOrStacks: number,
) => void;

/**
 * スキルノード固有のカスタム効果マップ
 * キーに対象の SkillNodeId を指定することで、JSON定義の基本ステータス上昇に加えて
 * このコールバックが自動的にモディファイア・パイプラインへ合流する。
 */
export const CUSTOM_SKILL_EFFECTS: Partial<Record<SkillNodeId, CustomEffectFn>> = {
  // 例（特殊効果のサンプル）:
  // sniper_mastery: (acc, context, level) => {
  //   if (context.equippedWeapon === "sniper") {
  //     acc.damageMultiplier += 0.15 * level;
  //   }
  // },
};

/**
 * 永続強化固有のカスタム効果マップ
 */
export const CUSTOM_PERMANENT_EFFECTS: Partial<Record<PermanentUpgradeId, CustomEffectFn>> = {};

/**
 * パッシブボーナス固有のカスタム効果マップ
 */
export const CUSTOM_PASSIVE_EFFECTS: Partial<Record<PassiveId, CustomEffectFn>> = {};

/**
 * 動的にカスタムスキル効果を追加・登録するヘルパー
 */
export function registerCustomSkillEffect(nodeId: SkillNodeId, fn: CustomEffectFn): void {
  CUSTOM_SKILL_EFFECTS[nodeId] = fn;
}

/**
 * 動的にカスタム永続強化効果を追加・登録するヘルパー
 */
export function registerCustomPermanentEffect(id: PermanentUpgradeId, fn: CustomEffectFn): void {
  CUSTOM_PERMANENT_EFFECTS[id] = fn;
}

/**
 * 動的にカスタムパッシブ効果を追加・登録するヘルパー
 */
export function registerCustomPassiveEffect(id: PassiveId, fn: CustomEffectFn): void {
  CUSTOM_PASSIVE_EFFECTS[id] = fn;
}
