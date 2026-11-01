import { SKILL_IDS, SKILLS } from "../config/skillTree";
import type { PassiveId, SkillNodeId } from "../config/types";
import { GameState } from "./GameState";

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

export class HeadlessSimulation {
  public static runSingleRun(gameState: GameState, seed = 12345): SimulationResult {
    gameState.startNewRun(seed);

    while (true) {
      // 1. ラウンドのシミュレート (マガジン装弾数と空時自動リロードを考慮)
      const duration = gameState.getRoundDuration();
      const fireInterval = gameState.getFireInterval();
      const magazineSize = gameState.getMagazineSize();
      const reloadTime = gameState.getReloadTime();

      let shotsTotal = 0;
      let elapsed = fireInterval;
      let ammo = magazineSize;
      while (elapsed <= duration) {
        shotsTotal++;
        ammo--;
        if (ammo <= 0) {
          elapsed += reloadTime;
          ammo = magazineSize;
        } else {
          elapsed += fireInterval;
        }
      }

      // 人間操作を模した命中率 (85%〜95%)
      const accuracy = 0.9;
      const effectiveShots = Math.floor(shotsTotal * accuracy);

      for (let s = 0; s < effectiveShots; s++) {
        // 的を抽選
        const target = gameState.rollTarget();
        const isCrit = gameState.rollCrit();
        const dmg = gameState.calculateDamage(isCrit);

        // 必要弾数の計算
        const shotsNeeded = Math.ceil(target.hp / dmg);
        // 今回の射撃で撃破できたか（確率的判定）
        if (gameState.rng.next() < 1 / shotsNeeded) {
          gameState.onTargetDestroyed(target.id);
        }
      }

      // 2. ラウンド終了
      gameState.endRound();

      if (gameState.isCleared) {
        break;
      }

      // 3. 強化のシミュレート (AI戦略: 請求に備えて安全マージンを残しつつ強化)
      this.simulateUpgrades(gameState);

      // 4. 請求判定 (5ラウンド終了ごと)
      if (gameState.isInvoiceDue()) {
        const canPay = gameState.canPayInvoice();
        if (canPay) {
          gameState.payInvoice();
          // パッシブ選択 (SPボーナスまたはダメージボーナスを優先)
          const passives = gameState.rollPassives();
          const chosen = this.chooseBestPassive(passives);
          gameState.choosePassive(chosen);
        } else {
          gameState.triggerGameOver();
          break;
        }
      }

      // 次のラウンドへ
      gameState.prepareNextRound();

      // セーフティガード (無限ループ防止)
      if (gameState.round > 120) {
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

  private static simulateUpgrades(gameState: GameState): void {
    // 次回の請求予定ラウンド (例: round 1..5 なら 5, round 6..10 なら 10)
    const currentRound = gameState.round;
    const nextInvoiceRound = Math.ceil(currentRound / 5) * 5;
    const roundsUntilInvoice = nextInvoiceRound - currentRound; // 0なら今まさに請求の直前
    const invoiceCost = gameState.getInvoiceAmount();

    // 請求直前(残り0〜1ラウンド)なら請求予定額を全額温存
    const reserveAmount = roundsUntilInvoice <= 1 ? invoiceCost : Math.floor(invoiceCost * 0.35);

    // 武器ショップ購入優先判定 (Round 3以降)
    if (gameState.isShopAvailable()) {
      if (!gameState.ownedWeapons.includes("rifle")) {
        const riflePrice = gameState.getWeaponPrice("rifle");
        if (gameState.sp - riflePrice >= reserveAmount) {
          gameState.buyWeapon("rifle");
        }
      } else if (!gameState.ownedWeapons.includes("sniper") && gameState.round >= 10) {
        const sniperPrice = gameState.getWeaponPrice("sniper");
        if (gameState.sp - sniperPrice >= reserveAmount) {
          gameState.buyWeapon("sniper");
        }
      }
    }

    // スキル購入 (優先度: 基礎ダメージ > SP倍率 > 時間延長 > 連射間隔 > 的ポイント)
    // JSON に存在しないIDは除外し、優先リストにない新規ノードは末尾に追加する
    const preferred: SkillNodeId[] = [
      "damage_base",
      "sp_multiplier",
      "round_time",
      "fire_rate",
      "magazine_size",
      "reload_speed",
      "crit_rate",
      "target_point_mult",
      "max_targets",
      "shop_discount",
      "time_target_bonus",
      "chain_damage",
    ];
    const priorityList: SkillNodeId[] = [
      ...preferred.filter((id) => id in SKILLS),
      ...SKILL_IDS.filter((id) => !preferred.includes(id)),
    ];

    let upgraded = true;
    while (upgraded) {
      upgraded = false;
      for (const skillId of priorityList) {
        const cost = gameState.getSkillCost(skillId);
        if (cost !== null && gameState.canUnlockSkill(skillId)) {
          if (gameState.sp - cost >= reserveAmount) {
            if (gameState.buySkill(skillId)) {
              upgraded = true;
              break;
            }
          }
        }
      }
    }
  }

  private static chooseBestPassive(choices: PassiveId[]): PassiveId {
    const priority: PassiveId[] = [
      "sp_bonus",
      "dmg_bonus",
      "time_bonus",
      "tp_bonus",
      "target_bonus",
      "shop_discount",
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
    const gameState = new GameState();
    // 永続セーブデータを一旦リセット
    gameState.persistentData = {
      permanentPoints: 0,
      permanentUpgrades: {
        start_sp: 0,
        base_dmg: 0,
        round_time: 0,
        tp_gain: 0,
        invoice_reduction: 0,
      },
      settings: { autoFire: false },
      stats: { totalRuns: 0, totalInvoicesPaid: 0, highestRound: 0, cleared: false },
    };

    const results: SimulationResult[] = [];

    for (let run = 1; run <= maxRuns; run++) {
      const res = this.runSingleRun(gameState, 1000 + run * 37);
      results.push(res);

      if (res.cleared) {
        break;
      }

      // 永続強化の自動購入 (優先: 基礎ダメージ > 請求軽減 > 的ポイント > 時間延長 > 初期SP)
      while (gameState.persistentData.permanentPoints > 0) {
        const pPriority: (keyof typeof gameState.persistentData.permanentUpgrades)[] = [
          "base_dmg",
          "invoice_reduction",
          "tp_gain",
          "round_time",
          "start_sp",
        ];
        let bought = false;
        for (const u of pPriority) {
          if (gameState.purchasePermanentUpgrade(u)) {
            bought = true;
            break;
          }
        }
        if (!bought) break;
      }
    }

    return results;
  }
}
