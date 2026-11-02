/**
 * i18n 多言語対応システム（日本語 / 英語）
 *
 * 西部劇（マカロニ・ウェスタン）の雰囲気を活かしつつ、
 * ゲームルール・数値効果・文節の区切りが一読で直感的に分かる表現に統一しています。
 */

import {
  COMBAT_CONFIG,
  INVOICE_CONFIG,
  PASSIVES,
  PROGRESSION_CONFIG,
  ROUND_CONFIG,
  TARGET_UNLOCK_SEQUENCE,
  WEAPONS,
} from "../config/gameData";
import type {
  PassiveId,
  PermanentUpgradeId,
  SkillNodeId,
  SkillStatId,
  TargetId,
  WeaponId,
} from "../config/types";

export type Locale = "ja" | "en";

export interface LocalizedItemText {
  name: string;
  description: string;
}

export interface Translations {
  currency: {
    symbol: string;
    moneyName: string;
    earnedMoney: string;
    bountyScore: string;
    bountyScoreAbbr: string;
    metaPoints: string;
    metaPointsAbbr: string;
  };
  progression: {
    roundName: (round: number) => string;
    roundHudLabel: (round: number) => string;
    roundSuffix: (round: number) => string;
    roundHeader: (round: number) => string;
    nextInvoiceHeader: (roundsRemaining: number, amount: string) => string;
    shopUnlockAt: (round: number) => string;
    invoiceTitle: (count: number) => string;
    invoiceTerm: string;
    invoiceShort: string;
    invoiceDueDesc: string;
    invoiceAmountLabel: string;
    invoiceStatusAfford: (cash: string) => string;
    invoiceStatusShort: (cash: string) => string;
    invoiceQuote: string;
    invoiceWarnAfford: (nextRound: number, cost: string) => string;
    invoiceWarnShort: (nextRound: number, cost: string) => string;
    invoiceIntroTitle: string;
    invoiceIntroStory: string;
    invoiceIntroCardTitle: string;
    invoiceIntroBullet1: string;
    invoiceIntroBullet2: string;
    invoiceIntroConfirm: string;
    invoiceDueInRounds: (rounds: number, cost: string) => string;
    invoiceDueNextRound: (cost: string) => string;
  };
  combat: {
    targetName: string;
    targetUnit: string;
    draw: string;
    roundEnd: string;
    timeRemaining: string;
    timeExtensionPopup: (sec: string) => string;
    lockOnReady: string;
    lockOnAiming: string;
    lockOnTarget: (name: string) => string;
    critHit: string;
    autoFireAim: string;
    autoFireUnlockedMsg: string;
    cylinderReloading: (pct: number) => string;
    cylinderReloadSub: string;
    cylinderReserveAmmo: (extra: number) => string;
    weaponSwitchSub: (dmg: number, interval: number, mag: number) => string;
    dragAimHint: string;
    autoFireHint: string;
    keyboardAimHint: string;
    sliderRight: string;
    sliderLeft: string;
    sliderCenter: string;
    loadingGun: string;
  };
  facilities: {
    skills: string;
    skillsTree: string;
    weaponsShop: string;
    weaponsShopMenu: string;
    weaponsShopLocked: string;
    saloon: string;
    saloonSub: string;
    passivesTitle: string;
    passivesSub: string;
    passivesDesc: string;
    passiveOwnedCount: (count: number) => string;
    passiveUnowned: string;
    settings: string;
    settingsSaloon: string;
    sidebarQuote: string;
  };
  actions: {
    startDuel: string;
    nextDuel: string;
    toUpgrade: string;
    trainSaloon: string;
    trainSaloonWithPoints: (points: number) => string;
    backToTitle: string;
    backToTitleFromSaloon: string;
    payInvoice: string;
    bankruptSurrender: string;
    choosePassive: string;
    equipWeapon: string;
    equipped: string;
    buyWeapon: string;
    mastered: string;
    trainCost: (cost: number | string) => string;
    upgradeSkill: (cost: string) => string;
  };
  titleScreen: {
    mainTitleTop: string;
    mainTitleBottom: string;
    tagline: string;
    posterQuote: string;
    heldBadges: (points: number) => string;
    careerRecord: (highestRound: number, totalRuns: number) => string;
    introQuote: string;
  };
  resultScreen: {
    currentCash: string;
    targetsHit: (count: number) => string;
    unlockSectionTitle: string;
    nextTargetProgress: (name: string, pct: number) => string;
    totalWantedPoints: (cur: string, req: string) => string;
    allTargetsUnlocked: string;
    unlockPopupBanner: string;
    unlockPopupBody: (names: string) => string;
    unlockPopupClose: string;
  };
  records: {
    gameOverTitle: string;
    gameOverQuote: string;
    clearSubtitle: string;
    roundReached: string;
    roundCleared: string;
    invoicesPaidCount: string;
    countValue: (n: number) => string;
    totalBountyEarned: string;
    totalTaxesPaid: string;
    totalTargetsHit: string;
    targetsHitValue: (n: number) => string;
    targetsUnlocked: string;
    targetsUnlockedValue: (cur: number, total: number) => string;
    gunsAcquired: string;
    badgeConversionNote: string;
    badgeGainedSummary: (gained: number, total: number) => string;
  };
  skillTreeUi: {
    locked: string;
    maxBadge: string;
    noEffectYet: string;
    maxLevelReached: string;
    prerequisite: (name: string, level: number) => string;
    prereqUnmet: string;
    virtualStick: string;
    moveLeft: string;
    moveUp: string;
    moveDown: string;
    moveRight: string;
  };
  gunsmithUi: {
    statLine1: (dmg: number, interval: string, rps: string) => string;
    statLine2: (ammo: number, reload: string) => string;
    offSuffix: (pct: string) => string;
  };
  saloonUi: {
    formatEffect: (id: PermanentUpgradeId, eff: number) => string;
  };
  stats: Record<SkillStatId, { label: string; subLabel: string; unit: string }>;
  weapons: Record<WeaponId, LocalizedItemText>;
  targets: Record<TargetId, LocalizedItemText>;
  skills: Record<SkillNodeId, LocalizedItemText>;
  passives: Record<PassiveId, LocalizedItemText>;
  permanentUpgrades: Record<PermanentUpgradeId, LocalizedItemText>;
  quotes: readonly string[];
  stageSubtitles: readonly string[];
  sheriffStageSubtitle: string;
  ui: {
    language: string;
    languageJa: string;
    languageEn: string;
    fullscreen: string;
    fullscreenOn: string;
    fullscreenOff: string;
    fullscreenToggle: string;
    fullscreenExit: string;
    cursorFollow: string;
    cursorFollowDescOn: string;
    cursorFollowDescOff: string;
    mobileDisabled: string;
    pcCursorFollowActive: string;
    joystickPosition: string;
    joystickDynamic: string;
    joystickFixed: string;
    bgmVolume: string;
    seVolume: string;
  };
}

