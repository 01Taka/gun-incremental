import { AlertCircle, AlertTriangle, Crosshair, Target, Wrench } from "lucide-react";

import { VOCAB } from "../../config/vocab";
import { formatMoney, formatNumber } from "../../logic/format";
import { getWesternQuote } from "../../scenes/WesternDecor";
import { useResultOverlay } from "./useResultOverlay";

interface ResultOverlayProps {
  onToUpgrade: () => void;
  onNextDuel: () => void;
}

export function ResultOverlay({ onToUpgrade, onNextDuel }: ResultOverlayProps) {
  const {
    gameState,
    showUnlockModal,
    progress,
    nextTargetName,
    nextStep,
    hasInvoiceAppeared,
    isUrgent,
    noticeText,
    handleUpgrade,
    handleProceed,
    handleCloseUnlockModal,
  } = useResultOverlay({ onToUpgrade, onNextDuel });

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
      {/* 9:16比率コンテナ: 中央に集約して視線移動を最小化 */}
      <div className="font-western-slab pointer-events-auto relative flex h-full max-h-full w-full max-w-[calc(100dvh*9/16)] flex-col items-center justify-center overflow-x-hidden overflow-y-auto p-4 select-none sm:p-6">
        {/* ======================================================== */}
        {/* 新賞金首解禁ポップアップモーダル */}
        {/* ======================================================== */}
        {showUnlockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="western-parchment relative w-full max-w-sm rounded-xl border-4 border-[#7f1d1d] p-5 text-center shadow-2xl sm:p-6">
              <div className="font-western-display text-xl font-black text-[#7f1d1d] sm:text-2xl">
                ★ {VOCAB.resultScreen.unlockPopupBanner} ★
              </div>
              <div className="my-2 h-[2px] w-full bg-[#7f1d1d]/40" />
              <div className="mx-auto my-3 flex h-14 w-14 items-center justify-center rounded-full border-2 border-amber-800 bg-amber-100/90 shadow">
                <Target className="h-8 w-8 text-amber-900" />
              </div>
              <p className="text-sm leading-relaxed font-bold text-[#2b1206] sm:text-base">
                {VOCAB.resultScreen.unlockPopupBody(
                  gameState.lastRoundNewlyUnlockedTargets
                    .map((id) => `【${VOCAB.targets[id].name}】`)
                    .join(" "),
                )}
              </p>
              <button
                type="button"
                onClick={handleCloseUnlockModal}
                className="western-btn-brass mt-4 flex h-11 w-full cursor-pointer items-center justify-center rounded-lg text-sm font-extrabold text-amber-100 shadow transition-transform active:scale-95"
              >
                ★ {VOCAB.resultScreen.unlockPopupClose}
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 中央集中コンテナ（ヘッダー・賞金・進捗・ボタン・上納金案内） */}
        {/* ======================================================== */}
        <div className="my-auto flex w-full max-w-md flex-col items-center gap-3 py-2">
          {/* 1. ヘッダーセクション */}
          <div className="flex flex-col items-center text-center">
            <h1 className="font-western-display text-2xl font-black tracking-wide text-amber-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] sm:text-3xl">
              {VOCAB.progression.roundHeader(gameState.round)}
            </h1>
            <p className="mt-0.5 text-xs font-semibold text-amber-300/80 italic sm:text-sm">
              "{getWesternQuote(gameState.round + 3)}"
            </p>
          </div>

          {/* 2. 賞金サマリー（指名手配書カード） */}
          <div className="western-parchment relative w-full rounded-xl border-3 border-[#5c2d10] p-3.5 shadow-xl sm:p-4">
            {/* 四隅の鋲 */}
            <div className="absolute top-2 left-2 h-2.5 w-2.5 rounded-full border border-amber-900 bg-amber-800" />
            <div className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full border border-amber-900 bg-amber-800" />
            <div className="absolute bottom-2 left-2 h-2.5 w-2.5 rounded-full border border-amber-900 bg-amber-800" />
            <div className="absolute right-2 bottom-2 h-2.5 w-2.5 rounded-full border border-amber-900 bg-amber-800" />

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="flex flex-col items-center border-r border-[#5c2d10]/30 pr-2">
                <span className="text-xs font-bold text-[#5c2d10] sm:text-sm">
                  {VOCAB.currency.earnedMoney}
                </span>
                <span className="font-mono text-xl font-black text-[#7f1d1d] sm:text-2xl">
                  +{formatMoney(gameState.lastRoundSpEarned)}
                </span>
              </div>
              <div className="flex flex-col items-center pl-2">
                <span className="text-xs font-bold text-[#5c2d10] sm:text-sm">
                  {VOCAB.resultScreen.currentCash}
                </span>
                <span className="font-mono text-xl font-black text-[#2b1206] sm:text-2xl">
                  {formatMoney(gameState.sp)}
                </span>
              </div>
            </div>

            <div className="mt-2.5 border-t border-[#5c2d10]/30 pt-2 text-center">
              <span className="text-xs font-extrabold text-[#4a2109] sm:text-sm">
                🎯 {VOCAB.resultScreen.targetsHit(gameState.lastRoundTargetsDestroyed)}
              </span>
            </div>
          </div>

          {/* 3. 懸賞金評価 & 次の賞金首解禁進捗（木札パネル） */}
          <div className="western-wood w-full rounded-xl border-2 border-amber-700/80 p-3 shadow-xl sm:p-3.5">
            <div className="flex items-center justify-between border-b border-amber-800/60 pb-1.5">
              <span className="font-western-display text-xs font-black tracking-wider text-amber-200 sm:text-sm">
                ★ {VOCAB.resultScreen.unlockSectionTitle}
              </span>
              <Target className="h-4 w-4 text-amber-400" />
            </div>

            {progress.nextTarget ? (
              <div className="mt-2 flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs font-bold sm:text-sm">
                  <span className="truncate pr-2 text-amber-200">
                    {VOCAB.resultScreen.nextTargetProgress(nextTargetName ?? "", progress.percent)}
                  </span>
                  <span className="font-mono font-extrabold text-amber-400">
                    {progress.percent}%
                  </span>
                </div>

                {/* プログレスバー */}
                <div className="h-2.5 w-full overflow-hidden rounded-full border border-amber-950 bg-black/60 sm:h-3">
                  <div
                    className="h-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
                  />
                </div>

                <div className="text-right text-[11px] font-semibold text-amber-300/80">
                  {VOCAB.resultScreen.totalWantedPoints(
                    formatNumber(gameState.targetPoints),
                    formatNumber(nextStep?.requiredPoints ?? 0),
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-2.5 text-center text-xs font-bold text-amber-300 sm:text-sm">
                ★ {VOCAB.resultScreen.allTargetsUnlocked} ★
              </div>
            )}
          </div>

          {/* 4. アクションボタン群（横並び2分割でコンパクトに） */}
          <div className="mt-1 grid w-full grid-cols-2 gap-2.5">
            {/* 強化画面へ */}
            <button
              type="button"
              onClick={handleUpgrade}
              className="western-btn-brass group flex h-12 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl text-sm font-black text-amber-100 shadow-xl transition-all hover:scale-[1.02] active:scale-95 sm:h-13 sm:text-base"
            >
              <Wrench className="h-4 w-4 text-amber-200 transition-transform group-hover:rotate-45" />
              <span>{VOCAB.actions.toUpgrade}</span>
            </button>

            {/* 次の決闘へ */}
            <button
              type="button"
              onClick={handleProceed}
              className="western-btn-wood group flex h-12 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl text-sm font-black text-amber-100 shadow-xl transition-all hover:scale-[1.02] active:scale-95 sm:h-13 sm:text-base"
            >
              <Crosshair className="h-4 w-4 text-amber-300 transition-transform group-hover:scale-110" />
              <span>{VOCAB.actions.nextDuel}</span>
            </button>
          </div>

          {/* 5. 上納金案内バナー（元々の設計通りボタンの下に配置） */}
          {hasInvoiceAppeared && (
            <div
              className={`flex w-full items-center justify-center rounded-lg border px-3 py-2 text-center text-xs shadow transition-all sm:text-sm ${
                isUrgent
                  ? "animate-pulse border-red-500 bg-red-950/90 text-red-200 ring-1 ring-red-500/50"
                  : "border-amber-700/80 bg-[#1f1008]/90 text-amber-200"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 font-bold">
                {isUrgent ? (
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-400" />
                )}
                <span>{noticeText}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
