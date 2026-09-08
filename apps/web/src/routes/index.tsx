import { createFileRoute } from "@tanstack/react-router";

import { Home } from "#/routes/_components/home-page";

export const Route = createFileRoute("/")({ component: Home });
