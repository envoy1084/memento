import { spawnSync } from "node:child_process";

// Container builds contain no Git checkout. Normal installs still install the Klarity hooks.
if (process.env.LEFTHOOK !== "0") {
  const result = spawnSync("lefthook", ["install"], { stdio: "inherit" });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
