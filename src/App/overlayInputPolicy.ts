import type Phaser from "phaser";

export interface ActiveOverlaysState {
  isSettingsOpen: boolean;
  isTitleActive: boolean;
  isResultActive: boolean;
  isInvoiceActive: boolean;
  isUpgradeActive: boolean;
  isPermanentUpgradeActive: boolean;
  isGameOverActive: boolean;
  isClearActive: boolean;
}

/**
 * 静止UI画面・モーダル表示時はPhaserの入力をブロック
 * ※ゲーム中（isRoundActive）はスライダーやドラッグ入力を行うためブロックしない
 */
export function shouldBlockPhaserInput(state: ActiveOverlaysState): boolean {
  return (
    state.isSettingsOpen ||
    state.isTitleActive ||
    state.isResultActive ||
    state.isInvoiceActive ||
    state.isUpgradeActive ||
    state.isPermanentUpgradeActive ||
    state.isGameOverActive ||
    state.isClearActive
  );
}

/**
 * Phaserゲームインスタンスに対して、入力の有効化・無効化とポインターリセットを適用
 */
export function applyPhaserInputState(
  game: Phaser.Game | null | undefined,
  isBlocking: boolean,
): void {
  if (!game) return;

  if (isBlocking) {
    game.input.enabled = false;
    for (const pointer of game.input.pointers ?? []) {
      pointer.reset();
    }
  } else {
    game.input.enabled = true;
  }
}
