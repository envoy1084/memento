import { createFileRoute } from "@tanstack/react-router";

import { ClaimJourney } from "#/routes/claim/_components/claim-journey";
export const Route = createFileRoute("/claim/$giftId")({ component: GiftInvitation });
function GiftInvitation() {
  const { giftId } = Route.useParams();
  return <ClaimJourney key={giftId} giftId={giftId} />;
}
