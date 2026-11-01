import type Phaser from "phaser";

import type { TargetDefinition } from "../../config/types";

export interface ArenaBounds {
  left: number;
  top: number;
  size: number;
  right: number;
  bottom: number;
}

export interface StickState {
  x: number; // -1.0 〜 1.0 (左〜右)
  y: number; // -1.0 〜 1.0 (上〜下)
  active: boolean; // デッドゾーンを超えて操作中か
  angle: number; // 倒されている角度（ラジアン: -PI 〜 PI）
  force: number; // 倒しの強さ（0.0 〜 1.0）
}

export interface ActiveTarget {
  id: string;
  def: TargetDefinition;
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  hpBar?: Phaser.GameObjects.Graphics;
  currentHp: number;
  maxHp: number;
  remainingLife?: number;
  x: number;
  y: number;
}

export interface HitResult {
  destroyed: boolean;
  damage: number;
  isCrit: boolean;
  spEarned: number;
  bonusTime: number;
}

export interface Bullet {
  id: string;
  sprite: Phaser.GameObjects.Image;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  speed: number;
}
