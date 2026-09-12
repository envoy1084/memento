import { useAvatar, usePrimaryName } from "@ensforge/react";

import { WalletAvatar } from "#/components/common/wallet-avatar";
import { truncateAddress } from "#/format/address";

export default function WalletIdentity({ address }: { address: string }) {
  const primaryName = usePrimaryName({ address });
  const name = primaryName.data?.name;
  const avatar = useAvatar({ name: name ?? "", enabled: Boolean(name) });
  const src = avatar.data?.status === "resolved" ? avatar.data.uri : undefined;

  return (
    <>
      <WalletAvatar key={name ?? address} src={src} />
      <span className="max-w-40 truncate" title={address}>
        {name ?? truncateAddress(address)}
      </span>
    </>
  );
}
