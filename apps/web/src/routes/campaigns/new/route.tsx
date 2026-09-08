import { createFileRoute } from "@tanstack/react-router";

import { CampaignWizard } from "#/features/campaigns/campaign-wizard";
export const Route = createFileRoute("/campaigns/new")({ component: CampaignWizard });
