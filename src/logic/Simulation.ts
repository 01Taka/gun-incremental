import { ARENA_CONFIG, SIMULATION_CONFIG } from "../config/gameData";
import { SKILL_IDS } from "../config/skillTree";
import type { PassiveId, SkillNodeId, TargetDefinition } from "../config/types";
import { GameState } from "./GameState";
import { StorageService } from "./storage";

export interface SimulationResult {
  runNumber: number;
  roundsSurvived: number;
  invoicesPaid: number;
  totalSpEarned: number;
  totalInvoicesPaidAmount: number;
  targetsUnlockedCount: number;
  cleared: boolean;
  permanentPointsGained: number;
}

interface SimTarget {
  uid: number;
  def: TargetDefinition;
  hp: number;
  remainingLife?: number;
}

export interface SingleRunOptions {
  disableRunUpgrades?: boolean;
}

export class HeadlessSimulation {
  public static runSingleRun(
    gameState: GameState,
    seed = 12345,
    options?: SingleRunOptions,
  ): SimulationResult {
    gameState.startNewRun(seed);

    while (true) {
      this.simulateArenaRound(gameState);

      // 2. ラウンド終了
      gameState.endRound();

      if (gameState.isCleared) {
        break;
      }

      // 上納金の初登場告知（Round 3 では支払いは発生しない）
      if (gameState.shouldShowInvoiceIntro()) {
        gameState.invoiceIntroduced = true;
      }

      // 3. 請求判定 (初回支払いは Round 6、以降 3 ラウンドごと)
      if (gameState.isInvoiceDue()) {
        const canPay = gameState.canPayInvoice();
        if (canPay) {
          gameState.payInvoice();
          const passives = gameState.rollPassives();
          const chosen = this.chooseBestPassive(passives);
          gameState.choosePassive(chosen);
        } else {
          gameState.triggerGameOver();
          break;
        }
      }

      // 4. 強化のシミュレート (支払い後に残った資金で安全に強化)
      if (!options?.disableRunUpgrades) {
        this.simulateUpgrades(gameState);
      }

      // 次のラウンドへ
      gameState.prepareNextRound();

      // セーフティガード (無限ループ防止)
      if (gameState.round > SIMULATION_CONFIG.maxRoundsGuard) {
        break;
      }
    }

    return {
      runNumber: gameState.persistentData.stats.totalRuns,
      roundsSurvived: gameState.round,
      invoicesPaid: gameState.invoiceCount,
      totalSpEarned: gameState.runStats.totalSpEarned,
      totalInvoicesPaidAmount: gameState.runStats.totalInvoicesPaidAmount,
      targetsUnlockedCount: gameState.unlockedTargets.length,
      cleared: gameState.isCleared,
      permanentPointsGained: gameState.lastGainedPermanentPoints,
    };
  }

