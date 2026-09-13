import { isIP } from "node:net";

import { DateTime, Effect, FileSystem, Layer, Option } from "effect";
import {
  HttpEffect,
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/unstable/http";

export const HttpPolicy = (origin: string, trustProxy = false) =>
  Layer.unwrap(
    Effect.sync(() => {
      const buckets = new Map<string, { count: number; until: number }>();

      const safety = HttpRouter.middleware(
        (httpEffect) =>
          Effect.gen(function* () {
            const request = yield* HttpServerRequest.HttpServerRequest;

            yield* HttpEffect.appendPreResponseHandler((_, response) =>
              Effect.succeed(
                HttpServerResponse.setHeaders(response, {
                  "cache-control": "no-store",
                  "referrer-policy": "no-referrer",
                  "x-content-type-options": "nosniff",
                }),
              ),
            );

            const now = yield* DateTime.now.pipe(Effect.map(DateTime.toEpochMillis));
            // Dokploy's Traefik appends the client address. Ignore caller-supplied prefixes.
            // Enable only when the API port is reachable exclusively through that proxy.
            const forwarded = request.headers["x-forwarded-for"]?.split(",").at(-1)?.trim();
            const ip =
              trustProxy && forwarded && isIP(forwarded)
                ? forwarded
                : Option.getOrElse(request.remoteAddress, () => "unknown");

            for (const [key, bucket] of buckets) if (bucket.until <= now) buckets.delete(key);

            const bucket = buckets.get(ip) ?? { count: 0, until: now + 60000 };

            bucket.count++;

            if (bucket.count > 180 || (!buckets.has(ip) && buckets.size >= 10000))
              return HttpServerResponse.text("Too many requests", {
                status: 429,
                headers: { "retry-after": "60", "cache-control": "no-store" },
              });

            buckets.set(ip, bucket);

            return yield* httpEffect.pipe(
              Effect.provideService(HttpServerRequest.MaxBodySize, FileSystem.Size(131072)),
            );
          }),
        { global: true },
      );

      return Layer.mergeAll(
        safety,
        HttpRouter.cors({
          allowedOrigins: [origin],
          allowedMethods: ["GET", "POST", "OPTIONS"],
          // Effect HttpClient propagates both B3 and W3C tracing headers.
          allowedHeaders: ["authorization", "content-type", "b3", "traceparent"],
          maxAge: 600,
        }),
      );
    }),
  );
