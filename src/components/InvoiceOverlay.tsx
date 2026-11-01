import { Check, DollarSign, Skull, Sparkles } from "lucide-react";
import { useState } from "react";

import { AudioManager } from "../audio/AudioManager";
import { PASSIVES } from "../config/gameData";
import type { PassiveId } from "../config/types";
import { VOCAB } from "../config/vocab";
import { useI18n } from "../i18n";
import { formatMoney } from "../logic/format";
import { GameState } from "../logic/GameState";

type InvoiceStep = "intro" | "invoice" | "passive";

interface InvoiceOverlayProps {
  onIntroConfirm: () => void;
  onPassiveChosen: () => void;
  onGameOver: () => void;
}

export function InvoiceOverlay({
  onIntroConfirm,
  onPassiveChosen,
  onGameOver,
}: InvoiceOverlayProps) {
  const gameState = GameState.getInstance();
  const audio = AudioManager.getInstance();
  useI18n();

  const [step, setStep] = useState<InvoiceStep>(() => {
    return gameState.shouldShowInvoiceIntro() ? "intro" : "invoice";
  });

  const [choices, setChoices] = useState<PassiveId[]>(() => {
    return [];
  });

  const invoiceNumber = gameState.invoiceCount + 1;
  const invoiceCost = gameState.getInvoiceAmount();
  const canAfford = gameState.canPayInvoice();

  // 初回導入の確認
  const handleIntroConfirm = () => {
    audio.playSynthSE("spur", 0.7);
    GameState.getInstance().completeInvoiceIntro();
    onIntroConfirm();
  };

  // 上納金支払い
  const handlePayInvoice = () => {
    if (gameState.payInvoice()) {
      audio.playSynthSE("laser", 0.85);
      const rolled = gameState.rollPassives();
      setChoices(rolled);
      setStep("passive");
    }
  };

  // 破産・降伏
  const handleBankrupt = () => {
    audio.playSynthSE("gameover");
    gameState.triggerGameOver();
    onGameOver();
  };

  // パッシブ選択
  const handleSelectPassive = (passiveId: PassiveId) => {
    audio.playSynthSE("spur", 0.75);
    gameState.choosePassive(passiveId);
    onPassiveChosen();
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
      {/* 9:16比率コンテナ: 中央に集約して上端見切れを防止 */}
      <div className="font-western-slab pointer-events-auto relative flex h-full max-h-full w-full max-w-[calc(100dvh*9/16)] flex-col items-center justify-center overflow-x-hidden overflow-y-auto p-4 select-none sm:p-6">
        {/* ======================================================== */}
        {/* 1. 初回インボイス解説モーダル */}
        {/* ======================================================== */}
        {step === "intro" && (
          <div className="my-auto flex w-full max-w-md flex-col items-center py-2">
            <h1 className="font-western-display text-center text-2xl font-black text-amber-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] sm:text-3xl">
              {VOCAB.progression.invoiceIntroTitle}
            </h1>
            <div className="my-2 h-[2px] w-full max-w-sm bg-gradient-to-r from-transparent via-amber-600 to-transparent" />

            <p className="max-w-md text-center text-xs leading-relaxed font-semibold text-amber-100/90 sm:text-sm">
              {VOCAB.progression.invoiceIntroStory}
            </p>

            {/* 掟・ルールの手配書カード */}
            <div className="western-parchment relative mt-4 w-full rounded-xl border-3 border-[#7f1d1d] p-3.5 shadow-2xl sm:p-4">
              <h2 className="font-western-display text-center text-sm font-black text-[#7f1d1d] sm:text-base">
                {VOCAB.progression.invoiceIntroCardTitle}
              </h2>
              <div className="my-1.5 h-[1px] w-full bg-[#7f1d1d]/30" />

              <div className="flex flex-col gap-2 pt-0.5">
                <div className="flex items-start gap-2 rounded-lg border border-amber-800/40 bg-amber-100/80 p-2 shadow-sm">
                  <span className="text-sm">📜</span>
                  <p className="text-xs leading-snug font-bold text-[#2b1206]">
                    {VOCAB.progression.invoiceIntroBullet1}
                  </p>
                </div>
                <div className="flex items-start gap-2 rounded-lg border border-red-800/40 bg-red-100/80 p-2 shadow-sm">
                  <span className="text-sm">💀</span>
                  <p className="text-xs leading-snug font-bold text-[#7f1d1d]">
                    {VOCAB.progression.invoiceIntroBullet2}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleIntroConfirm}
              className="western-btn-brass mt-4 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-black text-amber-100 shadow-xl transition-all hover:scale-[1.01] active:scale-95 sm:h-13 sm:text-base"
            >
              <Check className="h-5 w-5 text-amber-200" />
              <span>{VOCAB.progression.invoiceIntroConfirm}</span>
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. 上納金請求書ステップ */}
        {/* ======================================================== */}
        {step === "invoice" && (
          <div className="my-auto flex w-full max-w-md flex-col items-center py-2">
            <h1 className="font-western-display text-center text-2xl font-black text-amber-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] sm:text-3xl">
              ★ {VOCAB.progression.invoiceTitle(invoiceNumber)} ★
            </h1>
            <p className="mt-0.5 text-center text-xs font-semibold text-amber-300/80 italic sm:text-sm">
              "{VOCAB.progression.invoiceQuote}"
            </p>

            {/* 請求書（手配書デザイン） */}
            <div
              className={`western-parchment relative mt-4 w-full rounded-xl border-4 p-4 text-center shadow-2xl sm:p-5 ${
                canAfford ? "border-[#5c2d10]" : "border-[#991b1b]"
              }`}
            >
              <p className="text-xs font-bold text-[#4a2109] sm:text-sm">
                {VOCAB.progression.invoiceDueDesc}
              </p>

              <div className="my-3 flex flex-col items-center">
                <span className="text-xs font-bold text-[#6b2710] sm:text-sm">
                  {VOCAB.progression.invoiceAmountLabel}
                </span>
                <span
                  className={`font-mono text-3xl font-black drop-shadow sm:text-4xl ${
                    canAfford ? "text-[#2b1206]" : "text-[#b91c1c]"
                  }`}
                >
                  {formatMoney(invoiceCost)}
                </span>
              </div>

              <div
                className={`rounded-lg border p-2 text-xs font-bold sm:text-sm ${
                  canAfford
                    ? "border-amber-800/40 bg-amber-100/70 text-[#5c2d10]"
                    : "border-red-800/40 bg-red-100/80 text-[#b91c1c]"
                }`}
              >
                {canAfford
                  ? VOCAB.progression.invoiceStatusAfford(formatMoney(gameState.sp))
                  : VOCAB.progression.invoiceStatusShort(formatMoney(gameState.sp))}
              </div>
            </div>

            {/* アクションボタン */}
            <div className="mt-4 w-full">
              {canAfford ? (
                <button
                  type="button"
                  onClick={handlePayInvoice}
                  className="western-btn-brass flex h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-base font-black text-amber-100 shadow-xl transition-all hover:scale-[1.01] active:scale-95 sm:h-14 sm:text-lg"
                >
                  <DollarSign className="h-5 w-5 text-amber-200" />
                  <span>{VOCAB.actions.payInvoice}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleBankrupt}
                  className="group flex h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-red-500 bg-gradient-to-b from-red-700 to-red-900 text-base font-black text-red-100 shadow-xl transition-all hover:scale-[1.01] active:scale-95 sm:h-14 sm:text-lg"
                >
                  <Skull className="h-5 w-5 text-red-300 transition-transform group-hover:scale-110" />
                  <span>{VOCAB.actions.bankruptSurrender}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. 酒場の切り札（パッシブ3択選択）ステップ */}
        {/* ======================================================== */}
        {step === "passive" && (
          <div className="my-auto flex w-full max-w-md flex-col items-center py-2">
            <div className="flex flex-col items-center text-center">
              <h1 className="font-western-display text-2xl font-black text-amber-200 drop-shadow sm:text-3xl">
                🥃 {VOCAB.facilities.passivesSub}
              </h1>
              <p className="mt-0.5 text-xs font-semibold text-amber-300/80 sm:text-sm">
                {VOCAB.facilities.passivesDesc}
              </p>
            </div>

            {/* 3択カードリスト */}
            <div className="my-3 flex w-full flex-col gap-2.5">
              {choices.map((passiveId) => {
                const def = PASSIVES[passiveId];
                const localized = VOCAB.passives[passiveId];
                const count = gameState.passives[passiveId] || 0;

                return (
                  <div
                    key={passiveId}
                    className="western-wood relative flex flex-col justify-between rounded-xl border-2 border-amber-700/80 p-3 shadow-xl transition-all hover:border-amber-400 sm:p-3.5"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-2xl sm:text-3xl">{def.icon}</span>
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-black text-amber-100 sm:text-sm">
                            {localized.name}
                          </h3>
                          <span className="text-[10px] font-bold text-amber-400/80 sm:text-xs">
                            {count > 0
                              ? VOCAB.facilities.passiveOwnedCount(count)
                              : VOCAB.facilities.passiveUnowned}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs font-bold text-amber-300">
                          {localized.description}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectPassive(passiveId)}
                      className="western-btn-wood mt-2.5 flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg text-xs font-black text-amber-100 shadow transition-all hover:scale-[1.01] active:scale-95 sm:h-10"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                      <span>{VOCAB.actions.choosePassive}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
