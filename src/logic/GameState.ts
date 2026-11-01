import {
  COMBAT_CONFIG,
  INVOICE_CONFIG,
  PASSIVE_IDS,
  PASSIVES,
  PERMANENT_UPGRADES,
  PROGRESSION_CONFIG,
  ROUND_CONFIG,
  TARGET_IDS,
  TARGET_UNLOCK_SEQUENCE,
  TARGETS,
  WEAPONS,
} from "../config/gameData";
import { createEmptySkillLevels, SKILL_IDS, SKILLS } from "../config/skillTree";
import type {
  PassiveId,
  PermanentUpgradeId,
  PersistentSaveData,
  RunStats,
  SkillNodeId,
  SkillStatId,
  TargetDefinition,
  TargetId,
  WeaponBulletConfig,
  WeaponDefinition,
  WeaponId,
} from "../config/types";
import { globalRng, type SeededRandom } from "./SeededRandom";
import { StorageService } from "./storage";

function createInitialTargetsDestroyed(): Record<TargetId, number> {
  const result = {} as Record<TargetId, number>;
  for (const id of TARGET_IDS) {
    result[id] = 0;
  }
  return result;
}

function createInitialPassives(): Record<PassiveId, number> {
  const result = {} as Record<PassiveId, number>;
  for (const id of PASSIVE_IDS) {
    result[id] = 0;
  }
  return result;
}

export class GameState {
  private static instance: GameState | null = null;

  // 永続データ
  public persistentData: PersistentSaveData;

  // ランの状態
  public currentRunActive: boolean = false;
  public round: number = 1;
  public sp: number = 0;
  public targetPoints: number = 0;
  public equippedWeapon: WeaponId = PROGRESSION_CONFIG.initialWeaponId;
  public ownedWeapons: WeaponId[] = [PROGRESSION_CONFIG.initialWeaponId];
  public skillLevels: Record<SkillNodeId, number> = createEmptySkillLevels();
  public passives: Record<PassiveId, number> = createInitialPassives();
  public invoiceCount: number = 0; // これまでクリアした請求回数
  public unlockedTargets: TargetId[] = [
    TARGET_UNLOCK_SEQUENCE[0]?.targetId ?? ("standard" as TargetId),
  ];

  // 直近ラウンド結果
  public lastRoundSpEarned: number = 0;
  public lastRoundTargetsDestroyed: number = 0;
  public lastRoundNewlyUnlockedTargets: TargetId[] = [];

  // ラン統計
  public runStats: RunStats = {
    round: 1,
    totalSpEarned: 0,
    totalInvoicesPaidAmount: 0,
    invoicesPassed: 0,
    targetsDestroyedTotal: 0,
    targetsDestroyedByType: createInitialTargetsDestroyed(),
    weaponsPurchased: [PROGRESSION_CONFIG.initialWeaponId],
    cleared: false,
  };

  // フラグ
  public isGameOver: boolean = false;
  public isCleared: boolean = false;
  public lastGainedPermanentPoints: number = 0;

  // 乱数生成器
  public rng: SeededRandom = globalRng;

  constructor() {
    this.persistentData = StorageService.load();
  }

  public static getInstance(): GameState {
    if (!GameState.instance) {
      GameState.instance = new GameState();
    }
    return GameState.instance;
  }

  /**
   * 新しいランを開始する
   */
  public startNewRun(seed?: number): void {
    if (typeof seed === "number") {
      this.rng.setSeed(seed);
    }

    this.persistentData = StorageService.load();

    const startSpBonus = this.getPermanentStartSp();
    const initialWeapon = PROGRESSION_CONFIG.initialWeaponId;
    this.currentRunActive = true;
    this.round = 1;
    this.sp = startSpBonus;
    this.targetPoints = 0;
    this.equippedWeapon = initialWeapon;
    this.ownedWeapons = [initialWeapon];

    this.skillLevels = createEmptySkillLevels();
    this.passives = createInitialPassives();

    this.invoiceCount = 0;
    this.unlockedTargets = [TARGET_UNLOCK_SEQUENCE[0]?.targetId ?? ("standard" as TargetId)];
    this.lastRoundSpEarned = 0;
    this.lastRoundTargetsDestroyed = 0;
    this.lastRoundNewlyUnlockedTargets = [];

    this.runStats = {
      round: 1,
      totalSpEarned: 0,
      totalInvoicesPaidAmount: 0,
      invoicesPassed: 0,
      targetsDestroyedTotal: 0,
      targetsDestroyedByType: createInitialTargetsDestroyed(),
      weaponsPurchased: [initialWeapon],
      cleared: false,
    };

    this.isGameOver = false;
    this.isCleared = false;
    this.lastGainedPermanentPoints = 0;

    // 永続統計更新
    this.persistentData.stats.totalRuns += 1;
    StorageService.save(this.persistentData);
  }

