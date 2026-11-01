import type Phaser from "phaser";

import { useGameSettings } from "../stores/useGameSettings";

export type SynthSoundType =
  | "laser"
  | "shoot"
  | "explosion"
  | "hit"
  | "ricochet"
  | "click"
  | "spur"
  | "bell"
  | "wind"
  | "gameover"
  | "countdown"
  | "start"
  | "reload"
  | "reload_insert"
  | "reload_complete";

export interface SoundPlayOptions {
  volume?: number; // 個別音量倍率 (0.0 - 1.0, デフォルト: 1.0)
  detune?: number; // ピッチの揺らぎ (-1200 - 1200, デフォルト: 0)
  rate?: number; // 再生速度
}

// Dマイナー / Aフリジアンの西部劇音階ヘルパー (Hz)
const NOTE_HZ: Record<string, number> = {
  D2: 73.42,
  E2: 82.41,
  F2: 87.31,
  G2: 98.0,
  A2: 110.0,
  Bb2: 116.54,
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.0,
  A3: 220.0,
  Bb3: 233.08,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  Bb4: 466.16,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880.0,
};

export class AudioManager {
  private static instance: AudioManager;
  private game?: Phaser.Game;
  private currentBgmKey: string | null = null;
  private currentBgm: Phaser.Sound.BaseSound | null = null;
  private unsubscribeSettings?: () => void;

  // プロシージャル西部劇BGMエンジン用ノード群
  private synthBgmMasterGain: GainNode | null = null;
  private synthWindSource: AudioBufferSourceNode | null = null;
  private synthWindLfo: OscillatorNode | null = null;
  private synthSequencerTimer: number | null = null;
  private synthStepIndex = 0;
  private isSynthBgmRunning = false;
  private isBgmPaused = false;

  // SE多重発音を防止するクールダウン管理（キー -> 最終再生時刻ms）
  private seCooldowns: Map<string, number> = new Map();
  private readonly defaultCooldownMs = 38;

  // AudioContextアンロック済みフラグ
  private isUnlocked = false;

