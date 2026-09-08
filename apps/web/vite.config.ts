import { fileURLToPath } from "node:url";

import { tanstackRouter } from "@tanstack/router-plugin/vite";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), tailwindcss(), react()],
  resolve: {
    conditions: ["memento-source"],
    alias: { "#": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: { host: "0.0.0.0", port: 3000 },
});
