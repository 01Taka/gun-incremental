import { HeadlessSimulation } from "../src/logic/Simulation";

console.log("==================================================");
console.log("   銃的当てインクリメンタル バランスシミュレーション");
console.log("==================================================");

const results = HeadlessSimulation.runCampaign(7);

results.forEach((res, i) => {
  console.log(
    `[Run ${i + 1}] 到達Round: ${res.roundsSurvived} | 請求支払数: ${res.invoicesPaid} | 支払総額: ${res.totalInvoicesPaidAmount} SP | 解放的: ${res.targetsUnlockedCount}/6 | 獲得永続pt: +${res.permanentPointsGained} | クリア: ${res.cleared ? "YES" : "NO"}`,
  );
});

const run1 = results[0];
console.log("\n--- 検証結果 ---");
console.log(
  `初回プレイ請求回数: ${run1.invoicesPaid} 回 (設計想定: 5〜7回) -> ${run1.invoicesPaid >= 4 && run1.invoicesPaid <= 8 ? "OK (想定通り)" : "調整検討"}`,
);
console.log(
  `周回メタ進行: Run 1 (${run1.roundsSurvived}R) -> Run 2 (${results[1]?.roundsSurvived}R) -> Run 3 (${results[2]?.roundsSurvived}R) -> ${results[2]?.roundsSurvived > run1.roundsSurvived ? "OK (明確に進歩)" : "要調整"}`,
);
console.log(
  `最終クリア: ${results.some((r) => r.cleared) ? "達成可能" : "未達成"} (クリアRun: ${results.findIndex((r) => r.cleared) + 1}周目)`,
);
console.log("==================================================");
