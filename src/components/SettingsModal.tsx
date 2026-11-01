import { Maximize2, Minimize2, Settings, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useGameSettings } from "../stores/useGameSettings";
import { useInputMode } from "../stores/useInputMode";

interface SettingsModalProps {
  onClose?: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const settings = useGameSettings();
  const inputMode = useInputMode((s) => s.mode);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // スマホ版では「カーソルを追従」はDisabled（元の設定値は維持）
  const isMobile = inputMode === "mobile";
  const cursorFollowActive = settings.followCursor;
  const cursorFollowDisabled = isMobile;

  // PC版かつカーソル追従が有効な場合、スティック操作はdisabled
  const joystickDisabled = inputMode === "pc" && settings.followCursor;

  const getModalHeader = () => ({
    title: "酒場の設定",
    icon: <Settings className="h-5 w-5 text-amber-400" />,
  });

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        const docEl = document.documentElement as HTMLElement & {
          webkitRequestFullscreen?: () => Promise<void>;
        };

        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        }
      } else {
        const doc = document as Document & {
          webkitExitFullscreen?: () => Promise<void>;
        };

        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Fullscreen toggle failed:", err);
    }
  };

  const handleClose = () => {
    settings.closeSettings();
    if (onClose) onClose();
  };

  const header = getModalHeader();

  return (
    <div
      className="font-western-slab animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm duration-200 sm:p-4"
      onClick={handleClose}
    >
      <div
        className="western-wood relative flex max-h-[90dvh] w-full max-w-lg flex-col rounded-xl border-2 border-amber-700 p-4 text-amber-50 shadow-2xl sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 固定ヘッダー */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-amber-800/80 pb-2.5 sm:pb-3">
          <div className="flex items-center gap-2">
            {header.icon}
            <h2 className="text-base font-extrabold tracking-wide text-amber-200 sm:text-lg">
              {header.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="cursor-pointer rounded-lg p-1.5 text-amber-300/75 transition-colors hover:bg-amber-950 hover:text-amber-100 active:scale-95"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* スクロール可能な設定項目セクション群 */}
        <div className="flex-1 touch-pan-y space-y-3 overflow-y-auto overscroll-contain py-3 pr-1">
          {/* 全画面表示切り替え */}
          <div className="western-leather flex items-center justify-between rounded-xl border border-amber-800/60 p-3">
            <div>
              <div className="text-sm font-bold text-amber-100">画面表示</div>
              <div className="text-xs text-amber-300/70">
                {isFullscreen ? "全画面表示中" : "通常表示"}
              </div>
            </div>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="western-btn-brass flex cursor-pointer items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold text-amber-50 transition-all active:scale-95"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-4 w-4" />
                  <span>全画面解除</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-4 w-4" />
                  <span>全画面にする</span>
                </>
              )}
            </button>
          </div>

          {/* カーソルを追従設定 */}
          <div
            className={`western-leather rounded-xl border border-amber-800/60 p-3 transition-opacity ${
              cursorFollowDisabled ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-amber-100">カーソルを追従</span>
                  {isMobile && (
                    <span className="rounded bg-amber-950 px-1.5 py-0.5 text-[10px] text-amber-300">
                      スマホ版（無効）
                    </span>
                  )}
                </div>
                <div className="text-xs text-amber-300/70">
                  {cursorFollowActive ? "マウス位置へ直接エイム" : "スライダー操作を使用"}
                </div>
              </div>
              <button
                type="button"
                disabled={cursorFollowDisabled}
                onClick={settings.toggleFollowCursor}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  cursorFollowActive ? "bg-amber-600" : "bg-[#3d2111]"
                } ${cursorFollowDisabled ? "cursor-not-allowed opacity-75" : "cursor-pointer"}`}
                aria-label="カーソルを追従の切り替え"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-amber-50 transition-transform ${
                    cursorFollowActive ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* スティック操作形式切り替え */}
          <div
            className={`western-leather rounded-xl border border-amber-800/60 p-3 transition-opacity ${
              joystickDisabled ? "opacity-50" : ""
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-amber-100">レバー操作位置</span>
                {joystickDisabled && (
                  <span className="rounded bg-amber-950 px-1.5 py-0.5 text-[10px] text-amber-300">
                    無効（カーソル追従中）
                  </span>
                )}
              </div>
              <span className="text-xs text-amber-300/70">
                {settings.joystickType === "dynamic" ? "指の位置に追従" : "画面下部に固定"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={joystickDisabled}
                onClick={() => settings.setJoystickType("dynamic")}
                className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                  settings.joystickType === "dynamic"
                    ? "western-btn-brass text-amber-50"
                    : "border border-amber-900 bg-[#1f0f07] text-amber-200/80 hover:border-amber-600"
                } ${joystickDisabled ? "cursor-not-allowed" : ""}`}
              >
                追従（Dynamic）
              </button>
              <button
                type="button"
                disabled={joystickDisabled}
                onClick={() => settings.setJoystickType("fixed")}
                className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                  settings.joystickType === "fixed"
                    ? "western-btn-brass text-amber-50"
                    : "border border-amber-900 bg-[#1f0f07] text-amber-200/80 hover:border-amber-600"
                } ${joystickDisabled ? "cursor-not-allowed" : ""}`}
              >
                固定（Fixed）
              </button>
            </div>
          </div>

          {/* BGM 音量（口笛・ギター・ハーモニカ） */}
          <div className="western-leather rounded-xl border border-amber-800/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-amber-100">BGM 音量（口笛・ギター）</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={settings.toggleBgmMute}
                  className="cursor-pointer rounded p-1 text-amber-300/80 transition-colors hover:text-amber-100"
                >
                  {settings.bgmMuted || settings.bgmVolume === 0 ? (
                    <VolumeX className="h-4 w-4 text-red-400" />
                  ) : (
                    <Volume2 className="h-4 w-4 text-amber-400" />
                  )}
                </button>
                <span className="font-western-mono w-10 text-right text-xs text-amber-200">
                  {settings.bgmMuted ? "0%" : `${settings.bgmVolume}%`}
                </span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.bgmMuted ? 0 : settings.bgmVolume}
              onChange={(e) => settings.setBgmVolume(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#3d2111] accent-amber-500"
            />
          </div>

          {/* SE 音量（銃声・拍車・シリンダー） */}
          <div className="western-leather rounded-xl border border-amber-800/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-amber-100">
                効果音（銃声・拍車・シリンダー）
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={settings.toggleSeMute}
                  className="cursor-pointer rounded p-1 text-amber-300/80 transition-colors hover:text-amber-100"
                >
                  {settings.seMuted || settings.seVolume === 0 ? (
                    <VolumeX className="h-4 w-4 text-red-400" />
                  ) : (
                    <Volume2 className="h-4 w-4 text-amber-400" />
                  )}
                </button>
                <span className="font-western-mono w-10 text-right text-xs text-amber-200">
                  {settings.seMuted ? "0%" : `${settings.seVolume}%`}
                </span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.seMuted ? 0 : settings.seVolume}
              onChange={(e) => settings.setSeVolume(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#3d2111] accent-amber-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
