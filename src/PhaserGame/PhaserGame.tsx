import { forwardRef } from "react";

import { type IRefPhaserGame, usePhaserGame } from "./usePhaserGame";

export type { IRefPhaserGame };

interface IProps {
  currentActiveScene?: (scene_instance: Phaser.Scene) => void;
}

export const PhaserGame = forwardRef<IRefPhaserGame, IProps>(function PhaserGame(
  { currentActiveScene },
  ref,
) {
  const { containerRef } = usePhaserGame({ currentActiveScene, ref });

  return <div ref={containerRef} className="h-full w-full" />;
});
