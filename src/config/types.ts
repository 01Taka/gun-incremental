// ゲーム内の各種データ型定義

export type WeaponId = "handgun" | "rifle" | "sniper";

export interface WeaponDefinition {
  id: WeaponId;
  name: string;
  description: string;
  fireInterval: number; // 秒単位 (例: 0.3)
  damage: number;
  magazineSize: number; // 1マガジンの装弾数
  reloadTime: number; // リロード所要時間 (秒)
  price: number; // SP
  unlockRound: number; // ショップに並ぶラウンド
}

export type TargetId = "standard" | "hard" | "gold" | "electric" | "small" | "time";

export interface TargetDefinition {
  id: TargetId;
  name: string;
  hp: number;
  baseSp: number;
  weight: number;
  radius: number;
  color: number; // 0xRRGGBB
  border: number;
  lifetime?: number; // 秒 (無指定ならラウンド中持続)
  unlockPoints?: number; // 解放に必要な累計的ポイント
  description: string;
}

// スキルノードIDは skillTree.json で自由に定義できるため string
export type SkillNodeId = string;

/**
 * 魚の骨型スキルツリーのノード種別
 * - large  (大): 背骨。ルートから真下へ一直線に伸びる
 * - medium (中): 肋骨。大ノードの左右へ水平に伸びる
 * - small  (小): 中ノードから真下へ伸びる (背骨と並行)
 */
export type SkillNodeSize = "large" | "medium" | "small";

export type SkillTreeSide = "left" | "right";

/**
 * スキル効果が加算されるステータス。
 * 同じ stat を持つノードが複数あれば効果は合算される。
 */
export type SkillStatId =
  | "damage"
  | "critRate"
  | "fireRateReduction"
  | "magazineCapacity"
  | "magazineMultiplier"
  | "reloadTimeReduction"
  | "roundTime"
  | "maxTargets"
  | "spMultiplier"
  | "targetPointMultiplier"
  | "shopDiscount"
  | "timeTargetBonus"
  | "chainDamage";

export interface SkillDefinition {
  id: SkillNodeId;
  size: SkillNodeSize;
  parent?: SkillNodeId; // ルートのみ未指定
  side?: SkillTreeSide; // 大→中 の接続時のみ指定
  name: string;
  description: string;
  icon: string;
  category: "combat" | "economy";
  maxLevel: number;
  costs: number[]; // 各レベルのコスト
  requirement?: {
    nodeId: SkillNodeId; // = parent
    level: number; // = unlockLevel
  };
  effect: {
    stat: SkillStatId;
    perLevel: number;
  };
}

export type PassiveId =
  "sp_bonus" | "dmg_bonus" | "time_bonus" | "target_bonus" | "shop_discount" | "tp_bonus";

export interface PassiveDefinition {
  id: PassiveId;
  name: string;
  description: string;
  icon: string;
}

export type PermanentUpgradeId =
  "start_sp" | "base_dmg" | "round_time" | "tp_gain" | "invoice_reduction";

export interface PermanentUpgradeDefinition {
  id: PermanentUpgradeId;
  name: string;
  description: string;
  maxLevel: number;
  costs: number[]; // 各レベルの必要ポイント [15, 35, 75]
  effects: number[]; // レベル1, 2, 3の効果量
  effectUnit: string; // "+", "%" などの表示用
}

// 永続セーブデータ構造 (localStorage)
export interface PersistentSaveData {
  permanentPoints: number;
  permanentUpgrades: Record<PermanentUpgradeId, number>;
  settings: {
    autoFire: boolean;
  };
  stats: {
    totalRuns: number;
    totalInvoicesPaid: number;
    highestRound: number;
    cleared: boolean;
  };
}

// 1ラン内の統計情報
export interface RunStats {
  round: number;
  totalSpEarned: number;
  totalInvoicesPaidAmount: number;
  invoicesPassed: number;
  targetsDestroyedTotal: number;
  targetsDestroyedByType: Record<TargetId, number>;
  weaponsPurchased: WeaponId[];
  cleared: boolean;
}