  private constructor() {
    this.setupGlobalUnlockListeners();
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /**
   * Phaserゲームインスタンスとの接続 & 設定ストア購読
   */
  public init(game: Phaser.Game): void {
    this.game = game;

    // 設定ストアの音量・ミュート変更をリアルタイム購読
    this.unsubscribeSettings = useGameSettings.subscribe((state) => {
      this.syncBgmVolume(state.bgmVolume, state.bgmMuted);
    });

    // 初期音量の同期
    const state = useGameSettings.getState();
    this.syncBgmVolume(state.bgmVolume, state.bgmMuted);
  }

  /**
   * ブラウザの Autoplay Policy（自動再生制限）を解除するリスナー
   */
  private setupGlobalUnlockListeners(): void {
    if (typeof window === "undefined") return;

    const unlockHandler = () => {
      this.unlockAudioContext();
    };

    window.addEventListener("pointerdown", unlockHandler, { passive: true });
    window.addEventListener("keydown", unlockHandler, { passive: true });
    window.addEventListener("touchend", unlockHandler, { passive: true });
  }

  /**
   * AudioContext のアンロック実行
   */
  public unlockAudioContext(): void {
    const audioCtx = this.getAudioContext() || this.createStandaloneContext();
    if (!audioCtx) return;

    if (audioCtx.state === "suspended") {
      audioCtx
        .resume()
        .then(() => {
          this.isUnlocked = true;
          this.ensureSynthBgmStarted();
        })
        .catch(() => {});
    } else if (!this.isUnlocked) {
      this.isUnlocked = true;
      this.ensureSynthBgmStarted();
    } else {
      this.ensureSynthBgmStarted();
    }
  }

  private ensureSynthBgmStarted(): void {
    if (this.currentBgmKey && !this.currentBgm && !this.isSynthBgmRunning && !this.isBgmPaused) {
      this.startProceduralWesternBGM(this.currentBgmKey);
    }
  }

  private getAudioContext(): AudioContext | null {
    if (!this.game) return null;
    const soundManager = this.game.sound;
    if (soundManager && "context" in soundManager) {
      return (soundManager as unknown as { context: AudioContext }).context;
    }
    return null;
  }

  // ==========================================
  // BGM 管理（モリコーネ風プロシージャル西部劇BGM対応）
  // ==========================================

  /**
   * BGMの再生（すでに同じ曲が流れている場合は再開のみ）
   * キー例: "western_town" (哀愁の口笛・ギター・ハーモニカ・鐘), "western_duel" (緊迫の早撃ちギター)
   */
  public playBGM(key: string, loop = true): void {
    if (this.currentBgmKey === key && (this.currentBgm || this.isSynthBgmRunning)) {
      if (this.isBgmPaused) {
        this.resumeBGM();
      }
      return;
    }

    // 前のBGMを停止
    this.stopBGM();
    this.currentBgmKey = key;
    this.isBgmPaused = false;

    const settings = useGameSettings.getState();
    const effectiveVolume = settings.bgmMuted ? 0 : settings.bgmVolume / 100;

    // 1. 実アセットが存在する場合
    if (this.game && this.game.cache.audio.has(key)) {
      this.currentBgm = this.game.sound.add(key, {
        loop,
        volume: effectiveVolume,
      });
      this.currentBgm.play();
      return;
    }

    // 2. プロシージャル西部劇BGMを起動（未アンロックの場合は最初のタップ時に自動開始）
    const audioCtx = this.getAudioContext() || this.createStandaloneContext();
    if (audioCtx && audioCtx.state === "running") {
      this.startProceduralWesternBGM(key);
    }
  }

  /**
   * 決闘直前の「静寂の間」を作る演出
   * BGMをスッと消し、乾いた風の音だけを残して決闘の緊張感を高める
   */
  public enterDuelSilence(): void {
    const audioCtx = this.getAudioContext() || this.createStandaloneContext();
    if (this.synthBgmMasterGain && audioCtx) {
      const now = audioCtx.currentTime;
      this.synthBgmMasterGain.gain.cancelScheduledValues(now);
      this.synthBgmMasterGain.gain.setValueAtTime(this.synthBgmMasterGain.gain.value, now);
      this.synthBgmMasterGain.gain.linearRampToValueAtTime(0.0001, now + 0.18);
    }
    this.stopBGM();
    this.playSynthSE("wind", 0.55);
  }

  /**
   * BGMの停止
   */
  public stopBGM(): void {
    if (this.currentBgm) {
      this.currentBgm.stop();
      this.currentBgm.destroy();
      this.currentBgm = null;
    }
    this.stopProceduralWesternBGM();
    this.currentBgmKey = null;
    this.isBgmPaused = false;
  }

  /**
   * BGMのポーズ / 再開
   */
  public pauseBGM(): void {
    this.isBgmPaused = true;
    if (this.currentBgm && this.currentBgm.isPlaying) {
      this.currentBgm.pause();
    }
    if (this.synthBgmMasterGain) {
      const ctx = this.getAudioContext() || this.fallbackCtx;
      if (ctx) {
        this.synthBgmMasterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      }
    }
  }

  public resumeBGM(): void {
    this.isBgmPaused = false;
    if (this.currentBgm && this.currentBgm.isPaused) {
      this.currentBgm.resume();
    }
    const state = useGameSettings.getState();
    this.syncBgmVolume(state.bgmVolume, state.bgmMuted);
    this.ensureSynthBgmStarted();
  }

  /**
   * 再生中のBGM音量を設定ストアと同期
   */
  private syncBgmVolume(volume: number, muted: boolean): void {
    const effectiveVolume = muted || this.isBgmPaused ? 0 : volume / 100;
    if (this.currentBgm && "setVolume" in this.currentBgm) {
      (this.currentBgm as Phaser.Sound.WebAudioSound).setVolume(effectiveVolume);
    }
    if (this.synthBgmMasterGain) {
      const ctx = this.getAudioContext() || this.fallbackCtx;
      if (ctx) {
        this.synthBgmMasterGain.gain.setTargetAtTime(effectiveVolume * 0.42, ctx.currentTime, 0.06);
      }
    }
  }

  // ==========================================
  // エンニオ・モリコーネ風 プロシージャル西部劇BGM
  // ==========================================

  private startProceduralWesternBGM(mode: string): void {
    this.stopProceduralWesternBGM();

    const audioCtx = this.getAudioContext() || this.createStandaloneContext();
    if (!audioCtx || typeof window === "undefined") return;

    const settings = useGameSettings.getState();
    const effectiveVolume = settings.bgmMuted || this.isBgmPaused ? 0 : settings.bgmVolume / 100;

    const master = audioCtx.createGain();
    master.gain.setValueAtTime(0.001, audioCtx.currentTime);
    master.gain.linearRampToValueAtTime(effectiveVolume * 0.42, audioCtx.currentTime + 0.5);
    master.connect(audioCtx.destination);
    this.synthBgmMasterGain = master;

    // 1. 常時流れる荒野の風音レイヤー（ピンク寄りのバンドパスノイズ + ゆらぎLFO）
    const windLen = audioCtx.sampleRate * 4;
    const windBuf = audioCtx.createBuffer(1, windLen, audioCtx.sampleRate);
    const windData = windBuf.getChannelData(0);
    let b0 = 0,
      b1 = 0,
      b2 = 0;
    for (let i = 0; i < windLen; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.95 * b2 + white * 0.048;
      windData[i] = (b0 + b1 + b2 + white * 0.015) * 0.9;
    }

    const windSrc = audioCtx.createBufferSource();
    windSrc.buffer = windBuf;
    windSrc.loop = true;

    const windFilter = audioCtx.createBiquadFilter();
    windFilter.type = "bandpass";
    windFilter.frequency.setValueAtTime(420, audioCtx.currentTime);
    windFilter.Q.setValueAtTime(1.8, audioCtx.currentTime);

    const windLfo = audioCtx.createOscillator();
    const windLfoGain = audioCtx.createGain();
    windLfo.type = "sine";
    windLfo.frequency.setValueAtTime(0.14, audioCtx.currentTime);
    windLfoGain.gain.setValueAtTime(190, audioCtx.currentTime);
    windLfo.connect(windLfoGain);
    windLfoGain.connect(windFilter.frequency);

    const windGain = audioCtx.createGain();
    windGain.gain.setValueAtTime(0.24, audioCtx.currentTime);

    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);

    windSrc.start();
    windLfo.start();
    this.synthWindSource = windSrc;
    this.synthWindLfo = windLfo;

    // 2. シーケンサー：乾いたギター・口笛・ハーモニカ・遠くの鐘
    const isDuel = mode === "western_duel";
    const stepMs = isDuel ? 240 : 380; // 8分音符刻み
    this.synthStepIndex = 0;
    this.isSynthBgmRunning = true;

    // 32ステップ（4小節）ループ
    const tick = () => {
      if (!this.isSynthBgmRunning || !this.synthBgmMasterGain) return;
      const ctx = this.getAudioContext() || this.fallbackCtx;
      if (!ctx || ctx.state !== "running") return;

      const step = this.synthStepIndex % 32;
      const now = ctx.currentTime;

      if (isDuel) {
        this.scheduleDuelStep(ctx, this.synthBgmMasterGain, step, now);
      } else {
        this.scheduleTownMorriconeStep(ctx, this.synthBgmMasterGain, step, now);
      }

      this.synthStepIndex++;
    };

    tick();
    this.synthSequencerTimer = window.setInterval(tick, stepMs);
  }