  /**
   * 実際のアリーナ物理・ルール（同時出現数・照準スイープ・弾速/弾サイズ・懐中時計延長・ダイナマイト誘爆・寿命消滅）を忠実に再現した1ラウンドシミュレーション
   */
  private static simulateArenaRound(gameState: GameState): void {
    let duration = gameState.getRoundDuration();
    const fireInterval = gameState.getFireInterval();
    const magazineSize = gameState.getMagazineSize();
    const reloadTime = gameState.getReloadTime();
    const maxTargets = gameState.getMaxTargets();
    const bullet = gameState.getBulletConfig();
    const respawnDelaySec = ARENA_CONFIG.targetRespawnDelayMs / 1000;
    const isAutoAim = gameState.canToggleAutoFire() && gameState.persistentData.settings.autoFire;

    let nextUid = 1;
    const activeTargets: SimTarget[] = [];
    const pendingRespawns: number[] = [];

    const spawnTarget = () => {
      const def = gameState.rollTarget();
      activeTargets.push({
        uid: nextUid++,
        def,
        hp: def.hp,
        remainingLife: def.lifetime,
      });
    };

    for (let i = 0; i < maxTargets; i++) {
      spawnTarget();
    }

    let elapsed = 0;
    let ammo = magazineSize;
    let lockedUid: number | null = null;

    const advanceTime = (dt: number) => {
      elapsed += dt;
      // 寿命付き標的のカウントダウン
      for (let i = activeTargets.length - 1; i >= 0; i--) {
        const t = activeTargets[i];
        if (typeof t.remainingLife === "number") {
          t.remainingLife -= dt;
          if (t.remainingLife <= 0) {
            if (lockedUid === t.uid) lockedUid = null;
            activeTargets.splice(i, 1);
            pendingRespawns.push(elapsed + 0.2);
          }
        }
      }
      // リスポーン処理
      for (let i = pendingRespawns.length - 1; i >= 0; i--) {
        if (elapsed >= pendingRespawns[i]) {
          pendingRespawns.splice(i, 1);
          if (activeTargets.length < maxTargets) {
            spawnTarget();
          }
        }
      }
    };

    const handleDestroy = (idx: number, killingDamage: number) => {
      const destroyed = activeTargets[idx];
      if (!destroyed) return;
      if (lockedUid === destroyed.uid) lockedUid = null;
      activeTargets.splice(idx, 1);

      gameState.onTargetDestroyed(destroyed.def.id);
      const shouldRespawn = gameState.rollTargetRespawn() || activeTargets.length === 0;
      if (shouldRespawn) {
        pendingRespawns.push(elapsed + respawnDelaySec);
      }

      if (destroyed.def.id === "time") {
        duration += gameState.getTimeTargetBonus();
      }

      if (destroyed.def.id === "electric") {
        const chainDmg = gameState.getChainDamage(killingDamage);
        const chainKilledUids: number[] = [];
        for (const other of activeTargets) {
          other.hp -= chainDmg;
          if (other.hp <= 0) {
            chainKilledUids.push(other.uid);
          }
        }
        for (const uid of chainKilledUids) {
          const foundIdx = activeTargets.findIndex((t) => t.uid === uid);
          if (foundIdx !== -1) {
            handleDestroy(foundIdx, chainDmg);
          }
        }
      }
    };

    // 最大安全ループ回数
    let safetySteps = 0;
    while (elapsed < duration && safetySteps < 600) {
      safetySteps++;

      if (activeTargets.length === 0) {
        advanceTime(0.08);
        continue;
      }

      // ターゲット選定（ロックオン継続中ならそのまま、なければ優先度の高い標的へスイープ）
      let targetIdx: number =
        lockedUid !== null ? activeTargets.findIndex((t) => t.uid === lockedUid) : -1;
      if (targetIdx === -1) {
        // 新規ターゲットへ照準を合わせるスイープ時間（同時出現数が多いほど短縮）
        const baseSweep = isAutoAim ? 0.16 : 0.24;
        const densityFactor = Math.sqrt(Math.max(1, activeTargets.length) / 3);
        advanceTime(baseSweep / densityFactor);
        if (elapsed >= duration || activeTargets.length === 0) break;

        // 人間らしく高価値・時間延長・誘爆樽を優先しつつ選択
        targetIdx = this.pickTargetIndex(activeTargets);
        lockedUid = activeTargets[targetIdx].uid;
      }

      const target = activeTargets[targetIdx];
      // 弾の飛翔によるわずかな実効ラグ（弾速が速いほど有利）
      const travelLag = Math.min(0.18, 360 / bullet.speed) * 0.25;
      advanceTime(travelLag);
      if (elapsed >= duration) break;

      // リロード確認
      if (ammo <= 0) {
        advanceTime(reloadTime);
        ammo = magazineSize;
        if (elapsed >= duration) break;
      }

      // ターゲットが寿命切れで消えていないか再確認
      targetIdx = activeTargets.findIndex((t) => t.uid === target.uid);
      if (targetIdx === -1) {
        lockedUid = null;
        continue;
      }

      // 命中判定: 標的半径 + 弾半径 と 弾速 に応じて命中率が変化
      const sizeFactor = (target.def.radius + bullet.radius) / (46 + 7);
      const speedBonus = Math.min(0.06, (bullet.speed - 1800) / 25000);
      const hitChance = Math.max(
        0.68,
        Math.min(0.97, SIMULATION_CONFIG.assumedAccuracy * Math.pow(sizeFactor, 0.25) + speedBonus),
      );

      ammo--;
      if (gameState.rng.next() < hitChance) {
        const isCrit = gameState.rollCrit();
        const dmg = gameState.calculateDamage(isCrit);
        activeTargets[targetIdx].hp -= dmg;
        if (activeTargets[targetIdx].hp <= 0) {
          handleDestroy(targetIdx, dmg);
        }
      }

      // 次弾発射インターバルまたは空リロード
      if (ammo <= 0) {
        advanceTime(reloadTime);
        ammo = magazineSize;
      } else {
        advanceTime(fireInterval);
      }
    }
  }

