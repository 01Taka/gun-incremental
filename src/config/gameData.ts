import type {
  PassiveDefinition,
  PassiveId,
  PermanentUpgradeDefinition,
  PermanentUpgradeId,
  SkillDefinition,
  SkillNodeId,
  TargetDefinition,
  TargetId,
  WeaponDefinition,
  WeaponId,
} from "./types";

export const WEAPONS: Record<WeaponId, WeaponDefinition> = {
  handgun: {
    id: "handgun",
    name: "ハンドガン",
    description: "手軽に扱える標準銃。連射が早く小回りが利く。",
    fireInterval: 0.3,
    damage: 1,
    price: 0,
    unlockRound: 1,
  },
  rifle: {
    id: "rifle",
    name: "ライフル",
    description: "中威力と安定した集弾性を兼ね備えた連射銃。",
    fireInterval: 0.6,
    damage: 3,
    price: 120,
    unlockRound: 3,
  },
  sniper: {
    id: "sniper",
    name: "スナイパー",
    description: "極めて高威力だが連射が遅い。硬い的を一撃で破壊。",
    fireInterval: 1.2,
    damage: 8,
    price: 450,
    unlockRound: 6,
  },
};

export const TARGETS: Record<TargetId, TargetDefinition> = {
  standard: {
    id: "standard",
    name: "標準",
    hp: 1,
    baseSp: 5,
    weight: 100,
    radius: 46,
    color: 0x38bdf8, // light blue
    border: 0x0284c7,
    description: "HP低・SP低。もっとも標準的な的。",
  },
  hard: {
    id: "hard",
    name: "硬い的",
    hp: 5,
    baseSp: 25,
    weight: 40,
    radius: 54,
    color: 0x94a3b8, // slate grey
    border: 0x475569,
    description: "HP高・SP中。装甲が硬く複数回攻撃が必要。",
  },
  gold: {
    id: "gold",
    name: "金の的",
    hp: 2,
    baseSp: 80,
    weight: 15,
    radius: 40,
    color: 0xfacc15, // yellow gold
    border: 0xca8a04,
    lifetime: 1.5,
    description: "SP高・消滅が早い。短時間で消えるため最優先で狙おう。",
  },
  electric: {
    id: "electric",
    name: "電撃の的",
    hp: 3,
    baseSp: 22,
    weight: 30,
    radius: 44,
    color: 0xa855f7, // purple
    border: 0x7e22ce,
    description: "破壊時に放電し、画面内の他の的に連鎖ダメージを与える。",
  },
  small: {
    id: "small",
    name: "小さい的",
    hp: 2,
    baseSp: 22,
    weight: 30,
    radius: 26,
    color: 0xec4899, // pink
    border: 0xbe185d,
    description: "当てにくいがSP高め。素早く正確に狙う的。",
  },
  time: {
    id: "time",
    name: "時間の的",
    hp: 3,
    baseSp: 12,
    weight: 15,
    radius: 42,
    color: 0x22c55e, // green
    border: 0x15803d,
    description: "破壊するとラウンド残り時間が延長される貴重な的。",
  },
};

// 的の解放順序と各解放に必要な累計的ポイント
export const TARGET_UNLOCK_SEQUENCE: { targetId: TargetId; requiredPoints: number }[] = [
  { targetId: "standard", requiredPoints: 0 }, // 最初から解放
  { targetId: "hard", requiredPoints: 200 },
  { targetId: "gold", requiredPoints: 900 },
  { targetId: "electric", requiredPoints: 2800 },
  { targetId: "small", requiredPoints: 8500 },
  { targetId: "time", requiredPoints: 25000 },
];

