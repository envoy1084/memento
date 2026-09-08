import {
  Alert02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  Calendar01Icon,
  Cancel01Icon,
  CheckmarkBadge01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Copy01Icon,
  Download01Icon,
  Edit02Icon,
  FavouriteIcon,
  GiftIcon,
  Globe02Icon,
  HugeiconsIcon,
  InformationCircleIcon,
  Link01Icon,
  Mail01Icon,
  Menu01Icon,
  PauseIcon,
  PlayIcon,
  PlusSignIcon,
  Search01Icon,
  SentIcon,
  Settings01Icon,
  Shield01Icon,
  SparklesIcon,
  UserGroupIcon,
  UserIcon,
  Wallet01Icon,
} from "@thenamespace/uikit/icons";

const icons = {
  alert: Alert02Icon,
  arrow: ArrowRight01Icon,
  back: ArrowLeft01Icon,
  badge: CheckmarkBadge01Icon,
  calendar: Calendar01Icon,
  check: CheckmarkCircle02Icon,
  clock: Clock01Icon,
  close: Cancel01Icon,
  copy: Copy01Icon,
  download: Download01Icon,
  edit: Edit02Icon,
  external: ArrowUpRight01Icon,
  gift: GiftIcon,
  globe: Globe02Icon,
  heart: FavouriteIcon,
  info: InformationCircleIcon,
  link: Link01Icon,
  mail: Mail01Icon,
  menu: Menu01Icon,
  pause: PauseIcon,
  people: UserGroupIcon,
  person: UserIcon,
  plus: PlusSignIcon,
  resume: PlayIcon,
  search: Search01Icon,
  send: SentIcon,
  settings: Settings01Icon,
  shield: Shield01Icon,
  sparkle: SparklesIcon,
  wallet: Wallet01Icon,
} as const;

export type IconName = keyof typeof icons;

export function Icon({
  name,
  className = "",
  size = 20,
  label,
}: {
  name: IconName;
  className?: string;
  size?: number;
  label?: string;
}) {
  return (
    <HugeiconsIcon
      icon={icons[name]}
      width={size}
      height={size}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : "true"}
      className={`shrink-0 ${className}`}
    />
  );
}
