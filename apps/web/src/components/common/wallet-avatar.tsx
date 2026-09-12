import { useState } from "react";

import { ShellMark } from "#/components/display/brand";

export function WalletAvatar({ src }: { src?: string | undefined }) {
  const [failedSource, setFailedSource] = useState<string>();

  return (
    <span
      aria-hidden="true"
      className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-lavender-100 text-lavender-600"
    >
      {src && src !== failedSource ? (
        <img
          src={src}
          alt=""
          width={20}
          height={20}
          className="size-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setFailedSource(src)}
        />
      ) : (
        <ShellMark tone="lavender" size={14} />
      )}
    </span>
  );
}
