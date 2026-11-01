/**
 * 数値を K, M, B, T... などの短縮単位表記にフォーマットする
 */
const UNITS = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc"];

export function formatNumber(val: number, maxDecimals: number = 2): string {
  if (!Number.isFinite(val)) return "0";
  if (Math.abs(val) < 1000) {
    // 整数ならそのまま、小数なら最大指定桁数
    if (Math.floor(val) === val) {
      return val.toString();
    }
    return val.toFixed(maxDecimals).replace(/\.?0+$/, "");
  }

  const sign = val < 0 ? "-" : "";
  let absVal = Math.abs(val);
  let unitIndex = 0;

  while (absVal >= 1000 && unitIndex < UNITS.length - 1) {
    absVal /= 1000;
    unitIndex++;
  }

  // 100以上なら小数点以下1桁、100未満なら小数点以下2桁
  const decimals = absVal >= 100 ? 1 : maxDecimals;
  const formatted = absVal.toFixed(decimals).replace(/\.?0+$/, "");

  return `${sign}${formatted}${UNITS[unitIndex]}`;
}

/**
 * 金額を "$120", "$1.5K" などのドル表記にフォーマットする
 */
export function formatMoney(val: number, maxDecimals: number = 2): string {
  if (val < 0) {
    return `-$${formatNumber(Math.abs(val), maxDecimals)}`;
  }
  return `$${formatNumber(val, maxDecimals)}`;
}

/**
 * 時間(秒)を "0.0s" や "12.3s" の形式にフォーマット
 */
export function formatSeconds(seconds: number): string {
  return `${Math.max(0, seconds).toFixed(1)}s`;
}

/**
 * パーセンテージ表記 (+15%, -10% など)
 */
export function formatPercent(ratio: number, showSign: boolean = true): string {
  const pct = Math.round(ratio * 100);
  const sign = showSign && pct > 0 ? "+" : "";
  return `${sign}${pct}%`;
}
