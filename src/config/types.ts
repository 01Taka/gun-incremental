// ゲーム内の各種データ型定義

export type WeaponId = "handgun" | "rifle" | "sniper";

export interface WeaponDefinition {
  id: WeaponId;
  name: string;
  description: string;
  fireInterval: number; // 秒単位 (例: 0.3)
  damage: number;
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
  description: string;
}

export type SkillNodeId =
  | "damage_base"
  | "round_time"
  | "fire_rate"
  | "sp_multiplier"
  | "max_targets"
  | "crit_rate"
  | "target_point_mult"
  | "shop_discount"
  | "time_target_bonus"
  | "chain_damage";

export interface SkillDefinition {
  id: SkillNodeId;
  name: string;
  description: string;
  icon: string;
  category: "combat" | "economy";
  treePos: { x: number; y: number };
  maxLevel: number;
  costs: number[]; // 各レベルのコスト
  requirement?: {
    nodeId: SkillNodeId;
    level: number;
  };
  effectPerLevel: number;
  effectUnit: string;
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
