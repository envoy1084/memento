import { createFileRoute } from "@tanstack/react-router";

import { GiftWizard } from "#/routes/send/_components/gift-wizard";
export const Route = createFileRoute("/send")({ component: GiftWizard });
