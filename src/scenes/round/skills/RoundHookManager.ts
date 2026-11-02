import type {
  DestroyEventInfo,
  HitEventInfo,
  RoundContext,
  RoundHook,
  ShootEventInfo,
} from "./types";

export class RoundHookManager {
  private hooks: RoundHook[] = [];
  private ctx: RoundContext;

  constructor(ctx: RoundContext) {
    this.ctx = ctx;
  }

  /**
   * フックを追加
   */
  public register(hook: RoundHook): void {
    this.hooks.push(hook);
  }

  /**
   * 全フックを解除・クリア
   */
  public clear(): void {
    this.hooks = [];
  }

  /**
   * ラウンド開始イベントを発火
   */
  public triggerRoundStart(): void {
    for (const hook of this.hooks) {
      hook.onRoundStart?.(this.ctx);
    }
  }

  /**
   * 毎フレーム更新イベントを発火
   */
  public triggerUpdate(deltaSeconds: number): void {
    for (const hook of this.hooks) {
      hook.onUpdate?.(deltaSeconds, this.ctx);
    }
  }

  /**
   * プレイヤー発砲イベントを発火
   */
  public triggerPlayerShoot(info: ShootEventInfo): void {
    for (const hook of this.hooks) {
      hook.onPlayerShoot?.(info, this.ctx);
    }
  }

  /**
   * 的着弾イベントを発火
   */
  public triggerTargetHit(info: HitEventInfo): void {
    for (const hook of this.hooks) {
      hook.onTargetHit?.(info, this.ctx);
    }
  }

  /**
   * 的破壊イベントを発火
   */
  public triggerTargetDestroyed(info: DestroyEventInfo): void {
    for (const hook of this.hooks) {
      hook.onTargetDestroyed?.(info, this.ctx);
    }
  }

  /**
   * リロード開始イベントを発火
   */
  public triggerReloadStart(): void {
    for (const hook of this.hooks) {
      hook.onReloadStart?.(this.ctx);
    }
  }

  /**
   * リロード完了イベントを発火
   */
  public triggerReloadComplete(): void {
    for (const hook of this.hooks) {
      hook.onReloadComplete?.(this.ctx);
    }
  }

  /**
   * ラウンド終了イベントを発火
   */
  public triggerRoundEnd(): void {
    for (const hook of this.hooks) {
      hook.onRoundEnd?.(this.ctx);
    }
  }
}
