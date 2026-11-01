import { useCallback, useEffect, useRef, useState } from "react";

import { ClearOverlay } from "./components/ClearOverlay";
import { GameOverOverlay } from "./components/GameOverOverlay";
import { InvoiceOverlay } from "./components/InvoiceOverlay";
import { PermanentUpgradeOverlay } from "./components/PermanentUpgradeOverlay";
import { ResultOverlay } from "./components/ResultOverlay";
import { SettingsModal } from "./components/SettingsModal";
import { TitleOverlay } from "./components/TitleOverlay";
import { UpgradeOverlay } from "./components/UpgradeOverlay";
import { EventBus } from "./EventBus";
import { type IRefPhaserGame, PhaserGame } from "./PhaserGame";
import { useGameSettings } from "./stores/useGameSettings";

export default function App() {
  const { isOpen: isSettingsOpen, openSettings, closeSettings } = useGameSettings();

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
  // ※ゲーム中（isRoundActive）はスライダーやドラッグ入力を行うためブロックしない
  const isOverlayBlockingInput =
    isSettingsOpen ||
    isTitleActive ||
    isResultActive ||
    isInvoiceActive ||
    isUpgradeActive ||
    isPermanentUpgradeActive ||
    isGameOverActive ||
    isClearActive;

  useEffect(() => {
    const game = phaserRef.current?.game;
    if (!game) return;

    if (isOverlayBlockingInput) {
      game.input.enabled = false;
      game.input.pointers?.forEach((pointer) => {
        pointer.reset();
      });
    } else {
      game.input.enabled = true;
    }
  }, [isOverlayBlockingInput]);

  return (
    <main className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-[#160c06] select-none">
      {/* 設定モーダル（全画面切り替えや音量設定を内包） */}
      {isSettingsOpen && <SettingsModal onClose={closeSettings} />}

      {/* 1. タイトル画面 React オーバーレイ */}
      {isTitleActive && (
        <TitleOverlay
          onStartDuel={handleTitleStartDuel}
          onOpenSaloon={handleTitleOpenSaloon}
          onOpenSettings={openSettings}
        />
      )}

      {/* 2. リザルト画面 React オーバーレイ */}
      {isResultActive && (
        <ResultOverlay onToUpgrade={handleResultToUpgrade} onNextDuel={handleResultNextDuel} />
      )}

      {/* 4. 上納金 & パッシブ画面 React オーバーレイ */}
      {isInvoiceActive && (
        <InvoiceOverlay
          onIntroConfirm={handleInvoiceIntroConfirm}
          onPassiveChosen={handleInvoicePassiveChosen}
          onGameOver={handleInvoiceGameOver}
        />
      )}

      {/* 5. スキルツリー & 武器ショップ強化画面 React オーバーレイ */}
      {isUpgradeActive && <UpgradeOverlay onProceed={handleUpgradeProceed} />}

      {/* 6. 永続強化（酒場）画面 React オーバーレイ */}
      {isPermanentUpgradeActive && (
        <PermanentUpgradeOverlay
          onStartRun={handlePermanentStartRun}
          onBackToTitle={handlePermanentBackToTitle}
        />
      )}

      {/* 7. ゲームオーバー画面 React オーバーレイ */}
      {isGameOverActive && (
        <GameOverOverlay
          onBackToTitle={handleGameOverBackToTitle}
          onOpenSaloon={handleGameOverOpenSaloon}
        />
      )}

      {/* 8. ゲームクリア画面 React オーバーレイ */}
      {isClearActive && (
        <ClearOverlay onBackToTitle={handleClearBackToTitle} onOpenSaloon={handleClearOpenSaloon} />
      )}

      {/* Phaserゲーム画面（背景描画・アリーナ物理・銃身・弾丸演出） */}
      <PhaserGame ref={phaserRef} />

      {/* 西部劇映画風のセピア色調フィルター & 軽いフィルムグレイン（入力は完全に透過） */}
      <div
        aria-hidden="true"
        className="western-warm-wash pointer-events-none fixed inset-0 z-40"
      />
      <div
        aria-hidden="true"
        className="western-sepia-vignette pointer-events-none fixed inset-0 z-40"
      />
      <div
        aria-hidden="true"
        className="western-film-grain pointer-events-none fixed -inset-4 z-40"
      />
    </main>
  );
}
