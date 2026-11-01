import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { VOCAB } from "../../config/vocab";

interface VirtualStickProps {
  /** 方向変更時のコールバック (dx: -1, 0, 1 / dy: -1, 0, 1)。中央復帰時は (0, 0) */
  onDirectionChange: (dx: number, dy: number) => void;
  /** 外枠ベースの直径 (px) */
  size?: number;
  /** 操作ノブの直径 (px) */
  knobSize?: number;
  className?: string;
}

export function VirtualStick({
  onDirectionChange,
  size = 78,
  knobSize = 36,
  className = "",
}: VirtualStickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeDir, setActiveDir] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const isDraggingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const prevDirRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  // 最初にタップした位置（動的スティックの原点）
  const touchOriginRef = useRef<{ x: number; y: number } | null>(null);

  const maxTravel = (size - knobSize) / 2;
  const deadzone = maxTravel * 0.35;

  const updatePosition = useCallback(
    (clientX: number, clientY: number) => {
      if (!touchOriginRef.current) return;
      let deltaX = clientX - touchOriginRef.current.x;
      let deltaY = clientY - touchOriginRef.current.y;

      const dist = Math.hypot(deltaX, deltaY);
      const angle = Math.atan2(deltaY, deltaX);

      // 最大可動範囲を超えて指が動いた場合、原点を引き寄せることで反転操作へのレスポンスを高める
      if (dist > maxTravel) {
        touchOriginRef.current.x = clientX - Math.cos(angle) * maxTravel;
        touchOriginRef.current.y = clientY - Math.sin(angle) * maxTravel;
        deltaX = clientX - touchOriginRef.current.x;
        deltaY = clientY - touchOriginRef.current.y;
      }

      const clampedDist = Math.min(dist, maxTravel);
      const x = Math.cos(angle) * clampedDist;
      const y = Math.sin(angle) * clampedDist;
      setKnobPos({ x, y });

      let dirX = 0;
      let dirY = 0;
      if (clampedDist >= deadzone) {
        // 斜め境界付近でのチラつき防止ヒステリシス
        const prev = prevDirRef.current;
        const bias = 1.3;
        const effectiveAbsX = Math.abs(deltaX) * (prev.dx !== 0 ? bias : 1);
        const effectiveAbsY = Math.abs(deltaY) * (prev.dy !== 0 ? bias : 1);

        if (effectiveAbsX >= effectiveAbsY) {
          dirX = deltaX > 0 ? 1 : -1;
          dirY = 0;
        } else {
          dirX = 0;
          dirY = deltaY > 0 ? 1 : -1;
        }
      }

      setActiveDir({ dx: dirX, dy: dirY });

      if (dirX !== prevDirRef.current.dx || dirY !== prevDirRef.current.dy) {
        prevDirRef.current = { dx: dirX, dy: dirY };
        onDirectionChange(dirX, dirY);
      }
    },
    [deadzone, maxTravel, onDirectionChange],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    pointerIdRef.current = e.pointerId;
    isDraggingRef.current = true;
    setIsDragging(true);

    // 最初にタップした位置を動的スティックの原点とする（タップ直後は移動量0）
    touchOriginRef.current = { x: e.clientX, y: e.clientY };
    setKnobPos({ x: 0, y: 0 });
    setActiveDir({ dx: 0, dy: 0 });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || e.pointerId !== pointerIdRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    updatePosition(e.clientX, e.clientY);
  };

  const handlePointerRelease = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== pointerIdRef.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    touchOriginRef.current = null;
    isDraggingRef.current = false;
    pointerIdRef.current = null;
    setIsDragging(false);
    setKnobPos({ x: 0, y: 0 });
    setActiveDir({ dx: 0, dy: 0 });

    if (prevDirRef.current.dx !== 0 || prevDirRef.current.dy !== 0) {
      prevDirRef.current = { dx: 0, dy: 0 };
      onDirectionChange(0, 0);
    }
  };

  useEffect(() => {
    return () => {
      if (prevDirRef.current.dx !== 0 || prevDirRef.current.dy !== 0) {
        prevDirRef.current = { dx: 0, dy: 0 };
        onDirectionChange(0, 0);
      }
    };
  }, [onDirectionChange]);

  return (
    <div
      ref={baseRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerRelease}
      onPointerCancel={handlePointerRelease}
      onLostPointerCapture={handlePointerRelease}
      role="group"
      aria-label={VOCAB.skillTreeUi.virtualStick}
      className={`relative flex cursor-grab touch-none items-center justify-center rounded-full border-2 border-amber-900/90 bg-gradient-to-b from-[#1b0d05] via-[#2a1308] to-[#120703] shadow-[inset_0_3px_8px_rgba(0,0,0,0.85),0_1px_3px_rgba(251,191,36,0.18)] select-none active:cursor-grabbing ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      {/* 方向インジケーター（上下左右） */}
      <span
        className={`pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-black transition-all ${
          activeDir.dy === -1
            ? "scale-125 text-amber-300 drop-shadow-[0_0_5px_rgba(251,191,36,0.9)]"
            : "text-amber-700/40"
        }`}
      >
        ▲
      </span>
      <span
        className={`pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-black transition-all ${
          activeDir.dy === 1
            ? "scale-125 text-amber-300 drop-shadow-[0_0_5px_rgba(251,191,36,0.9)]"
            : "text-amber-700/40"
        }`}
      >
        ▼
      </span>
      <span
        className={`pointer-events-none absolute top-1/2 left-1.5 -translate-y-1/2 text-[9px] font-black transition-all ${
          activeDir.dx === -1
            ? "scale-125 text-amber-300 drop-shadow-[0_0_5px_rgba(251,191,36,0.9)]"
            : "text-amber-700/40"
        }`}
      >
        ◀
      </span>
      <span
        className={`pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-[9px] font-black transition-all ${
          activeDir.dx === 1
            ? "scale-125 text-amber-300 drop-shadow-[0_0_5px_rgba(251,191,36,0.9)]"
            : "text-amber-700/40"
        }`}
      >
        ▶
      </span>

      {/* スティック中心ガイドリング（ニュートラル位置） */}
      <div
        className="pointer-events-none absolute rounded-full border border-amber-900/40"
        style={{
          width: `${knobSize + 4}px`,
          height: `${knobSize + 4}px`,
        }}
      />

      {/* 操作ノブ（真鍮ゴールドのリベット風デザイン） */}
      <div
        className={`pointer-events-none relative flex items-center justify-center rounded-full border-2 border-amber-300/80 bg-gradient-to-b from-[#fcd34d] via-[#d97706] to-[#78350f] shadow-[0_3px_7px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.6)] ${
          isDragging ? "scale-105" : ""
        }`}
        style={{
          width: `${knobSize}px`,
          height: `${knobSize}px`,
          transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          transition: isDragging ? "none" : "transform 140ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        {/* ノブ中央のリベット凹凸装飾 */}
        <div className="flex h-3 w-3 items-center justify-center rounded-full border border-amber-400/50 bg-gradient-to-b from-[#451a03] to-[#240e02] shadow-inner">
          <div className="h-1 w-1 rounded-full bg-amber-400/80" />
        </div>
      </div>
    </div>
  );
}
