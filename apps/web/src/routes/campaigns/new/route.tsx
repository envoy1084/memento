import { createFileRoute } from "@tanstack/react-router";

import { CampaignWizard } from "#/routes/campaigns/_components/campaign-wizard";
export const Route = createFileRoute("/campaigns/new")({ component: CampaignWizard });
