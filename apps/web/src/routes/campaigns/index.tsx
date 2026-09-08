import { createFileRoute } from "@tanstack/react-router";

import { Campaigns } from "#/routes/campaigns/_components/campaigns-page";

export const Route = createFileRoute("/campaigns/")({ component: Campaigns });
