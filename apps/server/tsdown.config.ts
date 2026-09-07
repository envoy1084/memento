import defineConfig from "klarity/tsdown/node";

export default defineConfig({
  alias: { "#/": "./src/" },
  entry: { index: "src/index.ts", main: "src/main.ts" },
  exports: { devExports: "memento-source" },
  target: "node24",
  unbundle: true,
  // Deployable runtime; client-facing declarations come from api and protocol.
  dts: false,
  // TS 7 is pinned by this workspace; this advisory is not a build failure.
  suppressWarnings: [
    "TypeScript 7.0 does not yet have a stable API and is experimental. Some options will be unavailable.",
  ],
});