  // --- 永続強化の計算 ---
  public getPermanentStartSp(): number {
    const level = this.persistentData.permanentUpgrades.start_sp;
    if (level <= 0) return 0;
    return PERMANENT_UPGRADES.start_sp.effects[level - 1] ?? 0;
  }

  public getPermanentBaseDamage(): number {
    const level = this.persistentData.permanentUpgrades.base_dmg;
    if (level <= 0) return 0;
    return PERMANENT_UPGRADES.base_dmg.effects[level - 1] ?? 0;
  }

  public getPermanentRoundTime(): number {
    const level = this.persistentData.permanentUpgrades.round_time;
    if (level <= 0) return 0;
    return PERMANENT_UPGRADES.round_time.effects[level - 1] ?? 0;
  }

  public getPermanentTargetPointBonus(): number {
    const level = this.persistentData.permanentUpgrades.tp_gain;
    if (level <= 0) return 0;
    return (PERMANENT_UPGRADES.tp_gain.effects[level - 1] ?? 0) / 100;
  }

  public getPermanentInvoiceReduction(): number {
    const level = this.persistentData.permanentUpgrades.invoice_reduction;
    if (level <= 0) return 0;
    return (PERMANENT_UPGRADES.invoice_reduction.effects[level - 1] ?? 0) / 100;
  }

  public getPermanentUpgradeCost(id: PermanentUpgradeId): number | null {
    const def = PERMANENT_UPGRADES[id];
    const curLevel = this.persistentData.permanentUpgrades[id] || 0;
    if (curLevel >= def.maxLevel) return null;
    return def.costs[curLevel] ?? null;
  }

  /**
   * 永続強化を購入
   */
  public purchasePermanentUpgrade(id: PermanentUpgradeId): boolean {
    const cost = this.getPermanentUpgradeCost(id);
    if (cost === null || this.persistentData.permanentPoints < cost) return false;

    this.persistentData.permanentPoints -= cost;
    this.persistentData.permanentUpgrades[id] =
      (this.persistentData.permanentUpgrades[id] || 0) + 1;
    StorageService.save(this.persistentData);
    return true;
  }

  // --- 実効パラメータ計算 ---
  /**
   * 指定ステータスに対するスキル効果の合計値。
   * skillTree.json で同じ stat を持つ全ノードの (レベル × perLevel) を合算する。
   */
  public getSkillStat(stat: SkillStatId): number {
    let total = 0;
    for (const id of SKILL_IDS) {
      const def = SKILLS[id];
      if (def.effect.stat === stat) {
        total += (this.skillLevels[id] ?? 0) * def.effect.perLevel;
      }
    }
    return total;
  }

  public getWeapon(id: WeaponId = this.equippedWeapon): WeaponDefinition {
    return WEAPONS[id];
  }

  public getBulletConfig(id: WeaponId = this.equippedWeapon): WeaponBulletConfig {
    return this.getWeapon(id).bullet;
  }

  /**
   * 攻撃ダメージの計算
   * 基礎: (武器威力 + スキル基礎ダメージ + 永続基礎ダメージ) * (1 + パッシブ基礎ダメージ% + 会心倍率)
   */
  public calculateDamage(isCrit: boolean): number {
    const weapon = this.getWeapon();
    const skillBonus = this.getSkillStat("damage");
    const permBonus = this.getPermanentBaseDamage();
    const passiveMult = 1 + this.passives.dmg_bonus * PASSIVES.dmg_bonus.effectPerStack;

    let base = (weapon.damage + skillBonus + permBonus) * passiveMult;
    if (isCrit) {
      base *= COMBAT_CONFIG.critMultiplier;
    }
    return Math.max(1, Math.round(base));
  }

