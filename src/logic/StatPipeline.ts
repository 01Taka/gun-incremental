/**
 * モディファイア・パイプライン（コールバックリスト方式）によるステータス計算
 *
 * スキル・永続強化・パッシブ・カスタム効果をコールバック関数リストとして表現し、
 * 中間バケット（StatAccumulator）への参照書き換えをループ処理で行った後、
 * キャップや丸め処理を適用して最終実効値を導出する。
 */
import {
  COMBAT_CONFIG,
  PASSIVES,
  PERMANENT_UPGRADES,
  ROUND_CONFIG,
  WEAPONS,
} from "../config/gameData";
import { SKILL_IDS, SKILLS } from "../config/skillTree";
import type {
  PassiveId,
  PermanentUpgradeId,
  SkillNodeId,
  SkillStatId,
  WeaponId,
} from "../config/types";
import {
  CUSTOM_PASSIVE_EFFECTS,
  CUSTOM_PERMANENT_EFFECTS,
  CUSTOM_SKILL_EFFECTS,
} from "./customEffects";
import {
  createPassiveModifier,
  createPermanentUpgradeModifier,
  createSkillModifier,
} from "./modifierFactory";

/**
 * 実効プロパティ計算に必要な状態入力コンテキスト
 */
export interface StatContext {
  equippedWeapon?: WeaponId;
  skillLevels: Record<SkillNodeId, number>;
  passives: Record<PassiveId, number>;
  permanentUpgrades: Record<PermanentUpgradeId, number>;
}

/**
 * コールバックが値を直接書き換える中間集計バケット
 */
export interface StatAccumulator {
  // 戦闘系
  damageFlat: number; // 基礎ダメージ加算 (スキル + 永続)
  damageMultiplier: number; // ダメージ乗算 (パッシブ dmg_bonus 等)
  critRate: number; // 会心率加算 (スキル + パッシブ)
  fireRateReduction: number; // 連射短縮率 (スキル)
  magazineCapacityFlat: number; // 装弾数固定加算 (スキル)
  magazineMultiplier: number; // 装弾数乗算 (スキル)
  reloadTimeReduction: number; // リロード短縮率 (スキル)
  chainDamageMultiplier: number; // 誘爆倍率加算 (スキル)

  // 進行・経済系
  roundTimeFlat: number; // 制限時間加算 (スキル + 永続 + パッシブ)
  maxTargetsFlat: number; // 出現数加算 (スキル + パッシブ)
  spSkillMult: number; // SP獲得倍率のスキル枠 (1 + Σ)
  spPassiveMult: number; // SP獲得倍率のパッシブ枠 (1 + Σ)
  shopDiscount: number; // ショップ割引率 (スキル)
  timeTargetBonus: number; // 懐中時計延長加算 (スキル)
  invoiceReduction: number; // 上納金軽減率 (永続)
  targetRespawnRateFlat: number; // 標的復活率加算 (スキル)
}

/**
 * 最終確定された実効ステータス値
 */
export interface EffectiveStats {
  damage: number;
  critDamage: number;
  critRate: number;
  fireInterval: number;
  magazineSize: number;
  reloadTime: number;
  roundDuration: number;
  maxTargets: number;
  spMultiplier: number;
  shopDiscount: number;
  weaponPrice: number;
  timeTargetBonus: number;
  invoiceReduction: number;
  targetRespawnRate: number;
  getChainDamage: (sourceDamage: number) => number;
}

/**
 * モディファイア（コールバック）定義
 * acc の参照を直接書き換える。
 */
export type StatModifierFn = (acc: StatAccumulator, context: StatContext) => void;

export interface StatModifier {
  readonly id: string;
  readonly name?: string;
  readonly source: "skill" | "permanent" | "passive" | "custom";
  readonly apply: StatModifierFn;
}

/**
 * 中間バケットの初期化
 */
export function createInitialAccumulator(): StatAccumulator {
  return {
    damageFlat: 0,
    damageMultiplier: 1.0,
    critRate: 0,
    fireRateReduction: 0,
    magazineCapacityFlat: 0,
    magazineMultiplier: 0,
    reloadTimeReduction: 0,
    chainDamageMultiplier: 1.0,
    roundTimeFlat: 0,
    maxTargetsFlat: 0,
    spSkillMult: 1.0,
    spPassiveMult: 1.0,
    shopDiscount: 0,
    timeTargetBonus: 0,
    invoiceReduction: 0,
    targetRespawnRateFlat: 0,
  };
}

