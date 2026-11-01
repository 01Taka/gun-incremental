import type {
  PassiveDefinition,
  PassiveId,
  PermanentUpgradeDefinition,
  PermanentUpgradeId,
  WeaponDefinition,
  WeaponId,
} from "./types";

export { TARGET_IDS, TARGET_LIST, TARGET_UNLOCK_SEQUENCE, TARGETS } from "./targets";

export const WEAPONS: Record<WeaponId, WeaponDefinition> = {
  handgun: {
    id: "handgun",
    name: "ハンドガン",
    description: "手軽に扱える標準銃。連射が早くリロードも素早い。",
    fireInterval: 0.3,
    damage: 1,
    magazineSize: 8,
    reloadTime: 1.0,
    price: 0,
    unlockRound: 1,
  },
  rifle: {
    id: "rifle",
    name: "ライフル",
    description: "中威力と豊富なマガジン数を兼ね備えた連射銃。",
    fireInterval: 0.6,
    damage: 3,
    magazineSize: 10,
    reloadTime: 1.3,
    price: 120,
    unlockRound: 3,
  },
  sniper: {
    id: "sniper",
    name: "スナイパー",
    description: "極めて高威力だが装弾数が少なくリロードが重い。硬い的を一撃で破壊。",
    fireInterval: 1.15,
    damage: 8,
    magazineSize: 5,
    reloadTime: 1.7,
    price: 450,
    unlockRound: 6,
  },
};

export const PASSIVES: Record<PassiveId, PassiveDefinition> = {
  sp_bonus: {
    id: "sp_bonus",
    name: "富の蓄積",
    description: "SP獲得量 +10%",
    icon: "💰",
  },
  dmg_bonus: {
    id: "dmg_bonus",
    name: "徹甲弾",
    description: "全武器の基礎ダメージ +15%",
    icon: "💥",
  },
  time_bonus: {
    id: "time_bonus",
    name: "クロックシフト",
    description: "ラウンド時間 +1.0秒",
    icon: "⏳",
  },
  target_bonus: {
    id: "target_bonus",
    name: "的の増殖",
    description: "ラウンド開始時の的出現数 +1",
    icon: "🎯",
  },
  shop_discount: {
    id: "shop_discount",
    name: "裏ルート調達",
    description: "ショップの武器価格 -10%",
    icon: "🏷️",
  },
  tp_bonus: {
    id: "tp_bonus",
    name: "解析加速",
    description: "的ポイント獲得量 +10%",
    icon: "📊",
  },
};

export const PERMANENT_UPGRADES: Record<PermanentUpgradeId, PermanentUpgradeDefinition> = {
  start_sp: {
    id: "start_sp",
    name: "初期資金",
    description: "ラン開始時の所持SPを増加させる",
    maxLevel: 3,
    costs: [15, 35, 75],
    effects: [30, 80, 160],
    effectUnit: "SP",
  },
  base_dmg: {
    id: "base_dmg",
    name: "射撃適性",
    description: "ラン開始時の基礎ダメージを増加させる",
    maxLevel: 3,
    costs: [15, 35, 75],
    effects: [1, 2, 3],
    effectUnit: "ダメージ",
  },
  round_time: {
    id: "round_time",
    name: "集中力持続",
    description: "ラウンドの制限時間を延長する",
    maxLevel: 3,
    costs: [15, 35, 75],
    effects: [0.5, 1.0, 1.5],
    effectUnit: "秒",
  },
  tp_gain: {
    id: "tp_gain",
    name: "研究効率化",
    description: "的ポイントの獲得量を増加させる",
    maxLevel: 3,
    costs: [15, 35, 75],
    effects: [15, 30, 50],
    effectUnit: "%",
  },
  invoice_reduction: {
    id: "invoice_reduction",
    name: "税務対策",
    description: "5ラウンドごとの請求額を軽減する",
    maxLevel: 3,
    costs: [15, 35, 75],
    effects: [5, 10, 15],
    effectUnit: "%",
  },
};

// 請求設定
export const INVOICE_CONFIG = {
  intervalRounds: 5, // 5ラウンドごと
  baseCost: 150, // 初回請求額
  growthRate: 1.6, // 成長率
  permanentPointRate: 0.02, // 支払額の2%を永続ポイントへ変換
};

// ラウンド基本設定
export const ROUND_CONFIG = {
  baseDuration: 7.0, // 初期7秒
  baseTargetCount: 3, // 初期同時出現数
  maxTargetCountCap: 8, // 最大同時出現上限
  timeTargetBaseExtension: 0.8, // 時間の的の基本延長時間(秒)
};
