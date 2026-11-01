import { useCallback, useState } from "react";

import { AudioManager } from "../../audio/AudioManager";
import { INVOICE_CONFIG } from "../../config/gameData";
import type { WeaponId } from "../../config/types";
import { useI18n } from "../../i18n";
import { GameState } from "../../logic/GameState";

export type UpgradeTabType = "skills" | "weapons";

interface UseUpgradeOverlayOptions {
  onProceed: () => void;
}

export function useUpgradeOverlay({ onProceed }: UseUpgradeOverlayOptions) {
  const gameState = GameState.getInstance();
  const audio = AudioManager.getInstance();
  useI18n(); // 言語切り替え時に再レンダリング

  const [currentTab, setCurrentTab] = useState<UpgradeTabType>("skills");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [, setRevision] = useState(0);

  const refresh = useCallback(() => {
    setRevision((r) => r + 1);
  }, []);

  const isShopUnlocked = gameState.isShopAvailable();
  const nextInvoice = gameState.getInvoiceAmount();
  const nextInvoiceRound = (gameState.invoiceCount + 1) * INVOICE_CONFIG.intervalRounds;
  const canAffordInvoice = gameState.sp >= nextInvoice;

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
    audio.playSynthSE("spur", 0.65);
  };

  const handleSelectTab = (tab: UpgradeTabType) => {
    if (tab === "weapons" && !isShopUnlocked) return;
    if (currentTab !== tab) {
      setCurrentTab(tab);
    }
    setIsSidebarOpen(false);
    audio.playSynthSE("spur", 0.65);
  };

  const handleEquipWeapon = (weaponId: WeaponId) => {
    gameState.equipWeapon(weaponId);
    audio.playSynthSE("reload_complete", 0.7);
    refresh();
  };

  const handleBuyWeapon = (weaponId: WeaponId) => {
    if (gameState.buyWeapon(weaponId)) {
      audio.playSynthSE("laser", 0.85);
      refresh();
    }
  };

  const handleProceed = () => {
    audio.playSynthSE("spur", 0.75);
    onProceed();
  };

  return {
    gameState,
    currentTab,
    isSidebarOpen,
    isShopUnlocked,
    nextInvoice,
    nextInvoiceRound,
    canAffordInvoice,
    refresh,
    toggleSidebar,
    handleSelectTab,
    handleEquipWeapon,
    handleBuyWeapon,
    handleProceed,
    setIsSidebarOpen,
  };
}
