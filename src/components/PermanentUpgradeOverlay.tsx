import {
  BarChart3,
  Check,
  Coins,
  Crosshair,
  Home,
  type LucideIcon,
  Percent,
  Play,
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

function formatEffectLabel(eff: number, unit: string): string {
  if (unit === "$") {
    return `+$${eff}`;
  }
  return `+${eff}${unit}`;
}

/**
 * 酒場の鍛錬（永続強化 / SALOON）画面の西部劇風 React オーバーレイ
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
      audio.playSynthSE("laser", 0.8);
      refresh();
    }
  };

  const handleStartRun = () => {
    audio.playSynthSE("spur", 0.75);
    onStartRun();
  };

  const handleBackToTitle = () => {
    audio.playSynthSE("spur", 0.65);
    onBackToTitle();
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
      <div className="font-western-slab pointer-events-auto relative flex h-full max-h-full w-full max-w-[calc(100dvh*9/16)] flex-col overflow-hidden bg-[#1a0d06]/92 text-amber-50 backdrop-blur-[2px]">
        {/* 上部木札ヘッダー */}
        <header className="western-wood z-20 flex flex-shrink-0 items-center justify-between gap-2 border-b-2 border-amber-700/80 px-3.5 py-2.5 sm:px-5 sm:py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-amber-500/70 bg-amber-950/80 text-amber-300 shadow">
              <Star className="h-5 w-5 fill-amber-400 text-amber-200" />
            </span>
            <div className="flex min-w-0 flex-col leading-tight">
              <h1 className="truncate text-base font-extrabold text-amber-200 sm:text-lg">
                酒場の鍛錬（ガンマンの流儀）
              </h1>
              <span className="font-western-display text-[10px] font-bold tracking-wider text-amber-400/80">
                SALOON &amp; OUTLAW CREED
              </span>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-amber-500/60 bg-[#180b04]/90 px-3 py-1.5 shadow-inner">
            <Star className="h-4 w-4 fill-amber-400 text-amber-300" />
            <span className="text-xs font-semibold text-amber-200/80 sm:text-sm">名声:</span>
            <span className="text-sm font-extrabold text-amber-300 sm:text-base">
              {formatNumber(points)}
            </span>
          </div>
        </header>

        {/* 中央: ガンマンの流儀カード一覧 */}
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
                className={`western-leather rounded-xl border-2 p-3.5 shadow-lg transition-colors sm:p-4 ${
                  isMax ? "border-amber-400" : canAfford ? "border-amber-600" : "border-[#4d2913]"
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex min-w-0 flex-1 items-start gap-2.5">
                    <span
                      className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border ${
                        isMax
                          ? "border-amber-400/70 bg-amber-950/80 text-amber-300"
                          : curLevel > 0 || canAfford
                            ? "border-amber-600/60 bg-[#3b1d0c] text-amber-300"
                            : "border-[#4d2913] bg-[#211007] text-amber-700"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <h2 className="text-base font-extrabold text-amber-50 sm:text-lg">
                          {def.name}
                        </h2>
                        <span
                          className={`text-xs font-extrabold sm:text-sm ${
                            isMax ? "text-amber-300" : "text-amber-400/90"
                          }`}
                        >
                          {isMax ? "★ 極意皆伝" : `Lv.${curLevel} / ${def.maxLevel}`}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-amber-200/75 sm:text-sm">
                        {def.description}
                      </p>
                    </div>
                  </div>

                  {/* 右側: 鍛錬ボタン */}
                  <div className="flex-shrink-0">
                    {isMax ? (
                      <div className="flex h-10 items-center gap-1 rounded-lg border border-amber-400/60 bg-amber-950/70 px-3 text-xs font-extrabold text-amber-300 sm:text-sm">
                        <Check className="h-4 w-4" />
                        <span>習得完了</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => handlePurchase(id)}
                        className={`flex h-10 flex-col items-center justify-center rounded-lg px-3.5 leading-tight font-extrabold transition-all sm:px-4 ${
                          canAfford
                            ? "western-btn-brass cursor-pointer text-amber-50 active:scale-95"
                            : "cursor-not-allowed border border-[#4d2913] bg-[#1c0e06] text-amber-800"
                        }`}
                      >
                        <span className="text-xs sm:text-sm">
                          鍛える (★ {cost !== null ? formatNumber(cost) : 0})
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* レベル進捗バー */}
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[#160a04]">
                  <div
                    className={`h-full rounded-full transition-all duration-200 ${
                      isMax ? "bg-amber-300" : "bg-amber-600"
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
                        className={`flex items-center justify-center gap-1 rounded-md border px-1.5 py-1 text-center text-[11px] transition-colors sm:text-xs ${
                          isCurrent
                            ? "border-amber-400/80 bg-amber-950/70 font-extrabold text-amber-200"
                            : isPast
                              ? "border-[#5c3116] bg-[#2a1509]/80 font-semibold text-amber-200/80"
                              : "border-[#381d0c] bg-[#160a04]/70 font-medium text-amber-700"
                        }`}
                      >
                        {isPast && <Check className="h-3 w-3 flex-shrink-0 text-amber-400" />}
                        <span className="truncate">
                          {isCurrent ? "▶ " : ""}Lv.{lvl}: {formatEffectLabel(eff, def.effectUnit)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* 下部木札フッターボタン */}
        <footer className="western-wood z-20 flex flex-shrink-0 flex-col gap-2 border-t-2 border-amber-700/80 px-3.5 py-2.5 sm:px-4 sm:py-3">
          <button
            type="button"
            onClick={handleStartRun}
            className="western-btn-wood flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg text-sm font-extrabold text-amber-50 transition-all active:scale-[0.98] sm:h-12 sm:text-base"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>荒野へ繰り出す（決闘開始）</span>
          </button>

          <button
            type="button"
            onClick={handleBackToTitle}
            className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-amber-800 bg-[#241208] text-sm font-bold text-amber-200 transition-all hover:border-amber-500 hover:bg-[#331a0c] hover:text-amber-50 active:scale-[0.98] sm:h-11 sm:text-base"
          >
            <Home className="h-4 w-4" />
            <span>酒場の表へ出る（タイトル）</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
