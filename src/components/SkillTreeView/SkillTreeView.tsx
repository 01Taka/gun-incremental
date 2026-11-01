import { ChevronRight, Lock, Zap } from "lucide-react";
import type React from "react";
import { useCallback } from "react";

import { SKILL_IDS, SKILLS } from "../../config/skillTree";
import { VOCAB } from "../../config/vocab";
import { formatMoney } from "../../logic/format";
import { SkillIcon } from "../SkillIcon";
import { NODE_STYLE } from "./skillTreeMetrics";
import { useSkillTree } from "./useSkillTree";
import { VirtualStick } from "./VirtualStick";

interface SkillTreeViewProps {
  /** SPや購入状態が更新されたときに親（ヘッダー表示など）へ通知するコールバック */
  onStateChange?: () => void;
  /** 「次のラウンドへ」ボタン押下時のコールバック */
  onProceed: () => void;
}

export function SkillTreeView({ onStateChange, onProceed }: SkillTreeViewProps) {
  const {
    gameState,
    selectedSkillId,
    longPressState,
    viewportRef,
    canvasMetrics,
    executePurchase,
    startDpadPan,
    stopDpadPan,
    handleViewportPointerDown,
    handleViewportPointerMove,
    handleViewportPointerUpOrCancel,
    handleNodePointerDown,
    handleNodeClick,
    selectedDef,
    selectedText,
    selectedCurLevel,
    selectedIsMax,
    selectedCost,
    selectedCanUnlock,
    selectedReqMet,
    statInfo,
    curDisplay,
    nextDisplay,
    parentDef,
    parentText,
    isParentRevealed,
  } = useSkillTree({ onStateChange });

  const handleStickDirectionChange = useCallback(
    (dx: number, dy: number) => {
      if (dx === 0 && dy === 0) {
        stopDpadPan();
      } else {
        startDpadPan(dx, dy);
      }
    },
    [startDpadPan, stopDpadPan],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {/* 1. 上部: スキル説明パネル（サドルレザー＆真鍮枠） */}
      <div
        className={`western-leather flex-shrink-0 rounded-xl border-2 px-3.5 py-2.5 shadow-xl transition-colors ${
          !selectedReqMet
            ? "border-[#4d2913]"
            : selectedIsMax
              ? "border-amber-400"
              : "border-amber-600"
        }`}
      >
        {/* 1段目: スキル名 & レベル */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border ${
                !selectedReqMet
                  ? "border-[#4d2913] bg-[#1a0c05] text-amber-800"
                  : "border-amber-600/60 bg-[#361b0b] text-amber-300"
              }`}
            >
              {!selectedReqMet ? (
                <Lock size={18} />
              ) : (
                <SkillIcon name={selectedDef.icon} size={19} strokeWidth={2.2} />
              )}
            </span>
            <h3
              className={`truncate text-base font-extrabold sm:text-lg ${
                !selectedReqMet ? "text-amber-700" : "text-amber-50"
              }`}
            >
              {!selectedReqMet ? "???" : selectedText.name}
            </h3>
          </div>
          <span
            className={`flex-shrink-0 text-sm font-extrabold sm:text-base ${
              !selectedReqMet
                ? "text-amber-800"
                : selectedIsMax
                  ? "text-amber-300"
                  : "text-amber-400"
            }`}
          >
            {!selectedReqMet
              ? VOCAB.skillTreeUi.locked
              : selectedIsMax
                ? VOCAB.skillTreeUi.maxBadge
                : `Lv.${selectedCurLevel} / ${selectedDef.maxLevel}`}
          </span>
        </div>

        {/* レベル進捗バー */}
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#160a04]">
          <div
            className={`h-full rounded-full transition-all duration-200 ${
              selectedIsMax ? "bg-amber-300" : "bg-amber-600"
            }`}
            style={{
              width: `${!selectedReqMet ? 0 : (selectedCurLevel / selectedDef.maxLevel) * 100}%`,
            }}
          />
        </div>

        {/* 2段目: 効果量 */}
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <span
            className={`text-xs font-semibold ${
              !selectedReqMet ? "text-amber-800" : "text-amber-200/80"
            }`}
          >
            {!selectedReqMet ? "???" : statInfo.label}
          </span>
          {!selectedReqMet ? (
            <span className="text-sm font-extrabold tracking-widest text-amber-800 sm:text-base">
              ???
            </span>
          ) : selectedIsMax ? (
            <span className="text-base font-extrabold text-amber-300 sm:text-lg">{curDisplay}</span>
          ) : (
            <span className="text-sm font-extrabold text-amber-300 sm:text-base">
              <span className="text-amber-100/80">
                {selectedCurLevel > 0 ? curDisplay : VOCAB.skillTreeUi.noEffectYet}
              </span>
              <span className="mx-1.5 text-amber-600">➔</span>
              <span>{nextDisplay}</span>
            </span>
          )}
        </div>

        {/* 3段目: スキルの詳細説明（分かりやすさ補足） */}
        {selectedReqMet && (
          <p className="mt-1.5 border-t border-amber-900/50 pt-1.5 text-xs text-amber-200/75 sm:text-[13px]">
            {selectedText.description}
          </p>
        )}
      </div>

      {/* 説明パネル直下: 次の決闘へボタン */}
      <div className="flex flex-shrink-0 justify-end">
        <button
          type="button"
          onClick={onProceed}
          className="western-btn-wood flex h-9 cursor-pointer items-center gap-1 rounded-lg px-3.5 text-xs font-extrabold text-amber-50 transition-all active:scale-95 sm:px-4 sm:text-sm"
        >
          <span>{VOCAB.actions.nextDuel}</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* 2. 中央: 魚の骨スキルツリー ビューポート（荒野の古地図風背景） */}
      <div
        ref={viewportRef}
        onPointerDown={handleViewportPointerDown}
        onPointerMove={handleViewportPointerMove}
        onPointerUp={handleViewportPointerUpOrCancel}
        onPointerCancel={handleViewportPointerUpOrCancel}
        onPointerLeave={handleViewportPointerUpOrCancel}
        className="western-map-bg relative min-h-0 flex-1 touch-none overflow-auto rounded-xl border-2 border-amber-800/75 shadow-inner"
      >
        <div
          className="relative mx-auto select-none"
          style={{
            width: `${canvasMetrics.width}px`,
            height: `${canvasMetrics.height}px`,
          }}
        >
          {/* 接続線 SVG レイヤー */}
          <svg
            width={canvasMetrics.width}
            height={canvasMetrics.height}
            className="pointer-events-none absolute inset-0"
          >
            {SKILL_IDS.map((skillId) => {
              const def = SKILLS[skillId];
              if (!def.requirement) return null;

              const parentPos = canvasMetrics.coords[def.requirement.nodeId];
              const childPos = canvasMetrics.coords[skillId];
              if (!parentPos || !childPos) return null;

              const isConditionMet = gameState.isSkillRequirementMet(skillId);
              const childLevel = gameState.getSkillLevel(skillId);
              const isChildMax = childLevel >= def.maxLevel;
              const style = NODE_STYLE[def.size];

              let stroke = "#3b1f0e";
              let opacity = 0.72;
              let strokeWidth = style.lineWidth;

              if (isChildMax) {
                stroke = "#fde047";
                opacity = 0.96;
                strokeWidth = style.lineWidth + 1.2;
              } else if (childLevel > 0) {
                stroke = "#f59e0b";
                opacity = 0.95;
                strokeWidth = style.lineWidth + 0.8;
              } else if (isConditionMet) {
                stroke = "#b45309";
                opacity = 0.85;
                strokeWidth = style.lineWidth + 0.4;
              }

              // 子ノード手前の矢印マーカー座標計算
              const dx = childPos.x - parentPos.x;
              const dy = childPos.y - parentPos.y;
              const len = Math.hypot(dx, dy) || 1;
              const ux = dx / len;
              const uy = dy / len;
              const tipOffset = style.radius + 5;
              const tipX = childPos.x - ux * tipOffset;
              const tipY = childPos.y - uy * tipOffset;
              const arrowLen = 10;
              const arrowHalf = 6;

              const p1 = `${tipX},${tipY}`;
              const p2 = `${tipX - ux * arrowLen - uy * arrowHalf},${tipY - uy * arrowLen + ux * arrowHalf}`;
              const p3 = `${tipX - ux * arrowLen + uy * arrowHalf},${tipY - uy * arrowLen - ux * arrowHalf}`;

              return (
                <g key={`edge-${skillId}`} opacity={opacity}>
                  <line
                    x1={parentPos.x}
                    y1={parentPos.y}
                    x2={childPos.x}
                    y2={childPos.y}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                  />
                  <polygon points={`${p1} ${p2} ${p3}`} fill={stroke} />
                </g>
              );
            })}
          </svg>

          {/* ノード群 */}
          {SKILL_IDS.map((skillId) => {
            const def = SKILLS[skillId];
            const nodeText = VOCAB.skills[skillId] ?? {
              name: def.name,
              description: def.description,
            };
            const style = NODE_STYLE[def.size];
            const pos = canvasMetrics.coords[skillId];
            const curLevel = gameState.getSkillLevel(skillId);
            const isMax = curLevel >= def.maxLevel;
            const canUnlock = gameState.canUnlockSkill(skillId);
            const isReqMet = gameState.isSkillRequirementMet(skillId);
            const cost = gameState.getSkillCost(skillId);
            const isSelected = selectedSkillId === skillId;

            // 長押し進捗
            const lpProgress =
              longPressState && longPressState.skillId === skillId ? longPressState.progress : 0;
            const ringRadius = style.radius + 4;
            const ringCircumference = 2 * Math.PI * ringRadius;

            // ノード外枠・背景スタイル
            let borderClass: string;
            let glowShadow = "";

            if (!isReqMet) {
              borderClass = "border-[#3b1c0c] bg-[#140803] opacity-60";
            } else if (isMax) {
              borderClass = "border-amber-300 bg-[#3b1d07] text-amber-200";
              glowShadow = "0 0 14px rgba(251, 191, 36, 0.45)";
            } else if (curLevel > 0) {
              borderClass = "border-amber-500 bg-[#2b1407] text-amber-100";
              glowShadow = "0 0 8px rgba(245, 158, 11, 0.35)";
            } else if (canUnlock) {
              borderClass = "border-amber-600 bg-[#241006] text-amber-200 animate-pulse";
            } else {
              borderClass = "border-[#6b3515] bg-[#1a0a03] text-amber-300/80";
            }

            return (
              <div
                key={skillId}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                }}
              >
                {/* ノード上部: スキル名バッジ */}
                <div className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 text-center whitespace-nowrap">
                  <span
                    className={`rounded px-1.5 py-0.5 font-extrabold tracking-tight shadow ${style.nameTextClass} ${
                      !isReqMet
                        ? "bg-[#180a04]/90 text-amber-800"
                        : isSelected
                          ? "border border-amber-400 bg-amber-950 text-amber-200"
                          : "border border-amber-900/60 bg-[#210e05]/95 text-amber-200"
                    }`}
                  >
                    {!isReqMet ? "???" : nodeText.name}
                  </span>
                </div>

                {/* メイン円形ノードボタン */}
                <button
                  type="button"
                  onPointerDown={(e) => handleNodePointerDown(skillId, e)}
                  onClick={() => handleNodeClick(skillId)}
                  className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-full border-2 transition-transform active:scale-95 ${borderClass} ${
                    isSelected ? "ring-3 ring-amber-400 ring-offset-2 ring-offset-black" : ""
                  }`}
                  style={{
                    width: `${style.radius * 2}px`,
                    height: `${style.radius * 2}px`,
                    boxShadow: glowShadow,
                  }}
                  aria-label={nodeText.name}
                >
                  {/* 長押し購入進捗リング (SVG) */}
                  {lpProgress > 0 && (
                    <svg
                      width={(ringRadius + 4) * 2}
                      height={(ringRadius + 4) * 2}
                      className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90"
                    >
                      <circle
                        cx={ringRadius + 4}
                        cy={ringRadius + 4}
                        r={ringRadius}
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth={3.5}
                        strokeDasharray={ringCircumference}
                        strokeDashoffset={ringCircumference * (1 - lpProgress)}
                        strokeLinecap="round"
                      />
                    </svg>
                  )}

                  <div className="flex items-center justify-center">
                    {!isReqMet ? (
                      <Lock size={Math.round(style.iconSize * 0.85)} className="text-[#6b462b]" />
                    ) : (
                      <SkillIcon name={def.icon} size={style.iconSize} strokeWidth={2.2} />
                    )}
                  </div>

                  {isReqMet && (
                    <span
                      className={`mt-0.5 leading-none font-extrabold tracking-tight ${style.levelTextClass} ${
                        isMax
                          ? "text-amber-300"
                          : curLevel > 0
                            ? "text-amber-200"
                            : "text-amber-400/80"
                      }`}
                    >
                      {isMax ? "MAX" : `${curLevel}/${def.maxLevel}`}
                    </span>
                  )}
                </button>

                {/* コスト表示 (ノード下部: $表記) */}
                <div className="pointer-events-none absolute top-full left-1/2 mt-1 -translate-x-1/2 text-[11px] font-bold whitespace-nowrap">
                  {!isReqMet ? null : isMax ? (
                    <span className="text-amber-300">{VOCAB.skillTreeUi.maxBadge}</span>
                  ) : cost !== null ? (
                    <span className={canUnlock ? "text-amber-300" : "text-red-400"}>
                      {formatMoney(cost)}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. 下部: 購入ボタン（左） + バーチャルスティック（右）（木札パネル） */}
      <div className="western-wood flex flex-shrink-0 items-center gap-3 rounded-xl border border-amber-800/80 p-2 shadow-xl sm:p-2.5">
        {/* 左側: 購入アクションボタン / ロック状態 */}
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          {selectedIsMax ? (
            <div className="flex h-14 w-full items-center justify-center rounded-lg border-2 border-amber-400/80 bg-amber-950/60 px-2 text-center text-xs font-extrabold text-amber-300 sm:h-16 sm:text-sm md:text-base">
              {VOCAB.skillTreeUi.maxLevelReached}
            </div>
          ) : !selectedReqMet ? (
            <div className="flex h-14 w-full items-center justify-center gap-2 rounded-lg border border-red-800/80 bg-[#2d0e0b]/80 px-2.5 text-center text-xs font-bold text-red-300 sm:h-16 sm:text-sm">
              <Lock className="h-4 w-4 flex-shrink-0 text-red-400" />
              <span className="line-clamp-2 text-left">
                {parentDef && parentText
                  ? VOCAB.skillTreeUi.prerequisite(
                      isParentRevealed ? parentText.name : "???",
                      selectedDef.requirement!.level,
                    )
                  : VOCAB.skillTreeUi.prereqUnmet}
              </span>
            </div>
          ) : (
            <button
              type="button"
              disabled={!selectedCanUnlock}
              onClick={() => executePurchase(selectedSkillId)}
              className={`flex h-14 w-full items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-extrabold transition-all sm:h-16 sm:text-base ${
                selectedCanUnlock
                  ? "western-btn-brass cursor-pointer text-amber-50 shadow-lg active:scale-[0.99]"
                  : "cursor-not-allowed border border-[#4d2913] bg-[#1c0e06] text-amber-800"
              }`}
            >
              <Zap className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {VOCAB.actions.upgradeSkill(formatMoney(selectedCost!))}
              </span>
            </button>
          )}
        </div>

        {/* 右側: バーチャルスティック */}
        <div className="flex flex-shrink-0 flex-col items-center justify-center">
          <VirtualStick onDirectionChange={handleStickDirectionChange} />
        </div>
      </div>
    </div>
  );
}