  private static pickTargetIndex(targets: SimTarget[]): number {
    let bestIdx = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < targets.length; i++) {
      const id = targets[i].def.id;
      const priority =
        id === "gold"
          ? 5
          : id === "time"
            ? 4
            : id === "electric"
              ? 3
              : id === "small"
                ? 2.5
                : id === "hard"
                  ? 2
                  : 1;
      if (priority > bestScore) {
        bestScore = priority;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  private static simulateUpgrades(gameState: GameState): void {
    const roundsUntilInvoice = gameState.getRoundsUntilNextInvoice();
    const invoiceCost = gameState.getInvoiceAmount();

    // 請求までの残りラウンドに応じた現実的な温存額（序盤ラウンドは投資してスノーボール、直前は全額確保）
    const reserveAmount =
      roundsUntilInvoice <= 1
        ? invoiceCost
        : roundsUntilInvoice === 2
          ? Math.floor(invoiceCost * SIMULATION_CONFIG.invoiceReserveRatio)
          : 0;

    // 武器ショップ購入判定（半分以上貯まっていれば1ラウンド貯金して銃を買う人間らしい判断を含む）
    let savingForGun = false;
    if (gameState.isShopAvailable()) {
      if (!gameState.ownedWeapons.includes("rifle")) {
        const riflePrice = gameState.getWeaponPrice("rifle");
        if (gameState.sp - riflePrice >= reserveAmount) {
          gameState.buyWeapon("rifle");
        } else if (roundsUntilInvoice >= 2 && gameState.sp - reserveAmount >= riflePrice * 0.55) {
          savingForGun = true;
        }
      } else if (
        !gameState.ownedWeapons.includes("sniper") &&
        gameState.round >= SIMULATION_CONFIG.sniperPurchaseMinRound
      ) {
        const sniperPrice = gameState.getWeaponPrice("sniper");
        if (gameState.sp - sniperPrice >= reserveAmount) {
          gameState.buyWeapon("sniper");
        } else if (roundsUntilInvoice >= 2 && gameState.sp - reserveAmount >= sniperPrice * 0.55) {
          savingForGun = true;
        }
      }
    }

    if (savingForGun) {
      return;
    }

    // コスパ重視の購入（購入可能なノードのうち、コストが低い＝費用対効果が高い段階を優先しつつ主要ノードを押さえる）
    const weightBySkill: Record<string, number> = {
      damage_base: 1.35,
      sp_multiplier: 1.3,
      round_time: 1.25,
      fire_rate: 1.2,
      target_point_mult: 1.18,
      magazine_size: 1.12,
      crit_rate: 1.1,
      reload_speed: 1.08,
      respawn_rate: 1.15,
      max_targets: 1.05,
      time_target_bonus: 1.02,
      magazine_mult: 1.0,
      chain_damage: 1.0,
    };

    let upgraded = true;
    while (upgraded) {
      upgraded = false;
      let bestSkill: SkillNodeId | null = null;
      let bestScore = -Infinity;

      for (const skillId of SKILL_IDS) {
        const cost = gameState.getSkillCost(skillId);
        if (cost !== null && gameState.canUnlockSkill(skillId)) {
          if (gameState.sp - cost >= reserveAmount) {
            const w = weightBySkill[skillId] ?? 1.0;
            // 低コストの初期段階ほど優先して幅広く伸ばす（実際のプレイヤー挙動に近い）
            const score = (w * 1000) / Math.max(1, cost);
            if (score > bestScore) {
              bestScore = score;
              bestSkill = skillId;
            }
          }
        }
      }

      if (bestSkill && gameState.buySkill(bestSkill)) {
        upgraded = true;
      }
    }
  }

  private static chooseBestPassive(choices: PassiveId[]): PassiveId {
    const priority: PassiveId[] = [
      "sp_bonus",
      "dmg_bonus",
      "time_bonus",
      "tp_bonus",
      "crit_bonus",
      "target_bonus",
    ];
    for (const p of priority) {
      if (choices.includes(p)) return p;
    }
    return choices[0];
  }

  /**
   * 複数ラン（周回）のメタ進行シミュレーションを実行
   */
  public static runCampaign(maxRuns = 8): SimulationResult[] {
    StorageService.clear();
    const gameState = new GameState();
    StorageService.save(gameState.persistentData);

    const results: SimulationResult[] = [];

    for (let run = 1; run <= maxRuns; run++) {
      const res = this.runSingleRun(gameState, 1000 + run * 37);
      results.push(res);

      if (res.cleared) {
        break;
      }

      // 永続強化の自動購入（段階の低いものから重要度順＝base_dmg優先でバランス良く購入）
      while (gameState.persistentData.permanentPoints > 0) {
        const candidates: (keyof typeof gameState.persistentData.permanentUpgrades)[] = [
          "base_dmg",
          "invoice_reduction",
          "round_time",
          "tp_gain",
          "start_sp",
        ];
        let bestUpgrade: keyof typeof gameState.persistentData.permanentUpgrades | null = null;
        let lowestLevel = Infinity;

        for (const u of candidates) {
          const cost = gameState.getPermanentUpgradeCost(u);
          const lvl = gameState.persistentData.permanentUpgrades[u] || 0;
          if (cost !== null && cost <= gameState.persistentData.permanentPoints) {
            if (lvl < lowestLevel) {
              lowestLevel = lvl;
              bestUpgrade = u;
            }
          }
        }

        if (!bestUpgrade || !gameState.purchasePermanentUpgrade(bestUpgrade)) {
          break;
        }
      }
    }

    return results;
  }
}