export const SKILLS: Record<SkillNodeId, SkillDefinition> = {
  damage_base: {
    id: "damage_base",
    name: "基礎ダメージ",
    description: "全武器の基礎攻撃力を増加させます",
    icon: "⚔️",
    category: "combat",
    treePos: { x: 260, y: 80 },
    maxLevel: 5,
    costs: [20, 50, 130, 320, 800],
    effectPerLevel: 1,
    effectUnit: "ダメージ",
  },
  round_time: {
    id: "round_time",
    name: "ラウンド時間延長",
    description: "射撃ラウンドの制限時間を延長します",
    icon: "⏱️",
    category: "economy",
    treePos: { x: 580, y: 80 },
    maxLevel: 5,
    costs: [25, 60, 150, 380, 900],
    effectPerLevel: 1.0,
    effectUnit: "秒",
  },
  fire_rate: {
    id: "fire_rate",
    name: "連射間隔短縮",
    description: "武器の発射クールダウンを短縮します",
    icon: "⚡",
    category: "combat",
    treePos: { x: 140, y: 230 },
    maxLevel: 3,
    costs: [45, 120, 300],
    requirement: { nodeId: "damage_base", level: 1 },
    effectPerLevel: 0.1,
    effectUnit: "%",
  },
  crit_rate: {
    id: "crit_rate",
    name: "会心の一撃",
    description: "ダメージが2倍になるクリティカル発生率を付与します",
    icon: "🎯",
    category: "combat",
    treePos: { x: 380, y: 230 },
    maxLevel: 3,
    costs: [80, 200, 500],
    requirement: { nodeId: "damage_base", level: 2 },
    effectPerLevel: 0.15,
    effectUnit: "%",
  },
  sp_multiplier: {
    id: "sp_multiplier",
    name: "SP獲得倍率",
    description: "的を破壊した際に獲得できるSPを底上げします",
    icon: "💰",
    category: "economy",
    treePos: { x: 580, y: 230 },
    maxLevel: 5,
    costs: [40, 100, 250, 600, 1400],
    requirement: { nodeId: "round_time", level: 1 },
    effectPerLevel: 0.2,
    effectUnit: "%",
  },
  max_targets: {
    id: "max_targets",
    name: "同時出現数",
    description: "画面上に同時に出現する的の最大数を増やします",
    icon: "👥",
    category: "combat",
    treePos: { x: 140, y: 400 },
    maxLevel: 3,
    costs: [60, 160, 420],
    requirement: { nodeId: "fire_rate", level: 1 },
    effectPerLevel: 1,
    effectUnit: "個",
  },
  chain_damage: {
    id: "chain_damage",
    name: "連鎖ダメージ強化",
    description: "電撃の的が周囲に放電する連鎖ダメージを強化します",
    icon: "🌩️",
    category: "combat",
    treePos: { x: 380, y: 400 },
    maxLevel: 3,
    costs: [160, 380, 900],
    requirement: { nodeId: "crit_rate", level: 1 },
    effectPerLevel: 0.5,
    effectUnit: "%",
  },
  target_point_mult: {
    id: "target_point_mult",
    name: "的ポイント獲得量",
    description: "新しい的を解放するための的ポイント獲得効率を上げます",
    icon: "📊",
    category: "economy",
    treePos: { x: 580, y: 400 },
    maxLevel: 3,
    costs: [90, 240, 600],
    requirement: { nodeId: "sp_multiplier", level: 1 },
    effectPerLevel: 0.25,
    effectUnit: "%",
  },
  shop_discount: {
    id: "shop_discount",
    name: "ショップ割引",
    description: "武器ショップで購入できる武器の価格を割り引きます",
    icon: "🏷️",
    category: "economy",
    treePos: { x: 740, y: 400 },
    maxLevel: 3,
    costs: [110, 280, 700],
    requirement: { nodeId: "sp_multiplier", level: 2 },
    effectPerLevel: 0.15,
    effectUnit: "%",
  },
  time_target_bonus: {
    id: "time_target_bonus",
    name: "時間の的延長量",
    description: "時間の的を破壊したときの制限時間追加ボーナスを強化します",
    icon: "⏳",
    category: "combat",
    treePos: { x: 140, y: 570 },
    maxLevel: 3,
    costs: [130, 320, 800],
    requirement: { nodeId: "max_targets", level: 1 },
    effectPerLevel: 0.5,
    effectUnit: "秒",
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
