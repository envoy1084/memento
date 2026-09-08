import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { RouterProvider } from "@tanstack/react-router";

import "@fontsource-variable/dm-sans/index.css";
import "@fontsource-variable/manrope/index.css";
import "#/styles/app.css";
import { getRouter } from "#/router";
const router = getRouter();
const root = document.getElementById("root");
if (!root) throw new Error("Memento root element is missing.");
createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
