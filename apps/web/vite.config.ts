import { fileURLToPath } from "node:url";

import { tanstackRouter } from "@tanstack/router-plugin/vite";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defaultClientConditions, defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routeFileIgnorePattern: "^_components$",
    }),
    tailwindcss(),
    react(),
  ],
  resolve: {
    conditions: ["memento-source", ...defaultClientConditions],
    alias: { "#": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: { host: "0.0.0.0", port: 3000 },
});
