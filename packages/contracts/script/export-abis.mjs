import { readFile, writeFile } from "node:fs/promises";
const names = ["MementoSponsorship", "MementoNameVault"];
await Promise.all(
  names.map(async (name) => {
    const artifact = JSON.parse(
      await readFile(new URL(`../out/${name}.sol/${name}.json`, import.meta.url), "utf8"),
    );
    await writeFile(
      new URL(`../src/generated/${name}.ts`, import.meta.url),
      `// Generated from ${name}.sol by script/export-abis.mjs.\nexport const ${name}Abi = ${JSON.stringify(artifact.abi, null, 2)} as const;\n`,
    );
  }),
);
