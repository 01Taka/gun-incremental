import {
  BarChart3,
  Check,
  Coins,
  Crosshair,
  Home,
  type LucideIcon,
  Percent,
  Play,
  Sparkles,
  Star,
  Timer,
} from "lucide-react";
import { useCallback, useState } from "react";

import { AudioManager } from "../audio/AudioManager";
import { PERMANENT_UPGRADES } from "../config/gameData";
import type { PermanentUpgradeId } from "../config/types";
import { formatNumber } from "../logic/format";
import { GameState } from "../logic/GameState";

interface PermanentUpgradeOverlayProps {
  onStartRun: () => void;
  onBackToTitle: () => void;
}

const PERMANENT_UPGRADE_IDS: PermanentUpgradeId[] = [
  "start_sp",
  "base_dmg",
  "round_time",
  "tp_gain",
  "invoice_reduction",
];

const UPGRADE_ICONS: Record<PermanentUpgradeId, LucideIcon> = {
  start_sp: Coins,
  base_dmg: Crosshair,
  round_time: Timer,
  tp_gain: BarChart3,
  invoice_reduction: Percent,
};

/**
 * 永続強化 (METAGAME) 画面の React オーバーレイ。
 * - 上部ヘッダー: タイトル & 所持永続ポイント
 * - 中央スクロール領域: 永続強化カード一覧 (段階別効果・進捗バー・強化ボタン)
 * - 下部フッター: 「新しいランを開始」「タイトルへ戻る」アクションボタン
 */