  public rollCrit(): boolean {
    const critRate = this.getSkillStat("critRate");
    return this.rng.next() < critRate;
  }

  public getFireInterval(id: WeaponId = this.equippedWeapon): number {
    const weapon = this.getWeapon(id);
    const reduction = Math.min(
      COMBAT_CONFIG.maxFireRateReduction,
      this.getSkillStat("fireRateReduction"),
    );
    return Math.max(COMBAT_CONFIG.minFireInterval, weapon.fireInterval * (1 - reduction));
  }

  public getMagazineSize(id: WeaponId = this.equippedWeapon): number {
    const weapon = this.getWeapon(id);
    const flatBonus = this.getSkillStat("magazineCapacity");
    const multBonus = this.getSkillStat("magazineMultiplier");
    return Math.max(1, Math.round((weapon.magazineSize + flatBonus) * (1 + multBonus)));
  }

  public getReloadTime(id: WeaponId = this.equippedWeapon): number {
    const weapon = this.getWeapon(id);
    const reduction = Math.min(
      COMBAT_CONFIG.maxReloadTimeReduction,
      this.getSkillStat("reloadTimeReduction"),
    );
    return Math.max(COMBAT_CONFIG.minReloadTime, weapon.reloadTime * (1 - reduction));
  }

  public getRoundDuration(): number {
    const base = ROUND_CONFIG.baseDuration;
    const skillBonus = this.getSkillStat("roundTime");
    const permBonus = this.getPermanentRoundTime();
    const passiveBonus = this.passives.time_bonus * PASSIVES.time_bonus.effectPerStack;
    return base + skillBonus + permBonus + passiveBonus;
  }

  public getMaxTargets(): number {
    const base = ROUND_CONFIG.baseTargetCount;
    const skillBonus = this.getSkillStat("maxTargets");
    const passiveBonus = this.passives.target_bonus * PASSIVES.target_bonus.effectPerStack;
    return Math.min(ROUND_CONFIG.maxTargetCountCap, base + skillBonus + passiveBonus);
  }

  public getSpMultiplier(): number {
    const skillMult = 1 + this.getSkillStat("spMultiplier");
    const passiveMult = 1 + this.passives.sp_bonus * PASSIVES.sp_bonus.effectPerStack;
    return skillMult * passiveMult;
  }

  public getTargetPointMultiplier(): number {
    const skillMult = 1 + this.getSkillStat("targetPointMultiplier");
    const passiveMult = 1 + this.passives.tp_bonus * PASSIVES.tp_bonus.effectPerStack;
    const permMult = 1 + this.getPermanentTargetPointBonus();
    return skillMult * passiveMult * permMult;
  }

  public getShopDiscount(): number {
    const skillDisc = this.getSkillStat("shopDiscount");
    const passiveDisc = this.passives.shop_discount * PASSIVES.shop_discount.effectPerStack;
    return Math.min(COMBAT_CONFIG.maxShopDiscount, skillDisc + passiveDisc);
  }

  public getWeaponPrice(id: WeaponId): number {
    const raw = WEAPONS[id].price;
    const discount = this.getShopDiscount();
    return Math.max(0, Math.floor(raw * (1 - discount)));
  }

  public getTimeTargetBonus(): number {
    const base = ROUND_CONFIG.timeTargetBaseExtension;
    const bonus = this.getSkillStat("timeTargetBonus");
    return base + bonus;
  }

  public getChainDamage(sourceDamage: number): number {
    const mult = 1 + this.getSkillStat("chainDamage");
    return Math.max(1, Math.round(sourceDamage * mult));
  }

  // --- スキル購入 ---
  public getSkillLevel(id: SkillNodeId): number {
    return this.skillLevels[id] ?? 0;
  }

  /** 親ノードの必要レベル (unlockLevel) を満たしているか。ルートは常に true */
  public isSkillRequirementMet(id: SkillNodeId): boolean {
    const req = SKILLS[id]?.requirement;
    if (!req) return true;
    return this.getSkillLevel(req.nodeId) >= req.level;
  }

  public canUnlockSkill(id: SkillNodeId): boolean {
    const cost = this.getSkillCost(id);
    if (cost === null) return false;
    if (!this.isSkillRequirementMet(id)) return false;
    return this.sp >= cost;
  }

