import confetti from "canvas-confetti";

import { TARGET_UNLOCK_SEQUENCE } from "../config/gameData";
import type { RunStats } from "../config/types";
import { VOCAB } from "../config/vocab";
import { formatMoney } from "../logic/format";

export interface StatItemDisplay {
  label: string;
  val: string;
}

/**
 * リザルト・ゲームオーバー・クリア画面用の戦歴アイテムリストを生成
 */
export function createRunStatItems(
  stats: RunStats,
  unlockedTargetsCount: number,
  totalTargetsCount = TARGET_UNLOCK_SEQUENCE.length,
): StatItemDisplay[] {
  return [
    { label: VOCAB.records.roundReached, val: VOCAB.progression.roundName(stats.round) },
    {
      label: VOCAB.records.invoicesPaidCount,
      val: VOCAB.records.countValue(stats.invoicesPassed),
    },
    {
      label: VOCAB.records.totalBountyEarned,
      val: `${formatMoney(stats.totalSpEarned)}`,
    },
    {
      label: VOCAB.records.totalTaxesPaid,
      val: `${formatMoney(stats.totalInvoicesPaidAmount)}`,
    },
    {
      label: VOCAB.records.totalTargetsHit,
      val: VOCAB.records.targetsHitValue(stats.targetsDestroyedTotal),
    },
    {
      label: VOCAB.records.targetsUnlocked,
      val: VOCAB.records.targetsUnlockedValue(unlockedTargetsCount, totalTargetsCount),
    },
  ];
}

/**
 * クリア時の西部劇風ゴールド紙吹雪アニメーションを発射
 */
export function triggerWesternConfetti(): () => void {
  const westernGoldColors = ["#fbbf24", "#d97706", "#fef3c7", "#b45309", "#dc2626"];
  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    confetti({
      particleCount: 100,
      spread: 90,
      colors: westernGoldColors,
      origin: { y: 0.5 },
    });
    timer = setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 70,
        colors: westernGoldColors,
        origin: { x: 0 },
      });
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 70,
        colors: westernGoldColors,
        origin: { x: 1 },
      });
    }, 400);
  } catch {
    // confetti fallback
  }

  return () => {
    if (timer) clearTimeout(timer);
  };
}
