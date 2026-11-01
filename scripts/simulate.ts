import { TARGET_UNLOCK_SEQUENCE } from "../src/config/gameData";
import { GameState } from "../src/logic/GameState";
import { HeadlessSimulation } from "../src/logic/Simulation";
import { StorageService } from "../src/logic/storage";

console.log("==================================================");
console.log("   銃的当てインクリメンタル バランスシミュレーション");
console.log("==================================================");

const results = HeadlessSimulation.runCampaign(8);

results.forEach((res, i) => {
  console.log(
    `[Run ${i + 1}] 到達Round: ${res.roundsSurvived} | 請求支払数: ${res.invoicesPaid} | 支払総額: ${res.totalInvoicesPaidAmount} SP | 解放的: ${res.targetsUnlockedCount}/${TARGET_UNLOCK_SEQUENCE.length} | 獲得永続pt: +${res.permanentPointsGained} | クリア: ${res.cleared ? "YES" : "NO"}`,
  );
});

// 永続強化完了後、スキルツリー・銃購入を一切使わずに序盤の壁(R15)を突破できるか検証
StorageService.clear();
const zeroSkillGs = new GameState();
zeroSkillGs.persistentData.permanentUpgrades = {
  start_sp: 3,
  base_dmg: 3,
  round_time: 3,
  tp_gain: 3,
  invoice_reduction: 3,
};
StorageService.save(zeroSkillGs.persistentData);
const zeroSkillRes = HeadlessSimulation.runSingleRun(zeroSkillGs, 2026, {
  disableRunUpgrades: true,
});

const run1 = results[0];
const clearRunIndex = results.findIndex((r) => r.cleared);

console.log("\n--- 検証結果 ---");
console.log(
  `初回プレイの壁 (R15 / 第3回請求): 到達 ${run1.roundsSurvived}R (支払 ${run1.invoicesPaid}回) -> ${run1.roundsSurvived === 15 && !run1.cleared ? "OK (想定通りR15でゲームオーバー・永続強化へ誘導)" : "調整検討"}`,
);
console.log(
  `周回メタ進行: Run 1 (${run1.roundsSurvived}R) -> Run 2 (${results[1]?.roundsSurvived}R) -> Run 3 (${results[2]?.roundsSurvived}R) -> ${(results[1]?.roundsSurvived ?? 0) > run1.roundsSurvived ? "OK (永続強化で壁を突破)" : "要調整"}`,
);
console.log(
  `永続強化後・スキル未取得での序盤無双: 到達 ${zeroSkillRes.roundsSurvived}R (支払 ${zeroSkillRes.invoicesPaid}回) -> ${zeroSkillRes.invoicesPaid >= 3 ? "OK (スキル0でも序盤〜R15の壁を余裕で突破)" : "要調整"}`,
);
console.log(
  `最終クリア: ${clearRunIndex !== -1 ? "達成可能" : "未達成"} (クリアRun: ${clearRunIndex !== -1 ? `${clearRunIndex + 1}周目` : "-"})`,
);
console.log("==================================================");
