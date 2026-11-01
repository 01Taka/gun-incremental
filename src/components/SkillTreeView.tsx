import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronRight, Lock, Zap } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AudioManager } from "../audio/AudioManager";
import { SKILL_IDS, SKILL_STATS, SKILL_TREE, SKILLS } from "../config/skillTree";
import type { SkillNodeId, SkillNodeSize } from "../config/types";
import { VOCAB } from "../config/vocab";
import { useI18n } from "../i18n";
import { layoutFishbone } from "../logic/fishboneLayout";
import { formatMoney, formatPercent } from "../logic/format";
import { GameState } from "../logic/GameState";
import { SkillIcon } from "./SkillIcon";

/** グリッド 1 マスのピクセルサイズと上下左右余白 */
const TREE_GRID = {
  colW: 140,
  rowH: 148,
  padX: 118,
  padTop: 80,
  padBottom: 80,
};

/** ドラッグスクロール判定しきい値 (px) */
const DRAG_THRESHOLD = 8;

/** 長押し購入の所要時間 (ms) */
const LONG_PRESS_DURATION = 500;

/** 方向ボタン押しっぱなし時のリピート開始待機 (ms) と間隔 (ms) */
const DPAD_REPEAT_DELAY = 320;
const DPAD_REPEAT_INTERVAL = 160;

const NODE_STYLE: Record<
  SkillNodeSize,
  {
    radius: number;
    iconSize: number;
    levelTextClass: string;
    nameTextClass: string;
    lineWidth: number;
  }
> = {
  large: {
    radius: 41,
    iconSize: 25,
    levelTextClass: "text-[11px]",
    nameTextClass: "text-[12px]",
    lineWidth: 5,
  },
  medium: {
    radius: 34,
    iconSize: 20,
    levelTextClass: "text-[10px]",
    nameTextClass: "text-[11px]",
    lineWidth: 3.8,
  },
  small: {
    radius: 28,
    iconSize: 16,
    levelTextClass: "text-[9.5px]",
    nameTextClass: "text-[10.5px]",
    lineWidth: 2.5,
  },
};

interface SkillTreeViewProps {
  /** SPや購入状態が更新されたときに親（ヘッダー表示など）へ通知するコールバック */
  onStateChange?: () => void;
  /** 「次のラウンドへ」ボタン押下時のコールバック */
  onProceed: () => void;
}

