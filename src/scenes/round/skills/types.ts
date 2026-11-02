import type Phaser from "phaser";

import type { SynthSoundType } from "../../../audio/AudioManager";
import type { WeaponBulletConfig } from "../../../config/types";
import type { ActiveTarget, HitResult } from "../types";

/** プレイヤー発砲イベント情報 */
export interface ShootEventInfo {
  muzzleX: number;
  muzzleY: number;
  angle: number;
}

/** 的着弾イベント情報 */
export interface HitEventInfo {
  target: ActiveTarget;
  hitX: number;
  hitY: number;
  damage: number;
  isCrit: boolean;
}

/** 的破壊イベント情報 */
export interface DestroyEventInfo {
  target: ActiveTarget;
  deathX: number;
  deathY: number;
  killingDamage: number;
  spEarned: number;
}

/**
 * スキル側が安全にラウンド内操作を行うためのコンテキスト
 */
export interface RoundContext {
  /** Phaser Scene 本体（描画・Tween等の操作用） */
  scene: Phaser.Scene;

  /**
   * 弾丸・破片を生成
   * @param x 発射開始X座標
   * @param y 発射開始Y座標
   * @param angle 発射角度（ラジアン）
   * @param bulletConfig 弾の速度・半径（未指定時はプレイヤー銃設定を流用）
   * @param customDamage 弾丸ヒット時の個別ダメージ量（未指定時はプレイヤー基準ダメージ）
   */
  spawnBullet: (
    x: number,
    y: number,
    angle: number,
    bulletConfig?: Partial<WeaponBulletConfig>,
    customDamage?: number,
  ) => void;

  /** 現在アクティブな全ての的を取得 */
  getTargets: () => ActiveTarget[];

  /** 指定座標に最も近い的を取得 */
  getClosestTarget: (x: number, y: number) => ActiveTarget | null;

  /**
   * 特定の的に直接ダメージを与える（雷やビーム、範囲爆発用）
   */
  dealDamageToTarget: (target: ActiveTarget, damage: number) => HitResult;

  /** 効果音を再生 */
  playSE: (soundKey: string, volume?: number) => void;

  /** 合成効果音を再生 */
  playSynthSE: (key: SynthSoundType, volume?: number) => void;

  /** 火花などのパーティクルを発生 */
  emitSparks: (x: number, y: number, count?: number) => void;

  /** プレイヤーの基本ダメージを取得（スキルのダメージスケーリング用） */
  getPlayerBaseDamage: () => number;
}

/**
 * ラウンド内で実行されるスキルの共通インターフェース（Strategy）
 */
export interface RoundHook {
  /** 一意なスキル識別子 */
  readonly id: string;

  /** ラウンド開始時（タレット等のオブジェクト生成・初期化） */
  onRoundStart?(ctx: RoundContext): void;

  /** 毎フレーム更新（タレットの索敵・自律攻撃、タイマー処理など） */
  onUpdate?(deltaSeconds: number, ctx: RoundContext): void;

  /** プレイヤー発砲時（追加弾の発射、反動拡散など） */
  onPlayerShoot?(info: ShootEventInfo, ctx: RoundContext): void;

  /** 弾が的に着弾した瞬間（跳弾、状態異常など） */
  onTargetHit?(info: HitEventInfo, ctx: RoundContext): void;

  /** 的が破壊された瞬間（破片拡散、撃破時爆発など） */
  onTargetDestroyed?(info: DestroyEventInfo, ctx: RoundContext): void;

  /** リロード開始時 */
  onReloadStart?(ctx: RoundContext): void;

  /** リロード完了時 */
  onReloadComplete?(ctx: RoundContext): void;

  /** ラウンド終了時（オブジェクトのクリーンアップ、終了処理） */
  onRoundEnd?(ctx: RoundContext): void;
}
