import { createFileRoute } from "@tanstack/react-router";

import { Gifts } from "#/routes/gifts/_components/gifts-page";

export const Route = createFileRoute("/gifts/")({ component: Gifts });
