import { createFileRoute } from "@tanstack/react-router";

import { Help } from "#/routes/help/_components/help-page";

export const Route = createFileRoute("/help")({ component: Help });
