import { AutoTurretSkill } from "./AutoTurretSkill";
import { ShrapnelSkill } from "./ShrapnelSkill";
import type { RoundHook } from "./types";

export type SkillHookFactory = (level: number) => RoundHook;

/**
 * 全ての動的インゲームスキルの登録簿（Registry）
 * 新しいスキルを作成したら、ここに対応するファクトリ関数を登録するだけで利用可能になります。
 */
export const SKILL_HOOK_REGISTRY: Record<string, SkillHookFactory> = {
  shrapnel_burst: (level) => new ShrapnelSkill(level),
  auto_turret: (level) => new AutoTurretSkill(level),
};
