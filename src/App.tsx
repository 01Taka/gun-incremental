import { useEffect, useRef } from "react";

import { SettingsModal } from "./components/SettingsModal";
import { EventBus } from "./EventBus";
import { type IRefPhaserGame, PhaserGame } from "./PhaserGame";
import { useGameSettings } from "./stores/useGameSettings";

export default function App() {
  const { isOpen: isSettingsOpen, openSettings, closeSettings } = useGameSettings();

  // 子コンポーネント（PhaserGame）の game インスタンスや scene への参照
  const phaserRef = useRef<IRefPhaserGame | null>(null);

  useEffect(() => {
    // Phaser側からの「設定を開く」イベントを購読
    const handleOpenSettings = () => {
      openSettings();
    };

    EventBus.on("open-settings", handleOpenSettings);

    return () => {
      EventBus.off("open-settings", handleOpenSettings);
    };
  }, [openSettings]);

  // 設定モーダルの開閉に合わせて Phaser の入力を制御
  useEffect(() => {
    const game = phaserRef.current?.game;
    if (!game) return;

    if (isSettingsOpen) {
      game.input.enabled = false;
      // 押しっぱなし状態が残らないようポインター状態をリセット
      game.input.pointers?.forEach((pointer) => {
        pointer.reset();
      });
    } else {
      game.input.enabled = true;
    }
  }, [isSettingsOpen]);

  return (
    <main className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-slate-900 select-none">
      {/* 設定モーダル（Reactコンポーネント。全画面切り替えや音量設定を内包） */}
      {isSettingsOpen && <SettingsModal onClose={closeSettings} />}

      {/* Phaserゲーム画面 */}
      <PhaserGame ref={phaserRef} />
    </main>
  );
}
