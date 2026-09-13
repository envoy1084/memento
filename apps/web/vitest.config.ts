import { fileURLToPath } from "node:url";

import defineConfig from "klarity/vitest/node";

export default defineConfig({
  resolve: {
    conditions: ["memento-source"],
    alias: { "#": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: { include: ["src/**/*.test.{ts,tsx}"] },
});