  /**
   * 哀愁のスパゲッティ・ウェスタン楽曲（タイトル・リザルト・酒場・強化画面用）
   * 遠くの鐘、乾いたギターアルペジオ、口笛の主旋律、ハーモニカの応答
   */
  private scheduleTownMorriconeStep(
    ctx: AudioContext,
    dest: AudioNode,
    step: number,
    now: number,
  ): void {
    // 小節頭 (Dm -> Bb -> Gm -> A7)
    // 遠くの教会の鐘 (step 0 と step 16)
    if (step === 0) {
      this.playDistantBell(ctx, dest, NOTE_HZ.D4, now, 0.22);
    } else if (step === 16) {
      this.playDistantBell(ctx, dest, NOTE_HZ.A3, now, 0.18);
    }

    // 乾いたトゥワンギー・ギターのアルペジオ (Dm | Bb | Gm | A)
    const guitarPattern: (string | null)[] = [
      // Bar 1: Dm
      "D2",
      "A2",
      "D3",
      "F3",
      "E3",
      "D3",
      "A2",
      null,
      // Bar 2: Bb -> F
      "Bb2",
      "F2",
      "Bb2",
      "D3",
      "C3",
      "Bb2",
      "F2",
      null,
      // Bar 3: Gm
      "G2",
      "D3",
      "G3",
      "Bb3",
      "A3",
      "G3",
      "D3",
      null,
      // Bar 4: A7 (フリジアン終止)
      "A2",
      "E3",
      "A3",
      "Bb3",
      "A3",
      "G3",
      "E3",
      "A2",
    ];
    const gNote = guitarPattern[step];
    if (gNote && NOTE_HZ[gNote]) {
      const accent = step % 8 === 0 ? 0.34 : 0.22;
      this.playTwangGuitar(ctx, dest, NOTE_HZ[gNote], now, 0.42, accent);
    }

    // 口笛メロディ（前半2小節：孤独な5度跳躍とポルタメント）
    if (step === 2) {
      this.playLonelyWhistle(ctx, dest, NOTE_HZ.A4, NOTE_HZ.D5, now, 0.68, 0.28);
    } else if (step === 5) {
      this.playLonelyWhistle(ctx, dest, NOTE_HZ.F5, NOTE_HZ.E5, now, 0.35, 0.22);
    } else if (step === 6) {
      this.playLonelyWhistle(ctx, dest, NOTE_HZ.D5, NOTE_HZ.A4, now, 0.55, 0.24);
    } else if (step === 10) {
      this.playLonelyWhistle(ctx, dest, NOTE_HZ.Bb4, NOTE_HZ.D5, now, 0.52, 0.25);
    } else if (step === 12) {
      this.playLonelyWhistle(ctx, dest, NOTE_HZ.C5, NOTE_HZ.A4, now, 0.85, 0.24);
    }

    // ハーモニカの応答フレーズ（後半2小節：乾いた哀愁コード＆ベンド）
    if (step === 18) {
      this.playWesternHarmonica(ctx, dest, NOTE_HZ.G4, NOTE_HZ.Bb4, now, 0.72, 0.18);
    } else if (step === 21) {
      this.playWesternHarmonica(ctx, dest, NOTE_HZ.A4, NOTE_HZ.G4, now, 0.55, 0.16);
    } else if (step === 25) {
      this.playWesternHarmonica(ctx, dest, NOTE_HZ.E4, NOTE_HZ.F4, now, 0.65, 0.19);
    } else if (step === 28) {
      this.playWesternHarmonica(ctx, dest, NOTE_HZ.E4, NOTE_HZ.D4, now, 0.95, 0.2);
    }
  }

