import { RotateCcw, Star, Trophy } from "lucide-react";

import { VOCAB } from "../../config/vocab";
import { useRunSummary } from "../../hooks";
import { formatNumber } from "../../logic/format";

interface ClearOverlayProps {
  onBackToTitle: () => void;
  onOpenSaloon: () => void;
}

export function ClearOverlay({ onBackToTitle, onOpenSaloon }: ClearOverlayProps) {
  const { gameState, gainedPoints, statItems, handleTitle, handleSaloon } = useRunSummary({
    onBackToTitle,
    onOpenSaloon,
    triggerConfetti: true,
  });

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
      {/* 9:16比率コンテナ: 中央に集約して上端見切れを防止 */}
      <div className="font-western-slab pointer-events-auto relative flex h-full max-h-full w-full max-w-[calc(100dvh*9/16)] flex-col items-center justify-center overflow-x-hidden overflow-y-auto p-4 select-none sm:p-6">
        <div className="my-auto flex w-full max-w-md flex-col items-center gap-3.5 py-2">
          {/* 1. タイトルセクション */}
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-400 drop-shadow sm:h-7 sm:w-7" />
              <h1 className="font-western-display text-2xl font-black tracking-wider text-amber-300 drop-shadow-[0_2px_10px_rgba(251,191,36,0.9)] sm:text-3xl">
                ★ LEGEND OF THE WEST ★
              </h1>
              <Trophy className="h-6 w-6 text-yellow-400 drop-shadow sm:h-7 sm:w-7" />
            </div>
            <p className="mt-0.5 text-xs font-bold text-amber-200/90 sm:text-sm">
              {VOCAB.records.clearSubtitle}
            </p>
          </div>

          {/* 2. 最終戦績カード（金縁羊皮紙） */}
          <div className="western-parchment relative w-full rounded-xl border-3 border-[#78350f] p-3.5 shadow-2xl sm:p-4">
            <h2 className="font-western-display text-center text-sm font-black text-[#78350f] sm:text-base">
              ★ FINAL RECORD ★
            </h2>
            <div className="my-1.5 h-[1px] w-full bg-[#78350f]/30" />

            <div className="flex flex-col divide-y divide-[#78350f]/20 text-xs sm:text-sm">
              {statItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-1 font-bold">
                  <span className="text-[#5c2d10]">{item.label}</span>
                  <span className="font-mono font-extrabold text-[#2b1206]">{item.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. 獲得名声ポイント木札パネル */}
          <div className="western-wood w-full rounded-xl border-2 border-amber-500/90 p-3 shadow-xl sm:p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 fill-amber-300 text-amber-300 sm:h-5 sm:w-5" />
                <span className="text-xs font-extrabold text-amber-200 sm:text-sm">
                  {VOCAB.currency.metaPoints}獲得:
                </span>
              </div>
              <span className="font-mono text-lg font-black text-amber-300 sm:text-xl">
                +{formatNumber(gainedPoints)}
              </span>
            </div>
            <p className="mt-0.5 text-right text-[10px] text-amber-400/80 sm:text-[11px]">
              所持名声: {formatNumber(gameState.persistentData.permanentPoints)}
            </p>
          </div>

          {/* 4. アクションボタン群（横並び2分割でコンパクトに） */}
          <div className="grid w-full grid-cols-2 gap-2.5 pt-1">
            {/* 酒場で鍛錬ボタン */}
            <button
              type="button"
              onClick={handleSaloon}
              className="western-btn-brass flex h-12 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl text-sm font-black text-amber-100 shadow-xl transition-all hover:scale-[1.02] active:scale-95 sm:h-13 sm:text-base"
            >
              <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
              <span>{VOCAB.actions.trainSaloon}</span>
            </button>

            {/* タイトルへ戻るボタン */}
            <button
              type="button"
              onClick={handleTitle}
              className="western-wood flex h-12 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-amber-700/80 text-xs font-extrabold text-amber-200 shadow-lg transition-all hover:border-amber-400 hover:text-amber-100 active:scale-95 sm:h-13 sm:text-sm"
            >
              <RotateCcw className="h-4 w-4 text-amber-400" />
              <span>{VOCAB.actions.backToTitle}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
