import {
  Award,
  BarChart3,
  Bolt,
  Bomb,
  CircleDot,
  Clock,
  CloudLightning,
  Coins,
  Cpu,
  Crosshair,
  Crown,
  Diamond,
  Eye,
  Flame,
  Gauge,
  Gem,
  Heart,
  Hourglass,
  Layers,
  type LucideIcon,
  type LucideProps,
  Magnet,
  Percent,
  Plus,
  Radar,
  RefreshCw,
  Repeat,
  Rocket,
  RotateCw,
  Scale,
  Shield,
  ShieldAlert,
  Sparkles,
  Star,
  Swords,
  Tag,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
  Wrench,
  Zap,
} from "lucide-react";

/**
 * skillTree.json の "icon" フィールドで指定可能な Lucide アイコン名のレジストリ。
 * 全アイコン (1900個以上) をバンドルせずツリーシェイキングを維持するため、
 * スキルツリーで利用しやすいアイコン群を登録している。
 * 追加したい場合は lucide-react から import してここに並べるだけで JSON から利用できる。
 * また絵文字などを直接記述した場合もテキストとしてフォールバック表示される。
 */
const SKILL_ICON_MAP: Record<string, LucideIcon> = {
  Award,
  BarChart3,
  Bolt,
  Bomb,
  CircleDot,
  Clock,
  CloudLightning,
  Coins,
  Cpu,
  Crosshair,
  Crown,
  Diamond,
  Eye,
  Flame,
  Gauge,
  Gem,
  Heart,
  Hourglass,
  Layers,
  Magnet,
  Percent,
  Plus,
  Radar,
  RefreshCw,
  Repeat,
  Rocket,
  RotateCw,
  Scale,
  Shield,
  ShieldAlert,
  Sparkles,
  Star,
  Swords,
  Tag,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
  Wrench,
  Zap,
};

interface SkillIconProps extends Omit<LucideProps, "name"> {
  name: string;
  size?: number;
}

/**
 * スキルアイコン描画コンポーネント。
 * SKILL_ICON_MAP に一致する Lucide アイコン名（PascalCase または kebab/snake_case 対応）があれば
 * ベクターアイコンとして描画し、なければ文字列（絵文字等）またはデフォルトアイコンを表示する。
 */
export function SkillIcon({ name, size = 24, className, ...rest }: SkillIconProps) {
  // PascalCase 変換サポート (例: "cloud-lightning" や "cloud_lightning" -> "CloudLightning")
  const normalized =
    name in SKILL_ICON_MAP
      ? name
      : name
          .split(/[-_\s]+/)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join("");

  const IconComponent = SKILL_ICON_MAP[normalized];
  if (IconComponent) {
    return <IconComponent size={size} className={className} {...rest} />;
  }

  // ASCII英数字のみ（タイポしたアイコン名など）の場合は Sparkles にフォールバック
  if (/^[A-Za-z0-9_-]+$/.test(name)) {
    return <Sparkles size={size} className={className} {...rest} />;
  }

  // 絵文字などの場合はそのまま表示
  return (
    <span
      className={className}
      style={{ fontSize: `${Math.round(size * 0.9)}px`, lineHeight: 1 }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
