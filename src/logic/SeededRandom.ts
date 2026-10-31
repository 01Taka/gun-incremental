/**
 * シード指定可能な擬似乱数生成器 (Mulberry32)
 * シミュレーションの完全再現やシード値指定ゲームプレイに使用
 */
export class SeededRandom {
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed >>> 0;
  }

  public setSeed(seed: number): void {
    this.seed = seed >>> 0;
  }

  public getSeed(): number {
    return this.seed;
  }

  /**
   * 0 以上 1 未満の浮動小数点数を返す
   */
  public next(): number {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * min 以上 max 未満の小数を返す
   */
  public range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /**
   * min 以上 max 以下の整数を返す
   */
  public rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /**
   * 配列からランダムに1つ選択
   */
  public choice<T>(array: readonly T[]): T {
    const idx = Math.floor(this.next() * array.length);
    return array[idx];
  }

  /**
   * 重み付き抽選 (weightプロパティまたは重み配列を使用)
   */
  public weightedChoice<T>(items: readonly T[], getWeight: (item: T) => number): T {
    let totalWeight = 0;
    for (const item of items) {
      totalWeight += Math.max(0, getWeight(item));
    }
    if (totalWeight <= 0) {
      return items[0];
    }
    let r = this.next() * totalWeight;
    for (const item of items) {
      const w = Math.max(0, getWeight(item));
      if (r < w) {
        return item;
      }
      r -= w;
    }
    return items[items.length - 1];
  }

  /**
   * 配列のシャッフル（Fisher-Yates）
   */
  public shuffle<T>(array: T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}

// デフォルトの共有乱数インスタンス
export const globalRng = new SeededRandom();
