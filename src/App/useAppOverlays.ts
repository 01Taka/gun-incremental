import { useCallback, useEffect, useRef, useState } from "react";

import { EventBus } from "../EventBus";
import type { IRefPhaserGame } from "../PhaserGame";
import { applyPhaserInputState, shouldBlockPhaserInput } from "./overlayInputPolicy";

interface UseAppOverlaysOptions {
  isSettingsOpen: boolean;
  openSettings: () => void;
}

export function useAppOverlays({ isSettingsOpen, openSettings }: UseAppOverlaysOptions) {
  // 各画面のアクティブ状態
  const [isTitleActive, setIsTitleActive] = useState(false);
  const [isResultActive, setIsResultActive] = useState(false);
  const [isInvoiceActive, setIsInvoiceActive] = useState(false);
  const [isUpgradeActive, setIsUpgradeActive] = useState(false);
  const [isPermanentUpgradeActive, setIsPermanentUpgradeActive] = useState(false);
  const [isGameOverActive, setIsGameOverActive] = useState(false);
  const [isClearActive, setIsClearActive] = useState(false);

  // 子コンポーネント（PhaserGame）の game インスタンスや scene への参照
  const phaserRef = useRef<IRefPhaserGame | null>(null);

  useEffect(() => {
    // Phaser側からの「設定を開く」イベント
    const handleOpenSettings = () => {
      openSettings();
    };

    // 各シーンのアクティブ状態購読
    const handleTitleSceneActive = (active: boolean) => {
      setIsTitleActive(active);
    };

    const handleResultSceneActive = (active: boolean) => {
      setIsResultActive(active);
    };

    const handleInvoiceSceneActive = (active: boolean) => {
      setIsInvoiceActive(active);
    };

    const handleUpgradeSceneActive = (active: boolean) => {
      setIsUpgradeActive(active);
    };

    const handlePermanentUpgradeSceneActive = (active: boolean) => {
      setIsPermanentUpgradeActive(active);
    };

    const handleGameOverSceneActive = (active: boolean) => {
      setIsGameOverActive(active);
    };

    const handleClearSceneActive = (active: boolean) => {
      setIsClearActive(active);
    };

    EventBus.on("open-settings", handleOpenSettings);
    EventBus.on("title-scene-active", handleTitleSceneActive);
    EventBus.on("result-scene-active", handleResultSceneActive);
    EventBus.on("invoice-scene-active", handleInvoiceSceneActive);
    EventBus.on("upgrade-scene-active", handleUpgradeSceneActive);
    EventBus.on("permanent-upgrade-scene-active", handlePermanentUpgradeSceneActive);
    EventBus.on("game-over-scene-active", handleGameOverSceneActive);
    EventBus.on("clear-scene-active", handleClearSceneActive);

    return () => {
      EventBus.off("open-settings", handleOpenSettings);
      EventBus.off("title-scene-active", handleTitleSceneActive);
      EventBus.off("result-scene-active", handleResultSceneActive);
      EventBus.off("invoice-scene-active", handleInvoiceSceneActive);
      EventBus.off("upgrade-scene-active", handleUpgradeSceneActive);
      EventBus.off("permanent-upgrade-scene-active", handlePermanentUpgradeSceneActive);
      EventBus.off("game-over-scene-active", handleGameOverSceneActive);
      EventBus.off("clear-scene-active", handleClearSceneActive);
    };
  }, [openSettings]);

  // タイトル画面のアクション
  const handleTitleStartDuel = useCallback(() => {
    EventBus.emit("title-start-game");
  }, []);

  const handleTitleOpenSaloon = useCallback(() => {
    EventBus.emit("title-open-permanent");
  }, []);

  // リザルト画面のアクション
  const handleResultToUpgrade = useCallback(() => {
    EventBus.emit("result-to-upgrade");
  }, []);

  const handleResultNextDuel = useCallback(() => {
    EventBus.emit("result-next-duel");
  }, []);

  // 上納金・パッシブ画面のアクション
  const handleInvoiceIntroConfirm = useCallback(() => {
    EventBus.emit("invoice-intro-confirm");
  }, []);

  const handleInvoicePassiveChosen = useCallback(() => {
    EventBus.emit("invoice-passive-chosen");
  }, []);

  const handleInvoiceGameOver = useCallback(() => {
    EventBus.emit("invoice-game-over");
  }, []);

  // 強化画面のアクション
  const handleUpgradeProceed = useCallback(() => {
    EventBus.emit("upgrade-proceed");
  }, []);

  // 永続強化画面のアクション
  const handlePermanentStartRun = useCallback(() => {
    EventBus.emit("permanent-upgrade-start-run");
  }, []);

  const handlePermanentBackToTitle = useCallback(() => {
    EventBus.emit("permanent-upgrade-back-title");
  }, []);

  // ゲームオーバー画面のアクション
  const handleGameOverBackToTitle = useCallback(() => {
    EventBus.emit("game-over-back-title");
  }, []);

  const handleGameOverOpenSaloon = useCallback(() => {
    EventBus.emit("game-over-open-saloon");
  }, []);

  // クリア画面のアクション
  const handleClearBackToTitle = useCallback(() => {
    EventBus.emit("clear-back-title");
  }, []);

  const handleClearOpenSaloon = useCallback(() => {
    EventBus.emit("clear-open-saloon");
  }, []);

  // 静止UI画面・モーダル表示時はPhaserの入力をブロック
  const isOverlayBlockingInput = shouldBlockPhaserInput({
    isSettingsOpen,
    isTitleActive,
    isResultActive,
    isInvoiceActive,
    isUpgradeActive,
    isPermanentUpgradeActive,
    isGameOverActive,
    isClearActive,
  });

  useEffect(() => {
    applyPhaserInputState(phaserRef.current?.game, isOverlayBlockingInput);
  }, [isOverlayBlockingInput]);

  return {
    phaserRef,
    // Active states
    isTitleActive,
    isResultActive,
    isInvoiceActive,
    isUpgradeActive,
    isPermanentUpgradeActive,
    isGameOverActive,
    isClearActive,
    // Action handlers
    handleTitleStartDuel,
    handleTitleOpenSaloon,
    handleResultToUpgrade,
    handleResultNextDuel,
    handleInvoiceIntroConfirm,
    handleInvoicePassiveChosen,
    handleInvoiceGameOver,
    handleUpgradeProceed,
    handlePermanentStartRun,
    handlePermanentBackToTitle,
    handleGameOverBackToTitle,
    handleGameOverOpenSaloon,
    handleClearBackToTitle,
    handleClearOpenSaloon,
  };
}
