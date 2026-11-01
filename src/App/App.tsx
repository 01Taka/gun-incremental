import { ClearOverlay } from "../components/ClearOverlay";
import { GameOverOverlay } from "../components/GameOverOverlay";
import { InvoiceOverlay } from "../components/InvoiceOverlay";
import { PermanentUpgradeOverlay } from "../components/PermanentUpgradeOverlay";
import { ResultOverlay } from "../components/ResultOverlay";
import { SettingsModal } from "../components/SettingsModal";
import { TitleOverlay } from "../components/TitleOverlay";
import { UpgradeOverlay } from "../components/UpgradeOverlay";
import { PhaserGame } from "../PhaserGame";
import { useGameSettings } from "../stores/useGameSettings";
import { useAppOverlays } from "./useAppOverlays";

export default function App() {
  const { isOpen: isSettingsOpen, openSettings, closeSettings } = useGameSettings();

  const {
    phaserRef,
    isTitleActive,
    isResultActive,
    isInvoiceActive,
    isUpgradeActive,
    isPermanentUpgradeActive,
    isGameOverActive,
    isClearActive,
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
  } = useAppOverlays({ isSettingsOpen, openSettings });

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

      {/* 3. 強化画面 React オーバーレイ */}
      {isUpgradeActive && <UpgradeOverlay onProceed={handleUpgradeProceed} />}

      {/* 6. 永続強化（酒場）画面 React オーバーレイ */}
      {isPermanentUpgradeActive && (
        <PermanentUpgradeOverlay
          onStartRun={handlePermanentStartRun}
          onBackToTitle={handlePermanentBackToTitle}
        />
      )}

      {/* 5. ゲームオーバー画面 React オーバーレイ */}
      {isGameOverActive && (
        <GameOverOverlay
          onBackToTitle={handleGameOverBackToTitle}
          onOpenSaloon={handleGameOverOpenSaloon}
        />
      )}

      {/* 7. クリア画面 React オーバーレイ */}
      {isClearActive && (
        <ClearOverlay onBackToTitle={handleClearBackToTitle} onOpenSaloon={handleClearOpenSaloon} />
      )}

      {/* Phaser Canvas コンテナ（常時背面に描画され、オーバーレイ時は入力が無効化される） */}
      <div className="relative flex h-full w-full items-center justify-center">
        <PhaserGame ref={phaserRef} />
      </div>
    </main>
  );
}