export function SkillTreeView({ onStateChange, onProceed }: SkillTreeViewProps) {
  const gameState = GameState.getInstance();
  const audio = AudioManager.getInstance();
  useI18n(); // 言語切り替え検知

  const [selectedSkillId, setSelectedSkillId] = useState<SkillNodeId>(SKILL_TREE.rootId);
  const selectedSkillIdRef = useRef<SkillNodeId>(SKILL_TREE.rootId);
  // GameState はミュータブルなシングルトンのため、購入時に再描画をトリガーするカウンタ
  const [, setRevision] = useState(0);

  // 長押し進捗 (対象ノードID と 0..1 の進捗)
  const [longPressState, setLongPressState] = useState<{
    skillId: SkillNodeId;
    progress: number;
  } | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);

  // ドラッグスクロール & 長押し管理用 ref
  const dragRef = useRef<{
    isDown: boolean;
    pointerId: number;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
    hasDragged: boolean;
  } | null>(null);

  const longPressTimerRef = useRef<{
    rafId: number;
    skillId: SkillNodeId;
    startTime: number;
    startX: number;
    startY: number;
  } | null>(null);

  // 方向ボタン（上下左右）長押しリピート用 ref
  const dpadRepeatRef = useRef<{
    timeoutId: number | null;
    intervalId: number | null;
  }>({ timeoutId: null, intervalId: null });

  // 魚の骨レイアウト計算
  const treeLayout = useMemo(() => layoutFishbone(SKILL_TREE), []);

  // キャンバスのピクセルサイズと各ノードの中心座標を算出
  const canvasMetrics = useMemo(() => {
    const { minCol, maxCol, maxRow, positions } = treeLayout;
    const halfCols = Math.max(Math.abs(minCol), Math.abs(maxCol), 1);
    const width = halfCols * 2 * TREE_GRID.colW + TREE_GRID.padX * 2;
    const height = maxRow * TREE_GRID.rowH + TREE_GRID.padTop + TREE_GRID.padBottom;
    const centerX = width / 2;

    const coords: Record<SkillNodeId, { x: number; y: number }> = {};
    for (const id of SKILL_IDS) {
      const pos = positions[id];
      coords[id] = {
        x: centerX + pos.col * TREE_GRID.colW,
        y: TREE_GRID.padTop + pos.row * TREE_GRID.rowH,
      };
    }

    return { width, height, centerX, coords };
  }, [treeLayout]);

  // 初回マウント時にルートノード（背骨中央）へスクロール位置を合わせる
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const targetLeft = Math.max(0, canvasMetrics.centerX - el.clientWidth / 2);
    el.scrollLeft = targetLeft;
    el.scrollTop = 0;
  }, [canvasMetrics.centerX]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      cancelAnimationFrame(longPressTimerRef.current.rafId);
      longPressTimerRef.current = null;
    }
    setLongPressState(null);
  }, []);

  const stopDpadPan = useCallback(() => {
    if (dpadRepeatRef.current.timeoutId !== null) {
      window.clearTimeout(dpadRepeatRef.current.timeoutId);
      dpadRepeatRef.current.timeoutId = null;
    }
    if (dpadRepeatRef.current.intervalId !== null) {
      window.clearInterval(dpadRepeatRef.current.intervalId);
      dpadRepeatRef.current.intervalId = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        cancelAnimationFrame(longPressTimerRef.current.rafId);
      }
      stopDpadPan();
    };
  }, [stopDpadPan]);

  const executePurchase = useCallback(
    (skillId: SkillNodeId) => {
      if (gameState.canUnlockSkill(skillId)) {
        if (gameState.buySkill(skillId)) {
          audio.playSynthSE("laser", 0.7);
          setRevision((r) => r + 1);
          onStateChange?.();
        }
      }
    },
    [audio, gameState, onStateChange],
  );

  const startLongPress = useCallback(
    (skillId: SkillNodeId, clientX: number, clientY: number) => {
      cancelLongPress();
      if (!gameState.canUnlockSkill(skillId)) return;

      const startTime = performance.now();

      const tick = (now: number) => {
        const current = longPressTimerRef.current;
        if (!current || current.skillId !== skillId) return;

        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / LONG_PRESS_DURATION);
        setLongPressState({ skillId, progress });

        if (progress >= 1) {
          cancelLongPress();
          executePurchase(skillId);
          return;
        }

        current.rafId = requestAnimationFrame(tick);
      };

      const rafId = requestAnimationFrame(tick);
      longPressTimerRef.current = {
        rafId,
        skillId,
        startTime,
        startX: clientX,
        startY: clientY,
      };
    },
    [cancelLongPress, executePurchase, gameState],
  );

  // 指定したノードがビューポート中央付近に表示されるようスクロール
  const scrollNodeIntoView = useCallback(
    (skillId: SkillNodeId) => {
      const el = viewportRef.current;
      const pos = canvasMetrics.coords[skillId];
      if (!el || !pos) return;

      const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth);
      const maxTop = Math.max(0, el.scrollHeight - el.clientHeight);
      const targetLeft = Math.min(maxLeft, Math.max(0, pos.x - el.clientWidth / 2));
      const targetTop = Math.min(maxTop, Math.max(0, pos.y - el.clientHeight / 2));

      el.scrollTo({
        left: targetLeft,
        top: targetTop,
        behavior: "smooth",
      });
    },
    [canvasMetrics.coords],
  );

  // 現在選択中ノードから指定方向 (dx, dy) にある次のノードを探索
  const findNextNodeInDirection = useCallback(
    (currentId: SkillNodeId, dx: number, dy: number): SkillNodeId | null => {
      const { positions } = treeLayout;
      const curPos = positions[currentId];
      if (!curPos) return null;

      // 1. 直接接続されている親子ノードのうち、指定方向にあるものを最優先
      const connectedIds: SkillNodeId[] = [];
      const parentId = SKILLS[currentId]?.requirement?.nodeId;
      if (parentId) connectedIds.push(parentId);
      for (const childId of Object.values(SKILL_TREE.children[currentId] ?? {})) {
        if (childId) connectedIds.push(childId);
      }

      for (const neighborId of connectedIds) {
        const nPos = positions[neighborId];
        if (!nPos) continue;
        if (dx !== 0 && nPos.row === curPos.row && Math.sign(nPos.col - curPos.col) === dx) {
          return neighborId;
        }
        if (dy !== 0 && nPos.col === curPos.col && Math.sign(nPos.row - curPos.row) === dy) {
          return neighborId;
        }
      }

      // 2. 直接接続がない場合はグリッド座標上で指定方向の最も自然なノードを選択
      let bestId: SkillNodeId | null = null;
      let bestScore = Number.POSITIVE_INFINITY;

      for (const candidateId of SKILL_IDS) {
        if (candidateId === currentId) continue;
        const pos = positions[candidateId];
        if (!pos) continue;

        if (dx !== 0) {
          if (Math.sign(pos.col - curPos.col) !== dx) continue;
          const dCol = Math.abs(pos.col - curPos.col);
          const dRow = Math.abs(pos.row - curPos.row);
          const score = dRow * 2 + dCol * 1.5;
          if (score < bestScore) {
            bestScore = score;
            bestId = candidateId;
          }
        } else if (dy !== 0) {
          if (Math.sign(pos.row - curPos.row) !== dy) continue;
          const dCol = Math.abs(pos.col - curPos.col);
          const dRow = Math.abs(pos.row - curPos.row);
          const score = dCol === 0 ? dRow : 1000 + dRow * 2 + dCol * 3;
          if (score < bestScore) {
            bestScore = score;
            bestId = candidateId;
          }
        }
      }

      return bestId;
    },
    [treeLayout],
  );

  const stepSelection = useCallback(
    (dx: number, dy: number) => {
      const currentId = selectedSkillIdRef.current;
      const nextId = findNextNodeInDirection(currentId, dx, dy);
      if (nextId && nextId !== currentId) {
        selectedSkillIdRef.current = nextId;
        setSelectedSkillId(nextId);
        audio.playSynthSE("click");
        scrollNodeIntoView(nextId);
      } else {
        scrollNodeIntoView(currentId);
      }
    },
    [audio, findNextNodeInDirection, scrollNodeIntoView],
  );

  // --- 下部の上下左右ボタンによる選択ノードハイライト移動 & 追従スクロール ---
  const startDpadPan = useCallback(
    (dx: number, dy: number) => {
      stopDpadPan();
      stepSelection(dx, dy);

      dpadRepeatRef.current.timeoutId = window.setTimeout(() => {
        dpadRepeatRef.current.intervalId = window.setInterval(() => {
          stepSelection(dx, dy);
        }, DPAD_REPEAT_INTERVAL);
      }, DPAD_REPEAT_DELAY);
    },
    [stepSelection, stopDpadPan],
  );

  // PCキーボードの矢印キーでもハイライト移動可能にする
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          stepSelection(-1, 0);
          break;
        case "ArrowRight":
          e.preventDefault();
          stepSelection(1, 0);
          break;
        case "ArrowUp":
          e.preventDefault();
          stepSelection(0, -1);
          break;
        case "ArrowDown":
          e.preventDefault();
          stepSelection(0, 1);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [stepSelection]);

  // --- ビューポートのドラッグパン操作 (PCマウスドラッグ & スマホタッチスクロール両対応) ---
  const handleViewportPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = viewportRef.current;
    if (!el) return;
    dragRef.current = {
      isDown: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
      hasDragged: false,
    };
  };

  const handleViewportPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // 長押し中に指・マウスが動いたらキャンセル
    if (longPressTimerRef.current) {
      const dist = Math.hypot(
        e.clientX - longPressTimerRef.current.startX,
        e.clientY - longPressTimerRef.current.startY,
      );
      if (dist >= DRAG_THRESHOLD) {
        cancelLongPress();
      }
    }

    const drag = dragRef.current;
    const el = viewportRef.current;
    if (!drag || !drag.isDown || !el || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.hasDragged && Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
      drag.hasDragged = true;
    }

    if (drag.hasDragged) {
      el.scrollLeft = drag.scrollLeft - dx;
      el.scrollTop = drag.scrollTop - dy;
    }
  };

  const handleViewportPointerUpOrCancel = () => {
    cancelLongPress();
    if (dragRef.current) {
      dragRef.current.isDown = false;
    }
  };

  // --- ノード操作 ---
  const handleNodePointerDown = (skillId: SkillNodeId, e: React.PointerEvent) => {
    if (selectedSkillIdRef.current !== skillId) {
      selectedSkillIdRef.current = skillId;
      setSelectedSkillId(skillId);
      audio.playSynthSE("click");
    }
    startLongPress(skillId, e.clientX, e.clientY);
  };

  const handleNodeClick = (skillId: SkillNodeId) => {
    if (dragRef.current?.hasDragged) return;

    if (selectedSkillIdRef.current !== skillId) {
      selectedSkillIdRef.current = skillId;
      setSelectedSkillId(skillId);
      audio.playSynthSE("click");
    }
  };

  // --- 選択中ノードの詳細データ ---
  const selectedDef = SKILLS[selectedSkillId];
  const selectedText = VOCAB.skills[selectedSkillId] ?? {
    name: selectedDef.name,
    description: selectedDef.description,
  };
  const selectedCurLevel = gameState.getSkillLevel(selectedSkillId);
  const selectedIsMax = selectedCurLevel >= selectedDef.maxLevel;
  const selectedCost = gameState.getSkillCost(selectedSkillId);
  const selectedCanUnlock = gameState.canUnlockSkill(selectedSkillId);
  const selectedReqMet = gameState.isSkillRequirementMet(selectedSkillId);

  const perLevel = selectedDef.effect.perLevel;
  const curVal = selectedCurLevel * perLevel;
  const nextVal = (selectedCurLevel + 1) * perLevel;
  const statInfo = SKILL_STATS[selectedDef.effect.stat];
  const unit = statInfo.unit;
  const roundVal = (v: number) => Math.round(v * 1000) / 1000;
  const formatStatVal = (v: number) =>
    unit === "%"
      ? formatPercent(v, true)
      : unit === ""
        ? `+${roundVal(v)}`
        : `+${roundVal(v)} ${unit}`;

  const curDisplay = formatStatVal(curVal);
  const nextDisplay = formatStatVal(nextVal);

  const parentDef = selectedDef.requirement ? SKILLS[selectedDef.requirement.nodeId] : null;
  const parentText = parentDef
    ? (VOCAB.skills[parentDef.id] ?? { name: parentDef.name, description: parentDef.description })
    : null;
  const isParentRevealed = parentDef ? gameState.isSkillRequirementMet(parentDef.id) : false;

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
            const isSelected = selectedSkillId === skillId;
            const cost = gameState.getSkillCost(skillId);
            const isReqMet = gameState.isSkillRequirementMet(skillId);

            const diameter = style.radius * 2;
            const lpProgress = longPressState?.skillId === skillId ? longPressState.progress : 0;
            const ringRadius = style.radius + 4;
            const ringCircumference = 2 * Math.PI * ringRadius;

            let bgClass: string;
            if (!isReqMet) {
              bgClass = "bg-[#160b05] border-[#3d2111] text-[#6b462b]";
            } else if (isMax) {
              bgClass = "bg-amber-950/95 border-amber-300 text-amber-200";
            } else if (canUnlock) {
              bgClass =
                curLevel > 0
                  ? "bg-[#43200c] border-amber-400 text-amber-100"
                  : "bg-[#2e1608] border-amber-500 text-amber-50";
            } else {
              // 解放条件は満たしているが所持金不足で強化できないノード
              bgClass = "bg-[#3b120e]/90 border-red-700 text-red-200";
            }

            return (
              <div
                key={skillId}
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2"
              >
                {/* スキル名 (ノード上部) */}
                <div
                  className={`pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 font-bold whitespace-nowrap drop-shadow ${style.nameTextClass} ${
                    !isReqMet ? "text-[#6b462b]" : isMax ? "text-amber-200" : "text-amber-50"
                  }`}
                >
                  {!isReqMet ? "???" : nodeText.name}
                </div>

                {/* ノード円ボタン本体 */}
                <button
                  type="button"
                  onPointerDown={(e) => handleNodePointerDown(skillId, e)}
                  onClick={() => handleNodeClick(skillId)}
                  style={{
                    width: `${diameter}px`,
                    height: `${diameter}px`,
                    transform: lpProgress > 0 ? `scale(${1 - lpProgress * 0.06})` : undefined,
                  }}
                  className={`relative flex flex-col items-center justify-center rounded-full border-[2.5px] transition-transform duration-100 hover:scale-105 focus:outline-none ${bgClass} ${
                    isSelected
                      ? "ring-[3px] ring-amber-200 ring-offset-2 ring-offset-[#1d1008]"
                      : canUnlock && !isMax
                        ? "shadow-[0_0_14px_rgba(245,158,11,0.45)]"
                        : ""
                  }`}
                >
                  {def.size === "large" && (
                    <span
                      className="pointer-events-none absolute inset-1 rounded-full border border-current opacity-35"
                      aria-hidden="true"
                    />
                  )}

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

      {/* 3. 下部: 移動用上下左右ボタン + 購入ボタン（木札パネル） */}
      <div className="western-wood flex flex-shrink-0 flex-col gap-2 rounded-xl border border-amber-800/80 p-2.5 shadow-xl">
        {/* 上下左右の移動ボタン群 */}
        <div className="grid grid-cols-4 gap-2">
          <DpadButton
            label={VOCAB.skillTreeUi.moveLeft}
            icon={<ArrowLeft className="h-4 w-4" />}
            onPressStart={() => startDpadPan(-1, 0)}
            onPressEnd={stopDpadPan}
          />
          <DpadButton
            label={VOCAB.skillTreeUi.moveUp}
            icon={<ArrowUp className="h-4 w-4" />}
            onPressStart={() => startDpadPan(0, -1)}
            onPressEnd={stopDpadPan}
          />
          <DpadButton
            label={VOCAB.skillTreeUi.moveDown}
            icon={<ArrowDown className="h-4 w-4" />}
            onPressStart={() => startDpadPan(0, 1)}
            onPressEnd={stopDpadPan}
          />
          <DpadButton
            label={VOCAB.skillTreeUi.moveRight}
            icon={<ArrowRight className="h-4 w-4" />}
            onPressStart={() => startDpadPan(1, 0)}
            onPressEnd={stopDpadPan}
          />
        </div>

        {/* 購入アクションボタン / ロック状態 */}
        {selectedIsMax ? (
          <div className="flex h-10 items-center justify-center rounded-lg border-2 border-amber-400/80 bg-amber-950/60 text-sm font-extrabold text-amber-300 sm:h-11 sm:text-base">
            {VOCAB.skillTreeUi.maxLevelReached}
          </div>
        ) : !selectedReqMet ? (
          <div className="flex h-10 items-center justify-center gap-2 rounded-lg border border-red-800/80 bg-[#2d0e0b]/80 px-3 text-xs font-bold text-red-300 sm:h-11 sm:text-sm">
            <Lock className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
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
            className={`flex h-10 w-full items-center justify-center gap-1.5 rounded-lg text-sm font-extrabold transition-all sm:h-11 sm:text-base ${
              selectedCanUnlock
                ? "western-btn-brass cursor-pointer text-amber-50 active:scale-[0.99]"
                : "cursor-not-allowed border border-[#4d2913] bg-[#1c0e06] text-amber-800"
            }`}
          >
            <Zap className="h-4 w-4" />
            <span>{VOCAB.actions.upgradeSkill(formatMoney(selectedCost!))}</span>
          </button>
        )}
      </div>
    </div>
  );
}

interface DpadButtonProps {
  label: string;
  icon: React.ReactNode;
  onPressStart: () => void;
  onPressEnd: () => void;
}

function DpadButton({ label, icon, onPressStart, onPressEnd }: DpadButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        onPressStart();
      }}
      onPointerUp={onPressEnd}
      onPointerCancel={onPressEnd}
      onPointerLeave={onPressEnd}
      className="flex h-9 cursor-pointer items-center justify-center rounded-lg border border-amber-800/80 bg-[#241208] text-amber-200 shadow transition-all hover:border-amber-500 hover:bg-[#361b0b] hover:text-amber-50 active:scale-95 active:border-amber-400 active:bg-amber-800 sm:h-9.5"
    >
      {icon}
    </button>
  );
}
