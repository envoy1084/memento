import { readFile, writeFile } from "node:fs/promises";

const check = process.argv.includes("--check");
const names = ["MementoSponsorship", "MementoNameVault"];

await Promise.all(
  names.map(async (name) => {
    const artifact = JSON.parse(
      await readFile(
        new URL(`../../contracts/out/${name}.sol/${name}.json`, import.meta.url),
        "utf8",
      ),
    );
    const output = new URL(`../src/abi/${name}.ts`, import.meta.url);

    if (check) {
      const generated = await import(output.href);

      if (JSON.stringify(generated[`${name}Abi`]) !== JSON.stringify(artifact.abi)) {
        throw new Error(`${name} ABI is stale. Run pnpm --filter @memento/chain generate.`);
      }
    } else {
      await writeFile(
        output,
        `// Generated from ${name}.sol by packages/chain/scripts/generate-abis.mjs.\nexport const ${name}Abi = ${JSON.stringify(artifact.abi, null, 2)} as const;\n`,
      );
    }
  }),
);
