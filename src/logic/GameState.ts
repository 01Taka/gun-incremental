import {
  INVOICE_CONFIG,
  PERMANENT_UPGRADES,
  ROUND_CONFIG,
  SKILLS,
  TARGET_UNLOCK_SEQUENCE,
  TARGETS,
  WEAPONS,
} from "../config/gameData";
import type {
  PassiveId,
  PermanentUpgradeId,
  PersistentSaveData,
  RunStats,
  SkillNodeId,
  TargetDefinition,
  TargetId,
  WeaponDefinition,
  WeaponId,
} from "../config/types";
import { globalRng, type SeededRandom } from "./SeededRandom";
import { StorageService } from "./storage";

export class GameState {
  private static instance: GameState | null = null;

  // 永続データ
  public persistentData: PersistentSaveData;

  // ランの状態
  public currentRunActive: boolean = false;
  public round: number = 1;
  public sp: number = 0;
  public targetPoints: number = 0;
  public equippedWeapon: WeaponId = "handgun";
  public ownedWeapons: WeaponId[] = ["handgun"];
  public skillLevels: Record<SkillNodeId, number> = {
    damage_base: 0,
    round_time: 0,
    fire_rate: 0,
    sp_multiplier: 0,
    max_targets: 0,
    crit_rate: 0,
    target_point_mult: 0,
    shop_discount: 0,
    time_target_bonus: 0,
    chain_damage: 0,
  };
  public passives: Record<PassiveId, number> = {
    sp_bonus: 0,
    dmg_bonus: 0,
    time_bonus: 0,
    target_bonus: 0,
    shop_discount: 0,
    tp_bonus: 0,
  };
  public invoiceCount: number = 0; // これまでクリアした請求回数
  public unlockedTargets: TargetId[] = ["standard"];

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
    targetsDestroyedByType: {
      standard: 0,
      hard: 0,
      gold: 0,
      electric: 0,
      small: 0,
      time: 0,
    },
    weaponsPurchased: ["handgun"],
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
    this.currentRunActive = true;
    this.round = 1;
    this.sp = startSpBonus;
    this.targetPoints = 0;
    this.equippedWeapon = "handgun";
    this.ownedWeapons = ["handgun"];

    this.skillLevels = {
      damage_base: 0,
      round_time: 0,
      fire_rate: 0,
      sp_multiplier: 0,
      max_targets: 0,
      crit_rate: 0,
      target_point_mult: 0,
      shop_discount: 0,
      time_target_bonus: 0,
      chain_damage: 0,
    };

    this.passives = {
      sp_bonus: 0,
      dmg_bonus: 0,
      time_bonus: 0,
      target_bonus: 0,
      shop_discount: 0,
      tp_bonus: 0,
    };

    this.invoiceCount = 0;
    this.unlockedTargets = ["standard"];
    this.lastRoundSpEarned = 0;
    this.lastRoundTargetsDestroyed = 0;
    this.lastRoundNewlyUnlockedTargets = [];

