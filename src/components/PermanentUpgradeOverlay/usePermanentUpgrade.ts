import { useCallback, useState } from "react";

import { AudioManager } from "../../audio/AudioManager";
import type { PermanentUpgradeId } from "../../config/types";
import { useI18n } from "../../i18n";
import { GameState } from "../../logic/GameState";

interface UsePermanentUpgradeOptions {
  onStartRun: () => void;
  onBackToTitle: () => void;
}

export function usePermanentUpgrade({ onStartRun, onBackToTitle }: UsePermanentUpgradeOptions) {
  const gameState = GameState.getInstance();
  const audio = AudioManager.getInstance();
  useI18n(); // 言語切り替え時に再レンダリング

  const [, setRevision] = useState(0);

  const refresh = useCallback(() => {
    setRevision((r) => r + 1);
  }, []);

  const points = gameState.persistentData.permanentPoints;

  const handlePurchase = (id: PermanentUpgradeId) => {
    if (gameState.purchasePermanentUpgrade(id)) {
      audio.playSynthSE("laser", 0.8);
      refresh();
    }
  };

  const handleStartRun = () => {
    audio.playSynthSE("spur", 0.75);
    onStartRun();
  };

  const handleBackToTitle = () => {
    audio.playSynthSE("spur", 0.65);
    onBackToTitle();
  };

  return {
    gameState,
    points,
    handlePurchase,
    handleStartRun,
    handleBackToTitle,
  };
}
