// ゲーム内の各種データ型定義

export type WeaponId = "handgun" | "rifle" | "sniper";

export interface WeaponBulletConfig {
  speed: number; // 弾速 (px/s)
  radius: number; // 弾の当たり判定半径 (px)
}

export interface WeaponDefinition {
  id: WeaponId;
  name: string;
  description: string;
  fireInterval: number; // 秒単位 (例: 0.6)
  damage: number;
  magazineSize: number; // 1マガジンの装弾数
  reloadTime: number; // リロード所要時間 (秒)
  price: number; // SP ($)
  unlockRound: number; // ショップ解禁目安ラウンド
  bullet: WeaponBulletConfig; // この銃固有の弾パラメータ
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
  | "shopDiscount"
  | "timeTargetBonus"
  | "chainDamage"
  | "targetRespawnRate";

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

export type PassiveId = "sp_bonus" | "dmg_bonus" | "time_bonus" | "target_bonus" | "crit_bonus";

export interface PassiveDefinition {
  id: PassiveId;
  name: string;
  description: string;
  icon: string;
  effectPerStack: number; // 1スタックあたりの効果量 (割合は 0.1 = 10%, 実数値はそのまま)
}

export type PermanentUpgradeId = "start_sp" | "base_dmg" | "round_time" | "invoice_reduction";

export interface PermanentUpgradeDefinition {
  id: PermanentUpgradeId;
  name: string;
  description: string;
  maxLevel: number;
  costs: number[]; // 各レベルの必要ポイント [15, 35, 75]
  effects: number[]; // レベル1, 2, 3の効果量
  effectUnit: string; // "$", "%", "秒" などの表示用
}

export interface RoundConfig {
  baseDuration: number; // 初期ラウンド制限時間 (秒)
  baseTargetCount: number; // 初期同時出現数
  baseRespawnRate: number; // 初期標的復活確率 (0〜1)
  maxTargetCountCap: number; // 最大同時出現数上限
  timeTargetBaseExtension: number; // 懐中時計の基本延長時間 (秒)
  countdownDuration: number; // 開幕カウントダウン時間 (秒)
  lowTimeWarningThreshold: number; // 残り時間赤字警告閾値 (秒)
}

export interface InvoiceConfig {
  intervalRounds: number; // 上納金が発生するラウンド周期
  baseCost: number; // 初回上納額 ($)
  growthRate: number; // 回数ごとの成長倍率
  minCost: number; // 軽減後の最低支払額 ($)
  permanentPointRate: number; // 支払総額→名声バッジ変換率
}

export interface CombatConfig {
  critMultiplier: number; // 会心ダメージ倍率
  maxCritRate: number; // 会心率の上限 (0〜1)
  maxFireRateReduction: number; // 発射間隔短縮の上限率 (0〜1未満)
  minFireInterval: number; // 発射間隔の下限 (秒)
  maxReloadTimeReduction: number; // リロード短縮の上限率 (0〜1未満)
  minReloadTime: number; // リロード時間の下限 (秒)
  maxShopDiscount: number; // 銃砲店割引率の上限 (0〜1)
}

export interface ProgressionConfig {
  initialWeaponId: WeaponId; // ラン開始時の初期銃
  shopUnlockRound: number; // 銃砲店が開店するラウンド
  autoFireUnlockWeaponCount: number; // 自動エイム解放に必要な所持銃数
  passiveChoicesCount: number; // 上納金支払い後のボーナス提示数
}

export interface ArenaConfig {
  turretMinAngleDeg: number; // 銃の左端可動角 (度)
  turretMaxAngleDeg: number; // 銃の右端可動角 (度)
  rayHitMarginRatio: number; // 射線ロックオン余白 (弾半径に対する比率)
  autoAimSpeed: number; // 自動エイムの追従速度係数
  keyboardAimSpeed: number; // キーボード照準の移動速度係数
  targetRespawnDelayMs: number; // 標的撃破後の再出現遅延 (ms)
  targetBlinkThresholdSeconds: number; // 寿命付き標的の点滅開始残り秒数
  bulletOutPadding: number; // アリーナ外周の弾消滅マージン (px)
}

export interface SimulationConfig {
  assumedAccuracy: number; // ヘッドレス検証時の想定命中率 (0〜1)
  maxRoundsGuard: number; // 無限ループ防止上限ラウンド
  invoiceReserveRatio: number; // 通常ラウンド時の上納金温存率
  sniperPurchaseMinRound: number; // AIがスナイパーを購入検討し始めるラウンド
}

export interface GameRulesConfig {
  round: RoundConfig;
  invoice: InvoiceConfig;
  combat: CombatConfig;
  progression: ProgressionConfig;
  arena: ArenaConfig;
  simulation: SimulationConfig;
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