export function PermanentUpgradeOverlay({
  onStartRun,
  onBackToTitle,
}: PermanentUpgradeOverlayProps) {
  const gameState = GameState.getInstance();
  const audio = AudioManager.getInstance();

  const [, setRevision] = useState(0);

  const refresh = useCallback(() => {
    setRevision((r) => r + 1);
  }, []);

  const points = gameState.persistentData.permanentPoints;

  const handlePurchase = (id: PermanentUpgradeId) => {
    if (gameState.purchasePermanentUpgrade(id)) {
      audio.playSynthSE("laser", 0.7);
      refresh();
    }
  };

  const handleStartRun = () => {
    audio.playSynthSE("click");
    onStartRun();
  };

  const handleBackToTitle = () => {
    audio.playSynthSE("click");
    onBackToTitle();
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
      {/* 9:16 のゲーム画面領域にぴったり重なるレスポンシブコンテナ */}
      <div className="pointer-events-auto relative flex h-full max-h-full w-full max-w-[calc(100dvh*9/16)] flex-col overflow-hidden bg-slate-950/90 text-white backdrop-blur-[2px]">
        {/* 上部ヘッダー */}
        <header className="z-20 flex flex-shrink-0 items-center justify-between gap-2 border-b-2 border-slate-800 bg-slate-900/95 px-3.5 py-2.5 sm:px-5 sm:py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-purple-500/40 bg-purple-950/60 text-purple-300">
              <Star className="h-4 w-4 fill-purple-400 text-purple-300" />
            </span>
            <div className="flex min-w-0 flex-col leading-tight">
              <h1 className="truncate text-base font-extrabold text-purple-300 sm:text-lg">
                永続強化
              </h1>
              <span className="text-[10px] font-bold tracking-wider text-slate-400">METAGAME</span>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-yellow-500/30 bg-slate-950/80 px-3 py-1.5">
            <Sparkles className="h-4 w-4 text-yellow-400" />
            <span className="text-xs font-semibold text-slate-300 sm:text-sm">所持:</span>
            <span className="text-sm font-extrabold text-yellow-400 sm:text-base">
              {formatNumber(points)} pt
            </span>
          </div>
        </header>

        {/* 中央: 永続強化カード一覧 */}
        <div className="flex-1 touch-pan-y space-y-2.5 overflow-y-auto overscroll-contain px-3 py-3 sm:space-y-3 sm:px-4">
          {PERMANENT_UPGRADE_IDS.map((id) => {
            const def = PERMANENT_UPGRADES[id];
            const Icon = UPGRADE_ICONS[id];
            const curLevel = gameState.persistentData.permanentUpgrades[id] || 0;
            const isMax = curLevel >= def.maxLevel;
            const cost = gameState.getPermanentUpgradeCost(id);
            const canAfford = cost !== null && points >= cost;

            return (
              <div
                key={id}
                className={`rounded-2xl border-2 p-3.5 shadow-lg transition-colors sm:p-4 ${
                  isMax
                    ? "border-yellow-400/90 bg-slate-900/95"
                    : canAfford
                      ? "border-purple-500 bg-slate-800/90"
                      : "border-slate-700 bg-slate-900/95"
                }`}
              >
                {/* 上段: アイコン・名称・レベル / 強化ボタン */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex min-w-0 flex-1 items-start gap-2.5">
                    <span
                      className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${
                        isMax
                          ? "border-yellow-400/50 bg-amber-950/60 text-yellow-300"
                          : curLevel > 0 || canAfford
                            ? "border-purple-500/40 bg-purple-950/60 text-purple-300"
                            : "border-slate-700 bg-slate-800 text-slate-400"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <h2 className="text-base font-extrabold text-slate-50 sm:text-lg">
                          {def.name}
                        </h2>
                        <span
                          className={`text-xs font-extrabold sm:text-sm ${
                            isMax ? "text-yellow-400" : "text-purple-300"
                          }`}
                        >
                          {isMax ? "★ MAX" : `Lv.${curLevel} / ${def.maxLevel}`}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">{def.description}</p>
                    </div>
                  </div>

                  {/* 右側: 強化ボタン または 取得完了表示 */}
                  <div className="flex-shrink-0">
                    {isMax ? (
                      <div className="flex h-10 items-center gap-1 rounded-xl border border-yellow-400/50 bg-amber-950/60 px-3 text-xs font-extrabold text-yellow-300 sm:text-sm">
                        <Check className="h-4 w-4" />
                        <span>取得完了</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => handlePurchase(id)}
                        className={`flex h-10 flex-col items-center justify-center rounded-xl px-3.5 leading-tight font-extrabold transition-all sm:px-4 ${
                          canAfford
                            ? "cursor-pointer border border-purple-300/60 bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.35)] hover:bg-purple-500 active:scale-95"
                            : "cursor-not-allowed border border-slate-700 bg-slate-800 text-slate-500"
                        }`}
                      >
                        <span className="text-xs sm:text-sm">
                          強化 ({cost !== null ? formatNumber(cost) : 0} pt)
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* レベル進捗バー */}
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-200 ${
                      isMax ? "bg-yellow-400" : "bg-purple-500"
                    }`}
                    style={{
                      width: `${(curLevel / def.maxLevel) * 100}%`,
                    }}
                  />
                </div>

                {/* 下段: 段階ごとの効果一覧 */}
                <div
                  className="mt-2.5 grid gap-1.5"
                  style={{
                    gridTemplateColumns: `repeat(${def.effects.length}, minmax(0, 1fr))`,
                  }}
                >
                  {def.effects.map((eff, index) => {
                    const lvl = index + 1;
                    const isCurrent = curLevel === lvl;
                    const isPast = curLevel > lvl;

                    return (
                      <div
                        key={lvl}
                        className={`flex items-center justify-center gap-1 rounded-lg border px-1.5 py-1 text-center text-[11px] transition-colors sm:text-xs ${
                          isCurrent
                            ? isMax
                              ? "border-yellow-400/70 bg-amber-950/50 font-extrabold text-yellow-300"
                              : "border-sky-400/80 bg-sky-950/60 font-extrabold text-sky-300"
                            : isPast
                              ? "border-slate-700 bg-slate-800/70 font-semibold text-slate-300"
                              : "border-slate-800 bg-slate-950/60 font-medium text-slate-500"
                        }`}
                      >
                        {isPast && <Check className="h-3 w-3 flex-shrink-0 text-purple-400" />}
                        <span className="truncate">
                          {isCurrent ? "▶ " : ""}Lv.{lvl}: +{eff}
                          {def.effectUnit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* 下部アクションボタン */}
        <footer className="z-20 flex flex-shrink-0 flex-col gap-2 border-t-2 border-slate-800 bg-slate-900/95 px-3.5 py-2.5 sm:px-4 sm:py-3">
          <button
            type="button"
            onClick={handleStartRun}
            className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-sky-300/60 bg-sky-600 text-sm font-extrabold text-white shadow transition-all hover:bg-sky-500 active:scale-[0.98] sm:h-12 sm:text-base"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>新しいランを開始</span>
          </button>

          <button
            type="button"
            onClick={handleBackToTitle}
            className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800 text-sm font-bold text-slate-200 transition-all hover:border-slate-500 hover:bg-slate-700 hover:text-white active:scale-[0.98] sm:h-11 sm:text-base"
          >
            <Home className="h-4 w-4" />
            <span>タイトルへ戻る</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
