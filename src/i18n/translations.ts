/**
 * i18n 多言語対応システム（日本語 / 英語）
 * 西部劇（マカロニ・ウェスタン）世界観のトーン＆マナーを保持
 */

export type Locale = "ja" | "en";

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
    roundSuffix: (round: number) => string;
    roundHeader: (round: number) => string;
    invoiceTitle: (count: number) => string;
    invoiceTerm: string;
    invoiceShort: string;
    invoiceDueDesc: string;
  };
  combat: {
    targetName: string;
    targetUnit: string;
    draw: string;
    roundEnd: string;
    timeRemaining: string;
    timeExtension: string;
    lockOnAiming: string;
    lockOnDeadeye: string;
    lockOnStandoff: string;
    critHit: string;
    autoFireAim: string;
    cylinderIconSub: string;
    cylinderSpinning: string;
    cylinderReserveAmmo: (extra: number) => string;
    dragAimHint: string;
    autoFireHint: string;
    keyboardAimHint: string;
  };
  facilities: {
    skills: string;
    skillsTree: string;
    weaponsShop: string;
    weaponsShopSub: string;
    saloon: string;
    saloonSub: string;
    passivesTitle: string;
    passivesSub: string;
    settings: string;
    settingsSaloon: string;
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
  };
  stats: {
    damage: { label: string; subLabel: string; unit: string };
    critRate: { label: string; subLabel: string; unit: string };
    fireRateReduction: { label: string; subLabel: string; unit: string };
    magazineCapacity: { label: string; subLabel: string; unit: string };
    magazineMultiplier: { label: string; subLabel: string; unit: string };
    reloadTimeReduction: { label: string; subLabel: string; unit: string };
    roundTime: { label: string; subLabel: string; unit: string };
    maxTargets: { label: string; subLabel: string; unit: string };
    spMultiplier: { label: string; subLabel: string; unit: string };
    targetPointMultiplier: { label: string; subLabel: string; unit: string };
    shopDiscount: { label: string; subLabel: string; unit: string };
    timeTargetBonus: { label: string; subLabel: string; unit: string };
    chainDamage: { label: string; subLabel: string; unit: string };
  };
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
      bountyScore: "懸賞金評価",
      bountyScoreAbbr: "評価pt",
      metaPoints: "名声バッジ",
      metaPointsAbbr: "名声",
    },
    progression: {
      roundName: (round: number) => `第 ${round} 決闘`,
      roundSuffix: (round: number) => `第${round}決闘後`,
      roundHeader: (round: number) => `第 ${round} 決闘 — 賞金精算`,
      invoiceTitle: (count: number) => `保安官の上納金 (第 ${count} 回)`,
      invoiceTerm: "保安官の上納金",
      invoiceShort: "上納金",
      invoiceDueDesc:
        "5決闘ごとの縄張り代・上納金の徴収書だ。\n支払えなければ、この町から追放（ゲームオーバー）となる。",
    },
    combat: {
      targetName: "賞金首",
      targetUnit: "人",
      draw: "DRAW!",
      roundEnd: "決着！",
      timeRemaining: "制限時間",
      timeExtension: "刻限延長",
      lockOnAiming: "AIMING...",
      lockOnDeadeye: "DEADEYE",
      lockOnStandoff: "STANDOFF...",
      critHit: "DEADEYE!",
      autoFireAim: "自動早撃ち照準",
      cylinderIconSub: "6連シリンダー",
      cylinderSpinning: "装填中",
      cylinderReserveAmmo: (extra: number) => `予備弾帯 +${extra}発`,
      dragAimHint: "🤠 画面のどこでもタッチ＆上下ドラッグで照準！（タップで正面へ）",
      autoFireHint: "🔫 賞金首を射線に捉えた瞬間、自動で早撃ち発砲！",
      keyboardAimHint: "（PC: A / D または 矢印キー でも照準調整可能）",
    },
    facilities: {
      skills: "早撃ち技能",
      skillsTree: "早撃ち技能ツリー",
      weaponsShop: "銃砲店",
      weaponsShopSub: "GUNSMITH",
      saloon: "酒場の鍛錬",
      saloonSub: "ガンマンの流儀",
      passivesTitle: "ガンマンの心得",
      passivesSub: "保安官の黙認 — ガンマンの心得",
      settings: "設定",
      settingsSaloon: "酒場の設定",
    },
    actions: {
      startDuel: "荒野へ繰り出す（決闘開始）",
      nextDuel: "次の決闘場へ進む",
      toUpgrade: "早撃ち技能 ＆ 銃砲店へ",
      trainSaloon: "酒場で鍛える（名声強化）",
      trainSaloonWithPoints: (points: number) => `酒場で鍛える（名声: ${points}）`,
      backToTitle: "タイトルへ戻る",
      backToTitleFromSaloon: "酒場の表へ出る（タイトル）",
      payInvoice: "上納金を支払う",
      bankruptSurrender: "支払い不能（荒野へ追放）",
      choosePassive: "選び取る",
      equipWeapon: "愛銃に持ち替える",
      equipped: "ホルスターに装備中",
      buyWeapon: "買い取る",
      mastered: "習得完了",
      trainCost: (cost: number | string) => `鍛える (★ ${cost})`,
    },
    stats: {
      damage: { label: "基礎威力", subLabel: "攻撃力", unit: "威力" },
      critRate: { label: "会心率 (急所撃ち)", subLabel: "急所率", unit: "%" },
      fireRateReduction: { label: "早撃ち間隔短縮", subLabel: "連射速度", unit: "%" },
      magazineCapacity: { label: "装填弾数", subLabel: "シリンダー容量", unit: "発" },
      magazineMultiplier: { label: "装填増加率", subLabel: "弾数倍率", unit: "%" },
      reloadTimeReduction: { label: "再装填時間短縮", subLabel: "リロード速度", unit: "%" },
      roundTime: { label: "決闘の制限時間", subLabel: "ラウンド時間", unit: "秒" },
      maxTargets: { label: "同時出現賞金首", subLabel: "出現数", unit: "人" },
      spMultiplier: { label: "獲得賞金倍率", subLabel: "獲得賞金UP", unit: "%" },
      targetPointMultiplier: { label: "懸賞金評価倍率", subLabel: "手配書進捗UP", unit: "%" },
      shopDiscount: { label: "銃砲店割引", subLabel: "武器割引", unit: "%" },
      timeTargetBonus: { label: "懐中時計延長量", subLabel: "時計追加秒", unit: "秒" },
      chainDamage: { label: "誘爆ダメージ倍率", subLabel: "爆発連鎖", unit: "%" },
    },
    ui: {
      language: "言語 / Language",
      languageJa: "日本語",
      languageEn: "English",
      fullscreen: "画面表示",
      fullscreenOn: "全画面表示中",
      fullscreenOff: "通常表示",
      fullscreenToggle: "全画面にする",
      fullscreenExit: "全画面解除",
      cursorFollow: "カーソルを追従",
      cursorFollowDescOn: "マウス位置へ直接エイム",
      cursorFollowDescOff: "スライダー操作を使用",
      mobileDisabled: "スマホ版（無効）",
      pcCursorFollowActive: "無効（カーソル追従中）",
      joystickPosition: "レバー操作位置",
      joystickDynamic: "追従（Dynamic）",
      joystickFixed: "固定（Fixed）",
      bgmVolume: "BGM 音量（口笛・ギター）",
      seVolume: "効果音（銃声・拍車・シリンダー）",
    },
  },

  en: {
    currency: {
      symbol: "$",
      moneyName: "Cash",
      earnedMoney: "Bounty Won",
      bountyScore: "Bounty Rep",
      bountyScoreAbbr: "Rep pt",
      metaPoints: "Sheriff Badges",
      metaPointsAbbr: "Badges",
    },
    progression: {
      roundName: (round: number) => `Duel #${round}`,
      roundSuffix: (round: number) => `After Duel #${round}`,
      roundHeader: (round: number) => `Duel #${round} — Bounty Payout`,
      invoiceTitle: (count: number) => `Sheriff's Tax (Tribute #${count})`,
      invoiceTerm: "Sheriff's Cut",
      invoiceShort: "Tribute",
      invoiceDueDesc:
        "Territory tribute due every 5 duels.\nIf you cannot pay, you will be run out of town (Game Over).",
    },
    combat: {
      targetName: "Outlaws",
      targetUnit: "heads",
      draw: "DRAW!",
      roundEnd: "SHOWDOWN OVER!",
      timeRemaining: "Time Limit",
      timeExtension: "High Noon Bonus",
      lockOnAiming: "AIMING...",
      lockOnDeadeye: "DEADEYE",
      lockOnStandoff: "STANDOFF...",
      critHit: "DEADEYE!",
      autoFireAim: "Quick-Draw Auto Aim",
      cylinderIconSub: "6-Shot Cylinder",
      cylinderSpinning: "Reloading",
      cylinderReserveAmmo: (extra: number) => `Bandolier +${extra} rounds`,
      dragAimHint: "🤠 Touch & drag up/down anywhere to aim! (Tap to center)",
      autoFireHint: "🔫 Instant quick-draw fire the moment an outlaw enters your sights!",
      keyboardAimHint: "(PC: Use A / D or Arrow Keys to aim)",
    },
    facilities: {
      skills: "Gunslinger Skills",
      skillsTree: "Gunslinger Skill Tree",
      weaponsShop: "Gunsmith",
      weaponsShopSub: "GUNSMITH",
      saloon: "Saloon Training",
      saloonSub: "Outlaw Creed",
      passivesTitle: "Gunslinger Creed",
      passivesSub: "Sheriff's Blind Eye — Gunslinger Creed",
      settings: "Settings",
      settingsSaloon: "Saloon Settings",
    },
    actions: {
      startDuel: "Ride into Frontier (Start Duel)",
      nextDuel: "Next Showdown",
      toUpgrade: "Skills & Gunsmith",
      trainSaloon: "Saloon Training (Honor Badges)",
      trainSaloonWithPoints: (points: number) => `Saloon Training (Badges: ${points})`,
      backToTitle: "Back to Title",
      backToTitleFromSaloon: "Leave Saloon (Title)",
      payInvoice: "Pay Sheriff's Cut",
      bankruptSurrender: "Can't Pay (Exiled to Badlands)",
      choosePassive: "Claim Creed",
      equipWeapon: "Equip as Sidearm",
      equipped: "Holstered & Ready",
      buyWeapon: "Purchase",
      mastered: "Mastered",
      trainCost: (cost: number | string) => `Train (★ ${cost})`,
    },
    stats: {
      damage: { label: "Base Firepower", subLabel: "Damage", unit: "dmg" },
      critRate: { label: "Deadeye Crit Rate", subLabel: "Crit %", unit: "%" },
      fireRateReduction: { label: "Quick-Draw Speed", subLabel: "Fire Rate", unit: "%" },
      magazineCapacity: { label: "Cylinder Ammo", subLabel: "Mag Size", unit: "rds" },
      magazineMultiplier: { label: "Ammo Expansion %", subLabel: "Mag %", unit: "%" },
      reloadTimeReduction: { label: "Fast Reload Speed", subLabel: "Reload %", unit: "%" },
      roundTime: { label: "High Noon Time", subLabel: "Time Limit", unit: "s" },
      maxTargets: { label: "Simultaneous Outlaws", subLabel: "Max Outlaws", unit: "" },
      spMultiplier: { label: "Bounty Reward Multiplier", subLabel: "Bounty %", unit: "%" },
      targetPointMultiplier: { label: "Bounty Rep Efficiency", subLabel: "Rep %", unit: "%" },
      shopDiscount: { label: "Gunsmith Discount", subLabel: "Discount", unit: "%" },
      timeTargetBonus: { label: "Pocket Watch Extension", subLabel: "Time +s", unit: "s" },
      chainDamage: { label: "Dynamite Chain Damage", subLabel: "Explosion %", unit: "%" },
    },
    ui: {
      language: "Language / 言語",
      languageJa: "日本語",
      languageEn: "English",
      fullscreen: "Display Mode",
      fullscreenOn: "Fullscreen Active",
      fullscreenOff: "Standard Window",
      fullscreenToggle: "Go Fullscreen",
      fullscreenExit: "Exit Fullscreen",
      cursorFollow: "Follow Mouse Cursor",
      cursorFollowDescOn: "Direct mouse aiming",
      cursorFollowDescOff: "Use slider lever control",
      mobileDisabled: "Mobile (Disabled)",
      pcCursorFollowActive: "Disabled (Following Cursor)",
      joystickPosition: "Lever Position",
      joystickDynamic: "Dynamic (Under Finger)",
      joystickFixed: "Fixed (Bottom)",
      bgmVolume: "Music Volume (Whistle & Guitar)",
      seVolume: "Sound Effects (Gunshot & Spurs)",
    },
  },
};
