import { createFileRoute } from "@tanstack/react-router";

import { ClaimJourney } from "#/routes/claim/_components/claim-journey";

export const Route = createFileRoute("/invite/$campaignId/$invitationId")({
  component: CampaignInvitation,
});

function CampaignInvitation() {
  const { campaignId, invitationId } = Route.useParams();

  return (
    <ClaimJourney
      key={`${campaignId}/${invitationId}`}
      campaignId={campaignId}
      invitationId={invitationId}
    />
  );
}
