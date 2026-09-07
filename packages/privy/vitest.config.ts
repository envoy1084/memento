import defineConfig from "klarity/vitest/node";

export default defineConfig({
  resolve: { conditions: ["memento-source"] },
  ssr: {
    noExternal: [/^@memento\//],
    resolve: { conditions: ["memento-source"], externalConditions: ["memento-source", "node"] },
  },
  test: { server: { deps: { inline: [/^@memento\//] } }, sequence: { concurrent: false } },
});
