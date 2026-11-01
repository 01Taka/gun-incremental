/**
 * 武器（銃）および各銃固有の弾パラメータのローダー
 *
 * 具体的なパラメータは weapons.json に記述する。本モジュールは
 *   1. JSON のスキーマ検証 (zod)
 *   2. 必須武器IDの重複・欠落チェック
 *   3. 検証済み武器モデル (WeaponsModel) の構築
 * を行い、ゲーム全体で安全に扱えるようにする。
 */
import { z } from "zod";

import type { WeaponDefinition, WeaponId } from "./types";
import rawWeapons from "./weapons.json";

const REQUIRED_WEAPON_IDS: readonly WeaponId[] = ["handgun", "rifle", "sniper"];

const weaponBulletJsonSchema = z
  .object({
    speed: z.number().positive("bullet.speed は正の数である必要があります"),
    radius: z.number().positive("bullet.radius は正の数である必要があります"),
  })
  .strict();

const weaponJsonSchema = z
  .object({
    id: z.enum(["handgun", "rifle", "sniper"]),
    name: z.string().min(1, "name は必須です"),
    description: z.string(),
    fireInterval: z.number().positive("fireInterval は正の数である必要があります"),
    damage: z.number().positive("damage は正の数である必要があります"),
    magazineSize: z.number().int().min(1, "magazineSize は1以上の整数である必要があります"),
    reloadTime: z.number().positive("reloadTime は正の数である必要があります"),
    price: z.number().nonnegative("price は0以上である必要があります"),
    unlockRound: z.number().int().min(1, "unlockRound は1以上の整数である必要があります"),
    bullet: weaponBulletJsonSchema,
  })
  .strict();

const weaponsFileSchema = z
  .object({
    $schema: z.string().optional(),
    weapons: z.array(weaponJsonSchema).min(1, "少なくとも1つの武器が必要です"),
  })
  .strict();

export type WeaponJson = z.infer<typeof weaponJsonSchema>;

export class WeaponValidationError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(`weapons.json の定義が不正です:\n- ${problems.join("\n- ")}`);
    this.name = "WeaponValidationError";
    this.problems = problems;
  }
}

export interface WeaponsModel {
  weapons: Record<WeaponId, WeaponDefinition>;
  weaponList: WeaponDefinition[];
  weaponIds: WeaponId[];
}

export function buildWeapons(raw: unknown): WeaponsModel {
  const parsed = weaponsFileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new WeaponValidationError([z.prettifyError(parsed.error)]);
  }

  const problems: string[] = [];
  const rawList = parsed.data.weapons;
  const seenIds = new Set<WeaponId>();

  for (const item of rawList) {
    if (seenIds.has(item.id)) {
      problems.push(`id "${item.id}" が重複しています`);
    }
    seenIds.add(item.id);
  }

  for (const reqId of REQUIRED_WEAPON_IDS) {
    if (!seenIds.has(reqId)) {
      problems.push(`必須の武器 id "${reqId}" が定義されていません`);
    }
  }

  if (problems.length > 0) {
    throw new WeaponValidationError(problems);
  }

  const weapons = {} as Record<WeaponId, WeaponDefinition>;
  const weaponList: WeaponDefinition[] = [];
  const weaponIds: WeaponId[] = [];

  for (const item of rawList) {
    const def: WeaponDefinition = {
      id: item.id,
      name: item.name,
      description: item.description,
      fireInterval: item.fireInterval,
      damage: item.damage,
      magazineSize: item.magazineSize,
      reloadTime: item.reloadTime,
      price: item.price,
      unlockRound: item.unlockRound,
      bullet: {
        speed: item.bullet.speed,
        radius: item.bullet.radius,
      },
    };
    weapons[item.id] = def;
    weaponList.push(def);
    weaponIds.push(item.id);
  }

  return {
    weapons,
    weaponList,
    weaponIds,
  };
}

export const WEAPONS_MODEL: WeaponsModel = buildWeapons(rawWeapons);
export const WEAPONS: Record<WeaponId, WeaponDefinition> = WEAPONS_MODEL.weapons;
export const WEAPON_LIST: WeaponDefinition[] = WEAPONS_MODEL.weaponList;
export const WEAPON_IDS: WeaponId[] = WEAPONS_MODEL.weaponIds;
