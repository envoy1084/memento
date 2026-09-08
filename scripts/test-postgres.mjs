import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });

  if (result.status !== 0)
    throw new Error(`${command} failed: ${result.stderr ?? result.error ?? "see output"}`);

  return result.stdout?.trim();
};

const password = randomBytes(24).toString("hex");

let container;

try {
  container = run("docker", [
    "run",
    "--rm",
    "-d",
    "--tmpfs",
    "/var/lib/postgresql/data",
    "-p",
    "127.0.0.1::5432",
    "-e",
    "POSTGRES_DB=memento_test",
    "-e",
    `POSTGRES_PASSWORD=${password}`,
    "postgres:17-alpine",
  ]);

  let ready = false;

  for (let attempt = 0; attempt < 60; attempt++) {
    if (
      spawnSync(
        "docker",
        ["exec", container, "pg_isready", "-U", "postgres", "-d", "memento_test"],
        { stdio: "ignore" },
      ).status === 0
    ) {
      ready = true;
      break;
    }

    // oxlint-disable-next-line no-await-in-loop -- Poll startup sequentially before connecting.
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (!ready) throw new Error("Test PostgreSQL did not start");

  const port = run("docker", ["port", container, "5432/tcp"]).split(":").at(-1);

  run("pnpm", ["--filter", "@memento/database", "exec", "tsx", "tests/postgres/concurrency.ts"], {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_OPTIONS: "--conditions=memento-source",
      TEST_DATABASE_URL: `postgresql://postgres:${password}@127.0.0.1:${port}/memento_test`,
    },
  });
} finally {
  if (container) spawnSync("docker", ["stop", container], { stdio: "ignore" });
}
