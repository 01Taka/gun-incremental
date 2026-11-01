import type Phaser from "phaser";

import type { TargetDefinition } from "../../config/types";

export interface ArenaBounds {
  left: number;
  top: number;
  size: number;
  right: number;
  bottom: number;
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
