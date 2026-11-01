import { useEffect } from "react";

import { AudioManager } from "../audio/AudioManager";
import { useI18n } from "../i18n";
import { GameState } from "../logic/GameState";
import { createRunStatItems, triggerWesternConfetti } from "./runSummaryUtils";

interface UseRunSummaryOptions {
  onBackToTitle: () => void;
  onOpenSaloon: () => void;
  triggerConfetti?: boolean;
}

export function useRunSummary({
  onBackToTitle,
  onOpenSaloon,
  triggerConfetti = false,
}: UseRunSummaryOptions) {
  const gameState = GameState.getInstance();
  const audio = AudioManager.getInstance();
  useI18n();

  useEffect(() => {
    if (!triggerConfetti) return;
    audio.playSynthSE("laser", 0.9);
    return triggerWesternConfetti();
  }, [audio, triggerConfetti]);

  const stats = gameState.runStats;
  const gainedPoints = gameState.lastGainedPermanentPoints;

  const handleTitle = () => {
    audio.playSynthSE("spur", 0.65);
    onBackToTitle();
  };

  const handleSaloon = () => {
    audio.playSynthSE("spur", 0.65);
    onOpenSaloon();
  };

  const statItems = createRunStatItems(stats, gameState.unlockedTargets.length);

  return {
    gameState,
    stats,
    gainedPoints,
    statItems,
    handleTitle,
    handleSaloon,
  };
}