  /**
   * 決闘中（RoundScene playing中）の緊迫したギャロッピング・ギターBGM
   */
  private scheduleDuelStep(ctx: AudioContext, dest: AudioNode, step: number, now: number): void {
    // 16ステップ単位の駆けるような低音ギターリフ
    const bassPattern: (string | null)[] = [
      "D2",
      null,
      "D2",
      "D2",
      "A2",
      null,
      "C3",
      "A2",
      "D2",
      null,
      "D2",
      "F2",
      "G2",
      "F2",
      "E2",
      "A2",
      "D2",
      null,
      "D2",
      "D2",
      "Bb2",
      null,
      "A2",
      "G2",
      "A2",
      null,
      "Bb2",
      null,
      "A2",
      null,
      "E2",
      "A2",
    ];
    const bNote = bassPattern[step];
    if (bNote && NOTE_HZ[bNote]) {
      const accent = step % 4 === 0 ? 0.34 : 0.23;
      this.playTwangGuitar(ctx, dest, NOTE_HZ[bNote], now, 0.24, accent);
    }

    // 決闘の口笛モチーフ
    if (step === 4) {
      this.playLonelyWhistle(ctx, dest, NOTE_HZ.A4, NOTE_HZ.D5, now, 0.42, 0.22);
    } else if (step === 7) {
      this.playLonelyWhistle(ctx, dest, NOTE_HZ.C5, NOTE_HZ.D5, now, 0.35, 0.2);
    } else if (step === 20) {
      this.playWesternHarmonica(ctx, dest, NOTE_HZ.Bb4, NOTE_HZ.A4, now, 0.55, 0.17);
    } else if (step === 0) {
      this.playDistantBell(ctx, dest, NOTE_HZ.D4, now, 0.15);
    }
  }

  private playTwangGuitar(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    time: number,
    dur: number,
    vol: number,
  ): void {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    // スプリングリバーブ風の短いスラップバックエコー
    const delay = ctx.createDelay();
    const delayGain = ctx.createGain();
    delay.delayTime.setValueAtTime(0.11, time);
    delayGain.gain.setValueAtTime(0.28, time);

    osc1.type = "sawtooth";
    osc2.type = "triangle";
    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq * 2, time);

