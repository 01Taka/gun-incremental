import { AudioManager } from "../../audio/AudioManager";
import { useI18n } from "../../i18n";
import { GameState } from "../../logic/GameState";

interface UseTitleOverlayOptions {
  onStartDuel: () => void;
  onOpenSaloon: () => void;
  onOpenSettings: () => void;
}

export function useTitleOverlay({
  onStartDuel,
  onOpenSaloon,
  onOpenSettings,
}: UseTitleOverlayOptions) {
  const gameState = GameState.getInstance();
  const audio = AudioManager.getInstance();
  useI18n();

  const permPoints = gameState.persistentData.permanentPoints;
  const highestRound = gameState.persistentData.stats.highestRound;
  const totalRuns = gameState.persistentData.stats.totalRuns;

  const handleStart = () => {
    audio.playSynthSE("spur", 0.75);
    onStartDuel();
  };

  const handleSaloon = () => {
    audio.playSynthSE("spur", 0.65);
    onOpenSaloon();
  };

  const handleSettings = () => {
    audio.playSynthSE("spur", 0.65);
    onOpenSettings();
  };

  return {
    permPoints,
    highestRound,
    totalRuns,
    handleStart,
    handleSaloon,
    handleSettings,
  };
}