export const translations: Record<Locale, Translations> = {
  ja: {
    currency: {
      symbol: "$",
      moneyName: "所持金",
      earnedMoney: "獲得賞金",
      bountyScore: "手配ポイント",
      bountyScoreAbbr: "pt",
      metaPoints: "名声バッジ",
      metaPointsAbbr: "名声バッジ",
    },
    progression: {
      roundName: (round: number) => `Round ${round}`,
      roundHudLabel: (round: number) => `ROUND ${round}`,
      roundSuffix: (round: number) => `Round ${round} 終了後`,
      roundHeader: (round: number) => `Round ${round} — 賞金精算`,
      nextInvoiceHeader: (roundsRemaining: number, amount: string) =>
        `次回上納金: ${amount} (あと${roundsRemaining}R)`,
      shopUnlockAt: (round: number) => `Round ${round} で開店`,
      invoiceTitle: (count: number) => `保安官の上納金（第 ${count} 回）`,
      invoiceTerm: "保安官の上納金",
      invoiceShort: "上納金",
      invoiceDueDesc: `${INVOICE_CONFIG.intervalRounds}ラウンドごとに徴収される縄張り代だ。\n支払えなければ町から追放（ゲームオーバー）となる。`,
      invoiceAmountLabel: "— 今回の支払額 —",
      invoiceStatusAfford: (cash: string) =>
        `現在の所持金: ${cash}\n（支払い可能 — 次のラウンドへ進める）`,
      invoiceStatusShort: (cash: string) =>
        `現在の所持金: ${cash}\n（所持金不足 — これ以上は進めない！）`,
      invoiceQuote: "「この町で銃を抜くなら、保安官事務所への上納金を置いていきな」",
      invoiceWarnAfford: (nextRound: number, cost: string) =>
        `⚠️ 次の Round ${nextRound} 終了時、保安官の上納金【${cost}】が発生！ 所持金を残しておこう`,
      invoiceWarnShort: (nextRound: number, cost: string) =>
        `🚨 警告: 次の Round ${nextRound} 終了時、保安官の上納金【${cost}】が必要！（現在所持金不足）`,
      invoiceIntroTitle: "★ 保安官の上納金 ★",
      invoiceIntroStory:
        "この荒野の町で銃を抜いて稼ぎ続けるなら、保安官事務所へ縄張り代（上納金）を納めなければならない。掟を守れぬ者は即座に町から叩き出される。稼いだ金をすべて武器やスキルの強化に使い切らず、手元に資金を残しておこう。",
      invoiceIntroCardTitle: "【 掟・やるべきこと 】",
      invoiceIntroBullet1: "3ラウンドごとに支払いが発生",
      invoiceIntroBullet2: "要求額が支払えなければゲームオーバー",
      invoiceIntroConfirm: "承知した（了解）",
      invoiceDueInRounds: (rounds: number, cost: string) =>
        `次回の上納金: あと ${rounds} ラウンド後 (${cost})`,
      invoiceDueNextRound: (cost: string) => `⚠️ 次のラウンド終了後に徴収！ 必要額: ${cost}`,
    },
    combat: {
      targetName: "標的",
      targetUnit: "個",
      draw: "DRAW!",
      roundEnd: "決着！",
      timeRemaining: "制限時間",
      timeExtensionPopup: (sec: string) => `時間 +${sec}秒!`,
      lockOnReady: "銃を構えろ...",
      lockOnAiming: "照準中...",
      lockOnTarget: (name: string) => `🎯 狙い: ${name}`,
      critHit: "急所!",
      autoFireAim: "自動エイム",
      autoFireUnlockedMsg: `全${PROGRESSION_CONFIG.autoFireUnlockWeaponCount}種の銃を入手！「自動エイム」が利用可能になった！`,
      cylinderReloading: (pct: number) => `リロード ${pct}%`,
      cylinderReloadSub: "再装填中...",
      cylinderReserveAmmo: (extra: number) => `6発 + 予備${extra}発`,
      weaponSwitchSub: (dmg: number, interval: number, mag: number) =>
        `威力: ${dmg} | 間隔: ${interval}秒 | 装弾: ${mag}発`,
      dragAimHint: "🤠 画面のどこでも上下ドラッグで照準！（タップで正面へ）",
      autoFireHint: "🔫 標的を射線に捉えると自動で発砲！",
      keyboardAimHint: "（PC: A / D または 矢印キー でも照準操作が可能）",
      sliderRight: "▲ 右へ",
      sliderLeft: "▼ 左へ",
      sliderCenter: "◄ 正面",
      loadingGun: "銃を手入れしています...",
    },
    facilities: {
      skills: "スキル強化",
      skillsTree: "スキル強化ツリー",
      weaponsShop: "銃砲店",
      weaponsShopMenu: "銃砲店（武器購入）",
      weaponsShopLocked: "銃砲店（準備中）",
      saloon: "酒場",
      saloonSub: "永続強化",
      passivesTitle: "ボーナス",
      passivesSub: "保安官の黙認 — ボーナス習得",
      passivesDesc: `${PROGRESSION_CONFIG.passiveChoicesCount}つのボーナスから1つを選んで習得しよう（重複習得可）`,
      passiveOwnedCount: (count: number) => `現在の習得数: ×${count}`,
      passiveUnowned: "未習得",
      settings: "設定",
      settingsSaloon: "ゲーム設定",
      sidebarQuote: "「いい銃と速い腕、生き残るには両方要るぜ」",
    },
    actions: {
      startDuel: "荒野へ繰り出す（ゲーム開始）",
      nextDuel: "次のラウンドへ",
      toUpgrade: "スキル強化 ＆ 銃砲店へ",
      trainSaloon: "酒場で永続強化",
      trainSaloonWithPoints: (points: number) => `酒場で永続強化（バッジ: ${points}）`,
      backToTitle: "タイトルへ戻る",
      backToTitleFromSaloon: "タイトルへ戻る",
      payInvoice: "上納金を支払う",
      bankruptSurrender: "支払い不能（ゲームオーバー）",
      choosePassive: "習得する",
      equipWeapon: "装備する",
      equipped: "装備中",
      buyWeapon: "購入する",
      mastered: "習得済み",
      trainCost: (cost: number | string) => `強化する (★ ${cost})`,
      upgradeSkill: (cost: string) => `強化する (${cost})`,
    },
    titleScreen: {
      mainTitleTop: "荒野の早撃ち",
      mainTitleBottom: "賞 金 稼 ぎ",
      tagline: `${ROUND_CONFIG.baseDuration}秒の早撃ち × 銃器改造 × 保安官の上納金`,
      posterQuote: "「この町は俺には狭すぎる」",
      heldBadges: (points: number) => `★ 所持名声バッジ: ${points}`,
      careerRecord: (highestRound: number, totalRuns: number) =>
        `最高到達: Round ${highestRound}   |   総プレイ回数: ${totalRuns} 回`,
      introQuote: "「風が止んだら……抜け」",
    },
    resultScreen: {
      currentCash: "現在の所持金",
      targetsHit: (count: number) => `撃破した標的: ${count} 個`,
      unlockSectionTitle: "📜 次の標的（賞金首）解放ゲージ",
      nextTargetProgress: (name: string, pct: number) => `次の解放: 【${name}】 (${pct}%)`,
      totalWantedPoints: (cur: string, req: string) => `手配ポイント: ${cur} / ${req} pt`,
      allTargetsUnlocked: `★ 全${TARGET_UNLOCK_SEQUENCE.length}種の標的をすべて解放済み！ ★`,
      unlockPopupBanner: "★ NEW WANTED! ★",
      unlockPopupBody: (names: string) => `新たな標的 ${names} が出現するようになった！`,
      unlockPopupClose: "（タップして閉じる）",
    },
    records: {
      gameOverTitle: "💀 GAME OVER 💀",
      gameOverQuote: "「俺の墓標に名は要らねえ……次はもっと速く抜くだけさ」",
      clearSubtitle: `全${TARGET_UNLOCK_SEQUENCE.length}種の標的（WANTED）を解放し、荒野を制覇した！\n「この町は俺には狭すぎる……次の荒野へ行くか」`,
      roundReached: "到達ラウンド",
      roundCleared: "クリア到達ラウンド",
      invoicesPaidCount: "上納金の支払い回数",
      countValue: (n: number) => `${n} 回`,
      totalBountyEarned: "累計獲得賞金",
      totalTaxesPaid: "上納金の支払総額",
      totalTargetsHit: "撃破した標的の総数",
      targetsHitValue: (n: number) => `${n} 個`,
      targetsUnlocked: "解放した標的の種類",
      targetsUnlockedValue: (cur: number, total: number) => `${cur} / ${total} 種`,
      gunsAcquired: "入手した銃器",
      badgeConversionNote: `★ 上納金総額の${Math.round(INVOICE_CONFIG.permanentPointRate * 100)}%を「名声バッジ」として獲得！ ★`,
      badgeGainedSummary: (gained: number, total: number) =>
        `★ +${gained} 獲得！ （所持合計: ${total}）`,
    },
    skillTreeUi: {
      locked: "未解放",
      maxBadge: "★ MAX",
      noEffectYet: "現在 +0",
      maxLevelReached: "★ 最大レベル習得済み",
      prerequisite: (name: string, level: number) => `解放条件: ${name} Lv.${level}`,
      prereqUnmet: "解放条件: 未達成",
      virtualStick: "移動スティック",
      moveLeft: "左へ移動",
      moveUp: "上へ移動",
      moveDown: "下へ移動",
      moveRight: "右へ移動",
    },
    gunsmithUi: {
      statLine1: (dmg: number, interval: string, rps: string) =>
        `威力: ${dmg}  |  発射間隔: ${interval}秒 (${rps}発/秒)`,
      statLine2: (ammo: number, reload: string) => `装弾数: ${ammo}発  |  リロード: ${reload}秒`,
      offSuffix: (pct: string) => ` (${pct} OFF)`,
    },
    saloonUi: {
      formatEffect: (id: PermanentUpgradeId, eff: number) => {
        switch (id) {
          case "start_sp":
            return `+$${eff}`;
          case "base_dmg":
            return `威力 +${eff}`;
          case "round_time":
            return `+${eff}秒`;
          case "invoice_reduction":
            return `-${eff}%`;
        }
      },
    },
    stats: {
      damage: { label: "基礎威力（ダメージ）", subLabel: "威力", unit: "" },
      critRate: { label: "会心率（急所撃ち）", subLabel: "会心率", unit: "%" },
      fireRateReduction: { label: "発射間隔の短縮", subLabel: "連射速度", unit: "%" },
      magazineCapacity: { label: "装弾数", subLabel: "装弾数", unit: "発" },
      magazineMultiplier: { label: "装弾数の増加率", subLabel: "弾数倍率", unit: "%" },
      reloadTimeReduction: { label: "リロード時間短縮", subLabel: "リロード", unit: "%" },
      roundTime: { label: "ラウンド制限時間", subLabel: "制限時間", unit: "秒" },
      maxTargets: { label: "同時出現数", subLabel: "出現数", unit: "個" },
      spMultiplier: { label: "獲得賞金ボーナス", subLabel: "獲得賞金", unit: "%" },
      shopDiscount: { label: "銃砲店の割引率", subLabel: "武器割引", unit: "%" },
      timeTargetBonus: { label: "懐中時計の延長時間", subLabel: "時間追加", unit: "秒" },
      chainDamage: { label: "ダイナマイト誘爆威力", subLabel: "誘爆倍率", unit: "%" },
      targetRespawnRate: { label: "的の復活率", subLabel: "復活率", unit: "%" },
    },
    weapons: {
      handgun: {
        name: "ピースメイカー",
        description: `連射とリロードの隙が少ない扱いやすい${WEAPONS.handgun.magazineSize}連発リボルバー。弾の当たり判定もやや広く狙いやすい。`,
      },
      rifle: {
        name: "ウィンチェスター銃",
        description: `高速連射と${WEAPONS.rifle.magazineSize}発の大容量マガジンを誇るレバーアクション連発銃。手数で賞金首を圧倒する。`,
      },
      sniper: {
        name: "シャープス大口径銃",
        description:
          "超高速・極太の大口径鉛弾を放つ重ライフル。装甲標的を一撃で砕き、ダイナマイト誘爆も劇的に強化する。",
      },
    },
    targets: {
      standard: {
        name: "無法者",
        description: "HPが低い標準的な標的。威力を1段階鍛えれば一撃で仕留められる。",
      },
      hard: {
        name: "鉄板の重罪人",
        description: "胸に鉄板を仕込んだ硬い標的。タフだが仕留めれば高額賞金が手に入る。",
      },
      gold: {
        name: "黄金の賞金首",
        description: "荒野に名を轟かせる伝説の大悪党。こいつを手配書に載せれば荒野制覇だ。",
      },
      electric: {
        name: "ダイナマイト樽",
        description: "撃ち抜くと大爆発し、とどめの一撃に応じた誘爆ダメージを全標的に与える。",
      },
      small: {
        name: "早撃ちキッド",
        description: "小柄で素早く逃げるが、仕留めれば大金になる厄介な賞金首。",
      },
      time: {
        name: "懐中時計",
        description: "撃ち抜くとラウンドの残り時間が延長される貴重な標的。",
      },
    },
    skills: {
      damage_base: {
        name: "鉛弾の威力",
        description: "すべての銃の基礎ダメージを上げる",
      },
      fire_rate: {
        name: "早撃ち連射",
        description: "発射間隔を短縮し、連射速度を上げる",
      },
      max_targets: {
        name: "標的の増加",
        description: "画面に同時出現する標的の最大数を増やす",
      },
      crit_rate: {
        name: "急所撃ち",
        description: `ダメージが${COMBAT_CONFIG.critMultiplier}倍になる会心（急所）率を上げる`,
      },
      chain_damage: {
        name: "ダイナマイト誘爆",
        description: "「ダイナマイト樽」撃破時に周囲へ与える誘爆ダメージを強化する",
      },
      round_time: {
        name: "制限時間延長",
        description: "1ラウンドの制限時間を延ばす",
      },
      time_target_bonus: {
        name: "懐中時計の延長",
        description: "「懐中時計」撃破時の残り時間プラス量を増やす",
      },
      magazine_size: {
        name: "装弾数アップ",
        description: "すべての銃の装弾数を増やし、リロード回数を減らす",
      },
      reload_speed: {
        name: "早業リロード",
        description: "弾切れ時のリロード時間を短縮する",
      },
      sp_multiplier: {
        name: "獲得賞金アップ",
        description: "標的を撃破したときに得られる賞金（$）を増やす",
      },
      shop_discount: {
        name: "銃砲店の割引",
        description: "銃砲店で購入する武器の価格を割り引く",
      },
      magazine_mult: {
        name: "特製ガンベルト",
        description: "装弾数を割合で大きく引き上げ、圧倒的な弾幕を維持する",
      },
    },
    passives: {
      sp_bonus: {
        name: "賞金稼ぎの嗅覚",
        description: `獲得賞金（$） +${Math.round(PASSIVES.sp_bonus.effectPerStack * 100)}%`,
      },
      dmg_bonus: {
        name: "大口径鉛弾",
        description: `すべての銃の基礎威力 +${Math.round(PASSIVES.dmg_bonus.effectPerStack * 100)}%`,
      },
      time_bonus: {
        name: "早撃ちの集中",
        description: `ラウンド制限時間 +${PASSIVES.time_bonus.effectPerStack.toFixed(1)}秒`,
      },
      target_bonus: {
        name: "一斉指名手配",
        description: `標的の同時出現数 +${PASSIVES.target_bonus.effectPerStack}`,
      },
      crit_bonus: {
        name: "死神の眼光",
        description: `会心（急所）率 +${Math.round(PASSIVES.crit_bonus.effectPerStack * 100)}%`,
      },
    },
    permanentUpgrades: {
      start_sp: {
        name: "砂金の軍資金",
        description: "ゲーム開始時の初期所持金（$）を増やす",
      },
      base_dmg: {
        name: "伝説の早撃ち術",
        description: "ゲーム開始時からの基礎威力を増やす",
      },
      round_time: {
        name: "死線の集中力",
        description: "ラウンドの制限時間を延長する",
      },
      invoice_reduction: {
        name: "保安官への袖の下",
        description: `${INVOICE_CONFIG.intervalRounds}ラウンドごとの「保安官の上納金」を軽減する`,
      },
    },
    quotes: [
      "「この町は俺には狭すぎる」",
      "「鉛玉は嘘をつかねえ」",
      "「棺桶を二つ用意しておけ」",
      "「早撃ちに二番目はねえ」",
      "「夕陽が沈む前にケリをつける」",
      "「風が止んだら……抜け」",
      "「賞金首は逃がさねえ」",
      "「死人に口なし、賞金に文句なしだ」",
    ],
    stageSubtitles: [
      "赤土の荒野 — RED DUST GULCH",
      "朽ちた酒場前 — OLD SALOON",
      "廃駅の線路 — GHOST DEPOT",
      "サボテン渓谷 — CACTUS CANYON",
      "真昼の決闘場 — HIGH NOON",
    ],
    sheriffStageSubtitle: "保安官の縄張り — SHERIFF'S TAX",
    ui: {
      language: "言語 / Language",
      languageJa: "日本語",
      languageEn: "English",
      fullscreen: "画面表示",
      fullscreenOn: "全画面表示中",
      fullscreenOff: "通常表示",
      fullscreenToggle: "全画面にする",
      fullscreenExit: "全画面解除",
      cursorFollow: "マウスカーソル追従",
      cursorFollowDescOn: "マウス位置へ直接エイム",
      cursorFollowDescOff: "上下ドラッグのレバー操作を使用",
      mobileDisabled: "スマホ版（無効）",
      pcCursorFollowActive: "無効（カーソル追従中）",
      joystickPosition: "照準レバーの表示位置",
      joystickDynamic: "追従（タッチ位置）",
      joystickFixed: "固定（画面下部）",
      bgmVolume: "BGM 音量（口笛・ギター）",
      seVolume: "効果音（銃声・拍車・リロード）",
    },
  },

  en: {
    currency: {
      symbol: "$",
      moneyName: "Cash",
      earnedMoney: "Bounty Earned",
      bountyScore: "Wanted Points",
      bountyScoreAbbr: "pt",
      metaPoints: "Star Badges",
      metaPointsAbbr: "Badges",
    },
    progression: {
      roundName: (round: number) => `Round ${round}`,
      roundHudLabel: (round: number) => `ROUND ${round}`,
      roundSuffix: (round: number) => `After R${round}`,
      roundHeader: (round: number) => `Round ${round} — Bounty Payout`,
      nextInvoiceHeader: (roundsRemaining: number, amount: string) =>
        `Next Tax: ${amount} (${roundsRemaining}R left)`,
      shopUnlockAt: (round: number) => `Opens at Round ${round}`,
      invoiceTitle: (count: number) => `Sheriff's Tax (#${count})`,
      invoiceTerm: "Sheriff's Tax",
      invoiceShort: "Tax",
      invoiceDueDesc: `Territory tax collected every ${INVOICE_CONFIG.intervalRounds} rounds.\nFail to pay, and you're run out of town (Game Over).`,
      invoiceAmountLabel: "— Amount Due —",
      invoiceStatusAfford: (cash: string) =>
        `Current Cash: ${cash}\n(Enough to pay — ready for the next round)`,
      invoiceStatusShort: (cash: string) =>
        `Current Cash: ${cash}\n(Not enough cash — end of the trail!)`,
      invoiceQuote: "\"If you're drawin' iron in my town, pay your due to the badge.\"",
      invoiceWarnAfford: (nextRound: number, cost: string) =>
        `⚠️ Sheriff's Tax [${cost}] due after Round ${nextRound}! Keep enough cash on hand!`,
      invoiceWarnShort: (nextRound: number, cost: string) =>
        `🚨 Warning: Sheriff's Tax [${cost}] due after Round ${nextRound}! (Short on cash!)`,
      invoiceIntroTitle: "★ SHERIFF'S TAX ★",
      invoiceIntroStory:
        "If you want to draw iron and collect bounties in this frontier town, you must pay territory tax to the Sheriff. Those who break the law are driven out on the spot. Never spend all your earnings on upgrades—always keep enough reserve cash on hand.",
      invoiceIntroCardTitle: "【 Frontier Rules & Action 】",
      invoiceIntroBullet1: "Payment due every 3 rounds",
      invoiceIntroBullet2: "Game over if unable to pay the demanded amount",
      invoiceIntroConfirm: "Understood",
      invoiceDueInRounds: (rounds: number, cost: string) =>
        `Next Tax Due: In ${rounds} rounds (${cost})`,
      invoiceDueNextRound: (cost: string) => `⚠️ Tax Due After Next Round! Required: ${cost}`,
    },
    combat: {
      targetName: "Targets",
      targetUnit: "",
      draw: "DRAW!",
      roundEnd: "TIME UP!",
      timeRemaining: "Time Limit",
      timeExtensionPopup: (sec: string) => `TIME +${sec}s!`,
      lockOnReady: "GET READY...",
      lockOnAiming: "AIMING...",
      lockOnTarget: (name: string) => `🎯 LOCKED: ${name}`,
      critHit: "CRIT!",
      autoFireAim: "Auto-Aim",
      autoFireUnlockedMsg: `All ${PROGRESSION_CONFIG.autoFireUnlockWeaponCount} guns owned! 'Auto-Aim' is now unlocked!`,
      cylinderReloading: (pct: number) => `Reload ${pct}%`,
      cylinderReloadSub: "Reloading...",
      cylinderReserveAmmo: (extra: number) => `6 + ${extra} reserve`,
      weaponSwitchSub: (dmg: number, interval: number, mag: number) =>
        `DMG: ${dmg} | Rate: ${interval}s | Ammo: ${mag}`,
      dragAimHint: "🤠 Touch & drag up/down anywhere to aim! (Tap to center)",
      autoFireHint: "🔫 Fires automatically when your sights line up on a target!",
      keyboardAimHint: "(PC: Aim with A / D or Arrow Keys)",
      sliderRight: "▲ RIGHT",
      sliderLeft: "▼ LEFT",
      sliderCenter: "◄ CENTER",
      loadingGun: "Oiling the revolver...",
    },
    facilities: {
      skills: "Skills",
      skillsTree: "Skill Tree",
      weaponsShop: "Gunsmith",
      weaponsShopMenu: "Gunsmith (Weapons)",
      weaponsShopLocked: "Gunsmith (Locked)",
      saloon: "Saloon",
      saloonSub: "Perm Upgrades",
      passivesTitle: "Bonus Perk",
      passivesSub: "Sheriff's Blind Eye — Bonus Perk",
      passivesDesc: `Choose 1 of ${PROGRESSION_CONFIG.passiveChoicesCount} perks to keep for this run (stackable)`,
      passiveOwnedCount: (count: number) => `Owned: ×${count}`,
      passiveUnowned: "Not Owned",
      settings: "Settings",
      settingsSaloon: "Game Settings",
      sidebarQuote: '"A good gun and a fast hand — out here, you need both."',
    },
    actions: {
      startDuel: "Ride Out (Start Game)",
      nextDuel: "Next Round",
      toUpgrade: "Skill Tree & Gunsmith",
      trainSaloon: "Saloon (Perm Upgrades)",
      trainSaloonWithPoints: (points: number) => `Saloon Upgrades (Badges: ${points})`,
      backToTitle: "Back to Title",
      backToTitleFromSaloon: "Back to Title",
      payInvoice: "Pay Sheriff's Tax",
      bankruptSurrender: "Can't Pay (Game Over)",
      choosePassive: "Select",
      equipWeapon: "Equip",
      equipped: "Equipped",
      buyWeapon: "Buy",
      mastered: "Maxed",
      trainCost: (cost: number | string) => `Upgrade (★ ${cost})`,
      upgradeSkill: (cost: string) => `Upgrade (${cost})`,
    },
    titleScreen: {
      mainTitleTop: "QUICK-DRAW",
      mainTitleBottom: "BOUNTY HUNTER",
      tagline: `${ROUND_CONFIG.baseDuration}-Second Duels × Gunsmithing × Sheriff's Tax`,
      posterQuote: '"This town ain\'t big enough for the both of us."',
      heldBadges: (points: number) => `★ Star Badges: ${points}`,
      careerRecord: (highestRound: number, totalRuns: number) =>
        `Best: Round ${highestRound}   |   Total Runs: ${totalRuns}`,
      introQuote: '"When the wind stops... draw."',
    },
    resultScreen: {
      currentCash: "Current Cash",
      targetsHit: (count: number) => `Targets Hit: ${count}`,
      unlockSectionTitle: "📜 Next Wanted Target Unlock",
      nextTargetProgress: (name: string, pct: number) => `Next Target: [${name}] (${pct}%)`,
      totalWantedPoints: (cur: string, req: string) => `Wanted Points: ${cur} / ${req} pt`,
      allTargetsUnlocked: `★ All ${TARGET_UNLOCK_SEQUENCE.length} Wanted Targets Unlocked! ★`,
      unlockPopupBanner: "★ NEW WANTED TARGET! ★",
      unlockPopupBody: (names: string) => `New target ${names} now appears!`,
      unlockPopupClose: "(Tap to close)",
    },
    records: {
      gameOverTitle: "💀 GAME OVER 💀",
      gameOverQuote: '"No name needed on my headstone... Next time I\'ll draw faster."',
      clearSubtitle: `All ${TARGET_UNLOCK_SEQUENCE.length} Wanted Targets unlocked — you conquered the Frontier!\n"This town ain't big enough for me... Onto the next horizon."`,
      roundReached: "Round Reached",
      roundCleared: "Cleared at Round",
      invoicesPaidCount: "Taxes Paid",
      countValue: (n: number) => `${n}`,
      totalBountyEarned: "Total Bounty Earned",
      totalTaxesPaid: "Total Taxes Paid",
      totalTargetsHit: "Total Targets Hit",
      targetsHitValue: (n: number) => `${n}`,
      targetsUnlocked: "Targets Unlocked",
      targetsUnlockedValue: (cur: number, total: number) => `${cur} / ${total}`,
      gunsAcquired: "Guns Acquired",
      badgeConversionNote: `★ Earned ${Math.round(INVOICE_CONFIG.permanentPointRate * 100)}% of Total Taxes Paid as Star Badges! ★`,
      badgeGainedSummary: (gained: number, total: number) =>
        `★ +${gained} Earned! (Total Held: ${total})`,
    },
    skillTreeUi: {
      locked: "Locked",
      maxBadge: "★ MAX",
      noEffectYet: "Current +0",
      maxLevelReached: "★ Max Level Reached",
      prerequisite: (name: string, level: number) => `Requires: ${name} Lv.${level}`,
      prereqUnmet: "Requires: Locked",
      virtualStick: "Navigation Stick",
      moveLeft: "Move Left",
      moveUp: "Move Up",
      moveDown: "Move Down",
      moveRight: "Move Right",
    },
    gunsmithUi: {
      statLine1: (dmg: number, interval: string, rps: string) =>
        `DMG: ${dmg}  |  Fire Interval: ${interval}s (${rps}/s)`,
      statLine2: (ammo: number, reload: string) => `Ammo: ${ammo}  |  Reload: ${reload}s`,
      offSuffix: (pct: string) => ` (${pct} OFF)`,
    },
    saloonUi: {
      formatEffect: (id: PermanentUpgradeId, eff: number) => {
        switch (id) {
          case "start_sp":
            return `+$${eff}`;
          case "base_dmg":
            return `DMG +${eff}`;
          case "round_time":
            return `+${eff}s`;
          case "invoice_reduction":
            return `-${eff}%`;
        }
      },
    },
    stats: {
      damage: { label: "Base Gun Damage", subLabel: "Damage", unit: "" },
      critRate: { label: "Critical Hit Chance", subLabel: "Crit %", unit: "%" },
      fireRateReduction: { label: "Fire Interval Reduction", subLabel: "Fire Rate", unit: "%" },
      magazineCapacity: { label: "Ammo Capacity", subLabel: "Ammo", unit: "rds" },
      magazineMultiplier: { label: "Ammo Capacity Bonus", subLabel: "Ammo %", unit: "%" },
      reloadTimeReduction: { label: "Reload Time Reduction", subLabel: "Reload", unit: "%" },
      roundTime: { label: "Round Time Limit", subLabel: "Time Limit", unit: "s" },
      maxTargets: { label: "Max Targets at Once", subLabel: "Max Targets", unit: "" },
      spMultiplier: { label: "Bounty Cash Bonus", subLabel: "Cash %", unit: "%" },
      shopDiscount: { label: "Gunsmith Discount", subLabel: "Discount", unit: "%" },
      timeTargetBonus: { label: "Pocket Watch Bonus", subLabel: "Watch +s", unit: "s" },
      chainDamage: { label: "Dynamite Blast Damage", subLabel: "Blast %", unit: "%" },
      targetRespawnRate: { label: "Target Respawn Rate", subLabel: "Respawn %", unit: "%" },
    },
    weapons: {
      handgun: {
        name: "Peacemaker",
        description: `Reliable ${WEAPONS.handgun.magazineSize}-shot revolver with quick reloads and slightly wider lead bullets.`,
      },
      rifle: {
        name: "Winchester Rifle",
        description: `Rapid-fire lever-action repeater with a ${WEAPONS.rifle.magazineSize}-round tube magazine to overwhelm outlaws.`,
      },
      sniper: {
        name: "Sharps Buffalo Rifle",
        description:
          "Fires ultra-fast, oversized heavy slugs that shatter armor and supercharge Dynamite blasts.",
      },
    },
    targets: {
      standard: {
        name: "Outlaw",
        description: "Low-HP standard target. Just +1 Damage lets you drop them in one shot.",
      },
      hard: {
        name: "Ironclad Bandit",
        description: "Armored target with high HP and a hefty bounty.",
      },
      gold: {
        name: "Golden Desperado",
        description: "Legendary outlaw of the Frontier. Unlock this bounty to conquer the West!",
      },
      electric: {
        name: "Dynamite Barrel",
        description:
          "Explodes when shot, dealing blast damage scaled by the killing shot to all targets.",
      },
      small: {
        name: "Quick-Draw Kid",
        description: "Small and quick to flee, but pays a handsome bounty.",
      },
      time: {
        name: "Pocket Watch",
        description: "Adds extra seconds to the round timer when destroyed.",
      },
    },
    skills: {
      damage_base: {
        name: "Lead Power",
        description: "Increases base damage of all guns.",
      },
      fire_rate: {
        name: "Rapid Draw",
        description: "Reduces firing interval for faster shots.",
      },
      max_targets: {
        name: "More Targets",
        description: "Increases the maximum number of simultaneous targets.",
      },
      crit_rate: {
        name: "Deadeye Crit",
        description: `Increases critical hit chance (${COMBAT_CONFIG.critMultiplier}x damage).`,
      },
      chain_damage: {
        name: "Dynamite Blast",
        description: "Boosts chain explosion damage from Dynamite Barrels.",
      },
      round_time: {
        name: "Extra Time",
        description: "Extends the time limit of each round.",
      },
      time_target_bonus: {
        name: "Watch Bonus",
        description: "Increases bonus time gained from Pocket Watches.",
      },
      magazine_size: {
        name: "Extra Ammo",
        description: "Increases ammo capacity for all guns.",
      },
      reload_speed: {
        name: "Quick Reload",
        description: "Reduces reload time when out of ammo.",
      },
      sp_multiplier: {
        name: "Bounty Boost",
        description: "Increases cash ($) earned from destroying targets.",
      },
      shop_discount: {
        name: "Gunsmith Deal",
        description: "Discounts weapon prices at the Gunsmith.",
      },
      magazine_mult: {
        name: "Custom Bandolier",
        description: "Multiplies ammo capacity by a large percentage for sustained barrages.",
      },
    },
    passives: {
      sp_bonus: {
        name: "Bounty Hunter's Nose",
        description: `Cash ($) Earned +${Math.round(PASSIVES.sp_bonus.effectPerStack * 100)}%`,
      },
      dmg_bonus: {
        name: "Heavy Lead Rounds",
        description: `Base Gun Damage +${Math.round(PASSIVES.dmg_bonus.effectPerStack * 100)}%`,
      },
      time_bonus: {
        name: "Quick-Draw Focus",
        description: `Round Time Limit +${PASSIVES.time_bonus.effectPerStack.toFixed(1)}s`,
      },
      target_bonus: {
        name: "Mass Wanted Posters",
        description: `Simultaneous Targets +${PASSIVES.target_bonus.effectPerStack}`,
      },
      crit_bonus: {
        name: "Reaper's Eye",
        description: `Critical Hit Chance +${Math.round(PASSIVES.crit_bonus.effectPerStack * 100)}%`,
      },
    },
    permanentUpgrades: {
      start_sp: {
        name: "Grubstake Pouch",
        description: "Increases starting Cash ($) on each new run.",
      },
      base_dmg: {
        name: "Gunslinger's Grit",
        description: "Increases base gun damage from the start of a run.",
      },
      round_time: {
        name: "Deadeye Focus",
        description: "Extends the round time limit.",
      },
      invoice_reduction: {
        name: "Sheriff's Bribe",
        description: `Reduces the Sheriff's Tax collected every ${INVOICE_CONFIG.intervalRounds} rounds.`,
      },
    },
    quotes: [
      '"This town ain\'t big enough for the both of us."',
      '"Lead don\'t lie."',
      '"Get two coffins ready."',
      '"There\'s no second place in a quick draw."',
      '"We settle this before sundown."',
      '"When the wind stops... draw."',
      '"No outlaw rides away from my sights."',
      '"Dead men tell no tales — and pay good bounty."',
    ],
    stageSubtitles: [
      "RED DUST GULCH",
      "OLD SALOON FRONT",
      "GHOST TRAIN DEPOT",
      "CACTUS CANYON",
      "HIGH NOON SQUARE",
    ],
    sheriffStageSubtitle: "SHERIFF'S RECKONING",
    ui: {
      language: "Language / 言語",
      languageJa: "日本語",
      languageEn: "English",
      fullscreen: "Display Mode",
      fullscreenOn: "Fullscreen Active",
      fullscreenOff: "Windowed",
      fullscreenToggle: "Fullscreen",
      fullscreenExit: "Exit Fullscreen",
      cursorFollow: "Follow Mouse Cursor",
      cursorFollowDescOn: "Aim directly at the mouse cursor",
      cursorFollowDescOff: "Aim with vertical drag lever",
      mobileDisabled: "Mobile (Disabled)",
      pcCursorFollowActive: "Disabled (Cursor Follow ON)",
      joystickPosition: "Aim Lever Position",
      joystickDynamic: "Dynamic (Touch Point)",
      joystickFixed: "Fixed (Bottom)",
      bgmVolume: "Music Volume (Whistle & Guitar)",
      seVolume: "SFX Volume (Gunshots, Spurs & Reload)",
    },
  },
};
