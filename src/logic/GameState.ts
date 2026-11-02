import {
  INVOICE_CONFIG,
  PASSIVE_IDS,
  PERMANENT_UPGRADES,
  PROGRESSION_CONFIG,
  TARGET_IDS,
  TARGET_UNLOCK_SEQUENCE,
  TARGETS,
  WEAPONS,
} from "../config/gameData";
import { createEmptySkillLevels, SKILLS } from "../config/skillTree";
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
import { type EffectiveStats, type StatContext, StatPipeline } from "./StatPipeline";
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
  public invoiceIntroduced: boolean = false; // 上納金システムが初登場告知されたか
  public unlockedTargets: TargetId[] = [
    TARGET_UNLOCK_SEQUENCE[0]?.targetId ?? ("standard" as TargetId),
  ];

  // 動的インゲームスキル（タレット・破片など）の習得レベル（0で無効）
  public inGameSkills: Record<string, number> = {
    shrapnel_burst: 1, // 検証用に初期値1（0でOFF）
    auto_turret: 1, // 検証用に初期値1（0でOFF）
  };

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
    this.invoiceIntroduced = false;
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

  /**
   * 現在の効果計算用コンテキスト（入力生データ）を取得
   */
  public getStatContext(): StatContext {
    return {
      equippedWeapon: this.equippedWeapon,
      skillLevels: this.skillLevels,
      passives: this.passives,
      permanentUpgrades: this.persistentData.permanentUpgrades,
    };
  }

  /**
   * パイプラインを実行して全実効ステータスを取得
   */
  public getEffectiveStats(weaponId: WeaponId = this.equippedWeapon): EffectiveStats {
    return StatPipeline.execute(this.getStatContext(), weaponId);
  }

  // --- 永続強化の計算 ---
  public getPermanentStartSp(): number {
    const level = this.persistentData.permanentUpgrades.start_sp ?? 0;
    if (level <= 0) return 0;
    return PERMANENT_UPGRADES.start_sp.effects[level - 1] ?? 0;
  }

  public getPermanentBaseDamage(): number {
    const level = this.persistentData.permanentUpgrades.base_dmg ?? 0;
    if (level <= 0) return 0;
    return PERMANENT_UPGRADES.base_dmg.effects[level - 1] ?? 0;
  }

  public getPermanentRoundTime(): number {
    const level = this.persistentData.permanentUpgrades.round_time ?? 0;
    if (level <= 0) return 0;
    return PERMANENT_UPGRADES.round_time.effects[level - 1] ?? 0;
  }

  public getPermanentInvoiceReduction(): number {
    const level = this.persistentData.permanentUpgrades.invoice_reduction ?? 0;
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

  // --- 実効パラメータ計算 (StatPipeline へ委譲) ---
  public getSkillStat(stat: SkillStatId): number {
    return StatPipeline.getSkillStat(this.skillLevels, stat);
  }

  public getWeapon(id: WeaponId = this.equippedWeapon): WeaponDefinition {
    return WEAPONS[id];
  }

  public getBulletConfig(id: WeaponId = this.equippedWeapon): WeaponBulletConfig {
    return WEAPONS[id].bullet;
  }

  public calculateDamage(isCrit: boolean): number {
    const stats = this.getEffectiveStats();
    return isCrit ? stats.critDamage : stats.damage;
  }

  public getCritRate(): number {
    return this.getEffectiveStats().critRate;
  }

  public rollCrit(): boolean {
    return this.rng.next() < this.getCritRate();
  }

  public getFireInterval(id: WeaponId = this.equippedWeapon): number {
    return this.getEffectiveStats(id).fireInterval;
  }

  public getMagazineSize(id: WeaponId = this.equippedWeapon): number {
    return this.getEffectiveStats(id).magazineSize;
  }

  public getReloadTime(id: WeaponId = this.equippedWeapon): number {
    return this.getEffectiveStats(id).reloadTime;
  }

  public getRoundDuration(): number {
    return this.getEffectiveStats().roundDuration;
  }

  public getMaxTargets(): number {
    return this.getEffectiveStats().maxTargets;
  }

  public getSpMultiplier(): number {
    return this.getEffectiveStats().spMultiplier;
  }

  public getShopDiscount(): number {
    return this.getEffectiveStats().shopDiscount;
  }

  public getWeaponPrice(id: WeaponId): number {
    return this.getEffectiveStats(id).weaponPrice;
  }

  public getTimeTargetBonus(): number {
    return this.getEffectiveStats().timeTargetBonus;
  }

  public getTargetRespawnRate(): number {
    return this.getEffectiveStats().targetRespawnRate;
  }

  public rollTargetRespawn(): boolean {
    return this.rng.next() < this.getTargetRespawnRate();
  }

  public getChainDamage(sourceDamage: number): number {
    return this.getEffectiveStats().getChainDamage(sourceDamage);
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
    // 的ポイント加算（獲得賞金SPが直接手配ポイントとして加算される）
    const tpEarned = this.lastRoundSpEarned;
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
  public completeInvoiceIntro(): void {
    this.invoiceIntroduced = true;
  }

  public shouldShowInvoiceIntro(): boolean {
    return this.round === INVOICE_CONFIG.intervalRounds && !this.invoiceIntroduced;
  }

  public isInvoiceDue(): boolean {
    const firstDueRound = INVOICE_CONFIG.intervalRounds * 2;
    return this.round >= firstDueRound && this.round % INVOICE_CONFIG.intervalRounds === 0;
  }

  public getRoundsUntilNextInvoice(): number {
    const interval = INVOICE_CONFIG.intervalRounds;
    const firstDueRound = interval * 2;
    if (this.round < firstDueRound) {
      return firstDueRound - this.round;
    }
    const nextDue = Math.floor(this.round / interval) * interval + interval;
    return nextDue - this.round;
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

  // --- インゲームスキル（動的スキル）管理 ---
  public getInGameSkillLevel(skillId: string): number {
    return this.inGameSkills[skillId] ?? 0;
  }

  public setInGameSkillLevel(skillId: string, level: number): void {
    this.inGameSkills[skillId] = Math.max(0, level);
  }

  public getAcquiredInGameSkills(): Record<string, number> {
    return { ...this.inGameSkills };
  }
}
