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

  // 連続移動のインターバル制御用（前回ステップ実行時刻）
  const lastStepTimeRef = useRef<number>(0);

  // 魚の骨レイアウト計算
  const treeLayout = useMemo(() => layoutFishbone(SKILL_TREE), []);

  // キャンバスのピクセルサイズと各ノードの中心座標を算出
  const canvasMetrics = useMemo(() => calculateCanvasMetrics(treeLayout), [treeLayout]);

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

  const stepSelection = useCallback(
    (dx: number, dy: number) => {
      const currentId = selectedSkillIdRef.current;
      const nextId = findNextNodeInDirection(currentId, dx, dy, treeLayout.positions);
      if (nextId && nextId !== currentId) {
        selectedSkillIdRef.current = nextId;
        setSelectedSkillId(nextId);
        audio.playSynthSE("click");
        scrollNodeIntoView(nextId);
      } else {
        scrollNodeIntoView(currentId);
      }
    },
    [audio, scrollNodeIntoView, treeLayout.positions],
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
