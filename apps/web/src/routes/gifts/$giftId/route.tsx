import { createFileRoute } from "@tanstack/react-router";

import { GiftDetail } from "#/routes/gifts/_components/gift-detail";

export const Route = createFileRoute("/gifts/$giftId")({
  validateSearch: (search: Record<string, unknown>): { created?: boolean } =>
    search.created === true ? { created: true } : {},

  component: GiftDetailRoute,
});

function GiftDetailRoute() {
  const { giftId } = Route.useParams();
  const { created } = Route.useSearch();

  return <GiftDetail giftId={giftId} created={created ?? false} />;
}
