import { useState } from "react";

import { AudioManager } from "../../audio/AudioManager";
import { TARGET_UNLOCK_SEQUENCE } from "../../config/gameData";
import { VOCAB } from "../../config/vocab";
import { useI18n } from "../../i18n";
import { formatMoney } from "../../logic/format";
import { GameState } from "../../logic/GameState";
import { checkHasInvoiceAppeared, getInvoiceNoticeText } from "./resultNotice";

interface UseResultOverlayOptions {
  onToUpgrade: () => void;
  onNextDuel: () => void;
}

export function useResultOverlay({ onToUpgrade, onNextDuel }: UseResultOverlayOptions) {
  const gameState = GameState.getInstance();
  const audio = AudioManager.getInstance();
  useI18n();

  const [showUnlockModal, setShowUnlockModal] = useState(
    gameState.lastRoundNewlyUnlockedTargets.length > 0,
  );

  const progress = gameState.getTargetUnlockProgress();
  const nextTargetName = progress.nextTarget ? VOCAB.targets[progress.nextTarget.id].name : null;
  const nextStep = progress.nextTarget
    ? TARGET_UNLOCK_SEQUENCE.find((s) => s.targetId === progress.nextTarget!.id)
    : null;

  const hasInvoiceAppeared = checkHasInvoiceAppeared({
    round: gameState.round,
    invoiceIntroduced: gameState.invoiceIntroduced,
    invoiceCount: gameState.invoiceCount,
  });

  const roundsRemaining = gameState.getRoundsUntilNextInvoice();
  const invoiceCost = gameState.getInvoiceAmount();
  const formattedCost = formatMoney(invoiceCost);
  const { isUrgent, noticeText } = getInvoiceNoticeText(roundsRemaining, formattedCost);

  const handleUpgrade = () => {
    audio.playSynthSE("spur", 0.75);
    onToUpgrade();
  };

  const handleProceed = () => {
    audio.playSynthSE("spur", 0.75);
    onNextDuel();
  };

  const handleCloseUnlockModal = () => {
    audio.playSynthSE("spur", 0.6);
    setShowUnlockModal(false);
  };

  return {
    gameState,
    showUnlockModal,
    progress,
    nextTargetName,
    nextStep,
    hasInvoiceAppeared,
    isUrgent,
    noticeText,
    handleUpgrade,
    handleProceed,
    handleCloseUnlockModal,
  };
}
