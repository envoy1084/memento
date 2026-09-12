import { createFileRoute } from "@tanstack/react-router";

import { LiveClaim } from "#/routes/claim/_components/live-claim";
export const Route = createFileRoute("/g/$giftId")({ component: Invitation });
function Invitation() {
  const { giftId } = Route.useParams();
  return <LiveClaim giftId={giftId} />;
}
