/**
 * ゲーム全体のルール・バランス定数のローダー
 *
 * ラウンド基本設定・保安官の上納金・戦闘上限キャップ・進行解放条件・
 * 砲台/アリーナ挙動・ヘッドレス検証パラメータを gameRules.json から読み込み検証する。
 */
import { z } from "zod";

import rawGameRules from "./gameRules.json";
import type {
  ArenaConfig,
  CombatConfig,
  GameRulesConfig,
  InvoiceConfig,
  ProgressionConfig,
  RoundConfig,
  SimulationConfig,
} from "./types";

const roundSchema = z
  .object({
    baseDuration: z.number().positive(),
    baseTargetCount: z.number().int().min(1),
    maxTargetCountCap: z.number().int().min(1),
    timeTargetBaseExtension: z.number().nonnegative(),
    countdownDuration: z.number().nonnegative(),
    lowTimeWarningThreshold: z.number().nonnegative(),
  })
  .strict();

const invoiceSchema = z
  .object({
    intervalRounds: z.number().int().min(1),
    baseCost: z.number().nonnegative(),
    growthRate: z.number().positive(),
    minCost: z.number().nonnegative(),
    permanentPointRate: z.number().nonnegative(),
  })
  .strict();

const combatSchema = z
  .object({
    critMultiplier: z.number().min(1),
    maxCritRate: z.number().min(0).max(1),
    maxFireRateReduction: z.number().min(0).max(0.99),
    minFireInterval: z.number().positive(),
    maxReloadTimeReduction: z.number().min(0).max(0.99),
    minReloadTime: z.number().positive(),
    maxShopDiscount: z.number().min(0).max(1),
  })
  .strict();

const progressionSchema = z
  .object({
    initialWeaponId: z.enum(["handgun", "rifle", "sniper"]),
    shopUnlockRound: z.number().int().min(1),
    autoFireUnlockWeaponCount: z.number().int().min(1),
    passiveChoicesCount: z.number().int().min(1),
  })
  .strict();

const arenaSchema = z
  .object({
    turretMinAngleDeg: z.number(),
    turretMaxAngleDeg: z.number(),
    rayHitMarginRatio: z.number().nonnegative(),
    autoAimSpeed: z.number().positive(),
    keyboardAimSpeed: z.number().positive(),
    targetRespawnDelayMs: z.number().nonnegative(),
    targetBlinkThresholdSeconds: z.number().nonnegative(),
    bulletOutPadding: z.number().nonnegative(),
  })
  .strict();

const simulationSchema = z
  .object({
    assumedAccuracy: z.number().gt(0).lte(1),
    maxRoundsGuard: z.number().int().min(1),
    invoiceReserveRatio: z.number().min(0).lte(1),
    sniperPurchaseMinRound: z.number().int().min(1),
  })
  .strict();

const gameRulesFileSchema = z
  .object({
    $schema: z.string().optional(),
    round: roundSchema,
    invoice: invoiceSchema,
    combat: combatSchema,
    progression: progressionSchema,
    arena: arenaSchema,
    simulation: simulationSchema,
  })
  .strict();

export class GameRulesValidationError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(`gameRules.json の定義が不正です:\n- ${problems.join("\n- ")}`);
    this.name = "GameRulesValidationError";
    this.problems = problems;
  }
}

export function buildGameRules(raw: unknown): GameRulesConfig {
  const parsed = gameRulesFileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new GameRulesValidationError([z.prettifyError(parsed.error)]);
  }

  const problems: string[] = [];
  const data = parsed.data;

  if (data.round.maxTargetCountCap < data.round.baseTargetCount) {
    problems.push(
      `round.maxTargetCountCap (${data.round.maxTargetCountCap}) は baseTargetCount (${data.round.baseTargetCount}) 以上である必要があります`,
    );
  }
  if (data.arena.turretMinAngleDeg >= data.arena.turretMaxAngleDeg) {
    problems.push(
      `arena.turretMinAngleDeg (${data.arena.turretMinAngleDeg}) は turretMaxAngleDeg (${data.arena.turretMaxAngleDeg}) より小さい必要があります`,
    );
  }

  if (problems.length > 0) {
    throw new GameRulesValidationError(problems);
  }

  return {
    round: data.round,
    invoice: data.invoice,
    combat: data.combat,
    progression: data.progression,
    arena: data.arena,
    simulation: data.simulation,
  };
}

export const GAME_RULES: GameRulesConfig = buildGameRules(rawGameRules);
export const ROUND_CONFIG: RoundConfig = GAME_RULES.round;
export const INVOICE_CONFIG: InvoiceConfig = GAME_RULES.invoice;
export const COMBAT_CONFIG: CombatConfig = GAME_RULES.combat;
export const PROGRESSION_CONFIG: ProgressionConfig = GAME_RULES.progression;
export const ARENA_CONFIG: ArenaConfig = GAME_RULES.arena;
export const SIMULATION_CONFIG: SimulationConfig = GAME_RULES.simulation;
