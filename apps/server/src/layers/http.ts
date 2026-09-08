import { DateTime, Effect, FileSystem, Layer, Option } from "effect";
import {
  HttpEffect,
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/unstable/http";
export const HttpPolicy = (origin: string) =>
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
            // The VPS proxy overwrites this header; the application port is not published externally.
            const ip =
              request.headers["x-memento-client-ip"] ??
              Option.getOrElse(request.remoteAddress, () => "unknown");
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
          allowedHeaders: ["authorization", "content-type"],
          maxAge: 600,
        }),
      );
    }),
  );
