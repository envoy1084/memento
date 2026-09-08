import { createFileRoute } from "@tanstack/react-router";

import { ProfilePage } from "#/routes/profile/_components/profile-page";

export const Route = createFileRoute("/profile")({ component: ProfilePage });
