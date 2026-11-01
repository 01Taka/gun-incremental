/**
 * ゲーム内バランスパラメータの統合エクスポート窓口
 *
 * 各パラメータの実体は src/config/*.json に定義されており、
 * 対応するローダーで zod スキーマ検証を行ったうえで公開される。
 *   - targets.json           : 的（賞金首）のパラメータ
 *   - weapons.json           : 各銃および銃ごとの弾パラメータ
 *   - skillTree.json         : スキルツリー（skillTree.ts から参照）
 *   - passives.json          : 上納金突破時パッシブボーナスと効果量
 *   - permanentUpgrades.json : 酒場（永続強化）のコストと段階効果量
 *   - gameRules.json         : ラウンド・上納金・戦闘上限・解放条件・アリーナ挙動
 */
export {
  ARENA_CONFIG,
  COMBAT_CONFIG,
  GAME_RULES,
  INVOICE_CONFIG,
  PROGRESSION_CONFIG,
  ROUND_CONFIG,
  SIMULATION_CONFIG,
} from "./gameRules";
export { PASSIVE_IDS, PASSIVE_LIST, PASSIVES } from "./passives";
export {
  PERMANENT_UPGRADE_IDS,
  PERMANENT_UPGRADE_LIST,
  PERMANENT_UPGRADES,
} from "./permanentUpgrades";
export { TARGET_IDS, TARGET_LIST, TARGET_UNLOCK_SEQUENCE, TARGETS } from "./targets";
export { WEAPON_IDS, WEAPON_LIST, WEAPONS } from "./weapons";
