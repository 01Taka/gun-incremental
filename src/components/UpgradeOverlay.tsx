import {
  Check,
  ChevronRight,
  Crosshair,
  Lock,
  Menu,
  ShoppingBag,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useState } from "react";

import { AudioManager } from "../audio/AudioManager";
import { WEAPONS } from "../config/gameData";
import type { WeaponId } from "../config/types";
import { formatNumber, formatPercent } from "../logic/format";
import { GameState } from "../logic/GameState";
import { SkillTreeView } from "./SkillTreeView";

type TabType = "skills" | "weapons";

interface UpgradeOverlayProps {
  onProceed: () => void;
}

const WEAPON_IDS: WeaponId[] = ["handgun", "rifle", "sniper"];

/**
 * UPGRADES 画面の React オーバーレイ。
 * - 画面上部左端: トグルサイドバー開閉ボタン
 * - 画面上部中央: 所持SP・次回請求額
 * - スキル説明パネルの下（ショップタブでは上部右端）: 「次のラウンドへ」ボタン
 * - サイドバー: スキルツリー / 武器ショップの切り替えメニュー
 */
export function UpgradeOverlay({ onProceed }: UpgradeOverlayProps) {
  const gameState = GameState.getInstance();
  const audio = AudioManager.getInstance();

  const [currentTab, setCurrentTab] = useState<TabType>("skills");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [, setRevision] = useState(0);

  const refresh = useCallback(() => {
    setRevision((r) => r + 1);
  }, []);

  const isShopUnlocked = gameState.isShopAvailable();
  const nextInvoice = gameState.getInvoiceAmount();
  const canAffordInvoice = gameState.sp >= nextInvoice;

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
    audio.playSynthSE("click");
  };

  const handleSelectTab = (tab: TabType) => {
    if (tab === "weapons" && !isShopUnlocked) return;
    if (currentTab !== tab) {
      setCurrentTab(tab);
    }
    setIsSidebarOpen(false);
    audio.playSynthSE("click");
  };

  const handleEquipWeapon = (weaponId: WeaponId) => {
    gameState.equipWeapon(weaponId);
    audio.playSynthSE("click");
    refresh();
  };

  const handleBuyWeapon = (weaponId: WeaponId) => {
    if (gameState.buyWeapon(weaponId)) {
      audio.playSynthSE("laser", 0.8);
      refresh();
    }
  };

  const handleProceed = () => {
    audio.playSynthSE("click");
    onProceed();
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
      {/* 9:16 のゲーム画面領域にぴったり重なるレスポンシブコンテナ */}
      <div className="pointer-events-auto relative flex h-full max-h-full w-full max-w-[calc(100dvh*9/16)] flex-col overflow-hidden bg-slate-950/90 text-white backdrop-blur-[2px]">
        {/* 上部ヘッダー (左: トグルサイドバー / 中央: SP & 請求) */}
        <header className="z-20 grid flex-shrink-0 grid-cols-3 items-center gap-2 border-b-2 border-slate-800 bg-slate-900/95 px-3 py-2 sm:px-4">
          {/* 左端: サイドバートグルボタン */}
          <div className="flex justify-start">
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="メニューを開閉"
              className="flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-2.5 text-xs font-bold text-slate-200 transition-colors hover:border-sky-400 hover:bg-slate-700 hover:text-white active:scale-95 sm:px-3 sm:text-sm"
            >
              {isSidebarOpen ? (
                <X className="h-4 w-4 text-sky-400" />
              ) : (
                <Menu className="h-4 w-4 text-sky-400" />
              )}
              <span>{currentTab === "skills" ? "スキル" : "ショップ"}</span>
            </button>
          </div>

          {/* 中央: 所持SP & 次回請求予定 */}
          <div className="flex min-w-0 flex-col items-center leading-tight">
            <div className="truncate text-sm font-extrabold text-yellow-400 sm:text-lg">
              {formatNumber(gameState.sp)} SP
            </div>
            <div
              className={`truncate text-[11px] font-bold sm:text-xs ${
                canAffordInvoice ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              請求: {formatNumber(nextInvoice)} SP
            </div>
          </div>

          {/* 右端スペーサー (中央揃え維持用) */}
          <div aria-hidden="true" />
        </header>

        {/* トグルサイドバー (オーバーレイドロワー) */}
        {isSidebarOpen && (
          <div
            className="absolute inset-0 z-30 flex bg-slate-950/65 backdrop-blur-[2px]"
            onClick={() => setIsSidebarOpen(false)}
          >
            <aside
              onClick={(e) => e.stopPropagation()}
              className="flex h-full w-64 max-w-[78%] flex-col border-r border-slate-700 bg-slate-900 p-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-sm font-extrabold tracking-wider text-sky-400">MENU</span>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  aria-label="サイドバーを閉じる"
                  className="cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="mt-4 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSelectTab("skills")}
                  className={`flex items-center gap-3 rounded-xl border-2 px-3.5 py-3 text-left text-sm font-bold transition-all ${
                    currentTab === "skills"
                      ? "cursor-pointer border-sky-400 bg-sky-600 text-white shadow"
                      : "cursor-pointer border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-500 hover:text-white"
                  }`}
                >
                  <Zap className="h-5 w-5 flex-shrink-0" />
                  <span>スキルツリー</span>
                </button>

                <button
                  type="button"
                  disabled={!isShopUnlocked}
                  onClick={() => handleSelectTab("weapons")}
                  className={`flex items-center gap-3 rounded-xl border-2 px-3.5 py-3 text-left text-sm font-bold transition-all ${
                    !isShopUnlocked
                      ? "cursor-not-allowed border-slate-800 bg-slate-900 text-slate-600"
                      : currentTab === "weapons"
                        ? "cursor-pointer border-sky-400 bg-sky-600 text-white shadow"
                        : "cursor-pointer border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-500 hover:text-white"
                  }`}
                >
                  {isShopUnlocked ? (
                    <>
                      <Crosshair className="h-5 w-5 flex-shrink-0" />
                      <span>武器ショップ</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-5 w-5 flex-shrink-0" />
                      <div className="flex flex-col leading-tight">
                        <span>武器ショップ</span>
                        <span className="mt-0.5 text-[11px] font-normal text-slate-500">
                          Round 3 で解放
                        </span>
                      </div>
                    </>
                  )}
                </button>
              </nav>
            </aside>
          </div>
        )}

        {/* メインコンテンツ領域 */}
        <div className="flex min-h-0 flex-1 flex-col px-3 py-2 sm:px-4">
          {currentTab === "skills" ? (
            <SkillTreeView onStateChange={refresh} onProceed={handleProceed} />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              <div className="flex flex-shrink-0 justify-end">
                <button
                  type="button"
                  onClick={handleProceed}
                  className="flex h-9 cursor-pointer items-center gap-1 rounded-xl border border-sky-300/60 bg-sky-600 px-3.5 text-xs font-extrabold text-white shadow transition-all hover:bg-sky-500 active:scale-95 sm:px-4 sm:text-sm"
                >
                  <span>次のラウンドへ</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 touch-pan-y space-y-3 overflow-y-auto pr-1">
                {WEAPON_IDS.map((weaponId) => {
                  const def = WEAPONS[weaponId];
                  const isOwned = gameState.ownedWeapons.includes(weaponId);
                  const isEquipped = gameState.equippedWeapon === weaponId;
                  const price = gameState.getWeaponPrice(weaponId);
                  const canAfford = gameState.sp >= price;
                  const discount = gameState.getShopDiscount();
                  const isDiscounted = discount > 0 && def.price > 0;

                  return (
                    <div
                      key={weaponId}
                      className={`flex flex-col items-center rounded-2xl border-2 p-4 text-center transition-colors sm:p-5 ${
                        isEquipped
                          ? "border-sky-400 bg-sky-950/70"
                          : isOwned
                            ? "border-emerald-500 bg-slate-800/90"
                            : "border-slate-600 bg-slate-900/95"
                      }`}
                    >
                      <h3 className="text-xl font-extrabold text-white sm:text-2xl">{def.name}</h3>

                      <p className="mt-1.5 text-xs font-semibold text-sky-400 sm:text-sm">
                        ダメージ: {def.damage} &nbsp;|&nbsp; 発射間隔: {def.fireInterval.toFixed(2)}
                        s ({(1 / def.fireInterval).toFixed(1)}発/秒)
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-300 sm:text-sm">
                        装弾数: {gameState.getMagazineSize(weaponId)}発 &nbsp;|&nbsp; リロード:{" "}
                        {gameState.getReloadTime(weaponId).toFixed(2)}s
                      </p>

                      <p className="mt-2.5 text-xs text-slate-400 sm:text-sm">{def.description}</p>

                      <div className="mt-4">
                        {isEquipped ? (
                          <div className="flex items-center gap-1.5 text-base font-extrabold text-sky-400 sm:text-lg">
                            <Check className="h-5 w-5" />
                            <span>現在装備中</span>
                          </div>
                        ) : isOwned ? (
                          <button
                            type="button"
                            onClick={() => handleEquipWeapon(weaponId)}
                            className="cursor-pointer rounded-xl bg-sky-600 px-8 py-2.5 text-sm font-bold text-white shadow transition-all hover:bg-sky-500 active:scale-95 sm:text-base"
                          >
                            装備する
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={!canAfford}
                            onClick={() => handleBuyWeapon(weaponId)}
                            className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold transition-all sm:text-base ${
                              canAfford
                                ? "cursor-pointer bg-emerald-600 text-white shadow hover:bg-emerald-500 active:scale-95"
                                : "cursor-not-allowed bg-slate-700 text-slate-400"
                            }`}
                          >
                            <ShoppingBag className="h-4 w-4" />
                            <span>
                              購入: {formatNumber(price)} SP
                              {isDiscounted ? ` (${formatPercent(discount)} OFF)` : ""}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {gameState.canToggleAutoFire() && (
                  <div className="flex items-center justify-center gap-2 py-2 text-center text-xs font-bold text-yellow-400 sm:text-sm">
                    <Sparkles className="h-4 w-4 flex-shrink-0" />
                    <span>全3種の武器を入手しました！「オート射撃」が利用可能です！</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