  public getSkillCost(id: SkillNodeId): number | null {
    const def = SKILLS[id];
    if (!def) return null;
    const curLevel = this.getSkillLevel(id);
    if (curLevel >= def.maxLevel) return null;
    return def.costs[curLevel] ?? null;
  }

  public buySkill(id: SkillNodeId): boolean {
    if (!this.canUnlockSkill(id)) return false;
    const cost = this.getSkillCost(id);
    if (cost === null || this.sp < cost) return false;

    this.sp -= cost;
    this.skillLevels[id] = this.getSkillLevel(id) + 1;
    return true;
  }

  // --- 武器購入 & 切り替え ---
  public isShopAvailable(): boolean {
    return this.round >= PROGRESSION_CONFIG.shopUnlockRound;
  }

  public buyWeapon(id: WeaponId): boolean {
    if (this.ownedWeapons.includes(id)) return false;
    const price = this.getWeaponPrice(id);
    if (this.sp < price) return false;

    this.sp -= price;
    this.ownedWeapons.push(id);
    this.equippedWeapon = id;
    if (!this.runStats.weaponsPurchased.includes(id)) {
      this.runStats.weaponsPurchased.push(id);
    }

    // 指定数の武器を購入したらオート射撃設定を可能にする
    if (this.ownedWeapons.length >= PROGRESSION_CONFIG.autoFireUnlockWeaponCount) {
      this.persistentData.settings.autoFire = true;
      StorageService.save(this.persistentData);
    }
    return true;
  }

  public equipWeapon(id: WeaponId): boolean {
    if (!this.ownedWeapons.includes(id)) return false;
    this.equippedWeapon = id;
    return true;
  }

  public canToggleAutoFire(): boolean {
    return (
      this.ownedWeapons.length >= PROGRESSION_CONFIG.autoFireUnlockWeaponCount ||
      this.persistentData.stats.cleared
    );
  }

  public toggleAutoFire(): void {
    if (!this.canToggleAutoFire()) return;
    this.persistentData.settings.autoFire = !this.persistentData.settings.autoFire;
    StorageService.save(this.persistentData);
  }

  // --- 的の抽選と出現 ---
  public rollTarget(): TargetDefinition {
    const activeTargets = this.unlockedTargets.map((id) => TARGETS[id]);
    return this.rng.weightedChoice(activeTargets, (t) => t.weight);
  }

  // --- 的破壊時のSP加算 ---
  public onTargetDestroyed(targetId: TargetId): number {
    const targetDef = TARGETS[targetId];
    const spEarned = Math.round(targetDef.baseSp * this.getSpMultiplier());

    this.sp += spEarned;
    this.lastRoundSpEarned += spEarned;
    this.lastRoundTargetsDestroyed += 1;

    this.runStats.totalSpEarned += spEarned;
    this.runStats.targetsDestroyedTotal += 1;
    this.runStats.targetsDestroyedByType[targetId] =
      (this.runStats.targetsDestroyedByType[targetId] || 0) + 1;

    return spEarned;
  }

  // --- ラウンド終了処理 ---
  public endRound(): void {
    // 的ポイント加算
    const tpEarned = Math.round(this.lastRoundSpEarned * this.getTargetPointMultiplier());
    this.targetPoints += tpEarned;

    // 新規解放チェック
    this.lastRoundNewlyUnlockedTargets = [];
    for (const step of TARGET_UNLOCK_SEQUENCE) {
      if (
        this.targetPoints >= step.requiredPoints &&
        !this.unlockedTargets.includes(step.targetId)
      ) {
        this.unlockedTargets.push(step.targetId);
        this.lastRoundNewlyUnlockedTargets.push(step.targetId);
      }
    }

    // 全種解放でクリア
    if (this.unlockedTargets.length >= TARGET_UNLOCK_SEQUENCE.length) {
      this.isCleared = true;
      this.runStats.cleared = true;
      this.persistentData.stats.cleared = true;
      StorageService.save(this.persistentData);
    }

    if (this.round > this.persistentData.stats.highestRound) {
      this.persistentData.stats.highestRound = this.round;
      StorageService.save(this.persistentData);
    }
  }

