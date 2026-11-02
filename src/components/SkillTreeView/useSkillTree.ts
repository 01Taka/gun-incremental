import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AudioManager } from "../../audio/AudioManager";
import { SKILL_STATS, SKILL_TREE, SKILLS } from "../../config/skillTree";
import type { SkillNodeId } from "../../config/types";
import { VOCAB } from "../../config/vocab";
import { useI18n } from "../../i18n";
import { layoutFishbone } from "../../logic/fishboneLayout";
import { GameState } from "../../logic/GameState";
import {
  calculateCanvasMetrics,
  DRAG_THRESHOLD,
  findNextNodeInDirection,
  formatSkillStatValue,
  LONG_PRESS_DURATION,
  SKILL_TREE_ZOOM,
  STICK_MOVE_COOLDOWN,
  STICK_REPEAT_DELAY,
  STICK_REPEAT_INTERVAL,
} from "./skillTreeMetrics";

interface UseSkillTreeOptions {
  onStateChange?: () => void;
}

export function useSkillTree({ onStateChange }: UseSkillTreeOptions = {}) {
  const gameState = GameState.getInstance();
  const audio = AudioManager.getInstance();
  useI18n(); // 言語切り替え検知

  const initialSkillId: SkillNodeId =
    gameState.lastFocusedSkillId && SKILLS[gameState.lastFocusedSkillId]
      ? gameState.lastFocusedSkillId
      : SKILL_TREE.rootId;

  const [selectedSkillId, setSelectedSkillId] = useState<SkillNodeId>(initialSkillId);
  const selectedSkillIdRef = useRef<SkillNodeId>(initialSkillId);
  // GameState はミュータブルなシングルトンのため、購入時に再描画をトリガーするカウンタ
  const [, setRevision] = useState(0);

  // 長押し進捗 (対象ノードID と 0..1 の進捗)
  const [longPressState, setLongPressState] = useState<{
    skillId: SkillNodeId;
    progress: number;
  } | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  // ズーム倍率
  const [zoom, setZoom] = useState<number>(SKILL_TREE_ZOOM.default);
  const zoomRef = useRef<number>(SKILL_TREE_ZOOM.default);

  // マルチタッチ（ピンチ操作） & ポインター追跡用
  const activePointersRef = useRef<Map<number, { clientX: number; clientY: number }>>(new Map());
  const pinchRef = useRef<{
    prevDist: number;
    prevMidX: number;
    prevMidY: number;
  } | null>(null);
  const hasPinchedRef = useRef(false);

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

  // 連続移動のインターバル制御用（前回ステップ実行時刻）
  const lastStepTimeRef = useRef<number>(0);

  // 魚の骨レイアウト計算
  const treeLayout = useMemo(() => layoutFishbone(SKILL_TREE), []);

  // キャンバスのピクセルサイズと各ノードの中心座標を算出
  const canvasMetrics = useMemo(() => calculateCanvasMetrics(treeLayout), [treeLayout]);

  // 初回マウント時に選択ノードへスクロール位置を合わせる
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const currentZoom = zoomRef.current;
    const pos = canvasMetrics.coords[selectedSkillIdRef.current];
    if (pos) {
      const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth);
      const maxTop = Math.max(0, el.scrollHeight - el.clientHeight);
      el.scrollLeft = Math.min(maxLeft, Math.max(0, pos.x * currentZoom - el.clientWidth / 2));
      el.scrollTop = Math.min(maxTop, Math.max(0, pos.y * currentZoom - el.clientHeight / 2));
    } else {
      const targetLeft = Math.max(0, canvasMetrics.centerX * currentZoom - el.clientWidth / 2);
      el.scrollLeft = targetLeft;
      el.scrollTop = 0;
    }
  }, [canvasMetrics]);

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

      const currentZoom = zoomRef.current;
      const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth);
      const maxTop = Math.max(0, el.scrollHeight - el.clientHeight);
      const targetLeft = Math.min(maxLeft, Math.max(0, pos.x * currentZoom - el.clientWidth / 2));
      const targetTop = Math.min(maxTop, Math.max(0, pos.y * currentZoom - el.clientHeight / 2));

      el.scrollTo({
        left: targetLeft,
        top: targetTop,
        behavior: "smooth",
      });
    },
    [canvasMetrics.coords],
  );

  const selectSkill = useCallback(
    (skillId: SkillNodeId) => {
      if (selectedSkillIdRef.current !== skillId) {
        selectedSkillIdRef.current = skillId;
        setSelectedSkillId(skillId);
        gameState.setLastFocusedSkillId(skillId);
        audio.playSynthSE("click");
      }
    },
    [audio, gameState],
  );

  const stepSelection = useCallback(
    (dx: number, dy: number) => {
      const currentId = selectedSkillIdRef.current;
      const nextId = findNextNodeInDirection(currentId, dx, dy, treeLayout.positions);
      if (nextId && nextId !== currentId) {
        selectSkill(nextId);
        scrollNodeIntoView(nextId);
      } else {
        scrollNodeIntoView(currentId);
      }
    },
    [scrollNodeIntoView, selectSkill, treeLayout.positions],
  );

  // --- スティック・方向入力による選択ノード移動 & インターバル付き連続移動 ---
  const startDpadPan = useCallback(
    (dx: number, dy: number) => {
      stopDpadPan();

      const executeStepAndStartRepeat = () => {
        lastStepTimeRef.current = performance.now();
        stepSelection(dx, dy);

        dpadRepeatRef.current.timeoutId = window.setTimeout(() => {
          dpadRepeatRef.current.intervalId = window.setInterval(() => {
            lastStepTimeRef.current = performance.now();
            stepSelection(dx, dy);
          }, STICK_REPEAT_INTERVAL);
        }, STICK_REPEAT_DELAY);
      };

      const now = performance.now();
      const elapsed = now - lastStepTimeRef.current;
      const cooldownRemaining = Math.max(0, STICK_MOVE_COOLDOWN - elapsed);

      if (cooldownRemaining > 0) {
        // 前回の移動からのインターバルがまだ満たない場合、残りのインターバルを待ってから実行
        dpadRepeatRef.current.timeoutId = window.setTimeout(() => {
          executeStepAndStartRepeat();
        }, cooldownRemaining);
      } else {
        executeStepAndStartRepeat();
      }
    },
    [stepSelection, stopDpadPan],
  );

  // PCキーボードの矢印キーでもハイライト移動可能にする（インターバルを考慮）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      let dx = 0;
      let dy = 0;
      switch (e.key) {
        case "ArrowLeft":
          dx = -1;
          break;
        case "ArrowRight":
          dx = 1;
          break;
        case "ArrowUp":
          dy = -1;
          break;
        case "ArrowDown":
          dy = 1;
          break;
        default:
          return;
      }

      e.preventDefault();
      const now = performance.now();
      if (now - lastStepTimeRef.current >= STICK_MOVE_COOLDOWN) {
        lastStepTimeRef.current = now;
        stepSelection(dx, dy);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [stepSelection]);

  // 拡大縮小処理（指定の viewport クライアント座標を中心としてズーム）
  const applyZoomAt = useCallback(
    (zoomFactor: number, clientX: number, clientY: number, panDx = 0, panDy = 0) => {
      const el = viewportRef.current;
      const wrapperEl = wrapperRef.current;
      const innerEl = innerRef.current;
      if (!el) return;

      const currentZoom = zoomRef.current;
      const targetZoom = Math.min(
        SKILL_TREE_ZOOM.max,
        Math.max(SKILL_TREE_ZOOM.min, currentZoom * zoomFactor),
      );

      // ズーム倍率の変化がなく、パン移動もない場合は処理しない
      if (Math.abs(targetZoom - currentZoom) < 0.001 && panDx === 0 && panDy === 0) {
        return;
      }

      const rect = el.getBoundingClientRect();
      const viewportX = clientX - rect.left;
      const viewportY = clientY - rect.top;

      // ズーム中心となるコンテンツ座標（倍率1.0基準）
      const contentX = (el.scrollLeft + viewportX) / currentZoom;
      const contentY = (el.scrollTop + viewportY) / currentZoom;

      zoomRef.current = targetZoom;
      setZoom(targetZoom);

      // DOMサイズとtransformを即時更新してスクロール計算のクランプを防止
      if (wrapperEl) {
        wrapperEl.style.width = `${canvasMetrics.width * targetZoom}px`;
        wrapperEl.style.height = `${canvasMetrics.height * targetZoom}px`;
      }
      if (innerEl) {
        innerEl.style.transform = `scale(${targetZoom})`;
      }

      // 新しいスクロール位置
      const nextScrollLeft = contentX * targetZoom - viewportX - panDx;
      const nextScrollTop = contentY * targetZoom - viewportY - panDy;

      el.scrollLeft = nextScrollLeft;
      el.scrollTop = nextScrollTop;
    },
    [canvasMetrics.height, canvasMetrics.width],
  );

  // マウスホイールによる拡大縮小
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? SKILL_TREE_ZOOM.wheelFactorIn : SKILL_TREE_ZOOM.wheelFactorOut;
      applyZoomAt(factor, e.clientX, e.clientY);
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [applyZoomAt]);

  // --- ビューポートのドラッグパン操作 & マルチタッチピンチズーム ---
  const handleViewportPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = viewportRef.current;
    if (!el) return;

    activePointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    if (activePointersRef.current.size === 1 && e.button === 0) {
      dragRef.current = {
        isDown: true,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        scrollLeft: el.scrollLeft,
        scrollTop: el.scrollTop,
        hasDragged: false,
      };
    } else if (activePointersRef.current.size === 2) {
      // 2本指検知 -> ピンチ操作開始
      cancelLongPress();
      if (dragRef.current) {
        dragRef.current.isDown = false;
      }
      hasPinchedRef.current = true;

      const [p1, p2] = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
      const midX = (p1.clientX + p2.clientX) / 2;
      const midY = (p1.clientY + p2.clientY) / 2;

      pinchRef.current = {
        prevDist: dist,
        prevMidX: midX,
        prevMidY: midY,
      };
    }
  };

  const handleViewportPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activePointersRef.current.has(e.pointerId)) return;
    activePointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    const el = viewportRef.current;
    if (!el) return;

    if (activePointersRef.current.size === 2 && pinchRef.current) {
      // ピンチ操作 & 2本指パン
      cancelLongPress();
      hasPinchedRef.current = true;

      const [p1, p2] = Array.from(activePointersRef.current.values());
      const currentDist = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
      const currentMidX = (p1.clientX + p2.clientX) / 2;
      const currentMidY = (p1.clientY + p2.clientY) / 2;

      const factor = currentDist / Math.max(1, pinchRef.current.prevDist);
      const panDx = currentMidX - pinchRef.current.prevMidX;
      const panDy = currentMidY - pinchRef.current.prevMidY;

      pinchRef.current.prevDist = currentDist;
      pinchRef.current.prevMidX = currentMidX;
      pinchRef.current.prevMidY = currentMidY;

      applyZoomAt(factor, currentMidX, currentMidY, panDx, panDy);
      return;
    }

    if (activePointersRef.current.size === 1) {
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
      if (!drag || !drag.isDown || drag.pointerId !== e.pointerId) return;

      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (!drag.hasDragged && Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
        drag.hasDragged = true;
      }

      if (drag.hasDragged) {
        el.scrollLeft = drag.scrollLeft - dx;
        el.scrollTop = drag.scrollTop - dy;
      }
    }
  };

  const handleViewportPointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(e.pointerId);

    if (activePointersRef.current.size === 0) {
      cancelLongPress();
      if (dragRef.current) {
        dragRef.current.isDown = false;
      }
      pinchRef.current = null;
      window.setTimeout(() => {
        hasPinchedRef.current = false;
      }, 50);
    } else if (activePointersRef.current.size === 1) {
      pinchRef.current = null;
      const el = viewportRef.current;
      if (el) {
        const [remainingId, p] = Array.from(activePointersRef.current.entries())[0];
        dragRef.current = {
          isDown: true,
          pointerId: remainingId,
          startX: p.clientX,
          startY: p.clientY,
          scrollLeft: el.scrollLeft,
          scrollTop: el.scrollTop,
          hasDragged: true,
        };
      }
    }
  };

  // --- ノード操作 ---
  const handleNodePointerDown = (skillId: SkillNodeId, e: React.PointerEvent) => {
    selectSkill(skillId);
    startLongPress(skillId, e.clientX, e.clientY);
  };

  const handleNodeClick = (skillId: SkillNodeId) => {
    if (dragRef.current?.hasDragged || hasPinchedRef.current) return;
    selectSkill(skillId);
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

  const curDisplay = formatSkillStatValue(selectedDef.effect.stat, curVal);
  const nextDisplay = formatSkillStatValue(selectedDef.effect.stat, nextVal);

  const parentDef = selectedDef.requirement ? SKILLS[selectedDef.requirement.nodeId] : null;
  const parentText = parentDef
    ? (VOCAB.skills[parentDef.id] ?? { name: parentDef.name, description: parentDef.description })
    : null;
  const isParentRevealed = parentDef ? gameState.isSkillRequirementMet(parentDef.id) : false;

  return {
    gameState,
    selectedSkillId,
    longPressState,
    viewportRef,
    wrapperRef,
    innerRef,
    zoom,
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
  };
}
