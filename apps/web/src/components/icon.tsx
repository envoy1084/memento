import {
  ArrowRight01Icon,
  ArrowLeft01Icon,
  GiftIcon,
  UserGroupIcon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  Link01Icon,
  Wallet01Icon,
  Mail01Icon,
  Globe02Icon,
  Search01Icon,
  Cancel01Icon,
  Menu01Icon,
  PlusSignIcon,
  Shield01Icon,
  Settings01Icon,
  Clock01Icon,
  SparklesIcon,
  ArrowUpRight01Icon,
  HugeiconsIcon,
} from "@thenamespace/uikit/icons";
const icons = {
  arrow: ArrowRight01Icon,
  back: ArrowLeft01Icon,
  gift: GiftIcon,
  people: UserGroupIcon,
  check: CheckmarkCircle02Icon,
  copy: Copy01Icon,
  link: Link01Icon,
  wallet: Wallet01Icon,
  mail: Mail01Icon,
  globe: Globe02Icon,
  search: Search01Icon,
  close: Cancel01Icon,
  menu: Menu01Icon,
  plus: PlusSignIcon,
  shield: Shield01Icon,
  settings: Settings01Icon,
  clock: Clock01Icon,
  sparkle: SparklesIcon,
  external: ArrowUpRight01Icon,
};
export function Icon({
  name,
  className = "",
  size = 20,
}: {
  name: keyof typeof icons;
  className?: string;
  size?: number;
}) {
  return (
    <HugeiconsIcon
      icon={icons[name]}
      width={size}
      height={size}
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    />
  );
}