  /**
   * 次のラウンドへの準備
   */
  public prepareNextRound(): void {
    this.round += 1;
    this.runStats.round = this.round;
    this.lastRoundSpEarned = 0;
    this.lastRoundTargetsDestroyed = 0;
    this.lastRoundNewlyUnlockedTargets = [];
  }

  // --- 的ポイントの進捗 ---
  public getTargetUnlockProgress(): {
    currentTarget: TargetDefinition | null;
    nextTarget: TargetDefinition | null;
    currentStepPoints: number;
    requiredStepPoints: number;
    percent: number;
  } {
    // 現在未解放の最初の的を探す
    const nextStepIndex = TARGET_UNLOCK_SEQUENCE.findIndex(
      (s) => !this.unlockedTargets.includes(s.targetId),
    );

    if (nextStepIndex === -1) {
      const lastTargetId =
        TARGET_UNLOCK_SEQUENCE.length > 0
          ? TARGET_UNLOCK_SEQUENCE[TARGET_UNLOCK_SEQUENCE.length - 1].targetId
          : ("standard" as TargetId);
      return {
        currentTarget: TARGETS[lastTargetId] ?? null,
        nextTarget: null,
        currentStepPoints: 1,
        requiredStepPoints: 1,
        percent: 100,
      };
    }

    const nextStep = TARGET_UNLOCK_SEQUENCE[nextStepIndex];
    const prevRequired =
      nextStepIndex > 0 ? TARGET_UNLOCK_SEQUENCE[nextStepIndex - 1].requiredPoints : 0;
    const requiredInThisStep = nextStep.requiredPoints - prevRequired;
    const currentInThisStep = Math.max(0, this.targetPoints - prevRequired);

    const percent = Math.min(100, Math.floor((currentInThisStep / requiredInThisStep) * 100));

    return {
      currentTarget:
        nextStepIndex > 0 ? TARGETS[TARGET_UNLOCK_SEQUENCE[nextStepIndex - 1].targetId] : null,
      nextTarget: TARGETS[nextStep.targetId],
      currentStepPoints: currentInThisStep,
      requiredStepPoints: requiredInThisStep,
      percent,
    };
  }

  // --- 請求処理 ---
  public isInvoiceDue(): boolean {
    return this.round % INVOICE_CONFIG.intervalRounds === 0;
  }

  public getInvoiceAmount(): number {
    const n = this.invoiceCount + 1; // 1回目、2回目...
    const base = INVOICE_CONFIG.baseCost * Math.pow(INVOICE_CONFIG.growthRate, n - 1);
    const reduction = this.getPermanentInvoiceReduction();
    return Math.max(INVOICE_CONFIG.minCost, Math.floor(base * (1 - reduction)));
  }

  public canPayInvoice(): boolean {
    return this.sp >= this.getInvoiceAmount();
  }

  /**
   * 請求を支払う
   * 支払い成功なら true, 足りなければ false でゲームオーバー
   */
  public payInvoice(): boolean {
    const cost = this.getInvoiceAmount();
    if (this.sp < cost) {
      this.triggerGameOver();
      return false;
    }

    this.sp -= cost;
    this.invoiceCount += 1;
    this.runStats.totalInvoicesPaidAmount += cost;
    this.runStats.invoicesPassed += 1;

    this.persistentData.stats.totalInvoicesPaid += 1;
    StorageService.save(this.persistentData);

    return true;
  }

  /**
   * 請求後のパッシブ候補を抽選
   */
  public rollPassives(): PassiveId[] {
    return this.rng.shuffle([...PASSIVE_IDS]).slice(0, PROGRESSION_CONFIG.passiveChoicesCount);
  }

  public choosePassive(id: PassiveId): void {
    this.passives[id] = (this.passives[id] || 0) + 1;
  }

  // --- ゲームオーバー処理 ---
  public triggerGameOver(): void {
    this.isGameOver = true;
    this.currentRunActive = false;

    // 支払総額の指定割合(切り捨て)を永続ポイントとして獲得
    const pts = Math.floor(
      this.runStats.totalInvoicesPaidAmount * INVOICE_CONFIG.permanentPointRate,
    );
    this.lastGainedPermanentPoints = pts;
    this.persistentData.permanentPoints += pts;

    if (this.round > this.persistentData.stats.highestRound) {
      this.persistentData.stats.highestRound = this.round;
    }

    StorageService.save(this.persistentData);
  }
}
