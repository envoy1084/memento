import { createFileRoute } from "@tanstack/react-router";

import { LiveClaim } from "#/routes/claim/_components/live-claim";

export const Route = createFileRoute("/claim/$giftId")({ component: GiftInvitation });

function GiftInvitation() {
  const { giftId } = Route.useParams();

  return <LiveClaim key={giftId} giftId={giftId} />;
}
