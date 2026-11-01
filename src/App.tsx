import { useCallback, useEffect, useRef, useState } from "react";

import { PermanentUpgradeOverlay } from "./components/PermanentUpgradeOverlay";
import { SettingsModal } from "./components/SettingsModal";
import { UpgradeOverlay } from "./components/UpgradeOverlay";
import { EventBus } from "./EventBus";
import { type IRefPhaserGame, PhaserGame } from "./PhaserGame";
import { useGameSettings } from "./stores/useGameSettings";

export default function App() {
  const { isOpen: isSettingsOpen, openSettings, closeSettings } = useGameSettings();
  const [isUpgradeActive, setIsUpgradeActive] = useState(false);
  const [isPermanentUpgradeActive, setIsPermanentUpgradeActive] = useState(false);

  // 子コンポーネント（PhaserGame）の game インスタンスや scene への参照
  const phaserRef = useRef<IRefPhaserGame | null>(null);

  useEffect(() => {
    // Phaser側からの「設定を開く」イベントを購読
    const handleOpenSettings = () => {
      openSettings();
    };

    // UpgradeScene のアクティブ状態を購読
    const handleUpgradeSceneActive = (active: boolean) => {
      setIsUpgradeActive(active);
    };

    // PermanentUpgradeScene のアクティブ状態を購読
    const handlePermanentUpgradeSceneActive = (active: boolean) => {
      setIsPermanentUpgradeActive(active);
    };

    EventBus.on("open-settings", handleOpenSettings);
    EventBus.on("upgrade-scene-active", handleUpgradeSceneActive);
    EventBus.on("permanent-upgrade-scene-active", handlePermanentUpgradeSceneActive);

    return () => {
      EventBus.off("open-settings", handleOpenSettings);
      EventBus.off("upgrade-scene-active", handleUpgradeSceneActive);
      EventBus.off("permanent-upgrade-scene-active", handlePermanentUpgradeSceneActive);
    };
  }, [openSettings]);

  const handleUpgradeProceed = useCallback(() => {
    EventBus.emit("upgrade-proceed");
  }, []);

  const handlePermanentStartRun = useCallback(() => {
    EventBus.emit("permanent-upgrade-start-run");
  }, []);

  const handlePermanentBackToTitle = useCallback(() => {
    EventBus.emit("permanent-upgrade-back-title");
  }, []);

  // Reactオーバーレイ（設定モーダル / 強化画面 / 永続強化画面）の表示に合わせて Phaser の入力を制御
  const isOverlayBlockingInput = isSettingsOpen || isUpgradeActive || isPermanentUpgradeActive;

  useEffect(() => {
    const game = phaserRef.current?.game;
    if (!game) return;

    if (isOverlayBlockingInput) {
      game.input.enabled = false;
      // 押しっぱなし状態が残らないようポインター状態をリセット
      game.input.pointers?.forEach((pointer) => {
        pointer.reset();
      });
    } else {
      game.input.enabled = true;
    }
  }, [isOverlayBlockingInput]);

  return (
    <main className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-slate-900 select-none">
      {/* 設定モーダル（Reactコンポーネント。全画面切り替えや音量設定を内包） */}
      {isSettingsOpen && <SettingsModal onClose={closeSettings} />}

      {/* スキルツリー & 武器ショップ強化画面（Reactコンポーネント） */}
      {isUpgradeActive && <UpgradeOverlay onProceed={handleUpgradeProceed} />}

      {/* 永続強化画面（Reactコンポーネント） */}
      {isPermanentUpgradeActive && (
        <PermanentUpgradeOverlay
          onStartRun={handlePermanentStartRun}
          onBackToTitle={handlePermanentBackToTitle}
        />
      )}

      {/* Phaserゲーム画面 */}
      <PhaserGame ref={phaserRef} />
    </main>
  );
}