export class StatPipeline {
  /**
   * 現在のコンテキスト（習得状況）から有効な全モディファイアのコールバックリストを収集
   * （JSONから自動生成された汎用コールバック ＋ customEffects に登録された個別特殊コールバック）
   */
  public static collectModifiers(
    context: StatContext,
    customModifiers: StatModifier[] = [],
  ): StatModifier[] {
    const modifiers: StatModifier[] = [];

    // 1. スキルツリー (JSON汎用 + 個別カスタム)
    for (const nodeId of SKILL_IDS) {
      const level = context.skillLevels[nodeId] ?? 0;
      if (level <= 0) continue;

      const mod = createSkillModifier(nodeId, level);
      if (mod) modifiers.push(mod);

      const customFn = CUSTOM_SKILL_EFFECTS[nodeId];
      if (customFn) {
        modifiers.push({
          id: `custom:skill:${nodeId}`,
          name: SKILLS[nodeId]?.name,
          source: "custom",
          apply: (acc, ctx) => customFn(acc, ctx, level),
        });
      }
    }

    // 2. 永続強化 (JSON汎用 + 個別カスタム)
    for (const permId of Object.keys(context.permanentUpgrades) as PermanentUpgradeId[]) {
      const level = context.permanentUpgrades[permId] ?? 0;
      if (level <= 0) continue;

      const mod = createPermanentUpgradeModifier(permId, level);
      if (mod) modifiers.push(mod);

      const customFn = CUSTOM_PERMANENT_EFFECTS[permId];
      if (customFn) {
        modifiers.push({
          id: `custom:perm:${permId}`,
          name: PERMANENT_UPGRADES[permId]?.name,
          source: "custom",
          apply: (acc, ctx) => customFn(acc, ctx, level),
        });
      }
    }

    // 3. パッシブボーナス (JSON汎用 + 個別カスタム)
    for (const passiveId of Object.keys(context.passives) as PassiveId[]) {
      const stacks = context.passives[passiveId] ?? 0;
      if (stacks <= 0) continue;

      const mod = createPassiveModifier(passiveId, stacks);
      if (mod) modifiers.push(mod);

      const customFn = CUSTOM_PASSIVE_EFFECTS[passiveId];
      if (customFn) {
        modifiers.push({
          id: `custom:passive:${passiveId}`,
          name: PASSIVES[passiveId]?.name,
          source: "custom",
          apply: (acc, ctx) => customFn(acc, ctx, stacks),
        });
      }
    }

    // 4. 引数で直接渡された追加のカスタムコールバック（一時バフなど）
    if (customModifiers.length > 0) {
      modifiers.push(...customModifiers);
    }

    return modifiers;
  }

  /**
   * コールバックリストをループ実行し、中間バケットに反映して最終値を確定する
   */
  public static execute(
    context: StatContext,
    weaponId: WeaponId = context.equippedWeapon ?? "handgun",
    customModifiers: StatModifier[] = [],
  ): EffectiveStats {
    const acc = createInitialAccumulator();
    const modifiers = this.collectModifiers(context, customModifiers);

    // ループで参照を直接書き換える (Modifier Pipeline)
    for (let i = 0; i < modifiers.length; i++) {
      modifiers[i].apply(acc, context);
    }

    return this.finalize(acc, weaponId);
  }

  /**
   * 中間バケットから最終ステータスへの確定処理（キャップ・四捨五入適用）
   */
  public static finalize(acc: StatAccumulator, weaponId: WeaponId): EffectiveStats {
    const weapon = WEAPONS[weaponId];

    // 戦闘計算
    const baseDamage = (weapon.damage + acc.damageFlat) * acc.damageMultiplier;
    const damage = Math.max(1, Math.round(baseDamage));
    const critDamage = Math.max(1, Math.round(baseDamage * COMBAT_CONFIG.critMultiplier));
    const critRate = Math.min(COMBAT_CONFIG.maxCritRate, acc.critRate);

    const fireReduction = Math.min(COMBAT_CONFIG.maxFireRateReduction, acc.fireRateReduction);
    const fireInterval = Math.max(
      COMBAT_CONFIG.minFireInterval,
      weapon.fireInterval * (1 - fireReduction),
    );

    const magazineSize = Math.max(
      1,
      Math.round((weapon.magazineSize + acc.magazineCapacityFlat) * (1 + acc.magazineMultiplier)),
    );

    const reloadReduction = Math.min(COMBAT_CONFIG.maxReloadTimeReduction, acc.reloadTimeReduction);
    const reloadTime = Math.max(
      COMBAT_CONFIG.minReloadTime,
      weapon.reloadTime * (1 - reloadReduction),
    );

    // 進行・経済計算
    const roundDuration = ROUND_CONFIG.baseDuration + acc.roundTimeFlat;
    const maxTargets = Math.min(
      ROUND_CONFIG.maxTargetCountCap,
      ROUND_CONFIG.baseTargetCount + acc.maxTargetsFlat,
    );
    const spMultiplier = acc.spSkillMult * acc.spPassiveMult;

    const shopDiscount = Math.min(COMBAT_CONFIG.maxShopDiscount, acc.shopDiscount);
    const weaponPrice = Math.max(0, Math.floor(weapon.price * (1 - shopDiscount)));
    const timeTargetBonus = ROUND_CONFIG.timeTargetBaseExtension + acc.timeTargetBonus;
    const targetRespawnRate = Math.min(
      1.0,
      ROUND_CONFIG.baseRespawnRate + acc.targetRespawnRateFlat,
    );

    return {
      damage,
      critDamage,
      critRate,
      fireInterval,
      magazineSize,
      reloadTime,
      roundDuration,
      maxTargets,
      spMultiplier,
      shopDiscount,
      weaponPrice,
      timeTargetBonus,
      invoiceReduction: acc.invoiceReduction,
      targetRespawnRate,
      getChainDamage: (sourceDamage: number) =>
        Math.max(1, Math.round(sourceDamage * acc.chainDamageMultiplier)),
    };
  }

  /**
   * 指定ステータスに対するスキル効果の合計値（個別参照用）
   */
  public static getSkillStat(skillLevels: Record<SkillNodeId, number>, stat: SkillStatId): number {
    let total = 0;
    for (const id of SKILL_IDS) {
      const def = SKILLS[id];
      if (def && def.effect.stat === stat) {
        total += (skillLevels[id] ?? 0) * def.effect.perLevel;
      }
    }
    return total;
  }
}
