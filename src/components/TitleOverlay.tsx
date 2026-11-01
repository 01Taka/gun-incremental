import { Crosshair, Settings, ShieldAlert, Star } from "lucide-react";

import { AudioManager } from "../audio/AudioManager";
import { VOCAB } from "../config/vocab";
import { useI18n } from "../i18n";
import { formatNumber } from "../logic/format";
import { GameState } from "../logic/GameState";

interface TitleOverlayProps {
  onStartDuel: () => void;
  onOpenSaloon: () => void;
  onOpenSettings: () => void;
}

export function TitleOverlay({ onStartDuel, onOpenSaloon, onOpenSettings }: TitleOverlayProps) {
  const gameState = GameState.getInstance();
  const audio = AudioManager.getInstance();
  useI18n();

  const permPoints = gameState.persistentData.permanentPoints;
  const highestRound = gameState.persistentData.stats.highestRound;
  const totalRuns = gameState.persistentData.stats.totalRuns;

  const handleStart = () => {
    audio.playSynthSE("spur", 0.75);
    onStartDuel();
  };

  const handleSaloon = () => {
    audio.playSynthSE("spur", 0.65);
    onOpenSaloon();
  };

  const handleSettings = () => {
    audio.playSynthSE("spur", 0.65);
    onOpenSettings();
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
      {/* 9:16比率コンテナ: 中央に集約して上端見切れを防止 */}
      <div className="font-western-slab pointer-events-auto relative flex h-full max-h-full w-full max-w-[calc(100dvh*9/16)] flex-col items-center justify-center overflow-x-hidden overflow-y-auto p-4 select-none sm:p-6">
        <div className="my-auto flex w-full max-w-md flex-col items-center gap-3.5 py-2">
          {/* 設定ボタン（中央コンテンツ枠の右上に配置） */}
          <div className="flex w-full items-center justify-end">
            <button
              type="button"
              onClick={handleSettings}
              className="western-wood group flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-600/80 px-3 py-1.5 text-xs font-bold text-amber-200 shadow-lg transition-all hover:border-amber-400 hover:text-amber-100 active:scale-95 sm:text-sm"
            >
              <Settings className="h-3.5 w-3.5 text-amber-400 transition-transform group-hover:rotate-45 sm:h-4 sm:w-4" />
              <span>{VOCAB.facilities.settings}</span>
            </button>
          </div>

          {/* WANTED 指名手配書ポスター */}
          <div className="western-parchment relative w-full rounded-xl border-4 border-[#4a2109] px-5 py-5 text-center shadow-2xl sm:px-6 sm:py-6">
            {/* 四隅のピン留め・真鍮鋲デコレーション */}
            <div className="absolute top-2 left-2.5 h-3 w-3 rounded-full border border-amber-900 bg-amber-700 shadow-inner" />
            <div className="absolute top-2 right-2.5 h-3 w-3 rounded-full border border-amber-900 bg-amber-700 shadow-inner" />
            <div className="absolute bottom-2 left-2.5 h-3 w-3 rounded-full border border-amber-900 bg-amber-700 shadow-inner" />
            <div className="absolute right-2.5 bottom-2 h-3 w-3 rounded-full border border-amber-900 bg-amber-700 shadow-inner" />

            {/* WANTED ヘッダー */}
            <div className="font-western-display flex items-center justify-center gap-2 text-2xl font-black tracking-widest text-[#5c1f0b] sm:text-3xl">
              <Star className="h-5 w-5 fill-[#5c1f0b] text-[#5c1f0b]" />
              <span>W A N T E D</span>
              <Star className="h-5 w-5 fill-[#5c1f0b] text-[#5c1f0b]" />
            </div>

            <div className="font-western-display mt-0.5 text-xs font-bold tracking-widest text-[#7c2d12] sm:text-sm">
              — DEAD OR ALIVE —
            </div>

            {/* 区切り線 */}
            <div className="my-2.5 h-[2px] w-full bg-gradient-to-r from-transparent via-[#7c2d12]/50 to-transparent" />

            {/* メインタイトル */}
            <h1 className="font-western-display text-3xl font-black text-[#2b1206] drop-shadow sm:text-4xl">
              {VOCAB.titleScreen.mainTitleTop}
            </h1>
            <div className="font-western-display mt-0.5 text-2xl font-black text-[#7f1d1d] drop-shadow-sm sm:text-3xl">
              {VOCAB.titleScreen.mainTitleBottom}
            </div>

            {/* タグライン & 格言 */}
            <p className="mt-2.5 text-xs font-bold text-[#4a250d] sm:text-sm">
              {VOCAB.titleScreen.tagline}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-[#6b2710]/90 italic sm:text-xs">
              "{VOCAB.titleScreen.posterQuote}"
            </p>
          </div>

          {/* 賞金稼ぎの戦歴・名声バッジ木札パネル */}
          <div className="western-wood w-full rounded-xl border-2 border-amber-700/80 p-3 shadow-xl sm:p-3.5">
            <div className="flex items-center justify-between border-b border-amber-800/60 pb-1.5">
              <div className="flex items-center gap-2 text-amber-300">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-200 sm:text-sm">
                  {VOCAB.currency.metaPoints}:
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-base font-extrabold text-amber-300 sm:text-lg">
                  {formatNumber(permPoints)}
                </span>
              </div>
            </div>

            <div className="mt-2 text-center text-xs font-semibold text-amber-200/90 sm:text-sm">
              {VOCAB.titleScreen.careerRecord(highestRound, totalRuns)}
            </div>
          </div>

          {/* アクションボタン群 */}
          <div className="flex w-full flex-col gap-2.5 pt-1">
            {/* 決闘開始ボタン */}
            <button
              type="button"
              onClick={handleStart}
              className="western-btn-wood group flex h-13 w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl text-base font-black tracking-wide text-amber-100 shadow-xl transition-all hover:scale-[1.01] active:scale-95 sm:h-14 sm:text-lg"
            >
              <Crosshair className="h-5 w-5 text-amber-300 transition-transform group-hover:rotate-90" />
              <span>{VOCAB.actions.startDuel}</span>
            </button>

            {/* 酒場で鍛錬ボタン */}
            <button
              type="button"
              onClick={handleSaloon}
              className={`${
                permPoints > 0 ? "western-btn-brass" : "western-wood"
              } group flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-amber-600/80 text-xs font-extrabold text-amber-100 shadow-lg transition-all hover:scale-[1.01] active:scale-95 sm:h-12 sm:text-sm`}
            >
              <Star
                className={`h-4 w-4 ${
                  permPoints > 0 ? "fill-amber-300 text-amber-300" : "text-amber-400"
                }`}
              />
              <span>
                {permPoints > 0
                  ? VOCAB.actions.trainSaloonWithPoints(permPoints)
                  : VOCAB.actions.trainSaloon}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
