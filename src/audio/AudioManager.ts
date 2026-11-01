import type Phaser from "phaser";

import { useGameSettings } from "../stores/useGameSettings";

export type SynthSoundType =
  | "laser"
  | "shoot"
  | "explosion"
  | "hit"
  | "click"
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

export class AudioManager {
  private static instance: AudioManager;
  private game?: Phaser.Game;
  private currentBgmKey: string | null = null;
  private currentBgm: Phaser.Sound.BaseSound | null = null;
  private unsubscribeSettings?: () => void;

  // SE多重発音を防止するクールダウン管理（キー -> 最終再生時刻ms）
  private seCooldowns: Map<string, number> = new Map();
  private readonly defaultCooldownMs = 40;

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
      window.removeEventListener("pointerdown", unlockHandler);
      window.removeEventListener("keydown", unlockHandler);
      window.removeEventListener("touchend", unlockHandler);
    };

    window.addEventListener("pointerdown", unlockHandler, { passive: true });
    window.addEventListener("keydown", unlockHandler, { passive: true });
    window.addEventListener("touchend", unlockHandler, { passive: true });
  }

  /**
   * AudioContext のアンロック実行
   */
  public unlockAudioContext(): void {
    if (this.isUnlocked) return;

    const audioCtx = this.getAudioContext();
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().then(() => {
        this.isUnlocked = true;
      });
    } else {
      this.isUnlocked = true;
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
  // BGM 管理
  // ==========================================

  /**
   * BGMの再生（すでに同じ曲が流れている場合は何もしない）
   */
  public playBGM(key: string, loop = true): void {
    if (!this.game || this.currentBgmKey === key) return;

    // 前のBGMを停止
    this.stopBGM();

    const settings = useGameSettings.getState();
    const effectiveVolume = settings.bgmMuted ? 0 : settings.bgmVolume / 100;

    // アセットが存在する場合に再生
    if (this.game.cache.audio.has(key)) {
      this.currentBgm = this.game.sound.add(key, {
        loop,
        volume: effectiveVolume,
      });
      this.currentBgm.play();
      this.currentBgmKey = key;
    } else {
      this.currentBgmKey = key;
    }
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
    this.currentBgmKey = null;
  }

  /**
   * BGMのポーズ / 再開
   */
  public pauseBGM(): void {
    if (this.currentBgm && this.currentBgm.isPlaying) {
      this.currentBgm.pause();
    }
  }

  public resumeBGM(): void {
    if (this.currentBgm && this.currentBgm.isPaused) {
      this.currentBgm.resume();
    }
  }

  /**
   * 再生中のBGM音量を設定ストアと同期
   */
  private syncBgmVolume(volume: number, muted: boolean): void {
    const effectiveVolume = muted ? 0 : volume / 100;
    if (this.currentBgm && "setVolume" in this.currentBgm) {
      (this.currentBgm as Phaser.Sound.WebAudioSound).setVolume(effectiveVolume);
    }
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

    // 2. 実音声アセットが無い場合、シンセ音で自動フォールバック
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
      "click",
      "gameover",
      "countdown",
      "start",
      "reload",
      "reload_insert",
      "reload_complete",
    ].includes(key);
  }

  // ==========================================
  // プロシージャル合成音（Web Audio API シンセサイザー）
  // ==========================================

  /**
   * 外部アセット不要のWeb Audio APIプロシージャル効果音生成
   */
  public playSynthSE(type: SynthSoundType, volume = 0.8): void {
    const audioCtx = this.getAudioContext() || this.createStandaloneContext();
    if (!audioCtx) return;

    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    switch (type) {
      case "laser": {
        // ピューンと下降するレトロレーザー音
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);

        gain.gain.setValueAtTime(volume * 0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }

      case "shoot": {
        // 火薬を使った銃の音（カジュアルで爽快・小気味よいガンショット）
        const pitchJitter = 1 + (Math.random() * 0.1 - 0.05); // 連射時の機械感を防ぐ±5%の揺らぎ

        // 1. 火薬の破裂音（ホワイトノイズ + バンドパスフィルター）
        const noiseDuration = 0.05;
        const bufferSize = Math.max(1, Math.floor(audioCtx.sampleRate * noiseDuration));
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          // 急速に指数減衰するノイズバースト
          noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
        }

        const noiseSource = audioCtx.createBufferSource();
        noiseSource.buffer = noiseBuffer;

        const noiseFilter = audioCtx.createBiquadFilter();
        noiseFilter.type = "bandpass";
        noiseFilter.frequency.setValueAtTime(1600 * pitchJitter, now);
        noiseFilter.Q.setValueAtTime(1.4, now);

        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(volume * 0.7, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDuration);

        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(audioCtx.destination);
        noiseSource.start(now);

        // 2. 空気の衝撃波・火薬の低音パンチ（三角波の急降下ピッチ）
        const thumpOsc = audioCtx.createOscillator();
        const thumpGain = audioCtx.createGain();

        thumpOsc.type = "triangle";
        thumpOsc.frequency.setValueAtTime(240 * pitchJitter, now);
        thumpOsc.frequency.exponentialRampToValueAtTime(50, now + 0.065);

        thumpGain.gain.setValueAtTime(volume * 0.8, now);
        thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

        thumpOsc.connect(thumpGain);
        thumpGain.connect(audioCtx.destination);

        thumpOsc.start(now);
        thumpOsc.stop(now + 0.075);

        // 3. 撃針・マズルのシャープなアタック（カジュアルな歯切れの良さを演出）
        const clickOsc = audioCtx.createOscillator();
        const clickGain = audioCtx.createGain();

        clickOsc.type = "square";
        clickOsc.frequency.setValueAtTime(900 * pitchJitter, now);
        clickOsc.frequency.exponentialRampToValueAtTime(160, now + 0.02);

        clickGain.gain.setValueAtTime(volume * 0.2, now);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

        clickOsc.connect(clickGain);
        clickGain.connect(audioCtx.destination);

        clickOsc.start(now);
        clickOsc.stop(now + 0.02);
        break;
      }

      case "explosion": {
        // ホワイトノイズ＋ローパスフィルターによる爆発音
        const bufferSize = audioCtx.sampleRate * 0.35;
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = audioCtx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const filter = audioCtx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.exponentialRampToValueAtTime(60, now + 0.35);

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(volume * 0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);

        whiteNoise.start(now);
        break;
      }

      case "hit": {
        // 短く鈍い衝撃音
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.08);

        gain.gain.setValueAtTime(volume * 0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.08);
        break;
      }

      case "click": {
        // ピッという高音UIタップ音
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(1000, now);
        osc.frequency.setValueAtTime(1400, now + 0.015);

        gain.gain.setValueAtTime(volume * 0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.04);
        break;
      }

      case "gameover": {
        // 哀愁のある下降アルペジオ音
        const freqs = [330, 294, 262, 196];
        freqs.forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();

          osc.type = "square";
          osc.frequency.setValueAtTime(freq, now + idx * 0.15);

          gain.gain.setValueAtTime(volume * 0.3, now + idx * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, now + (idx + 1) * 0.15);

          osc.connect(gain);
          gain.connect(audioCtx.destination);

          osc.start(now + idx * 0.15);
          osc.stop(now + (idx + 1) * 0.15);
        });
        break;
      }

      case "countdown": {
        // カウントダウン用の軽快なビープ音 (3, 2, 1)
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(660, now);

        gain.gain.setValueAtTime(volume * 0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.08);
        break;
      }

      case "start": {
        // ラウンド開始時の高い合図音 (START!)
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(1320, now);

        gain.gain.setValueAtTime(volume * 0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.22);
        break;
      }

      case "reload": {
        // 実銃リロード開始：マガジンキャッチ解放 ＋ マガジン抜き取り音（カチャッ、サッ）
        // 1. ラッチ解放の金属クリック音
        const clickOsc = audioCtx.createOscillator();
        const clickGain = audioCtx.createGain();
        clickOsc.type = "triangle";
        clickOsc.frequency.setValueAtTime(840, now);
        clickOsc.frequency.exponentialRampToValueAtTime(260, now + 0.025);

        clickGain.gain.setValueAtTime(volume * 0.45, now);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

        clickOsc.connect(clickGain);
        clickGain.connect(audioCtx.destination);
        clickOsc.start(now);
        clickOsc.stop(now + 0.03);

        // 2. マガジンがスライドして抜ける摩擦ノイズ
        const noiseDur = 0.07;
        const bufSize = Math.max(1, Math.floor(audioCtx.sampleRate * noiseDur));
        const noiseBuf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
        const out = noiseBuf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
          out[i] = (Math.random() * 2 - 1) * Math.sin((i / bufSize) * Math.PI);
        }
        const noiseSrc = audioCtx.createBufferSource();
        noiseSrc.buffer = noiseBuf;

        const noiseFilter = audioCtx.createBiquadFilter();
        noiseFilter.type = "bandpass";
        noiseFilter.frequency.setValueAtTime(2200, now + 0.008);
        noiseFilter.Q.setValueAtTime(1.8, now + 0.008);

        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(volume * 0.35, now + 0.008);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDur);

        noiseSrc.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(audioCtx.destination);
        noiseSrc.start(now + 0.008);
        break;
      }

      case "reload_insert": {
        // 実銃リロード中間：マガジン挿入・ガイド接触とロック（コチャッ、カチッ）
        // 1. マガジンウェルに触れる第1接触音
        const hitOsc = audioCtx.createOscillator();
        const hitGain = audioCtx.createGain();
        hitOsc.type = "triangle";
        hitOsc.frequency.setValueAtTime(480, now);
        hitOsc.frequency.exponentialRampToValueAtTime(180, now + 0.03);

        hitGain.gain.setValueAtTime(volume * 0.4, now);
        hitGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

        hitOsc.connect(hitGain);
        hitGain.connect(audioCtx.destination);
        hitOsc.start(now);
        hitOsc.stop(now + 0.035);

        // 2. 奥までしっかり収まるロック音
        const tLock = now + 0.03;
        const lockOsc = audioCtx.createOscillator();
        const lockGain = audioCtx.createGain();
        lockOsc.type = "sine";
        lockOsc.frequency.setValueAtTime(1250, tLock);
        lockOsc.frequency.exponentialRampToValueAtTime(700, tLock + 0.035);

        lockGain.gain.setValueAtTime(volume * 0.5, tLock);
        lockGain.gain.exponentialRampToValueAtTime(0.001, tLock + 0.04);

        lockOsc.connect(lockGain);
        lockGain.connect(audioCtx.destination);
        lockOsc.start(tLock);
        lockOsc.stop(tLock + 0.04);

        // 金属のシャープなスナップノイズ
        const noiseDur = 0.035;
        const bufSize = Math.max(1, Math.floor(audioCtx.sampleRate * noiseDur));
        const noiseBuf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
        const out = noiseBuf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
          out[i] = Math.random() * 2 - 1;
        }
        const noiseSrc = audioCtx.createBufferSource();
        noiseSrc.buffer = noiseBuf;

        const noiseFilter = audioCtx.createBiquadFilter();
        noiseFilter.type = "highpass";
        noiseFilter.frequency.setValueAtTime(2800, tLock);

        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(volume * 0.3, tLock);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, tLock + noiseDur);

        noiseSrc.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(audioCtx.destination);
        noiseSrc.start(tLock);
        break;
      }

      case "reload_complete": {
        // 実銃リロード完了：スライド前進・薬室装填・ロック（ガシャンッ！チャキーン！）
        // 1. スライドが勢いよく前進して激突する重量感
        const slamOsc = audioCtx.createOscillator();
        const slamGain = audioCtx.createGain();
        slamOsc.type = "triangle";
        slamOsc.frequency.setValueAtTime(360, now);
        slamOsc.frequency.exponentialRampToValueAtTime(80, now + 0.06);

        slamGain.gain.setValueAtTime(volume * 0.6, now);
        slamGain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

        slamOsc.connect(slamGain);
        slamGain.connect(audioCtx.destination);
        slamOsc.start(now);
        slamOsc.stop(now + 0.07);

        // 2. 金属同士の鋭い激突ノイズ
        const noiseDur = 0.045;
        const bufSize = Math.max(1, Math.floor(audioCtx.sampleRate * noiseDur));
        const noiseBuf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
        const out = noiseBuf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
          out[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
        }
        const noiseSrc = audioCtx.createBufferSource();
        noiseSrc.buffer = noiseBuf;

        const noiseFilter = audioCtx.createBiquadFilter();
        noiseFilter.type = "bandpass";
        noiseFilter.frequency.setValueAtTime(2400, now);
        noiseFilter.Q.setValueAtTime(2.0, now);

        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(volume * 0.45, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDur);

        noiseSrc.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(audioCtx.destination);
        noiseSrc.start(now);

        // 3. チャンバーロックの美しい金属余韻（チャキーン）
        const ringFreqs = [1820, 2460];
        ringFreqs.forEach((freq, idx) => {
          const ringOsc = audioCtx.createOscillator();
          const ringGain = audioCtx.createGain();
          const tRing = now + 0.015 + idx * 0.01;

          ringOsc.type = "sine";
          ringOsc.frequency.setValueAtTime(freq, tRing);

          ringGain.gain.setValueAtTime(volume * 0.35, tRing);
          ringGain.gain.exponentialRampToValueAtTime(0.001, tRing + 0.09);

          ringOsc.connect(ringGain);
          ringGain.connect(audioCtx.destination);

          ringOsc.start(tRing);
          ringOsc.stop(tRing + 0.095);
        });
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
