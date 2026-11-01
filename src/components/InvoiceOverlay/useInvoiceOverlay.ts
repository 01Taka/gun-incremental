import { useState } from "react";

import { AudioManager } from "../../audio/AudioManager";
import type { PassiveId } from "../../config/types";
import { useI18n } from "../../i18n";
import { GameState } from "../../logic/GameState";

export type InvoiceStep = "intro" | "invoice" | "passive";

interface UseInvoiceOverlayOptions {
  onIntroConfirm: () => void;
  onPassiveChosen: () => void;
  onGameOver: () => void;
}

export function useInvoiceOverlay({
  onIntroConfirm,
  onPassiveChosen,
  onGameOver,
}: UseInvoiceOverlayOptions) {
  const gameState = GameState.getInstance();
  const audio = AudioManager.getInstance();
  useI18n();

  const [step, setStep] = useState<InvoiceStep>(() => {
    return gameState.shouldShowInvoiceIntro() ? "intro" : "invoice";
  });

  const [choices, setChoices] = useState<PassiveId[]>(() => []);

  const invoiceNumber = gameState.invoiceCount + 1;
  const invoiceCost = gameState.getInvoiceAmount();
  const canAfford = gameState.canPayInvoice();

  // 初回導入の確認
  const handleIntroConfirm = () => {
    audio.playSynthSE("spur", 0.7);
    gameState.completeInvoiceIntro();
    onIntroConfirm();
  };

  // 上納金支払い
  const handlePayInvoice = () => {
    if (gameState.payInvoice()) {
      audio.playSynthSE("laser", 0.85);
      const rolled = gameState.rollPassives();
      setChoices(rolled);
      setStep("passive");
    }
  };

  // 破産・降伏
  const handleBankrupt = () => {
    audio.playSynthSE("gameover");
    gameState.triggerGameOver();
    onGameOver();
  };

  // パッシブ選択
  const handleSelectPassive = (passiveId: PassiveId) => {
    audio.playSynthSE("spur", 0.75);
    gameState.choosePassive(passiveId);
    onPassiveChosen();
  };

  return {
    gameState,
    step,
    choices,
    invoiceNumber,
    invoiceCost,
    canAfford,
    handleIntroConfirm,
    handlePayInvoice,
    handleBankrupt,
    handleSelectPassive,
  };
}
