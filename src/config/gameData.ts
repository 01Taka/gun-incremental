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
    name: "ピースメイカー",
    description: "連射とリロードが速い、扱いやすい6連発リボルバー。",
    fireInterval: 0.28,
    damage: 1,
    magazineSize: 6,
    reloadTime: 0.8,
    price: 0,
    unlockRound: 1,
  },
  rifle: {
    id: "rifle",
    name: "ウィンチェスター銃",
    description: "中威力で装弾数が多いレバーアクション連発銃。",
    fireInterval: 0.6,
    damage: 3,
    magazineSize: 10,
    reloadTime: 1.3,
    price: 120,
    unlockRound: 3,
  },
  sniper: {
    id: "sniper",
    name: "シャープス大口径銃",
    description: "装弾数は少なくリロードも重いが、硬い標的も一撃で砕く高威力ライフル。",
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
    name: "賞金稼ぎの嗅覚",
    description: "獲得賞金（$） +10%",
    icon: "💰",
  },
  dmg_bonus: {
    id: "dmg_bonus",
    name: "大口径鉛弾",
    description: "すべての銃の基礎威力 +15%",
    icon: "💥",
  },
  time_bonus: {
    id: "time_bonus",
    name: "早撃ちの集中",
    description: "ラウンド制限時間 +1.0秒",
    icon: "⏳",
  },
  target_bonus: {
    id: "target_bonus",
    name: "一斉指名手配",
    description: "標的の同時出現数 +1",
    icon: "🎯",
  },
  shop_discount: {
    id: "shop_discount",
    name: "銃砲店の顔パス",
    description: "銃砲店の武器価格 -10%",
    icon: "🏷️",
  },
  tp_bonus: {
    id: "tp_bonus",
    name: "広域指名手配",
    description: "手配ポイント（新標的の解放） +10%",
    icon: "📜",
  },
};

export const PERMANENT_UPGRADES: Record<PermanentUpgradeId, PermanentUpgradeDefinition> = {
  start_sp: {
    id: "start_sp",
    name: "砂金の軍資金",
    description: "ゲーム開始時の初期所持金（$）を増やす",
    maxLevel: 3,
    costs: [15, 35, 75],
    effects: [30, 80, 160],
    effectUnit: "$",
  },
  base_dmg: {
    id: "base_dmg",
    name: "伝説の早撃ち術",
    description: "ゲーム開始時からの基礎威力を増やす",
    maxLevel: 3,
    costs: [15, 35, 75],
    effects: [1, 2, 3],
    effectUnit: "",
  },
  round_time: {
    id: "round_time",
    name: "死線の集中力",
    description: "ラウンドの制限時間を延長する",
    maxLevel: 3,
    costs: [15, 35, 75],
    effects: [0.5, 1.0, 1.5],
    effectUnit: "秒",
  },
  tp_gain: {
    id: "tp_gain",
    name: "手配書コレクター",
    description: "新しい標的を解放する「手配ポイント」の獲得量を増やす",
    maxLevel: 3,
    costs: [15, 35, 75],
    effects: [15, 30, 50],
    effectUnit: "%",
  },
  invoice_reduction: {
    id: "invoice_reduction",
    name: "保安官への袖の下",
    description: "5ラウンドごとの「保安官の上納金」を軽減する",
    maxLevel: 3,
    costs: [15, 35, 75],
    effects: [5, 10, 15],
    effectUnit: "%",
  },
};

// 保安官の上納金（請求）設定
export const INVOICE_CONFIG = {
  intervalRounds: 5, // 5ラウンドごと
  baseCost: 150, // 初回上納額 ($)
  growthRate: 1.6, // 成長率
  permanentPointRate: 0.02, // 支払額の2%を名声バッジへ変換
};

// ラウンド基本設定
export const ROUND_CONFIG = {
  baseDuration: 7.0, // 初期7秒
  baseTargetCount: 3, // 初期同時出現数
  maxTargetCountCap: 8, // 最大同時出現上限
  timeTargetBaseExtension: 0.8, // 懐中時計の基本延長時間(秒)
};