    // ピッキング直後に明るく、急速に乾いたトーンへ減衰するフィルター
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(freq * 9, time);
    filter.frequency.exponentialRampToValueAtTime(Math.max(180, freq * 2.2), time + dur * 0.7);
    filter.Q.setValueAtTime(2.4, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    gain.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(dest);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + dur + 0.02);
    osc2.stop(time + dur + 0.02);
  }

  private playLonelyWhistle(
    ctx: AudioContext,
    dest: AudioNode,
    startFreq: number,
    endFreq: number,
    time: number,
    dur: number,
    vol: number,
  ): void {
    const osc = ctx.createOscillator();
    const vib = ctx.createOscillator();
    const vibGain = ctx.createGain();
    const gain = ctx.createGain();
    const echo = ctx.createDelay();
    const echoGain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(endFreq, time + Math.min(0.14, dur * 0.4));

    // 口笛のビブラート
    vib.type = "sine";
    vib.frequency.setValueAtTime(5.6, time);
    vibGain.gain.setValueAtTime(endFreq * 0.014, time);
    vib.connect(vibGain);
    vibGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.045);
    gain.gain.setValueAtTime(vol * 0.85, time + dur * 0.65);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    // 渓谷に響く口笛エコー
    echo.delayTime.setValueAtTime(0.22, time);
    echoGain.gain.setValueAtTime(0.35, time);

    osc.connect(gain);
    gain.connect(dest);
    gain.connect(echo);
    echo.connect(echoGain);
    echoGain.connect(dest);

    osc.start(time);
    vib.start(time);
    osc.stop(time + dur + 0.03);
    vib.stop(time + dur + 0.03);
  }

  private playWesternHarmonica(
    ctx: AudioContext,
    dest: AudioNode,
    startFreq: number,
    endFreq: number,
    time: number,
    dur: number,
    vol: number,
  ): void {
    // 2枚のリードのわずかなデチューンでハーモニカの哀愁を表現
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = "sawtooth";
    osc2.type = "square";
    osc1.frequency.setValueAtTime(startFreq, time);
    osc1.frequency.exponentialRampToValueAtTime(endFreq, time + 0.16);
    osc2.frequency.setValueAtTime(startFreq * 1.004, time);
    osc2.frequency.exponentialRampToValueAtTime(endFreq * 1.004, time + 0.16);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1150, time);
    filter.Q.setValueAtTime(2.2, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.06);
    gain.gain.setValueAtTime(vol * 0.8, time + dur * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + dur + 0.03);
    osc2.stop(time + dur + 0.03);
  }

  private playDistantBell(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    time: number,
    vol: number,
  ): void {
    // 非整数倍音を重ねた教会の鐘の音
    const partials = [
      { ratio: 1.0, amp: 1.0, decay: 1.8 },
      { ratio: 2.0, amp: 0.55, decay: 1.3 },
      { ratio: 2.42, amp: 0.4, decay: 0.95 },
      { ratio: 3.01, amp: 0.25, decay: 0.65 },
    ];

    for (const p of partials) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq * p.ratio, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(vol * p.amp, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0008, time + p.decay);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + p.decay + 0.02);
    }
  }

  private stopProceduralWesternBGM(): void {
    this.isSynthBgmRunning = false;
    if (this.synthSequencerTimer !== null && typeof window !== "undefined") {
      window.clearInterval(this.synthSequencerTimer);
      this.synthSequencerTimer = null;
    }
    try {
      this.synthWindSource?.stop();
      this.synthWindSource?.disconnect();
    } catch {
      // ignore
    }
    try {
      this.synthWindLfo?.stop();
      this.synthWindLfo?.disconnect();
    } catch {
      // ignore
    }
    try {
      this.synthBgmMasterGain?.disconnect();
    } catch {
      // ignore
    }
    this.synthWindSource = null;
    this.synthWindLfo = null;
    this.synthBgmMasterGain = null;
  }

  // ==========================================
  // 効果音（SE）管理
  // ==========================================

  /**
   * SEの再生（アセットがあればPhaserで再生、無ければWeb Audioシンセ音で自動フォールバック）
   */
  public playSE(key: string, options?: SoundPlayOptions): void {
    const settings = useGameSettings.getState();
    if (settings.seMuted || settings.seVolume <= 0) return;

    // クールダウン（同一フレーム・短時間の爆音化防止）判定
    const now = performance.now();
    const lastPlayed = this.seCooldowns.get(key) || 0;
    if (now - lastPlayed < this.defaultCooldownMs) {
      return;
    }
    this.seCooldowns.set(key, now);

    const baseVolume = settings.seVolume / 100;
    const finalVolume = Math.max(0, Math.min(1.0, baseVolume * (options?.volume ?? 1.0)));

    // 1. Phaser のキャッシュに実音声ファイルが存在する場合
    if (this.game && this.game.cache.audio.has(key)) {
      this.game.sound.play(key, {
        volume: finalVolume,
        detune: options?.detune ?? 0,
        rate: options?.rate ?? 1.0,
      });
      return;
    }

    // 2. 実音声アセットが無い場合、西部劇シンセ効果音で再生
    if (this.isSynthSoundType(key)) {
      this.playSynthSE(key, finalVolume);
    }
  }

  private isSynthSoundType(key: string): key is SynthSoundType {
    return [
      "laser",
      "shoot",
      "explosion",
      "hit",
      "ricochet",
      "click",
      "spur",
      "bell",
      "wind",
      "gameover",
      "countdown",
      "start",
      "reload",
      "reload_insert",
      "reload_complete",
    ].includes(key);
  }

  // ==========================================
  // プロシージャル西部劇効果音（Web Audio API）
  // ==========================================

  /**
   * 外部アセット不要のWeb Audio APIプロシージャル西部劇効果音
   */
  public playSynthSE(type: SynthSoundType, volume = 0.8): void {
    const settings = useGameSettings.getState();
    if (settings.seMuted || settings.seVolume <= 0) return;
    const scaledVol = Math.max(0, Math.min(1.0, volume * (settings.seVolume / 100)));
    if (scaledVol <= 0.001) return;

    const audioCtx = this.getAudioContext() || this.createStandaloneContext();
    if (!audioCtx) return;

    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }

    const now = audioCtx.currentTime;

    switch (type) {
      case "shoot": {
        // 重厚で荒野にエコーが響き渡る大口径リボルバー銃声（ズドォン……ォン…）
        const pitchJitter = 1 + (Math.random() * 0.08 - 0.04);

        // 渓谷エコーバス（2段減衰ディレイ + ローパス）
        const echoDelay = audioCtx.createDelay();
        const echoFeedback = audioCtx.createGain();
        const echoFilter = audioCtx.createBiquadFilter();
        const echoOut = audioCtx.createGain();

        echoDelay.delayTime.setValueAtTime(0.135, now);
        echoFeedback.gain.setValueAtTime(0.36, now);
        echoFilter.type = "lowpass";
        echoFilter.frequency.setValueAtTime(880, now);
        echoOut.gain.setValueAtTime(0.42, now);

        echoDelay.connect(echoFilter);
        echoFilter.connect(echoOut);
        echoOut.connect(audioCtx.destination);
        echoFilter.connect(echoFeedback);
        echoFeedback.connect(echoDelay);

        // 1. 黒色火薬の重たい爆裂ノイズ（中低域〜中域の厚み）
        const blastDur = 0.19;
        const bufSize = Math.max(1, Math.floor(audioCtx.sampleRate * blastDur));
        const noiseBuf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
        const noiseData = noiseBuf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
          const env = Math.exp(-i / (bufSize * 0.24));
          noiseData[i] = (Math.random() * 2 - 1) * env;
        }

        const noiseSrc = audioCtx.createBufferSource();
        noiseSrc.buffer = noiseBuf;

        const bodyFilter = audioCtx.createBiquadFilter();
        bodyFilter.type = "lowpass";
        bodyFilter.frequency.setValueAtTime(2200 * pitchJitter, now);
        bodyFilter.frequency.exponentialRampToValueAtTime(260, now + blastDur);

        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(scaledVol * 0.9, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + blastDur);

        noiseSrc.connect(bodyFilter);
        bodyFilter.connect(noiseGain);
        noiseGain.connect(audioCtx.destination);
        noiseGain.connect(echoDelay);
        noiseSrc.start(now);

        // 2. 腹に響く銃身の低音衝撃波（210Hz -> 34Hz）
        const thumpOsc = audioCtx.createOscillator();
        const thumpGain = audioCtx.createGain();
        thumpOsc.type = "triangle";
        thumpOsc.frequency.setValueAtTime(210 * pitchJitter, now);
        thumpOsc.frequency.exponentialRampToValueAtTime(34, now + 0.13);

        thumpGain.gain.setValueAtTime(scaledVol * 0.95, now);
        thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        thumpOsc.connect(thumpGain);
        thumpGain.connect(audioCtx.destination);
        thumpGain.connect(echoDelay);
        thumpOsc.start(now);
        thumpOsc.stop(now + 0.145);

        // 3. 撃鉄（ハンマー）とマズルクラックの鋭い金属アタック
        const snapOsc = audioCtx.createOscillator();
        const snapGain = audioCtx.createGain();
        snapOsc.type = "sawtooth";
        snapOsc.frequency.setValueAtTime(1250 * pitchJitter, now);
        snapOsc.frequency.exponentialRampToValueAtTime(140, now + 0.028);

        snapGain.gain.setValueAtTime(scaledVol * 0.35, now);
        snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

        snapOsc.connect(snapGain);
        snapGain.connect(audioCtx.destination);
        snapOsc.start(now);
        snapOsc.stop(now + 0.032);
        break;
      }

      case "ricochet": {
        // 西部劇名物の跳弾音（ピチューン！）
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1600, now);
        osc.frequency.exponentialRampToValueAtTime(3300, now + 0.045);
        osc.frequency.exponentialRampToValueAtTime(620, now + 0.28);

        gain.gain.setValueAtTime(scaledVol * 0.36, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.29);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      }

      case "spur": {
        // ブーツの拍車（チャリンという乾いた金属鈴の音）
        const freqs = [2950, 4420, 5880];
        freqs.forEach((f, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          const t0 = now + idx * 0.012;
          osc.type = "sine";
          osc.frequency.setValueAtTime(f, t0);
          osc.frequency.exponentialRampToValueAtTime(f * 0.96, t0 + 0.14);

          gain.gain.setValueAtTime(scaledVol * (0.22 - idx * 0.05), t0);
          gain.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.15);

          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(t0);
          osc.stop(t0 + 0.16);
        });

        // ブーツの革底が木の床を踏むコツッという低音
        const stepOsc = audioCtx.createOscillator();
        const stepGain = audioCtx.createGain();
        stepOsc.type = "triangle";
        stepOsc.frequency.setValueAtTime(160, now);
        stepOsc.frequency.exponentialRampToValueAtTime(55, now + 0.045);
        stepGain.gain.setValueAtTime(scaledVol * 0.32, now);
        stepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        stepOsc.connect(stepGain);
        stepGain.connect(audioCtx.destination);
        stepOsc.start(now);
        stepOsc.stop(now + 0.055);
        break;
      }

      case "click": {
        // 木札タップ ＋ 拍車の軽い金属チャリン音
        const woodOsc = audioCtx.createOscillator();
        const woodGain = audioCtx.createGain();
        woodOsc.type = "triangle";
        woodOsc.frequency.setValueAtTime(520, now);
        woodOsc.frequency.exponentialRampToValueAtTime(180, now + 0.032);
        woodGain.gain.setValueAtTime(scaledVol * 0.35, now);
        woodGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
        woodOsc.connect(woodGain);
        woodGain.connect(audioCtx.destination);
        woodOsc.start(now);
        woodOsc.stop(now + 0.038);

        const ringOsc = audioCtx.createOscillator();
        const ringGain = audioCtx.createGain();
        ringOsc.type = "sine";
        ringOsc.frequency.setValueAtTime(3200, now + 0.006);
        ringGain.gain.setValueAtTime(scaledVol * 0.14, now + 0.006);
        ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        ringOsc.connect(ringGain);
        ringGain.connect(audioCtx.destination);
        ringOsc.start(now + 0.006);
        ringOsc.stop(now + 0.085);
        break;
      }

      case "laser": {
        // 賞金首解放・銃器購入時の西部劇ゴールドファンファーレ（金貨＆拍車チャリン＋ブラス和音）
        const chord = [NOTE_HZ.D4, NOTE_HZ.F4, NOTE_HZ.A4, NOTE_HZ.D5];
        chord.forEach((freq, i) => {
          const t0 = now + i * 0.045;
          this.playTwangGuitar(audioCtx, audioCtx.destination, freq, t0, 0.35, scaledVol * 0.28);
        });
        // 金貨チャリン音
        const coinOsc = audioCtx.createOscillator();
        const coinGain = audioCtx.createGain();
        coinOsc.type = "sine";
        coinOsc.frequency.setValueAtTime(2640, now + 0.08);
        coinOsc.frequency.setValueAtTime(3520, now + 0.13);
        coinGain.gain.setValueAtTime(scaledVol * 0.22, now + 0.08);
        coinGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
        coinOsc.connect(coinGain);
        coinGain.connect(audioCtx.destination);
        coinOsc.start(now + 0.08);
        coinOsc.stop(now + 0.33);
        break;
      }

      case "explosion": {
        // 木箱・ダイナマイト樽の粉砕爆発音
        const dur = 0.42;
        const bufferSize = Math.floor(audioCtx.sampleRate * dur);
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.32));
        }

        const whiteNoise = audioCtx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const filter = audioCtx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(820, now);
        filter.frequency.exponentialRampToValueAtTime(65, now + dur);

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(scaledVol * 0.78, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        whiteNoise.start(now);
        break;
      }

      case "hit": {
        // 鉛玉が木の看板・ブリキ的に食い込む重たい着弾音
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(58, now + 0.075);

        gain.gain.setValueAtTime(scaledVol * 0.62, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.085);
        break;
      }

      case "bell": {
        // 決闘を告げる教会の鐘
        this.playDistantBell(audioCtx, audioCtx.destination, NOTE_HZ.D4, now, scaledVol * 0.45);
        break;
      }

      case "wind": {
        // 決闘前の静寂に吹き抜ける乾いた突風
        const dur = 0.95;
        const len = Math.floor(audioCtx.sampleRate * dur);
        const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) {
          const env = Math.sin((i / len) * Math.PI);
          data[i] = (Math.random() * 2 - 1) * env;
        }
        const src = audioCtx.createBufferSource();
        src.buffer = buf;

        const filter = audioCtx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(380, now);
        filter.frequency.linearRampToValueAtTime(680, now + dur * 0.45);
        filter.frequency.linearRampToValueAtTime(320, now + dur);
        filter.Q.setValueAtTime(2.5, now);

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(scaledVol * 0.28, now);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        src.start(now);
        break;
      }

      case "gameover": {
        // 敗北時の哀愁ハーモニカ＆低音ギター終止
        const notes = [NOTE_HZ.A4, NOTE_HZ.F4, NOTE_HZ.E4, NOTE_HZ.D4];
        notes.forEach((freq, idx) => {
          const t0 = now + idx * 0.22;
          this.playWesternHarmonica(
            audioCtx,
            audioCtx.destination,
            freq,
            freq * 0.98,
            t0,
            0.28,
            scaledVol * 0.3,
          );
        });
        this.playDistantBell(
          audioCtx,
          audioCtx.destination,
          NOTE_HZ.D3,
          now + 0.66,
          scaledVol * 0.35,
        );
        break;
      }

      case "countdown": {
        // 懐中時計の秒針チック音 ＋ 低い鐘の余韻
        const tickOsc = audioCtx.createOscillator();
        const tickGain = audioCtx.createGain();
        tickOsc.type = "triangle";
        tickOsc.frequency.setValueAtTime(1450, now);
        tickOsc.frequency.exponentialRampToValueAtTime(420, now + 0.025);
        tickGain.gain.setValueAtTime(scaledVol * 0.4, now);
        tickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        tickOsc.connect(tickGain);
        tickGain.connect(audioCtx.destination);
        tickOsc.start(now);
        tickOsc.stop(now + 0.035);

        this.playDistantBell(audioCtx, audioCtx.destination, NOTE_HZ.A3, now, scaledVol * 0.22);
        break;
      }

      case "start": {
        // DRAW!（早撃ち開始の鞭の音＆真昼の鐘！）
        this.playDistantBell(audioCtx, audioCtx.destination, NOTE_HZ.D4, now, scaledVol * 0.5);

        // 鋭い鞭のクラック音
        const crackLen = Math.floor(audioCtx.sampleRate * 0.06);
        const crackBuf = audioCtx.createBuffer(1, crackLen, audioCtx.sampleRate);
        const crackData = crackBuf.getChannelData(0);
        for (let i = 0; i < crackLen; i++) {
          crackData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (crackLen * 0.2));
        }
        const crackSrc = audioCtx.createBufferSource();
        crackSrc.buffer = crackBuf;
        const crackFilter = audioCtx.createBiquadFilter();
        crackFilter.type = "highpass";
        crackFilter.frequency.setValueAtTime(1400, now);
        const crackGain = audioCtx.createGain();
        crackGain.gain.setValueAtTime(scaledVol * 0.55, now);
        crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        crackSrc.connect(crackFilter);
        crackFilter.connect(crackGain);
        crackGain.connect(audioCtx.destination);
        crackSrc.start(now);
        break;
      }

      case "reload": {
        // リボルバーのシリンダーを回す「カチ・カチ・カチ・カチッ」というラチェット回転音
        const clickTimes = [0, 0.042, 0.088, 0.138, 0.195];
        clickTimes.forEach((offset, idx) => {
          const t0 = now + offset;
          const ratOsc = audioCtx.createOscillator();
          const ratGain = audioCtx.createGain();
          ratOsc.type = "square";
          ratOsc.frequency.setValueAtTime(1750 + idx * 90, t0);
          ratOsc.frequency.exponentialRampToValueAtTime(520, t0 + 0.018);

          ratGain.gain.setValueAtTime(scaledVol * 0.34, t0);
          ratGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.02);

          ratOsc.connect(ratGain);
          ratGain.connect(audioCtx.destination);
          ratOsc.start(t0);
          ratOsc.stop(t0 + 0.022);
        });
        break;
      }

      case "reload_insert": {
        // 真鍮薬莢をシリンダーへ滑り込ませる音（チャリン・コチャッ）
        const brassTimes = [0, 0.055];
        brassTimes.forEach((offset, i) => {
          const t0 = now + offset;
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(2100 + i * 320, t0);
          osc.frequency.exponentialRampToValueAtTime(860, t0 + 0.04);

          gain.gain.setValueAtTime(scaledVol * 0.36, t0);
          gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.045);

          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(t0);
          osc.stop(t0 + 0.05);
        });
        break;
      }

      case "reload_complete": {
        // シリンダーをフレームへ戻し、撃鉄（ハンマー）を起こす音（カチャッ…チャキッ！）
        // 1. シリンダースナップ
        const snapOsc = audioCtx.createOscillator();
        const snapGain = audioCtx.createGain();
        snapOsc.type = "triangle";
        snapOsc.frequency.setValueAtTime(420, now);
        snapOsc.frequency.exponentialRampToValueAtTime(110, now + 0.045);
        snapGain.gain.setValueAtTime(scaledVol * 0.55, now);
        snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        snapOsc.connect(snapGain);
        snapGain.connect(audioCtx.destination);
        snapOsc.start(now);
        snapOsc.stop(now + 0.055);

        // 2. シングルアクションの撃鉄コッキング（チャキッ！）
        const tCock = now + 0.065;
        const cock1 = audioCtx.createOscillator();
        const cockGain1 = audioCtx.createGain();
        cock1.type = "square";
        cock1.frequency.setValueAtTime(1450, tCock);
        cock1.frequency.exponentialRampToValueAtTime(780, tCock + 0.02);
        cockGain1.gain.setValueAtTime(scaledVol * 0.35, tCock);
        cockGain1.gain.exponentialRampToValueAtTime(0.001, tCock + 0.022);
        cock1.connect(cockGain1);
        cockGain1.connect(audioCtx.destination);
        cock1.start(tCock);
        cock1.stop(tCock + 0.025);

        const tLock = now + 0.095;
        const cock2 = audioCtx.createOscillator();
        const cockGain2 = audioCtx.createGain();
        cock2.type = "sine";
        cock2.frequency.setValueAtTime(2380, tLock);
        cock2.frequency.exponentialRampToValueAtTime(1620, tLock + 0.045);
        cockGain2.gain.setValueAtTime(scaledVol * 0.45, tLock);
        cockGain2.gain.exponentialRampToValueAtTime(0.001, tLock + 0.05);
        cock2.connect(cockGain2);
        cockGain2.connect(audioCtx.destination);
        cock2.start(tLock);
        cock2.stop(tLock + 0.055);
        break;
      }
    }
  }

  private fallbackCtx: AudioContext | null = null;
  private createStandaloneContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.fallbackCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.fallbackCtx = new AudioContextClass();
      }
    }
    return this.fallbackCtx;
  }

  public destroy(): void {
    if (this.unsubscribeSettings) {
      this.unsubscribeSettings();
      this.unsubscribeSettings = undefined;
    }
    this.stopBGM();
    this.seCooldowns.clear();
  }
}
