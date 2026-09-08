import { createFileRoute } from "@tanstack/react-router";

import { GiftWizard } from "#/features/gifts/gift-wizard";
export const Route = createFileRoute("/send")({
  validateSearch: (search: Record<string, unknown>): { kind?: "owned" } =>
    search.kind === "owned" ? { kind: "owned" } : {},
  component: SendPage,
});
function SendPage() {
  const { kind } = Route.useSearch();
  return <GiftWizard key={kind ?? "choice"} initialKind={kind ?? "choice"} />;
}
