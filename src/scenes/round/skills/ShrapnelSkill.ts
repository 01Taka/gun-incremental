import type { DestroyEventInfo, RoundContext, RoundHook } from "./types";

/**
 * 的破壊時に弾の破片が放射状に飛び散るスキル（Shrapnel Burst）
 * 1スキル＝1ファイルで完全自己完結
 */
export class ShrapnelSkill implements RoundHook {
  public readonly id = "shrapnel_burst";
  private level: number;

  constructor(level: number) {
    this.level = level;
  }

  public onTargetDestroyed(info: DestroyEventInfo, ctx: RoundContext): void {
    // 破片の個数（レベル1で4個、レベル2で6個、レベル3で8個...）
    const shardCount = 2 + this.level * 2;

    // 破片のダメージ（プレイヤーの基礎ダメージの20% + レベルごとに10%加算）
    const playerBaseDmg = ctx.getPlayerBaseDamage();
    const shardDamage = Math.max(1, Math.round(playerBaseDmg * (0.2 + this.level * 0.1)));

    // ランダムな初期角度から均等に全方位へ拡散
    const baseAngle = Math.random() * Math.PI * 2;
    const angleStep = (Math.PI * 2) / shardCount;

    for (let i = 0; i < shardCount; i++) {
      const angle = baseAngle + i * angleStep;

      // 破片弾を発射（小さめ・高速）
      ctx.spawnBullet(
        info.deathX,
        info.deathY,
        angle,
        {
          speed: 680,
          radius: 3,
        },
        shardDamage,
      );
    }

    // 破片飛び散り時の火花と金属跳弾音
    ctx.emitSparks(info.deathX, info.deathY, 10);
    ctx.playSynthSE("ricochet", 0.65);
  }
}
