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

import { PROGRESSION_CONFIG, WEAPON_IDS, WEAPONS } from "../../config/gameData";
import { VOCAB } from "../../config/vocab";
import { formatMoney, formatPercent } from "../../logic/format";
import { SkillTreeView } from "../SkillTreeView";
import { useUpgradeOverlay } from "./useUpgradeOverlay";

interface UpgradeOverlayProps {
  onProceed: () => void;
}

/**
 * 早撃ち技能 & 銃砲店（UPGRADES）画面の西部劇風 React オーバーレイ
 */
export function UpgradeOverlay({ onProceed }: UpgradeOverlayProps) {
  const {
    gameState,
    currentTab,
    isSidebarOpen,
    isShopUnlocked,
    nextInvoice,
    nextInvoiceRound,
    canAffordInvoice,
    refresh,
    toggleSidebar,
    handleSelectTab,
    handleEquipWeapon,
    handleBuyWeapon,
    handleProceed,
    setIsSidebarOpen,
  } = useUpgradeOverlay({ onProceed });

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
      {/* 9:16 のゲーム画面領域にぴったり重なる西部劇コンテナ */}
      <div className="font-western-slab pointer-events-auto relative flex h-full max-h-full w-full max-w-[calc(100dvh*9/16)] flex-col overflow-hidden bg-[#1a0d06]/92 text-amber-50 backdrop-blur-[2px]">
        {/* 上部ヘッダー（木札＆真鍮鋲デザイン） */}
        <header className="western-wood safe-pt-2 z-20 grid flex-shrink-0 grid-cols-3 items-center gap-2 border-b-2 border-amber-700/80 px-3 pb-2 sm:px-4 sm:pb-2">
          {/* 左端: サイドバートグルボタン */}
          <div className="flex justify-start">
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="メニューを開閉"
              className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-amber-600/80 bg-[#2b1509] px-2.5 text-xs font-bold text-amber-100 shadow transition-colors hover:border-amber-400 hover:bg-[#3d1f0e] active:scale-95 sm:px-3 sm:text-sm"
            >
              {isSidebarOpen ? (
                <X className="h-4 w-4 text-amber-400" />
              ) : (
                <Menu className="h-4 w-4 text-amber-400" />
              )}
              <span>
                {currentTab === "skills" ? VOCAB.facilities.skills : VOCAB.facilities.weaponsShop}
              </span>
            </button>
          </div>

          {/* 中央: 所持金（$） & 次回上納金 */}
          <div className="flex min-w-0 flex-col items-center leading-tight">
            <div className="truncate text-sm font-extrabold text-amber-300 drop-shadow sm:text-lg">
              {VOCAB.currency.moneyName} {formatMoney(gameState.sp)}
            </div>
            <div
              className={`truncate text-[11px] font-bold sm:text-xs ${
                canAffordInvoice ? "text-amber-200/85" : "text-red-400"
              }`}
            >
              {VOCAB.progression.nextInvoiceHeader(nextInvoiceRound, formatMoney(nextInvoice))}
            </div>
          </div>

          {/* 右端: 決闘数表示 */}
          <div className="flex justify-end">
            <span className="font-western-display rounded border border-amber-800/70 bg-[#1a0c05]/80 px-2 py-0.5 text-[11px] font-bold text-amber-300/90 sm:text-xs">
              {VOCAB.progression.roundSuffix(gameState.round)}
            </span>
          </div>
        </header>

        {/* トグルサイドバー (木製扉ドロワー) */}
        {isSidebarOpen && (
          <div
            className="absolute inset-0 z-30 flex bg-black/70 backdrop-blur-[2px]"
            onClick={() => setIsSidebarOpen(false)}
          >
            <aside
              onClick={(e) => e.stopPropagation()}
              className="western-wood safe-pt-4 flex h-full w-64 max-w-[78%] flex-col border-r-2 border-amber-700 px-4 pb-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-amber-800/70 pb-3">
                <span className="font-western-display text-sm font-extrabold tracking-wider text-amber-300">
                  ★ FRONTIER MENU
                </span>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  aria-label="サイドバーを閉じる"
                  className="cursor-pointer rounded-lg p-1 text-amber-300/70 hover:bg-amber-950 hover:text-amber-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="mt-4 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSelectTab("skills")}
                  className={`flex items-center gap-3 rounded-lg border-2 px-3.5 py-3 text-left text-sm font-bold transition-all ${
                    currentTab === "skills"
                      ? "western-btn-brass cursor-pointer text-amber-50 shadow"
                      : "cursor-pointer border-amber-900 bg-[#221107]/90 text-amber-200/80 hover:border-amber-600 hover:text-amber-50"
                  }`}
                >
                  <Zap className="h-5 w-5 flex-shrink-0 text-amber-300" />
                  <span>{VOCAB.facilities.skillsTree}</span>
                </button>

                <button
                  type="button"
                  disabled={!isShopUnlocked}
                  onClick={() => handleSelectTab("weapons")}
                  className={`flex items-center gap-3 rounded-lg border-2 px-3.5 py-3 text-left text-sm font-bold transition-all ${
                    !isShopUnlocked
                      ? "cursor-not-allowed border-amber-950 bg-[#170b05] text-amber-900"
                      : currentTab === "weapons"
                        ? "western-btn-brass cursor-pointer text-amber-50 shadow"
                        : "cursor-pointer border-amber-900 bg-[#221107]/90 text-amber-200/80 hover:border-amber-600 hover:text-amber-50"
                  }`}
                >
                  {isShopUnlocked ? (
                    <>
                      <Crosshair className="h-5 w-5 flex-shrink-0 text-amber-300" />
                      <span>{VOCAB.facilities.weaponsShopMenu}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-5 w-5 flex-shrink-0" />
                      <div className="flex flex-col leading-tight">
                        <span>{VOCAB.facilities.weaponsShopLocked}</span>
                        <span className="mt-0.5 text-[11px] font-normal text-amber-700">
                          {VOCAB.progression.shopUnlockAt(PROGRESSION_CONFIG.shopUnlockRound)}
                        </span>
                      </div>
                    </>
                  )}
                </button>
              </nav>

              <p className="mt-auto border-t border-amber-900/60 pt-3 text-center text-xs text-amber-300/65 italic">
                {VOCAB.facilities.sidebarQuote}
              </p>
            </aside>
          </div>
        )}

        {/* メインコンテンツ領域 */}
        <div className="flex min-h-0 flex-1 flex-col px-3 py-2 sm:px-4">
          {currentTab === "skills" ? (
            <SkillTreeView onStateChange={refresh} onProceed={handleProceed} />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-2.5">
              <div className="flex flex-shrink-0 items-center justify-between">
                <span className="font-western-display text-xs font-bold tracking-wider text-amber-300/90 sm:text-sm">
                  ★ GUNSMITH CATALOGUE ★
                </span>
                <button
                  type="button"
                  onClick={handleProceed}
                  className="western-btn-wood flex h-9 cursor-pointer items-center gap-1 rounded-lg px-3.5 text-xs font-extrabold text-amber-50 transition-all active:scale-95 sm:px-4 sm:text-sm"
                >
                  <span>{VOCAB.actions.nextDuel}</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 touch-pan-y space-y-3 overflow-y-auto pr-1">
                {WEAPON_IDS.map((weaponId) => {
                  const def = WEAPONS[weaponId];
                  const localizedWeapon = VOCAB.weapons[weaponId];
                  const isOwned = gameState.ownedWeapons.includes(weaponId);
                  const isEquipped = gameState.equippedWeapon === weaponId;
                  const price = gameState.getWeaponPrice(weaponId);
                  const canAfford = gameState.sp >= price;
                  const discount = gameState.getShopDiscount();
                  const isDiscounted = discount > 0 && def.price > 0;

                  return (
                    <div
                      key={weaponId}
                      className={`western-parchment relative flex flex-col items-center rounded-lg border-2 p-4 text-center transition-all sm:p-5 ${
                        isEquipped
                          ? "border-amber-700 ring-2 ring-amber-400"
                          : isOwned
                            ? "border-[#6b3410]"
                            : "border-[#5c2d10] opacity-95"
                      }`}
                    >
                      {/* 四隅の鋲ドット */}
                      <span className="absolute top-2 left-2 h-2 w-2 rounded-full bg-amber-900/70" />
                      <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-amber-900/70" />
                      <span className="absolute bottom-2 left-2 h-2 w-2 rounded-full bg-amber-900/70" />
                      <span className="absolute right-2 bottom-2 h-2 w-2 rounded-full bg-amber-900/70" />

                      <h3 className="text-xl font-extrabold text-[#2b1206] sm:text-2xl">
                        {localizedWeapon.name}
                      </h3>

                      <p className="mt-1.5 text-xs font-bold text-[#7f1d1d] sm:text-sm">
                        {VOCAB.gunsmithUi.statLine1(
                          def.damage,
                          def.fireInterval.toFixed(2),
                          (1 / def.fireInterval).toFixed(1),
                        )}
                      </p>
                      <p className="mt-1 text-xs font-bold text-[#4a2109] sm:text-sm">
                        {VOCAB.gunsmithUi.statLine2(
                          gameState.getMagazineSize(weaponId),
                          gameState.getReloadTime(weaponId).toFixed(2),
                        )}
                      </p>

                      <p className="mt-2.5 text-xs font-medium text-[#5c2d10] sm:text-sm">
                        {localizedWeapon.description}
                      </p>

                      <div className="mt-4">
                        {isEquipped ? (
                          <div className="flex items-center gap-1.5 rounded-md border border-amber-800/50 bg-amber-950/15 px-4 py-1.5 text-sm font-extrabold text-[#7c2d12] sm:text-base">
                            <Check className="h-5 w-5" />
                            <span>★ {VOCAB.actions.equipped}</span>
                          </div>
                        ) : isOwned ? (
                          <button
                            type="button"
                            onClick={() => handleEquipWeapon(weaponId)}
                            className="western-btn-wood cursor-pointer rounded-lg px-8 py-2 text-sm font-bold text-amber-50 transition-all active:scale-95 sm:text-base"
                          >
                            {VOCAB.actions.equipWeapon}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={!canAfford}
                            onClick={() => handleBuyWeapon(weaponId)}
                            className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold transition-all sm:text-base ${
                              canAfford
                                ? "western-btn-brass cursor-pointer text-amber-50 active:scale-95"
                                : "cursor-not-allowed border border-[#8c6d46] bg-[#9c825e] text-[#4a3926]"
                            }`}
                          >
                            <ShoppingBag className="h-4 w-4" />
                            <span>
                              {VOCAB.actions.buyWeapon}: {formatMoney(price)}
                              {isDiscounted
                                ? VOCAB.gunsmithUi.offSuffix(formatPercent(discount))
                                : ""}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {gameState.canToggleAutoFire() && (
                  <div className="western-wood flex items-center justify-center gap-2 rounded-lg border border-amber-500/70 px-3 py-2.5 text-center text-xs font-bold text-amber-300 sm:text-sm">
                    <Sparkles className="h-4 w-4 flex-shrink-0" />
                    <span>{VOCAB.combat.autoFireUnlockedMsg}</span>
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
