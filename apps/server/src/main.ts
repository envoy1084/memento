import { createServer } from "node:http";

import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { Config, Effect, Layer, Schema } from "effect";
import { HttpRouter } from "effect/unstable/http";
import { HttpApiScalar } from "effect/unstable/httpapi";

import { Api } from "@memento/api";
import { Application, Cryptography, Product, Worker } from "@memento/application";
import { Database, MigrationsLive, RepositoriesLive } from "@memento/database";
import { Privy } from "@memento/privy";
import { WorldId } from "@memento/world-id";

import { productPolicy } from "./config/product.js";
import { MailerLive } from "./integrations/email.js";
import { ChainLive } from "./integrations/ens/chain.js";
import { Ethereum } from "./integrations/ens/client.js";
import { EnsConfig } from "./integrations/ens/config.js";
import { Hca } from "./integrations/ens/hca.js";
import { TransactionJournal } from "./integrations/ens/journal.js";
import { checkDeployment } from "./integrations/ens/readiness.js";
import { SepoliaRpc } from "./integrations/ens/rpc.js";
import { HttpPolicy } from "./layers/http.js";
import { ApiRoutes } from "./routes/api.js";
import { RpcRoutes } from "./routes/rpc/index.js";

const WorkerRuntime = Layer.effectDiscard(
  Effect.gen(function* () {
    const worker = yield* Worker;

    yield* worker.tick().pipe(
      Effect.catchCause(() => Effect.logError("Worker tick failed; durable jobs will be retried")),
      Effect.andThen(Effect.sleep("1 second")),
      Effect.forever,
      Effect.forkScoped,
    );
  }),
);

Effect.gen(function* () {
  const port = yield* Config.port("PORT").pipe(Config.withDefault(3001));
  const url = yield* Config.redacted("DATABASE_URL");
  const webOrigin = yield* Config.string("WEB_ORIGIN");
  const encryptionKey = yield* Config.redacted("ENCRYPTION_KEY");
  const emailKey = yield* Config.redacted("EMAIL_HMAC_KEY");
  const privyId = yield* Config.string("PRIVY_APP_ID");
  const privySecret = yield* Config.redacted("PRIVY_APP_SECRET");
  const worldId = yield* Config.string("WORLD_APP_ID");
  const rpId = yield* Config.string("WORLD_RP_ID");
  const worldKey = yield* Config.redacted("WORLD_SIGNING_KEY");
  const environment = yield* Config.schema(
    Schema.Literals(["staging", "production"]),
    "WORLD_ENVIRONMENT",
  );
  const resendKey = yield* Config.redacted("RESEND_API_KEY");
  const from = yield* Config.string("EMAIL_FROM");
  const database = MigrationsLive.pipe(Layer.provideMerge(Database.live(url)));
  const persistence = RepositoriesLive.pipe(Layer.provideMerge(database));

  const infrastructure = Layer.mergeAll(
    persistence,
    Cryptography.live(encryptionKey, emailKey),
    Ethereum.layer.pipe(Layer.provideMerge(EnsConfig.layer)),
  );

  const journal = TransactionJournal.layer.pipe(Layer.provideMerge(infrastructure));
  const hca = Hca.layer.pipe(Layer.provideMerge(journal));
  const chain = ChainLive.pipe(Layer.provideMerge(hca));

  const dependencies = Layer.mergeAll(
    chain,
    WorldId.live({
      appId: worldId,
      rpId,
      action: productPolicy.worldAction,
      signingKey: worldKey,
      environment,
    }),
    MailerLive(resendKey, from),
    Layer.succeed(Product, {
      webOrigin,
      maximumBudget: productPolicy.maximumBudget,
      maximumLifetime: productPolicy.maximumLifetime,
    }),
  );

  const services = Layer.mergeAll(Application.layer, Worker.layer).pipe(
    Layer.provideMerge(dependencies),
  );

  const routes = Layer.mergeAll(
    ApiRoutes,
    RpcRoutes.pipe(
      Layer.provide(Layer.unwrap(Config.redacted("RPC_URL").pipe(Effect.map(SepoliaRpc.live)))),
    ),
    HttpPolicy(webOrigin),
    HttpApiScalar.layer(Api, { path: "/docs" }),
  );

  const startup = Layer.effectDiscard(checkDeployment).pipe(Layer.provideMerge(services));

  yield* Layer.launch(
    Layer.mergeAll(HttpRouter.serve(routes, { disableLogger: true }), WorkerRuntime).pipe(
      Layer.provide(startup),
      Layer.provide(Privy.live({ appId: privyId, appSecret: privySecret })),
      Layer.provide(NodeHttpServer.layer(createServer, { port, host: "0.0.0.0" })),
    ),
  );
}).pipe(NodeRuntime.runMain);
