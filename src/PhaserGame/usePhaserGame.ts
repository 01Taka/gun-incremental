import Phaser from "phaser";
import { type ForwardedRef, useEffect, useImperativeHandle, useRef } from "react";

import { AudioManager } from "../audio/AudioManager";
import { EventBus } from "../EventBus";
import { createPhaserGameConfig } from "./phaserConfig";

export interface IRefPhaserGame {
  game: Phaser.Game | null;
  scene: Phaser.Scene | null;
}

interface UsePhaserGameOptions {
  currentActiveScene?: (scene_instance: Phaser.Scene) => void;
  ref?: ForwardedRef<IRefPhaserGame>;
}

export function usePhaserGame({ currentActiveScene, ref }: UsePhaserGameOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const game = useRef<Phaser.Game | null>(null);
  const scene = useRef<Phaser.Scene | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      get game() {
        return game.current;
      },
      get scene() {
        return scene.current;
      },
    }),
    [],
  );

  useEffect(() => {
    if (!containerRef.current) return;

    // Reactの再レンダリングや二重実行を防ぐガード
    if (game.current) return;

    const config = createPhaserGameConfig(containerRef.current);
    game.current = new Phaser.Game(config);
    AudioManager.getInstance().init(game.current);

    const onSceneReady = (sceneInstance: Phaser.Scene) => {
      scene.current = sceneInstance;
      if (currentActiveScene) {
        currentActiveScene(sceneInstance);
      }
    };

    EventBus.on("current-scene-ready", onSceneReady);

    // コンポーネントが破棄されたらゲームインスタンスも片付ける
    return () => {
      EventBus.off("current-scene-ready", onSceneReady);
      AudioManager.getInstance().destroy();
      if (game.current) {
        game.current.destroy(true);
        game.current = null;
      }
    };
  }, [currentActiveScene]);

  return { containerRef };
}
