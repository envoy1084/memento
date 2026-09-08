import defineConfig from "klarity/tsdown/library";

export default defineConfig({
  alias: { "#/": "./src/" },
  entry: { index: "src/index.ts", "abi/ens": "src/abi/ens.ts" },
  exports: { devExports: "memento-source" },
  target: "es2022",
  unbundle: true,
  // TS 7 is pinned by this workspace; this advisory is not a build failure.
  suppressWarnings: [
    "TypeScript 7.0 does not yet have a stable API and is experimental. Some options will be unavailable.",
  ],
});