    this.runStats = {
      round: 1,
      totalSpEarned: 0,
      totalInvoicesPaidAmount: 0,
      invoicesPassed: 0,
      targetsDestroyedTotal: 0,
      targetsDestroyedByType: {
        standard: 0,
        hard: 0,
        gold: 0,
        electric: 0,
        small: 0,
        time: 0,
      },
      weaponsPurchased: ["handgun"],
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

  /**
   * 永続強化を購入
   */
  public purchasePermanentUpgrade(id: PermanentUpgradeId): boolean {
    const def = PERMANENT_UPGRADES[id];
    const curLevel = this.persistentData.permanentUpgrades[id] || 0;
    if (curLevel >= def.maxLevel) return false;
    if (this.persistentData.permanentPoints < def.costPerLevel) return false;

    this.persistentData.permanentPoints -= def.costPerLevel;
    this.persistentData.permanentUpgrades[id] = curLevel + 1;
    StorageService.save(this.persistentData);
    return true;
  }

  // --- 実効パラメータ計算 ---
  public getWeapon(id: WeaponId = this.equippedWeapon): WeaponDefinition {
    return WEAPONS[id];
  }

  /**
   * 攻撃ダメージの計算
   * 基礎: (武器威力 + スキル基礎ダメージ + 永続基礎ダメージ) * (1 + パッシブ基礎ダメージ% + 会心倍率)
   */
  public calculateDamage(isCrit: boolean): number {
    const weapon = this.getWeapon();
    const skillBonus = this.skillLevels.damage_base * SKILLS.damage_base.effectPerLevel;
    const permBonus = this.getPermanentBaseDamage();
    const passiveMult = 1 + this.passives.dmg_bonus * 0.15;

    let base = (weapon.damage + skillBonus + permBonus) * passiveMult;
    if (isCrit) {
      base *= 2;
    }
    return Math.max(1, Math.round(base));
  }

  public rollCrit(): boolean {
    const critRate = this.skillLevels.crit_rate * SKILLS.crit_rate.effectPerLevel;
    return this.rng.next() < critRate;
  }

  public getFireInterval(): number {
    const weapon = this.getWeapon();
    const reduction = this.skillLevels.fire_rate * SKILLS.fire_rate.effectPerLevel;
    return Math.max(0.08, weapon.fireInterval * (1 - reduction));
  }

  public getRoundDuration(): number {
    const base = ROUND_CONFIG.baseDuration;
    const skillBonus = this.skillLevels.round_time * SKILLS.round_time.effectPerLevel;
    const permBonus = this.getPermanentRoundTime();
    const passiveBonus = this.passives.time_bonus * 1.0;
    return base + skillBonus + permBonus + passiveBonus;
  }

  public getMaxTargets(): number {
    const base = ROUND_CONFIG.baseTargetCount;
    const skillBonus = this.skillLevels.max_targets * SKILLS.max_targets.effectPerLevel;
    const passiveBonus = this.passives.target_bonus * 1;
    return Math.min(ROUND_CONFIG.maxTargetCountCap, base + skillBonus + passiveBonus);
  }

  public getSpMultiplier(): number {
    const skillMult = 1 + this.skillLevels.sp_multiplier * SKILLS.sp_multiplier.effectPerLevel;
    const passiveMult = 1 + this.passives.sp_bonus * 0.1;
    return skillMult * passiveMult;
  }

  public getTargetPointMultiplier(): number {
    const skillMult =
      1 + this.skillLevels.target_point_mult * SKILLS.target_point_mult.effectPerLevel;
    const passiveMult = 1 + this.passives.tp_bonus * 0.1;
    const permMult = 1 + this.getPermanentTargetPointBonus();
    return skillMult * passiveMult * permMult;
  }

  public getShopDiscount(): number {
    const skillDisc = this.skillLevels.shop_discount * SKILLS.shop_discount.effectPerLevel;
    const passiveDisc = this.passives.shop_discount * 0.1;
    return Math.min(0.5, skillDisc + passiveDisc); // 最大50%引
  }

  public getWeaponPrice(id: WeaponId): number {
    const raw = WEAPONS[id].price;
    const discount = this.getShopDiscount();
    return Math.max(0, Math.floor(raw * (1 - discount)));
  }

  public getTimeTargetBonus(): number {
    const base = ROUND_CONFIG.timeTargetBaseExtension;
    const bonus = this.skillLevels.time_target_bonus * SKILLS.time_target_bonus.effectPerLevel;
    return base + bonus;
  }

  public getChainDamage(sourceDamage: number): number {
    const mult = 1 + this.skillLevels.chain_damage * SKILLS.chain_damage.effectPerLevel;
    return Math.max(1, Math.round(sourceDamage * mult));
  }

  // --- スキル購入 ---
  public canUnlockSkill(id: SkillNodeId): boolean {
    const def = SKILLS[id];
    if (this.skillLevels[id] >= def.maxLevel) return false;
    if (def.requirement) {
      const currentReqLevel = this.skillLevels[def.requirement.nodeId] || 0;
      if (currentReqLevel < def.requirement.level) {
        return false;
      }
    }
    const cost = def.costs[this.skillLevels[id]];
    return this.sp >= cost;
  }

  public getSkillCost(id: SkillNodeId): number | null {
    const def = SKILLS[id];
    const curLevel = this.skillLevels[id];
    if (curLevel >= def.maxLevel) return null;
    return def.costs[curLevel];
  }

  public buySkill(id: SkillNodeId): boolean {
    if (!this.canUnlockSkill(id)) return false;
    const cost = this.getSkillCost(id);
    if (cost === null || this.sp < cost) return false;

    this.sp -= cost;
    this.skillLevels[id] += 1;
    return true;
  }

  // --- 武器購入 & 切り替え ---
  public isShopAvailable(): boolean {
    return this.round >= 3;
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

    // 3つ目の武器を購入したらオート射撃設定を可能にする
    if (this.ownedWeapons.length >= 3) {
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
    return this.ownedWeapons.length >= 3 || this.persistentData.stats.cleared;
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

    // 全6種解放でクリア
    if (this.unlockedTargets.length >= 6) {
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
      return {
        currentTarget: TARGETS.time,
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
    return Math.max(10, Math.floor(base * (1 - reduction)));
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
   * 請求後のパッシブ候補を3つ抽選
   */
  public rollPassives(): PassiveId[] {
    const allPassiveIds: PassiveId[] = [
      "sp_bonus",
      "dmg_bonus",
      "time_bonus",
      "target_bonus",
      "shop_discount",
      "tp_bonus",
    ];
    return this.rng.shuffle(allPassiveIds).slice(0, 3);
  }

  public choosePassive(id: PassiveId): void {
    this.passives[id] = (this.passives[id] || 0) + 1;
  }

  // --- ゲームオーバー処理 ---
  public triggerGameOver(): void {
    this.isGameOver = true;
    this.currentRunActive = false;

    // 支払総額の2%(切り捨て)を永続ポイントとして獲得
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
